import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { initSeedData } from '../seed';
import type { DJSet } from '../../domain/sets/set';

describe('Challenger R3 Deep Empirical Verification Harness', () => {
  beforeEach(async () => {
    await db.tracks.clear();
    await db.sets.clear();
    await db.transitions.clear();
    await db.practiceSessions.clear();
    await db.userPreferences.clear();
  });

  // =========================================================================
  // 1. CONCURRENT initSeedData() EXTREME STRESS TESTS
  // =========================================================================
  describe('Concurrent initSeedData() Stress Tests', () => {
    it('handles 20 simultaneous initSeedData() calls on empty DB without constraint errors', async () => {
      const results = await Promise.all(
        Array.from({ length: 20 }).map(() => initSeedData())
      );

      // Exactly one execution should return true (seeded), others return false (skipped)
      const seededCount = results.filter((r) => r === true).length;
      const skippedCount = results.filter((r) => r === false).length;

      expect(seededCount).toBe(1);
      expect(skippedCount).toBe(19);

      // Verify exact record counts
      expect(await db.tracks.count()).toBe(30);
      expect(await db.sets.count()).toBe(2);
      expect(await db.transitions.count()).toBe(15);
      expect(await db.userPreferences.count()).toBe(1);
    });

    it('handles 20 simultaneous initSeedData() calls on ALREADY SEEDED DB without constraint errors', async () => {
      // First seed
      await initSeedData();

      // Fire 20 concurrent calls
      const results = await Promise.all(
        Array.from({ length: 20 }).map(() => initSeedData())
      );

      // All 20 should return false because tracks table is already populated
      expect(results.every((r) => r === false)).toBe(true);

      // Record counts remain unchanged
      expect(await db.tracks.count()).toBe(30);
      expect(await db.sets.count()).toBe(2);
      expect(await db.transitions.count()).toBe(15);
    });

    it('handles concurrent force re-seeding initSeedData(true) alongside regular initSeedData() calls', async () => {
      await initSeedData();

      // Add a custom track to detect if re-seeding clears it
      await db.tracks.add({
        id: 'custom_temp_1',
        title: 'Temp Track',
        artist: 'Artist',
        genre: 'House',
        bpm: 124,
        camelotKey: '8A',
        energy: 6,
        vocalType: 'instrumental',
        familiarity: 'new',
        durationSeconds: 300,
      });

      expect(await db.tracks.count()).toBe(31);

      // Concurrent execution of 5 force-seeds and 5 non-force seeds
      const promises = [
        ...Array.from({ length: 5 }).map(() => initSeedData(true)),
        ...Array.from({ length: 5 }).map(() => initSeedData(false)),
      ];

      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Record counts must equal exact seed counts (custom track purged)
      expect(await db.tracks.count()).toBe(30);
      expect(await db.sets.count()).toBe(2);
      expect(await db.transitions.count()).toBe(15);
      expect(await db.tracks.get('custom_temp_1')).toBeUndefined();
    });

    it('rapid sequential stress: 50 consecutive initSeedData() calls produce stable database state', async () => {
      for (let i = 0; i < 50; i++) {
        await initSeedData();
      }

      expect(await db.tracks.count()).toBe(30);
      expect(await db.sets.count()).toBe(2);
      expect(await db.transitions.count()).toBe(15);
    });
  });

  // =========================================================================
  // 2. MULTIENTRY INDEX (*trackIds) QUERIES ON db.sets
  // =========================================================================
  describe('MultiEntry *trackIds Index Queries on db.sets', () => {
    it('queries sets by single trackId present in set_01 (trk_01)', async () => {
      await initSeedData();

      // trk_01 is present in set_01 (item_01_2)
      const setsWithTrk01 = await db.sets.where('trackIds').equals('trk_01').toArray();

      expect(setsWithTrk01).toHaveLength(1);
      expect(setsWithTrk01[0].id).toBe('set_01');
    });

    it('queries sets by trackId present in MULTIPLE sets', async () => {
      await initSeedData();

      // Add trk_01 to set_02 as well
      const set2 = await db.sets.get('set_02');
      expect(set2).toBeDefined();

      const updatedSet2Items = [
        ...set2!.items,
        { id: 'item_02_7', trackId: 'trk_01', notes: 'Added trk_01 to set 2' },
      ];
      await db.sets.put({
        ...set2!,
        items: updatedSet2Items,
        trackIds: updatedSet2Items.map((i) => i.trackId),
      });

      // MultiEntry index search for trk_01 should return set_01 AND set_02
      const setsWithTrk01 = await db.sets.where('trackIds').equals('trk_01').toArray();

      expect(setsWithTrk01).toHaveLength(2);
      const setIds = setsWithTrk01.map((s) => s.id).sort();
      expect(setIds).toEqual(['set_01', 'set_02']);
    });

    it('queries set containing DUPLICATE occurrences of the SAME trackId (trk_08 in set_02)', async () => {
      await initSeedData();

      // set_02 has trk_08 at item_02_2 AND item_02_6
      const setsWithTrk08 = await db.sets.where('trackIds').equals('trk_08').toArray();

      // Dexie multiEntry index should yield unique set record (no duplicate set objects returned)
      expect(setsWithTrk08).toHaveLength(1);
      expect(setsWithTrk08[0].id).toBe('set_02');
    });

    it('queries multiEntry index for non-existent trackId', async () => {
      await initSeedData();

      const setsWithNonExistent = await db.sets.where('trackIds').equals('trk_nonexistent_999').toArray();

      expect(setsWithNonExistent).toHaveLength(0);
    });

    it('queries multiEntry index using .anyOf() with multiple track IDs', async () => {
      await initSeedData();

      // set_01 has trk_01 (item_01_2), set_02 has trk_28 (item_02_1 in set_02)
      const setsWithAny = await db.sets.where('trackIds').anyOf(['trk_01', 'trk_08']).toArray();

      const setIds = setsWithAny.map((s) => s.id).sort();
      expect(setIds).toEqual(['set_01', 'set_02']);
    });

    it('multiEntry index dynamically updates when tracks are added or removed from sets', async () => {
      await initSeedData();

      // Create a brand new set set_03 with trk_10
      const newSet: DJSet = {
        id: 'set_03',
        name: 'Test Set 3',
        energyProfile: 'steady-groove',
        targetDurationMinutes: 45,
        items: [
          { id: 'item_03_1', trackId: 'trk_10' },
          { id: 'item_03_2', trackId: 'trk_11' },
        ],
        trackIds: ['trk_10', 'trk_11'],
      };
      await db.sets.add(newSet);

      // Verify multiEntry query finds set_03
      let setsWithTrk10 = await db.sets.where('trackIds').equals('trk_10').toArray();
      expect(setsWithTrk10.map((s) => s.id)).toContain('set_03');

      // Now update set_03 to remove trk_10
      await db.sets.put({
        ...newSet,
        items: [{ id: 'item_03_2', trackId: 'trk_11' }],
        trackIds: ['trk_11'],
      });

      // Verify multiEntry query no longer returns set_03 for trk_10
      setsWithTrk10 = await db.sets.where('trackIds').equals('trk_10').toArray();
      expect(setsWithTrk10.map((s) => s.id)).not.toContain('set_03');
    });

    it('multiEntry index counting with .count()', async () => {
      await initSeedData();

      // Count sets containing trk_01
      const countSet1 = await db.sets.where('trackIds').equals('trk_01').count();
      expect(countSet1).toBe(1);

      // Count sets containing non-existent track
      const countNone = await db.sets.where('trackIds').equals('trk_9999').count();
      expect(countNone).toBe(0);
    });
  });
});
