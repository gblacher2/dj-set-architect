import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import type { Track } from '../../domain/tracks/track';
import type { DJSet } from '../../domain/sets/set';
import type { TransitionRecord } from '../../domain/transitions/transition';

describe('SetArchitectDB Schema & Indexes', () => {
  beforeEach(async () => {
    await db.tracks.clear();
    await db.sets.clear();
    await db.transitions.clear();
    await db.practiceSessions.clear();
    await db.userPreferences.clear();
  });

  it('stores and retrieves tracks with indexed fields', async () => {
    const track: Track = {
      id: 'trk_test1',
      title: 'Test Track',
      artist: 'Test Artist',
      genre: 'Tech House',
      bpm: 126,
      camelotKey: '8A',
      energy: 8,
      vocalType: 'light-vocal',
      familiarity: 'reliable',
      durationSeconds: 300,
      rating: 4,
      createdAt: '2026-08-01T00:00:00.000Z',
    };

    await db.tracks.add(track);

    const fetched = await db.tracks.get('trk_test1');
    expect(fetched).toEqual(track);

    // Test querying by indexed field
    const byKey = await db.tracks.where('camelotKey').equals('8A').toArray();
    expect(byKey).toHaveLength(1);
    expect(byKey[0].id).toBe('trk_test1');

    const byBpm = await db.tracks.where('bpm').between(120, 130).toArray();
    expect(byBpm).toHaveLength(1);
  });

  it('queries sets containing a trackId', async () => {
    const set1: DJSet = {
      id: 'set_1',
      name: 'Set 1',
      targetDurationMinutes: 30,
      energyProfile: 'build-to-peak',
      items: [
        { id: 'item_1_1', trackId: 'trk_A' },
        { id: 'item_1_2', trackId: 'trk_B' },
      ],
    };

    const set2: DJSet = {
      id: 'set_2',
      name: 'Set 2',
      targetDurationMinutes: 45,
      energyProfile: 'warm-up',
      items: [
        { id: 'item_2_1', trackId: 'trk_B' },
        { id: 'item_2_2', trackId: 'trk_C' },
      ],
    };

    await db.sets.bulkAdd([set1, set2]);

    const setsWithTrkB = await db.sets.filter((s) => s.items.some((item) => item.trackId === 'trk_B')).toArray();
    expect(setsWithTrkB).toHaveLength(2);
    expect(setsWithTrkB.map((s) => s.id).sort()).toEqual(['set_1', 'set_2']);

    const setsWithTrkA = await db.sets.filter((s) => s.items.some((item) => item.trackId === 'trk_A')).toArray();
    expect(setsWithTrkA).toHaveLength(1);
    expect(setsWithTrkA[0].id).toBe('set_1');
  });

  it('queries transitions using compound indexes', async () => {
    const transition: TransitionRecord = {
      id: 'trans_1',
      setId: 'set_1',
      fromItemId: 'item_1_1',
      toItemId: 'item_1_2',
      transitionType: 'blend',
      difficulty: 3,
      rating: 4,
      practicedCount: 1,
    };

    await db.transitions.add(transition);

    // Compound lookup: [setId+fromItemId+toItemId]
    const exact = await db.transitions
      .where('[setId+fromItemId+toItemId]')
      .equals(['set_1', 'item_1_1', 'item_1_2'])
      .first();

    expect(exact).toBeDefined();
    expect(exact?.id).toBe('trans_1');

    // Compound lookup: [setId+fromItemId]
    const fromMatches = await db.transitions
      .where('[setId+fromItemId]')
      .equals(['set_1', 'item_1_1'])
      .toArray();

    expect(fromMatches).toHaveLength(1);

    // Compound lookup: [setId+toItemId]
    const toMatches = await db.transitions
      .where('[setId+toItemId]')
      .equals(['set_1', 'item_1_2'])
      .toArray();

    expect(toMatches).toHaveLength(1);
  });

  it('manages user preferences record', async () => {
    await db.userPreferences.put({
      id: 'default',
      defaultOverlapSeconds: 60,
      defaultEnergyProfile: 'peak-time',
      showAdvancedScoring: true,
      density: 'compact',
    });

    const prefs = await db.userPreferences.get('default');
    expect(prefs).toBeDefined();
    expect(prefs?.defaultOverlapSeconds).toBe(60);
    expect(prefs?.density).toBe('compact');
  });
});
