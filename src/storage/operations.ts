import { db } from './db';
import type { SetTrackItem } from '../domain/sets/set';
import type { PracticeSession } from './db';
import type { Track } from '../domain/tracks/track';
import type { TransitionRecord } from '../domain/transitions/transition';

const now = () => new Date().toISOString();

function createTransition(setId: string, fromItemId: string, toItemId: string, index: number): TransitionRecord {
  return {
    id: `trans_${setId}_${fromItemId}_${toItemId}_${index}`,
    setId,
    fromItemId,
    toItemId,
    transitionType: 'blend',
    phraseLengthBars: 32,
    difficulty: 3,
    practicedCount: 0,
  };
}

async function syncAdjacentTransitions(
  setId: string,
  items: SetTrackItem[],
  restoredTransitions: TransitionRecord[] = []
): Promise<void> {
  const restoredMap = new Map(
    restoredTransitions.map((t) => [`${t.fromItemId}|${t.toItemId}`, t])
  );

  const transitions = await db.transitions.where('setId').equals(setId).toArray();
  const adjacent = new Set(items.slice(0, -1).map((item, index) => `${item.id}|${items[index + 1].id}`));

  const stale = transitions.filter(
    (transition) => !adjacent.has(`${transition.fromItemId}|${transition.toItemId}`)
  );
  if (stale.length > 0) {
    await db.transitions.bulkDelete(stale.map((t) => t.id));
  }

  const existingMap = new Map(
    transitions
      .filter((t) => !stale.includes(t))
      .map((t) => [`${t.fromItemId}|${t.toItemId}`, t])
  );

  const missing = items
    .slice(0, -1)
    .map((item, index) => ({ item, next: items[index + 1], index }))
    .filter(({ item, next }) => !existingMap.has(`${item.id}|${next.id}`))
    .map(({ item, next, index }) => {
      const restored = restoredMap.get(`${item.id}|${next.id}`);
      return restored ?? createTransition(setId, item.id, next.id, index);
    });

  if (missing.length > 0) {
    await db.transitions.bulkPut(missing);
  }
}

export async function saveTrack(track: Track): Promise<void> {
  await db.tracks.put({ ...track, updatedAt: now() });
}

export async function updateSet(
  setId: string,
  changes: Partial<Pick<import('../domain/sets/set').DJSet, 'name' | 'description' | 'energyProfile' | 'targetDurationMinutes'>>
): Promise<void> {
  const current = await db.sets.get(setId);
  if (current) await db.sets.put({ ...current, ...changes, updatedAt: now() });
}

export async function updateTransition(record: TransitionRecord): Promise<void> {
  await db.transitions.put(record);
}

export async function incrementTransitionPractice(transitionId: string): Promise<void> {
  const transition = await db.transitions.get(transitionId);
  if (transition) await db.transitions.put({ ...transition, practicedCount: transition.practicedCount + 1, lastPracticedAt: now() });
}

export async function markFromTrackReliable(transition: TransitionRecord): Promise<void> {
  const set = await db.sets.get(transition.setId);
  const item = set?.items.find((candidate) => candidate.id === transition.fromItemId);
  if (!item) return;
  const track = await db.tracks.get(item.trackId);
  if (track) await db.tracks.put({ ...track, familiarity: 'reliable', updatedAt: now() });
}

/**
 * Atomically restore a full set snapshot (items and transitions) in Dexie.
 */
export async function restoreSetSnapshot(
  setId: string,
  items: SetTrackItem[],
  transitionsToRestore: TransitionRecord[]
): Promise<void> {
  await db.transaction('rw', [db.sets, db.transitions], async () => {
    const set = await db.sets.get(setId);
    if (!set) return;

    await db.sets.put({
      ...set,
      items,
      trackIds: items.map((item) => item.trackId),
      updatedAt: now(),
    });

    await db.transitions.where('setId').equals(setId).delete();

    if (transitionsToRestore.length > 0) {
      await db.transitions.bulkPut(transitionsToRestore);
    }

    await syncAdjacentTransitions(setId, items, transitionsToRestore);
  });
}

/**
 * Delete a track from the library and cascade-remove occurrences from all sets,
 * associated transition records, and practice session logs transactionally.
 * If a practice session is left with zero step logs, it is transactionally deleted.
 */
