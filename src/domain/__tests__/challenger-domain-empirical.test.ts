import { describe, it, expect } from 'vitest';
import { calculatePracticePriority, getPriorityTier } from '../scoring/practice-priority';
import { calculateSetMetrics } from '../sets/set-metrics';
import type { Track } from '../tracks/track';

describe('Challenger 2 Empirical Stress Tests — Practice Priority & Set Metrics', () => {

  describe('1. calculatePracticePriority Normalization & Extremes', () => {
    it('returns exact 100 priority for extreme max urgency (Diff=5, Rating=1, Count=0, Comp=0)', () => {
      const priority = calculatePracticePriority(
        { difficulty: 5, rating: 1, practicedCount: 0 },
        0
      );
      expect(priority).toBe(100);
      expect(getPriorityTier(priority).label).toBe('Critical');
    });

    it('returns exact 0 priority for extreme min urgency (Diff=1, Rating=5, Count=5, Comp=100)', () => {
      const priority = calculatePracticePriority(
        { difficulty: 1, rating: 5, practicedCount: 5 },
        100
      );
      expect(priority).toBe(0);
      expect(getPriorityTier(priority).label).toBe('Low');
    });

    it('handles count > 5 identically to count = 5 (capped practice count)', () => {
      const priority5 = calculatePracticePriority(
        { difficulty: 1, rating: 5, practicedCount: 5 },
        100
      );
      const priority100 = calculatePracticePriority(
        { difficulty: 1, rating: 5, practicedCount: 100 },
        100
      );
      expect(priority100).toBe(0);
      expect(priority100).toBe(priority5);
    });

    it('handles unrated transitions (rating undefined or null) using default ratingNorm=0.5', () => {
      const priorityUndefined = calculatePracticePriority(
        { difficulty: 5, rating: undefined, practicedCount: 0 },
        0
      ); // Diff=35, Rating=15 (30*0.5), Count=20, Comp=15 => total = 85
      expect(priorityUndefined).toBe(85);

      const priorityNull = calculatePracticePriority(
        { difficulty: 5, rating: null as unknown as undefined, practicedCount: 0 },
        0
      );
      expect(priorityNull).toBe(85);
    });

    it('clamps out-of-bounds difficulty values (< 1 or > 5)', () => {
      const priorityOverMax = calculatePracticePriority(
        { difficulty: 99, rating: 1, practicedCount: 0 },
        0
      );
      expect(priorityOverMax).toBe(100);

      const priorityUnderMin = calculatePracticePriority(
        { difficulty: -10, rating: 5, practicedCount: 5 },
        100
      );
      expect(priorityUnderMin).toBe(0);
    });

    it('clamps out-of-bounds rating values (< 1 or > 5)', () => {
      const priorityRatingHigh = calculatePracticePriority(
        { difficulty: 1, rating: 10, practicedCount: 5 },
        100
      );
      expect(priorityRatingHigh).toBe(0);

      const priorityRatingLow = calculatePracticePriority(
        { difficulty: 5, rating: -5, practicedCount: 0 },
        0
      );
      expect(priorityRatingLow).toBe(100);
    });

    it('clamps out-of-bounds practicedCount (< 0)', () => {
      const priorityNegCount = calculatePracticePriority(
        { difficulty: 5, rating: 1, practicedCount: -5 },
        0
      );
      expect(priorityNegCount).toBe(100);
    });

    it('clamps out-of-bounds compatibilityScore (< 0 or > 100)', () => {
      const priorityNegComp = calculatePracticePriority(
        { difficulty: 5, rating: 1, practicedCount: 0 },
        -50
      );
      expect(priorityNegComp).toBe(100);

      const priorityHighComp = calculatePracticePriority(
        { difficulty: 1, rating: 5, practicedCount: 5 },
        150
      );
      expect(priorityHighComp).toBe(0);
    });

    it('maintains strict 0-100 bounds across a 1,000-point randomized parameter sweep', () => {
      for (let i = 0; i < 1000; i++) {
        const diff = Math.random() * 10 - 2; // -2 to 8
        const rating = Math.random() < 0.1 ? undefined : Math.random() * 10 - 2;
        const count = Math.floor(Math.random() * 20 - 5); // -5 to 15
        const comp = Math.random() * 200 - 50; // -50 to 150

        const res = calculatePracticePriority({ difficulty: diff, rating, practicedCount: count }, comp);

        expect(res).toBeGreaterThanOrEqual(0);
        expect(res).toBeLessThanOrEqual(100);
        expect(Number.isInteger(res)).toBe(true);
      }
    });

    it('maps tier boundaries accurately (0, 24, 25, 49, 50, 74, 75, 100)', () => {
      expect(getPriorityTier(0).label).toBe('Low');
      expect(getPriorityTier(24).label).toBe('Low');
      expect(getPriorityTier(25).label).toBe('Medium');
      expect(getPriorityTier(49).label).toBe('Medium');
      expect(getPriorityTier(50).label).toBe('High');
      expect(getPriorityTier(74).label).toBe('High');
      expect(getPriorityTier(75).label).toBe('Critical');
      expect(getPriorityTier(100).label).toBe('Critical');
    });
  });

  describe('2. calculateSetMetrics Track Count & Overlap Math', () => {
    const createTrack = (id: string, durationSeconds: number, bpm = 124, energy = 6): Track => ({
      id,
      title: `Track ${id}`,
      artist: 'Artist',
      genre: 'Tech House',
      bpm,
      camelotKey: '8A',
      energy,
      durationSeconds,
      vocalType: 'instrumental',
      familiarity: 'reliable',
      createdAt: '',
      updatedAt: '',
    });

    it('returns baseline zero metrics for 0 tracks', () => {
      const metrics = calculateSetMetrics([], 'build-to-peak', 45);
      expect(metrics.totalTracks).toBe(0);
      expect(metrics.rawDurationSeconds).toBe(0);
      expect(metrics.mixedDurationSeconds).toBe(0);
      expect(metrics.averageScore).toBe(100);
      expect(metrics.lowestScore).toEqual({ score: 100, fromIndex: -1, toIndex: -1 });
      expect(metrics.startBpm).toBe(0);
      expect(metrics.endBpm).toBe(0);
      expect(metrics.startEnergy).toBe(0);
      expect(metrics.endEnergy).toBe(0);
      expect(metrics.peakEnergy).toBe(0);
      expect(metrics.warningCount).toBe(0);
      expect(metrics.transitions).toEqual([]);
    });

    it('calculates 1 track metrics where mixedDuration equals rawDuration (no overlap subtracted)', () => {
      const track = createTrack('t1', 320, 126, 7);
      const metrics = calculateSetMetrics([track], 'build-to-peak', 45);

      expect(metrics.totalTracks).toBe(1);
      expect(metrics.rawDurationSeconds).toBe(320);
      expect(metrics.mixedDurationSeconds).toBe(320);
      expect(metrics.mixedDurationSeconds).toBe(metrics.rawDurationSeconds);
      expect(metrics.startBpm).toBe(126);
      expect(metrics.endBpm).toBe(126);
      expect(metrics.startEnergy).toBe(7);
      expect(metrics.endEnergy).toBe(7);
      expect(metrics.peakEnergy).toBe(7);
      expect(metrics.transitions).toEqual([]);
      expect(metrics.warningCount).toBe(0);
    });

    it('calculates multiple tracks (2 tracks) subtracting 1x overlap (45s)', () => {
      const t1 = createTrack('t1', 300);
      const t2 = createTrack('t2', 240);
      const metrics = calculateSetMetrics([t1, t2], 'build-to-peak', 45);

      expect(metrics.totalTracks).toBe(2);
      expect(metrics.rawDurationSeconds).toBe(540); // 300 + 240
      expect(metrics.mixedDurationSeconds).toBe(495); // 540 - 45
    });

    it('calculates N tracks subtracting (N - 1) * overlapSeconds', () => {
      const tracks = [
        createTrack('t1', 300),
        createTrack('t2', 240),
        createTrack('t3', 360),
        createTrack('t4', 180),
        createTrack('t5', 420),
      ]; // N = 5 tracks. Overlaps = 4.
      const overlap = 45;
      const metrics = calculateSetMetrics(tracks, 'build-to-peak', overlap);

      const expectedRaw = 300 + 240 + 360 + 180 + 420; // 1500
      const expectedMixed = expectedRaw - (4 * overlap); // 1500 - 180 = 1320

      expect(metrics.totalTracks).toBe(5);
      expect(metrics.rawDurationSeconds).toBe(expectedRaw);
      expect(metrics.mixedDurationSeconds).toBe(expectedMixed);
    });

    it('handles zero overlap (0s) correctly', () => {
      const tracks = [createTrack('t1', 200), createTrack('t2', 200)];
      const metrics = calculateSetMetrics(tracks, 'build-to-peak', 0);

      expect(metrics.rawDurationSeconds).toBe(400);
      expect(metrics.mixedDurationSeconds).toBe(400);
    });

    it('clamps mixedDurationSeconds to 0 when overlap exceeds raw duration', () => {
      const shortTracks = [createTrack('t1', 15), createTrack('t2', 15)]; // raw = 30s
      const metrics = calculateSetMetrics(shortTracks, 'build-to-peak', 45); // overlap 45s > 30s

      expect(metrics.rawDurationSeconds).toBe(30);
      expect(metrics.mixedDurationSeconds).toBe(0); // clamped at 0
    });

    it('correctly tracks peak energy across varied track energy levels', () => {
      const tracks = [
        createTrack('t1', 200, 120, 3),
        createTrack('t2', 200, 124, 9),
        createTrack('t3', 200, 128, 5),
      ];
      const metrics = calculateSetMetrics(tracks, 'build-to-peak', 45);

      expect(metrics.startEnergy).toBe(3);
      expect(metrics.endEnergy).toBe(5);
      expect(metrics.peakEnergy).toBe(9);
    });

    it('correctly counts warnings for transitions scoring below 60', () => {
      const t1 = createTrack('t1', 300, 120, 5); // Instrumental, 120 BPM, 8A
      const t2 = createTrack('t2', 300, 135, 9); // +15 BPM diff (score 15), energy jump (score 40)
      (t1 as Track).vocalType = 'vocal';
      (t2 as Track).vocalType = 'vocal'; // vocal to vocal (vocal score 45)

      const metrics = calculateSetMetrics([t1, t2], 'build-to-peak', 45);
      expect(metrics.warningCount).toBe(1);
      expect(metrics.lowestScore.score).toBeLessThan(60);
      expect(metrics.lowestScore.fromIndex).toBe(0);
      expect(metrics.lowestScore.toIndex).toBe(1);
    });

    it('sweeps 100 set metric configurations ensuring duration consistency', () => {
      for (let n = 1; n <= 100; n++) {
        const count = Math.floor(Math.random() * 10); // 0 to 9 tracks
        const trackList = Array.from({ length: count }, (_, i) =>
          createTrack(`t${i}`, Math.floor(Math.random() * 300) + 60)
        );
        const overlap = Math.floor(Math.random() * 60);

        const metrics = calculateSetMetrics(trackList, 'steady-groove', overlap);

        expect(metrics.totalTracks).toBe(count);
        if (count === 0) {
          expect(metrics.rawDurationSeconds).toBe(0);
          expect(metrics.mixedDurationSeconds).toBe(0);
        } else if (count === 1) {
          expect(metrics.mixedDurationSeconds).toBe(metrics.rawDurationSeconds);
        } else {
          const expectedMixed = Math.max(0, metrics.rawDurationSeconds - overlap * (count - 1));
          expect(metrics.mixedDurationSeconds).toBe(expectedMixed);
        }
      }
    });
  });
});
