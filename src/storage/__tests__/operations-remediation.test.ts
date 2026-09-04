import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, type PracticeSession } from '../db';
import { deleteTrack, savePracticeSession, restoreSetSnapshot } from '../operations';
import type { DJSet } from '../../domain/sets/set';
import type { Track } from '../../domain/tracks/track';
import type { TransitionRecord } from '../../domain/transitions/transition';

describe('Storage Operations Remediation Suite', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('deleteTrack transactionally cleans up logs and deletes 0-log practice sessions cleanly', async () => {
    const track1: Track = {
      id: 'trk_del_1',
      title: 'Deleting Track 1',
      artist: 'Artist 1',
      genre: 'House',
      bpm: 120,
      musicalKey: '8A',
      camelotKey: '8A',
      energy: 4,
      durationSeconds: 300,
      vocalType: 'instrumental',
      familiarity: 'new',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const track2: Track = {
      id: 'trk_del_2',
      title: 'Keeping Track 2',
      artist: 'Artist 2',
      genre: 'House',
      bpm: 122,
      musicalKey: '9A',
      camelotKey: '9A',
      energy: 5,
      durationSeconds: 300,
      vocalType: 'instrumental',
      familiarity: 'new',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const set: DJSet = {
      id: 'set_del_test',
      name: 'Delete Test Set',
      targetDurationMinutes: 60,
      energyProfile: 'build-to-peak',
      items: [
        { id: 'item_1', trackId: 'trk_del_1' },
        { id: 'item_2', trackId: 'trk_del_2' },
      ],
      trackIds: ['trk_del_1', 'trk_del_2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const transition: TransitionRecord = {
      id: 'trans_del_1',
      setId: 'set_del_test',
      fromItemId: 'item_1',
      toItemId: 'item_2',
      transitionType: 'blend',
      difficulty: 3,
      practicedCount: 1,
      notes: 'Test transition payload',
    };

    const session: PracticeSession = {
      id: 'session_del_test',
      setId: 'set_del_test',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 300,
      overallRating: 5,
      stepsCompleted: 1,
      totalSteps: 1,
      logs: [
        {
          transitionId: 'trans_del_1',
          fromItemId: 'item_1',
          toItemId: 'item_2',
          rating: 5,
          notes: 'Session step note',
          practiceCounted: true,
        },
      ],
    };

    await db.tracks.bulkAdd([track1, track2]);
    await db.sets.add(set);
    await db.transitions.add(transition);
    await savePracticeSession(session);

    // Delete track1 (removes item_1 and trans_del_1)
    await deleteTrack('trk_del_1');

    // Verify track1 is removed
    const foundTrack = await db.tracks.get('trk_del_1');
    expect(foundTrack).toBeUndefined();

    // Verify set items are updated
    const updatedSet = await db.sets.get('set_del_test');
    expect(updatedSet?.items).toHaveLength(1);
    expect(updatedSet?.items[0].trackId).toBe('trk_del_2');

    // Verify transition is removed
    const remainingTransitions = await db.transitions.where('setId').equals('set_del_test').toArray();
    expect(remainingTransitions).toHaveLength(0);

    // Verify practice session with 0 remaining step logs was transactionally deleted
    const updatedSession = await db.practiceSessions.get('session_del_test');
    expect(updatedSession).toBeUndefined();
  });

  it('restoreSetSnapshot atomically restores set items and transition payloads', async () => {
    const set: DJSet = {
      id: 'set_snapshot_test',
      name: 'Snapshot Test Set',
      targetDurationMinutes: 60,
      energyProfile: 'build-to-peak',
      items: [
        { id: 'item_A', trackId: 't1' },
        { id: 'item_B', trackId: 't2' },
      ],
      trackIds: ['t1', 't2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const transition: TransitionRecord = {
      id: 'trans_snap_1',
      setId: 'set_snapshot_test',
      fromItemId: 'item_A',
      toItemId: 'item_B',
      transitionType: 'bass-swap',
      phraseLengthBars: 32,
      difficulty: 5,
      rating: 4,
      outgoingCueSeconds: 120,
      incomingCueSeconds: 15,
      notes: 'Atomic snapshot restoration note',
      practicedCount: 7,
    };

    await db.sets.add(set);
    await db.transitions.add(transition);

    // Perform atomic snapshot restore with previous items & transitions
    await restoreSetSnapshot('set_snapshot_test', [
      { id: 'item_A', trackId: 't1' },
      { id: 'item_B', trackId: 't2' },
    ], [transition]);

    const restoredTransition = await db.transitions.get('trans_snap_1');
    expect(restoredTransition).toBeDefined();
    expect(restoredTransition?.notes).toBe('Atomic snapshot restoration note');
    expect(restoredTransition?.transitionType).toBe('bass-swap');
    expect(restoredTransition?.difficulty).toBe(5);
    expect(restoredTransition?.rating).toBe(4);
    expect(restoredTransition?.outgoingCueSeconds).toBe(120);
    expect(restoredTransition?.incomingCueSeconds).toBe(15);
    expect(restoredTransition?.practicedCount).toBe(7);
  });
});