export async function deleteTrack(trackId: string): Promise<void> {
  await db.transaction('rw', [db.tracks, db.sets, db.transitions, db.practiceSessions], async () => {
    await db.tracks.delete(trackId);

    const affectedSets = await db.sets.filter((set) => set.items.some((item) => item.trackId === trackId)).toArray();

    for (const set of affectedSets) {
      const removedItemIds = new Set(
        set.items.filter((item) => item.trackId === trackId).map((item) => item.id)
      );

      if (removedItemIds.size === 0) continue;

      const updatedItems = set.items.filter((item) => item.trackId !== trackId);

      const setTransitions = await db.transitions.where('setId').equals(set.id).toArray();
      const transitionsToDelete = setTransitions.filter(
        (t) => removedItemIds.has(t.fromItemId) || removedItemIds.has(t.toItemId)
      );
      const removedTransitionIds = new Set(transitionsToDelete.map((t) => t.id));

      if (transitionsToDelete.length > 0) {
        await db.transitions.bulkDelete(Array.from(removedTransitionIds));
      }

      // Clean up practice session step logs referencing removed item IDs / transition IDs
      const setSessions = await db.practiceSessions.where('setId').equals(set.id).toArray();
      for (const session of setSessions) {
        const updatedLogs = session.logs.filter(
          (log) =>
            !removedItemIds.has(log.fromItemId) &&
            !removedItemIds.has(log.toItemId) &&
            !removedTransitionIds.has(log.transitionId)
        );

        if (updatedLogs.length === 0) {
          // Explicit requirement: zero-log practice sessions are transactionally deleted
          await db.practiceSessions.delete(session.id);
        } else if (updatedLogs.length !== session.logs.length) {
          const updatedSession: PracticeSession = {
            ...session,
            logs: updatedLogs,
            totalSteps: updatedLogs.length,
            stepsCompleted: updatedLogs.filter((l) => l.practiceCounted).length,
          };
          await db.practiceSessions.put(updatedSession);
        }
      }

      await db.sets.put({
        ...set,
        items: updatedItems,
        trackIds: updatedItems.map((item) => item.trackId),
        updatedAt: now(),
      });
      await syncAdjacentTransitions(set.id, updatedItems);
    }
  });
}

/**
 * Delete a DJ set and cascade-remove all associated transitions and practice sessions.
 */
export async function deleteSet(setId: string): Promise<void> {
  await db.transaction('rw', [db.sets, db.transitions, db.practiceSessions], async () => {
    await db.sets.delete(setId);
    await db.transitions.where('setId').equals(setId).delete();
    await db.practiceSessions.where('setId').equals(setId).delete();
  });
}

/**
 * Reorder items in a set and clean up orphaned transition records, preserving transition payloads.
 */
export async function reorderSetItems(
  setId: string,
  newItems: SetTrackItem[],
  restoredTransitions?: TransitionRecord[]
): Promise<void> {
  await db.transaction('rw', [db.sets, db.transitions], async () => {
    const set = await db.sets.get(setId);
    if (!set) return;

    await db.sets.put({
      ...set,
      items: newItems,
      trackIds: newItems.map((item) => item.trackId),
      updatedAt: now(),
    });
    await syncAdjacentTransitions(setId, newItems, restoredTransitions ?? []);
  });
}

/**
 * Remove a single item occurrence from a set and clean up its transition records.
 */
export async function removeTrackFromSet(setId: string, itemOccurrenceId: string): Promise<void> {
  await db.transaction('rw', [db.sets, db.transitions], async () => {
    const set = await db.sets.get(setId);
    if (!set) return;

    const updatedItems = set.items.filter((item) => item.id !== itemOccurrenceId);

    await db.sets.put({
      ...set,
      items: updatedItems,
      trackIds: updatedItems.map((item) => item.trackId),
      updatedAt: now(),
    });
    await syncAdjacentTransitions(setId, updatedItems);
  });
}

/**
 * Save practice session log and update practiced count/ratings on transitions.
 */
export async function savePracticeSession(session: PracticeSession): Promise<void> {
  await db.transaction('rw', [db.practiceSessions, db.transitions], async () => {
    await db.practiceSessions.put(session);

    for (const log of session.logs) {
      if (log.transitionId) {
        const transition = await db.transitions.get(log.transitionId);
        if (transition && !log.practiceCounted) {
          await db.transitions.put({
            ...transition,
            practicedCount: transition.practicedCount + 1,
            lastPracticedAt: now(),
            ...(log.rating !== undefined ? { rating: log.rating } : {}),
            ...(log.notes ? { notes: log.notes } : {}),
          });
        } else if (transition && (log.rating !== undefined || log.notes)) {
          await db.transitions.put({
            ...transition,
            ...(log.rating !== undefined ? { rating: log.rating } : {}),
            ...(log.notes ? { notes: log.notes } : {}),
          });
        }
      }
    }
  });
}
