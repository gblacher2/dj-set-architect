import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { initSeedData } from '../seed';
import {
  deleteTrack,
  deleteSet,
  reorderSetItems,
  removeTrackFromSet,
  savePracticeSession,
} from '../operations';
import { SEED_TRACKS } from '../../seed/tracks';
import { SEED_SETS, SEED_TRANSITIONS } from '../../seed/sets';
import { TrackSchema } from '../../domain/tracks/track';
import { DJSetSchema } from '../../domain/sets/set';
import { TransitionRecordSchema } from '../../domain/transitions/transition';
import type { PracticeSession } from '../db';
import type { DJSet } from '../../domain/sets/set';
import type { Track } from '../../domain/tracks/track';
import type { TransitionRecord } from '../../domain/transitions/transition';

describe('Challenger R3 Storage & Transactional Operations Empirical Stress Harness', () => {
  beforeEach(async () => {
    await db.tracks.clear();
    await db.sets.clear();
    await db.transitions.clear();
    await db.practiceSessions.clear();
    await db.userPreferences.clear();
  });

  // ==========================================
  // 1. SEED DATA AUDIT & IDEMPOTENCY STRESS
  // ==========================================
  describe('Seed Data Audit & Idempotency Stress', () => {
    it('verifies exact counts and completeness of seed tracks', () => {
      expect(SEED_TRACKS).toHaveLength(30);

      // Check unique track IDs
      const trackIds = new Set(SEED_TRACKS.map((t) => t.id));
      expect(trackIds.size).toBe(30);

      // Check all 24 Camelot keys are covered
      const keys = new Set(SEED_TRACKS.map((t) => t.camelotKey));
      expect(keys.size).toBe(24);
      for (let i = 1; i <= 12; i++) {
        expect(keys.has(`${i}A`)).toBe(true);
        expect(keys.has(`${i}B`)).toBe(true);
      }

      // The MVP seed is House-only and stays in a practical 116–128 BPM range.
      const bpms = SEED_TRACKS.map((t) => t.bpm);
      expect(Math.min(...bpms)).toBe(116);
      expect(Math.max(...bpms)).toBe(128);

      // Check Energy levels (1 to 10)
      const energies = SEED_TRACKS.map((t) => t.energy);
      expect(Math.min(...energies)).toBe(2);
      expect(Math.max(...energies)).toBe(10);

      // Check vocal types representation
      const vocalTypes = new Set(SEED_TRACKS.map((t) => t.vocalType));
      expect(vocalTypes).toEqual(new Set(['instrumental', 'light-vocal', 'vocal']));

      // Check familiarity representation
      const familiarities = new Set(SEED_TRACKS.map((t) => t.familiarity));
      expect(familiarities).toEqual(new Set(['new', 'practiced', 'reliable']));

      // Validate all against TrackSchema
      for (const track of SEED_TRACKS) {
        const parseResult = TrackSchema.safeParse(track);
        expect(parseResult.success, `Track ${track.id} schema error`).toBe(true);
      }
    });

    it('verifies exact counts, structure, and occurrence IDs of seed sets & transitions', () => {
      expect(SEED_SETS).toHaveLength(2);
      expect(SEED_TRANSITIONS).toHaveLength(15);

      const set1 = SEED_SETS.find((s) => s.id === 'set_01');
      const set2 = SEED_SETS.find((s) => s.id === 'set_02');

      expect(set1).toBeDefined();
      expect(set2).toBeDefined();
      expect(set1?.items).toHaveLength(8);
      expect(set2?.items).toHaveLength(9);

      // Verify set 2 has duplicate track trk_08 with distinct occurrence IDs
      const set2Trk08Items = set2!.items.filter((item) => item.trackId === 'trk_08');
      expect(set2Trk08Items).toHaveLength(2);
      expect(set2Trk08Items[0].id).not.toEqual(set2Trk08Items[1].id);
      expect(set2Trk08Items.map((i) => i.id)).toEqual(['item_02_2', 'item_02_6']);

      // Validate schemas
      for (const set of SEED_SETS) {
        expect(DJSetSchema.safeParse(set).success).toBe(true);
      }
      for (const trans of SEED_TRANSITIONS) {
        expect(TransitionRecordSchema.safeParse(trans).success).toBe(true);
      }
    });

    it('handles high concurrency auto-seeding calls cleanly without duplicate key errors', async () => {
      // Execute 10 simultaneous initSeedData calls
      await Promise.all(
        Array.from({ length: 10 }).map(() => initSeedData())
      );

      const tracksCount = await db.tracks.count();
      const setsCount = await db.sets.count();
      const transCount = await db.transitions.count();

      expect(tracksCount).toBe(30);
      expect(setsCount).toBe(2);
      expect(transCount).toBe(15);
    });

    it('executes force re-seeding cleanly after heavy custom database modifications', async () => {
      await initSeedData();

      // Add 100 custom tracks, 10 sets, 20 transitions
      const customTracks: Track[] = Array.from({ length: 100 }).map((_, i) => ({
        id: `custom_trk_${i}`,
        title: `Custom Track ${i}`,
        artist: 'Custom Artist',
        genre: 'Techno',
        bpm: 130,
        camelotKey: '1A',
        energy: 8,
        vocalType: 'instrumental',
        familiarity: 'new',
        durationSeconds: 300,
      }));

      await db.tracks.bulkAdd(customTracks);
      expect(await db.tracks.count()).toBe(130);

      // Force re-seed
      const reseeded = await initSeedData(true);
      expect(reseeded).toBe(true);

      expect(await db.tracks.count()).toBe(30);
      expect(await db.sets.count()).toBe(2);
      expect(await db.transitions.count()).toBe(15);
      expect(await db.tracks.get('custom_trk_0')).toBeUndefined();
    });
  });

  // ==========================================
  // 2. DELETE TRACK CASCADE STRESS
  // ==========================================
  describe('deleteTrack Cascade Stress', () => {
    it('purges track from library and all occurrences & transitions across multiple sets', async () => {
      await initSeedData();

      // Setup a track trk_01 in set_01 and also add it to set_02
      const set2 = await db.sets.get('set_02');
      const updatedSet2Items = [
        ...set2!.items,
        { id: 'item_02_extra', trackId: 'trk_01', notes: 'Extra trk_01' },
      ];
      await db.sets.put({
        ...set2!,
        items: updatedSet2Items,
        trackIds: updatedSet2Items.map((item) => item.trackId),
      });

      // Add transition in set_02 referencing item_02_7
      const extraTrans: TransitionRecord = {
        id: 'trans_02_extra',
        setId: 'set_02',
        fromItemId: 'item_02_5',
        toItemId: 'item_02_extra',
        transitionType: 'blend',
        difficulty: 2,
        practicedCount: 0,
      };
      await db.transitions.add(extraTrans);

      // Delete trk_01
      await deleteTrack('trk_01');

      // Verify track removed from db.tracks
      expect(await db.tracks.get('trk_01')).toBeUndefined();

      // Verify set_01 items updated (item_01_2 was trk_01)
      const set1After = await db.sets.get('set_01');
      expect(set1After?.items.some((i) => i.trackId === 'trk_01')).toBe(false);
      expect(set1After?.items.some((i) => i.id === 'item_01_2')).toBe(false);

      // Verify set_02 items updated (item_02_7 was trk_01)
      const set2After = await db.sets.get('set_02');
      expect(set2After?.items.some((i) => i.trackId === 'trk_01')).toBe(false);
      expect(set2After?.items.some((i) => i.id === 'item_02_extra')).toBe(false);

      // Verify set_01 transitions trans_01_1 and trans_01_2 are purged
      const transSet1 = await db.transitions.where('setId').equals('set_01').toArray();
      const transSet1Ids = transSet1.map((t) => t.id);
      expect(transSet1Ids).not.toContain('trans_01_1');
      expect(transSet1Ids).not.toContain('trans_01_2');
      expect(transSet1Ids).toHaveLength(6); // preserved adjacent records plus reconciled neighbors

      // Verify set_02 extra transition is purged
      expect(await db.transitions.get('trans_02_extra')).toBeUndefined();
    });

    it('purges MULTIPLE occurrence items of the SAME track within the SAME set', async () => {
      await initSeedData();

      // set_02 has trk_08 at item_02_2 and item_02_6
      // Create transitions connected to both occurrence items
      await db.transitions.bulkAdd([
        {
          id: 'custom_trans_02_1',
          setId: 'set_02',
          fromItemId: 'item_02_1',
          toItemId: 'item_02_2', // connects to item_02_2
          transitionType: 'blend',
          difficulty: 1,
          practicedCount: 0,
        },
        {
          id: 'custom_trans_02_2',
          setId: 'set_02',
          fromItemId: 'item_02_5',
          toItemId: 'item_02_6', // connects to item_02_6
          transitionType: 'blend',
          difficulty: 1,
          practicedCount: 0,
        },
      ]);

      expect(await db.transitions.where('setId').equals('set_02').count()).toBe(10);

      // Delete trk_08
      await deleteTrack('trk_08');

      // Verify both item_02_2 and item_02_6 are purged from set_02
      const set2After = await db.sets.get('set_02');
      expect(set2After?.items.some((i) => i.trackId === 'trk_08')).toBe(false);
      expect(set2After?.items).toHaveLength(7); // was 9

      // Verify BOTH transitions in set_02 connected to item_02_2 and item_02_6 are purged
      const transSet2 = await db.transitions.where('setId').equals('set_02').toArray();
      expect(transSet2).toHaveLength(6);
    });

    it('handles non-existent trackId or empty string without throwing', async () => {
      await initSeedData();

      await expect(deleteTrack('trk_nonexistent')).resolves.not.toThrow();
      await expect(deleteTrack('')).resolves.not.toThrow();

      // Database counts remain unchanged
      expect(await db.tracks.count()).toBe(30);
      expect(await db.sets.count()).toBe(2);
      expect(await db.transitions.count()).toBe(15);
    });
  });

  // ==========================================
  // 3. DELETE SET CASCADE STRESS
  // ==========================================
  describe('deleteSet Cascade Stress', () => {
    it('purges set record, all set transitions, and all set practice sessions atomically', async () => {
      await initSeedData();

      // Add 10 practice sessions for set_01
      const sessions: PracticeSession[] = Array.from({ length: 10 }).map((_, i) => ({
        id: `sess_set01_${i}`,
        setId: 'set_01',
        startedAt: `2026-08-01T10:${i < 10 ? '0' + i : i}:00.000Z`,
        durationSeconds: 600,
        stepsCompleted: 2,
        totalSteps: 5,
        logs: [],
      }));
      await db.practiceSessions.bulkAdd(sessions);

      // Add 5 practice sessions for set_02 (control group)
      const set2Sessions: PracticeSession[] = Array.from({ length: 5 }).map((_, i) => ({
        id: `sess_set02_${i}`,
        setId: 'set_02',
        startedAt: `2026-08-01T11:${i < 10 ? '0' + i : i}:00.000Z`,
        durationSeconds: 300,
        stepsCompleted: 1,
        totalSteps: 3,
        logs: [],
      }));
      await db.practiceSessions.bulkAdd(set2Sessions);

      expect(await db.sets.get('set_01')).toBeDefined();
      expect(await db.transitions.where('setId').equals('set_01').count()).toBe(7);
      expect(await db.practiceSessions.where('setId').equals('set_01').count()).toBe(10);
      expect(await db.practiceSessions.where('setId').equals('set_02').count()).toBe(5);

      // Delete set_01
      await deleteSet('set_01');

      // Verify set_01 is gone
      expect(await db.sets.get('set_01')).toBeUndefined();
      expect(await db.transitions.where('setId').equals('set_01').count()).toBe(0);
      expect(await db.practiceSessions.where('setId').equals('set_01').count()).toBe(0);

      // Verify set_02 and its practice sessions remain completely intact
      expect(await db.sets.get('set_02')).toBeDefined();
      expect(await db.practiceSessions.where('setId').equals('set_02').count()).toBe(5);
    });

    it('handles non-existent setId without throwing or affecting other data', async () => {
      await initSeedData();

      await expect(deleteSet('set_nonexistent')).resolves.not.toThrow();

      expect(await db.sets.count()).toBe(2);
      expect(await db.transitions.count()).toBe(15);
    });
  });

  // ==========================================
  // 4. REORDER SET ITEMS & OCCURRENCE REMOVAL STRESS
  // ==========================================
  describe('reorderSetItems & removeTrackFromSet Stress', () => {
    it('reorderSetItems correctly updates set order and purges transitions for removed occurrence IDs', async () => {
      await initSeedData();

      const set1 = await db.sets.get('set_01');
      expect(set1?.items).toHaveLength(8);

      // Reverse set_01 items but drop item_01_1 and item_01_6
      const newItems = set1!.items.slice(1, 5).reverse();
      // newItems contains item_01_5, item_01_4, item_01_3, item_01_2

      await reorderSetItems('set_01', newItems);

      const set1After = await db.sets.get('set_01');
      expect(set1After?.items.map((i) => i.id)).toEqual(['item_01_5', 'item_01_4', 'item_01_3', 'item_01_2']);

      // Transitions referencing item_01_1 (trans_01_1) and item_01_6 (trans_01_5) must be deleted
      const transitions = await db.transitions.where('setId').equals('set_01').toArray();
      const transIds = transitions.map((t) => t.id);

      expect(transIds).not.toContain('trans_01_1');
      expect(transIds).not.toContain('trans_01_5');
      expect(transIds).not.toContain('trans_01_2');
      expect(transIds).not.toContain('trans_01_3');
      expect(transIds).not.toContain('trans_01_4');
    });

    it('reorderSetItems handles non-existent setId gracefully', async () => {
      await initSeedData();
      await expect(reorderSetItems('set_nonexistent', [])).resolves.not.toThrow();
    });

    it('removeTrackFromSet removes specific occurrence ID and attached transitions', async () => {
      await initSeedData();

      // Remove item_01_2 from set_01
      await removeTrackFromSet('set_01', 'item_01_2');

      const set1After = await db.sets.get('set_01');
      expect(set1After?.items.some((i) => i.id === 'item_01_2')).toBe(false);
      expect(set1After?.items).toHaveLength(7);

      // trans_01_1 (to item_01_2) and trans_01_2 (from item_01_2) should be removed
      const transAfter = await db.transitions.where('setId').equals('set_01').toArray();
      const transIds = transAfter.map((t) => t.id);

      expect(transIds).not.toContain('trans_01_1');
      expect(transIds).not.toContain('trans_01_2');
      expect(transIds).toHaveLength(6);
    });

    it('removeTrackFromSet isolated removal with duplicate track occurrences', async () => {
      await initSeedData();

      // set_02 contains trk_08 at item_02_2 and item_02_6
      await removeTrackFromSet('set_02', 'item_02_2');

      const set2After = await db.sets.get('set_02');
      expect(set2After?.items.some((i) => i.id === 'item_02_2')).toBe(false);
      expect(set2After?.items.some((i) => i.id === 'item_02_6')).toBe(true);
      expect(set2After?.items).toHaveLength(8);
    });
  });

  // ==========================================
  // 5. SAVE PRACTICE SESSION & STATS STRESS
  // ==========================================
  describe('savePracticeSession & Transition Stats Stress', () => {
    it('saves session log and updates multiple transitions, ratings, notes, and practice counts atomically', async () => {
      await initSeedData();

      const trans1Before = await db.transitions.get('trans_01_1');
      const trans2Before = await db.transitions.get('trans_01_2');

      expect(trans1Before?.practicedCount).toBe(3);
      expect(trans2Before?.practicedCount).toBe(1);

      const session: PracticeSession = {
        id: 'sess_multi_step',
        setId: 'set_01',
        startedAt: '2026-08-03T10:00:00.000Z',
        completedAt: '2026-08-03T10:30:00.000Z',
        durationSeconds: 1800,
        stepsCompleted: 2,
        totalSteps: 5,
        notes: 'Session focusing on early set transitions',
        logs: [
          {
            transitionId: 'trans_01_1',
            fromItemId: 'item_01_1',
            toItemId: 'item_01_2',
            rating: 5,
            notes: 'Perfect 32-bar alignment',
            durationSeconds: 300,
          },
          {
            transitionId: 'trans_01_2',
            fromItemId: 'item_01_2',
            toItemId: 'item_01_3',
            rating: 3,
            notes: 'Low EQ swap was slightly off beat',
            durationSeconds: 240,
          },
        ],
      };

      await savePracticeSession(session);

      // Verify session saved
      const savedSession = await db.practiceSessions.get('sess_multi_step');
      expect(savedSession).toBeDefined();

      // Verify trans_01_1 updated
      const trans1After = await db.transitions.get('trans_01_1');
      expect(trans1After?.practicedCount).toBe(4);
      expect(trans1After?.rating).toBe(5);
      expect(trans1After?.notes).toBe('Perfect 32-bar alignment');
      expect(trans1After?.lastPracticedAt).toBeDefined();

      // Verify trans_01_2 updated
      const trans2After = await db.transitions.get('trans_01_2');
      expect(trans2After?.practicedCount).toBe(2);
      expect(trans2After?.rating).toBe(3);
      expect(trans2After?.notes).toBe('Low EQ swap was slightly off beat');
      expect(trans2After?.lastPracticedAt).toBeDefined();
    });

    it('handles logs referencing non-existent transitionId gracefully without failing session save', async () => {
      await initSeedData();

      const session: PracticeSession = {
        id: 'sess_invalid_trans',
        setId: 'set_01',
        startedAt: '2026-08-03T11:00:00.000Z',
        durationSeconds: 600,
        stepsCompleted: 1,
        totalSteps: 1,
        logs: [
          {
            transitionId: 'trans_nonexistent',
            fromItemId: 'item_01_1',
            toItemId: 'item_01_2',
            rating: 4,
            notes: 'Log for missing transition',
          },
        ],
      };

      await expect(savePracticeSession(session)).resolves.not.toThrow();

      const saved = await db.practiceSessions.get('sess_invalid_trans');
      expect(saved).toBeDefined();
    });
  });

  // ==========================================
  // 6. LARGE DATA LOAD & TRANSACTION ROLLBACK STRESS
  // ==========================================
  describe('Large Data Load & Transaction Rollback Stress', () => {
    it('handles high volume data mutations efficiently (1,000 tracks, 50 sets, 200 transitions)', async () => {
      const startTime = performance.now();

      const bulkTracks: Track[] = Array.from({ length: 1000 }).map((_, i) => ({
        id: `bulk_trk_${i}`,
        title: `Bulk Track ${i}`,
        artist: `Artist ${i % 20}`,
        genre: i % 2 === 0 ? 'Melodic Techno' : 'Deep House',
        bpm: 120 + (i % 15),
        camelotKey: `${(i % 12) + 1}${i % 2 === 0 ? 'A' : 'B'}`,
        energy: (i % 10) + 1,
        vocalType: 'instrumental',
        familiarity: 'reliable',
        durationSeconds: 300,
      }));

      const bulkSets: DJSet[] = Array.from({ length: 50 }).map((_, i) => ({
        id: `bulk_set_${i}`,
        name: `Bulk Set ${i}`,
        energyProfile: 'build-to-peak',
        targetDurationMinutes: 60,
        items: [
          { id: `bitem_${i}_1`, trackId: `bulk_trk_${i * 2}` },
          { id: `bitem_${i}_2`, trackId: `bulk_trk_${i * 2 + 1}` },
        ],
        trackIds: [`bulk_trk_${i * 2}`, `bulk_trk_${i * 2 + 1}`],
      }));

      const bulkTransitions: TransitionRecord[] = Array.from({ length: 50 }).map((_, i) => ({
        id: `btrans_${i}`,
        setId: `bulk_set_${i}`,
        fromItemId: `bitem_${i}_1`,
        toItemId: `bitem_${i}_2`,
        transitionType: 'blend',
        difficulty: 3,
        practicedCount: 0,
      }));

      await db.transaction('rw', [db.tracks, db.sets, db.transitions], async () => {
        await db.tracks.bulkAdd(bulkTracks);
        await db.sets.bulkAdd(bulkSets);
        await db.transitions.bulkAdd(bulkTransitions);
      });

      expect(await db.tracks.count()).toBe(1000);
      expect(await db.sets.count()).toBe(50);
      expect(await db.transitions.count()).toBe(50);

      // Now cascade delete bulk_trk_0
      await deleteTrack('bulk_trk_0');

      expect(await db.tracks.get('bulk_trk_0')).toBeUndefined();
      expect(await db.transitions.get('btrans_0')).toBeUndefined();
      const set0After = await db.sets.get('bulk_set_0');
      expect(set0After?.items).toHaveLength(1);

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(5000); // Must execute under 5s
    });

    it('rolls back database modifications atomically when an error occurs inside a transaction', async () => {
      await initSeedData();

      const initialTrackCount = await db.tracks.count();
      const initialSetCount = await db.sets.count();

      // Attempt transaction that throws an intentional error after partial work
      await expect(
        db.transaction('rw', [db.tracks, db.sets], async () => {
          await db.tracks.add({
            id: 'rollback_trk',
            title: 'Rollback Track',
            artist: 'Rollback Artist',
            genre: 'Techno',
            bpm: 130,
            camelotKey: '1A',
            energy: 5,
            vocalType: 'instrumental',
            familiarity: 'new',
            durationSeconds: 300,
          });

          await db.sets.add({
            id: 'rollback_set',
            name: 'Rollback Set',
            energyProfile: 'warm-up',
            targetDurationMinutes: 30,
            items: [],
            trackIds: [],
          });

          // Intentional error inside transaction
          throw new Error('Simulated Transaction Failure');
        })
      ).rejects.toThrow('Simulated Transaction Failure');

      // Verify DB rolled back completely and neither rollback_trk nor rollback_set persist
      expect(await db.tracks.count()).toBe(initialTrackCount);
      expect(await db.sets.count()).toBe(initialSetCount);
      expect(await db.tracks.get('rollback_trk')).toBeUndefined();
      expect(await db.sets.get('rollback_set')).toBeUndefined();
    });
  });
});
