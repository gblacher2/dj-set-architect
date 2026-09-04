import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { initSeedData } from '../seed';
import { SEED_TRACKS } from '../../seed/tracks';
import { SEED_SETS, SEED_TRANSITIONS } from '../../seed/sets';
import { TrackSchema } from '../../domain/tracks/track';
import { DJSetSchema } from '../../domain/sets/set';
import { TransitionRecordSchema } from '../../domain/transitions/transition';

describe('Seed Data & Auto-Seeding Logic', () => {
  beforeEach(async () => {
    await db.tracks.clear();
    await db.sets.clear();
    await db.transitions.clear();
    await db.userPreferences.clear();
  });

  it('validates all SEED_TRACKS against TrackSchema', () => {
    expect(SEED_TRACKS).toHaveLength(30);
    for (const track of SEED_TRACKS) {
      const result = TrackSchema.safeParse(track);
      expect(result.success, `Track ${track.id} failed schema validation`).toBe(true);
    }
  });

  it('validates SEED_TRACKS coverage of all 24 Camelot keys', () => {
    const keys = new Set(SEED_TRACKS.map((t) => t.camelotKey));
    expect(keys.size).toBe(24);
    for (let i = 1; i <= 12; i++) {
      expect(keys.has(`${i}A`), `Missing Camelot key ${i}A`).toBe(true);
      expect(keys.has(`${i}B`), `Missing Camelot key ${i}B`).toBe(true);
    }
  });

  it('validates SEED_SETS against DJSetSchema', () => {
    expect(SEED_SETS).toHaveLength(2);
    for (const set of SEED_SETS) {
      const result = DJSetSchema.safeParse(set);
      expect(result.success, `Set ${set.id} failed schema validation`).toBe(true);
    }
  });

  it('validates SEED_TRANSITIONS against TransitionRecordSchema', () => {
    expect(SEED_TRANSITIONS).toHaveLength(15);
    for (const transition of SEED_TRANSITIONS) {
      const result = TransitionRecordSchema.safeParse(transition);
      expect(result.success, `Transition ${transition.id} failed schema validation`).toBe(true);
    }
  });

  it('seeds data when DB is empty', async () => {
    const seeded = await initSeedData();
    expect(seeded).toBe(true);

    expect(await db.tracks.count()).toBe(30);
    expect(await db.sets.count()).toBe(2);
    expect(await db.transitions.count()).toBe(15);

    const userPrefs = await db.userPreferences.get('default');
    expect(userPrefs).toBeDefined();
    expect(userPrefs?.defaultEnergyProfile).toBe('build-to-peak');
  });

  it('is idempotent and does not overwrite existing DB on subsequent calls without force', async () => {
    await initSeedData();
    expect(await db.tracks.count()).toBe(30);

    // Call again without force
    const reseeded = await initSeedData();
    expect(reseeded).toBe(false);
    expect(await db.tracks.count()).toBe(30);
  });

  it('forces re-seeding when force=true', async () => {
    await initSeedData();

    // Add a custom track
    await db.tracks.add({
      id: 'trk_custom',
      title: 'Custom Track',
      artist: 'Custom Artist',
      genre: 'Techno',
      bpm: 130,
      camelotKey: '1A',
      energy: 8,
      vocalType: 'instrumental',
      familiarity: 'new',
      durationSeconds: 300,
    });
    expect(await db.tracks.count()).toBe(31);

    // Force reseed
    const forceReseeded = await initSeedData(true);
    expect(forceReseeded).toBe(true);
    expect(await db.tracks.count()).toBe(30);
    expect(await db.tracks.get('trk_custom')).toBeUndefined();
  });
});
