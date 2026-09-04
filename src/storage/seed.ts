import { db } from './db';
import { SEED_TRACKS } from '../seed/tracks';
import { SEED_SETS, SEED_TRANSITIONS } from '../seed/sets';
import { DEFAULT_PREFERENCES } from '../app/config';

/**
 * Auto-seeds database if tracks table is empty or if force=true.
 * Returns true if seeding occurred, false otherwise.
 */
export async function initSeedData(force = false): Promise<boolean> {
  let seeded = false;

  await db.transaction('rw', [db.tracks, db.sets, db.transitions, db.practiceSessions, db.userPreferences], async () => {
    const trackCount = await db.tracks.count();
    if (trackCount > 0 && !force) {
      return;
    }

    if (force) {
      await db.tracks.clear();
      await db.sets.clear();
      await db.transitions.clear();
      await db.practiceSessions.clear();
      await db.userPreferences.clear();
    }

    await db.tracks.bulkAdd(SEED_TRACKS);
    await db.sets.bulkAdd(SEED_SETS);
    await db.transitions.bulkAdd(SEED_TRANSITIONS);
    await db.userPreferences.put({
      id: 'default',
      ...DEFAULT_PREFERENCES,
      updatedAt: new Date().toISOString(),
    });
    seeded = true;
  });

  return seeded;
}
