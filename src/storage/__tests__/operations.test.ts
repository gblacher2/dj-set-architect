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
import type { PracticeSession } from '../db';

describe('Transactional DB Operations', () => {
  beforeEach(async () => {
    await initSeedData(true);
  });

  describe('deleteTrack', () => {
    it('deletes track record and removes occurrence items & transitions across sets', async () => {
      // trk_01 is item_01_2 in set_01
      // set_01 has transitions trans_01_1 (item_01_1 -> item_01_2) and trans_01_2 (item_01_2 -> item_01_3)
      expect(await db.tracks.get('trk_01')).toBeDefined();
      const setBefore = await db.sets.get('set_01');
      expect(setBefore?.items.some((i) => i.trackId === 'trk_01')).toBe(true);

      await deleteTrack('trk_01');

      // Track is deleted
      expect(await db.tracks.get('trk_01')).toBeUndefined();

      // Set items updated
      const setAfter = await db.sets.get('set_01');
      expect(setAfter?.items.some((i) => i.trackId === 'trk_01')).toBe(false);
      expect(setAfter?.items).toHaveLength(7);

      // Transitions referencing item_01_2 deleted
      const transitionsAfter = await db.transitions.where('setId').equals('set_01').toArray();
      const transitionIdsAfter = transitionsAfter.map((t) => t.id);
      expect(transitionIdsAfter).not.toContain('trans_01_1');
      expect(transitionIdsAfter).not.toContain('trans_01_2');
      expect(transitionIdsAfter).toContain('trans_01_3');
      expect(transitionIdsAfter).toContain('trans_01_4');
      expect(transitionIdsAfter).toContain('trans_01_5');
    });

    it('handles deletion of track that is not in any set without error', async () => {
      // trk_03 is not in set_01 or set_02
      expect(await db.tracks.get('trk_03')).toBeDefined();
      await deleteTrack('trk_03');
      expect(await db.tracks.get('trk_03')).toBeUndefined();
    });
  });

  describe('deleteSet', () => {
    it('deletes DJ set and cascade cleans transitions and practice sessions', async () => {
      // Add dummy practice session for set_01
      await db.practiceSessions.add({
        id: 'session_01',
        setId: 'set_01',
        startedAt: '2026-08-02T10:00:00.000Z',
        durationSeconds: 1200,
        stepsCompleted: 3,
        totalSteps: 5,
        logs: [],
      });

      expect(await db.sets.get('set_01')).toBeDefined();
      expect(await db.transitions.where('setId').equals('set_01').count()).toBe(7);
      expect(await db.practiceSessions.where('setId').equals('set_01').count()).toBe(1);

      await deleteSet('set_01');

      expect(await db.sets.get('set_01')).toBeUndefined();
      expect(await db.transitions.where('setId').equals('set_01').count()).toBe(0);
      expect(await db.practiceSessions.where('setId').equals('set_01').count()).toBe(0);
    });
  });

  describe('reorderSetItems', () => {
    it('updates set items order and removes orphaned transitions', async () => {
      const setBefore = await db.sets.get('set_01');
      expect(setBefore).toBeDefined();

      // Remove item_01_2 from reordered list
      const reorderedItems = setBefore!.items.filter((item) => item.id !== 'item_01_2');

      await reorderSetItems('set_01', reorderedItems);

      const setAfter = await db.sets.get('set_01');
      expect(setAfter?.items).toHaveLength(7);

      // Transitions trans_01_1 and trans_01_2 should be removed as orphaned
      const transitions = await db.transitions.where('setId').equals('set_01').toArray();
      const transitionIds = transitions.map((t) => t.id);
      expect(transitionIds).not.toContain('trans_01_1');
      expect(transitionIds).not.toContain('trans_01_2');
      expect(transitionIds).toHaveLength(6);
    });
  });

  describe('removeTrackFromSet', () => {
    it('removes specific occurrence item from set and cleans up transitions', async () => {
      // Remove item_01_3 from set_01
      await removeTrackFromSet('set_01', 'item_01_3');

      const setAfter = await db.sets.get('set_01');
      expect(setAfter?.items.some((item) => item.id === 'item_01_3')).toBe(false);

      // Transitions trans_01_2 (to item_01_3) and trans_01_3 (from item_01_3) removed
      const transitionsAfter = await db.transitions.where('setId').equals('set_01').toArray();
      const transitionIds = transitionsAfter.map((t) => t.id);
      expect(transitionIds).not.toContain('trans_01_2');
      expect(transitionIds).not.toContain('trans_01_3');
      expect(transitionIds).toContain('trans_01_1');
    });

    it('isolates occurrence removal when duplicate tracks exist in set', async () => {
      // set_02 has trk_08 twice: item_02_2 and item_02_6
      const setBefore = await db.sets.get('set_02');
      expect(setBefore?.items).toHaveLength(9);

      await removeTrackFromSet('set_02', 'item_02_2');

      const setAfter = await db.sets.get('set_02');
      expect(setAfter?.items).toHaveLength(8);
      expect(setAfter?.items.some((item) => item.id === 'item_02_2')).toBe(false);
      expect(setAfter?.items.some((item) => item.id === 'item_02_6')).toBe(true);
    });
  });

  describe('savePracticeSession', () => {
    it('saves practice session and updates transition stats and ratings', async () => {
      const transBefore = await db.transitions.get('trans_01_1');
      expect(transBefore?.practicedCount).toBe(3);
      expect(transBefore?.rating).toBe(4);

      const session: PracticeSession = {
        id: 'session_test_1',
        setId: 'set_01',
        startedAt: '2026-08-03T10:00:00.000Z',
        completedAt: '2026-08-03T10:20:00.000Z',
        durationSeconds: 1200,
        stepsCompleted: 1,
        totalSteps: 5,
        notes: 'Great practice session',
        logs: [
          {
            transitionId: 'trans_01_1',
            fromItemId: 'item_01_1',
            toItemId: 'item_01_2',
            rating: 5,
            notes: 'Nailed the EQ swap transition!',
            durationSeconds: 180,
          },
        ],
      };

      await savePracticeSession(session);

      // Session saved
      const savedSession = await db.practiceSessions.get('session_test_1');
      expect(savedSession).toEqual(session);

      // Transition updated
      const transAfter = await db.transitions.get('trans_01_1');
      expect(transAfter?.practicedCount).toBe(4);
      expect(transAfter?.rating).toBe(5);
      expect(transAfter?.notes).toBe('Nailed the EQ swap transition!');
      expect(transAfter?.lastPracticedAt).toBeDefined();
    });
  });
});
