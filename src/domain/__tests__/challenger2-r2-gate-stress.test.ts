import { describe, it, expect } from 'vitest';
import {
  calculatePracticePriority,
  getPriorityTier,
} from '../scoring/practice-priority';
import { calculateSetMetrics } from '../sets/set-metrics';
import { scoreVocal } from '../transitions/vocal-scoring';
import { scoreTransition } from '../transitions/overall-scoring';
import type { Track, VocalType } from '../tracks/track';

describe('Challenger 2 R2 Gate — Practice Priority Empirical Stress Suite', () => {
  it('1.1 Min/Max Weight Invariants: verified exact range bounds [0, 100]', () => {
    // Minimum priority: Diff 1, Rating 5, Count 5, Comp 100 -> 0
    const minPriority = calculatePracticePriority(
      { difficulty: 1, rating: 5, practicedCount: 5 },
      100
    );
    expect(minPriority).toBe(0);

    // Maximum priority: Diff 5, Rating 1, Count 0, Comp 0 -> 100
    const maxPriority = calculatePracticePriority(
      { difficulty: 5, rating: 1, practicedCount: 0 },
      0
    );
    expect(maxPriority).toBe(100);
  });

  it('1.2 Fractional Inputs Precision & Half-way Rounding', () => {
    // diff=3.5 -> norm (3.5-1)/4 = 2.5/4 = 0.625 * 35 = 21.875
    // rating=2.5 -> norm (5-2.5)/4 = 2.5/4 = 0.625 * 30 = 18.75
    // count=2.5 -> norm 1 - 2.5/5 = 0.5 * 20 = 10
    // comp=75 -> norm 1 - 75/100 = 0.25 * 15 = 3.75
    // raw sum = 21.875 + 18.75 + 10 + 3.75 = 54.375 -> rounded = 54
    const fractional = calculatePracticePriority(
      { difficulty: 3.5, rating: 2.5, practicedCount: 2.5 },
      75
    );
    expect(fractional).toBe(54);
  });

  it('1.3 Extreme Out-of-Bounds Clamping Check', () => {
    const extremeLow = calculatePracticePriority(
      { difficulty: -100, rating: -50, practicedCount: -20 },
      -200
    );
    // difficulty -100 clamped to 1 -> 0
    // rating -50 clamped to 1 -> (5-1)/4 = 1 * 30 = 30
    // count -20 clamped to 0 -> (1 - 0) * 20 = 20
    // comp -200 clamped to 0 -> (1 - 0) * 15 = 15
    // total = 30 + 20 + 15 = 65
    expect(extremeLow).toBe(65);

    const extremeHigh = calculatePracticePriority(
      { difficulty: 100, rating: 50, practicedCount: 1000 },
      500
    );
    // difficulty 100 clamped to 5 -> 35
    // rating 50 clamped to 5 -> 0
    // count 1000 clamped to 5 -> 0
    // comp 500 clamped to 100 -> 0
    // total = 35
    expect(extremeHigh).toBe(35);
  });

  it('1.4 Unrated vs Explicit Rating Differential Analysis', () => {
    // Unrated (undefined or null) defaults ratingNorm to 0.5 (15 pts)
    const unrated = calculatePracticePriority(
      { difficulty: 3, practicedCount: 2 },
      80
    );
    expect(unrated).toBe(48);

    // Rating 1 gives max urgency for rating (30 pts) -> score increases by 15 pts
    const rating1 = calculatePracticePriority(
      { difficulty: 3, rating: 1, practicedCount: 2 },
      80
    );
    expect(rating1).toBe(63);

    // Rating 5 gives zero urgency for rating (0 pts) -> score decreases by 15 pts
    const rating5 = calculatePracticePriority(
      { difficulty: 3, rating: 5, practicedCount: 2 },
      80
    );
    expect(rating5).toBe(33);
  });

  it('1.5 NaN / Infinity Boundary Safety & Tier Resilience', () => {
    const nanScore = calculatePracticePriority(
      { difficulty: NaN, rating: 3, practicedCount: 0 },
      100
    );
    expect(Number.isNaN(nanScore)).toBe(true);
    expect(getPriorityTier(nanScore).label).toBe('Low');

    const infScore = calculatePracticePriority(
      { difficulty: Infinity, rating: 3, practicedCount: 0 },
      100
    );
    // Math.min(5, Infinity) = 5 -> diffNorm = 1 * 35 = 35
    expect(infScore).toBe(70);
  });

  it('1.6 Priority Tier Threshold Matrix Sweep', () => {
    expect(getPriorityTier(-10).label).toBe('Low');
    expect(getPriorityTier(0).label).toBe('Low');
    expect(getPriorityTier(24).label).toBe('Low');
    expect(getPriorityTier(25).label).toBe('Medium');
    expect(getPriorityTier(49).label).toBe('Medium');
    expect(getPriorityTier(50).label).toBe('High');
    expect(getPriorityTier(74).label).toBe('High');
    expect(getPriorityTier(75).label).toBe('Critical');
    expect(getPriorityTier(100).label).toBe('Critical');
    expect(getPriorityTier(150).label).toBe('Critical');
  });
});

describe('Challenger 2 R2 Gate — Set Metrics Empirical Stress Suite', () => {
  const createMockTrack = (id: string, bpm: number, energy: number, duration: number): Track => ({
    id,
    title: `Track ${id}`,
    artist: 'Artist',
    genre: 'House',
    bpm,
    camelotKey: '8A',
    energy,
    vocalType: 'instrumental',
    familiarity: 'reliable',
    durationSeconds: duration,
  });

  it('2.1 Empty Set Contract Check', () => {
    const metrics = calculateSetMetrics([], 'build-to-peak');
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

  it('2.2 Single Track Set Contract Check with Arbitrary Overlap', () => {
    const track = createMockTrack('1', 124, 7, 300);
    const metrics = calculateSetMetrics([track], 'build-to-peak', 90);
    expect(metrics.totalTracks).toBe(1);
    expect(metrics.rawDurationSeconds).toBe(300);
    expect(metrics.mixedDurationSeconds).toBe(300); // Overlap ignored for single track
    expect(metrics.startBpm).toBe(124);
    expect(metrics.endBpm).toBe(124);
    expect(metrics.startEnergy).toBe(7);
    expect(metrics.endEnergy).toBe(7);
    expect(metrics.peakEnergy).toBe(7);
    expect(metrics.lowestScore).toEqual({ score: 100, fromIndex: -1, toIndex: -1 });
  });

  it('2.3 Overlap Mechanics & Negative Overlap Behavior', () => {
    const t1 = createMockTrack('1', 120, 5, 200);
    const t2 = createMockTrack('2', 120, 5, 200);

    // Default 45s overlap: 400 - 45 = 355
    const normal = calculateSetMetrics([t1, t2], 'build-to-peak', 45);
    expect(normal.mixedDurationSeconds).toBe(355);

    // Negative overlap (-30s gap): 400 - (-30) = 430
    const negativeOverlap = calculateSetMetrics([t1, t2], 'build-to-peak', -30);
    expect(negativeOverlap.mixedDurationSeconds).toBe(430);

    // Extreme positive overlap (500s > total raw duration 400s): clamped to 0
    const extremeOverlap = calculateSetMetrics([t1, t2], 'build-to-peak', 500);
    expect(extremeOverlap.mixedDurationSeconds).toBe(0);
  });

  it('2.4 Tied Lowest Score Resolution Strategy', () => {
    // 4 tracks with identical 100-scoring transitions
    const t1 = createMockTrack('1', 120, 5, 180);
    const t2 = createMockTrack('2', 120, 5, 180);
    const t3 = createMockTrack('3', 120, 5, 180);
    const t4 = createMockTrack('4', 120, 5, 180);

    const metrics = calculateSetMetrics([t1, t2, t3, t4], 'build-to-peak');
    expect(metrics.transitions.length).toBe(3);
    expect(metrics.transitions.every((t) => t.overall === 100)).toBe(true);
    // Verifies first minimum index (0 -> index 0 to 1) is returned on ties
    expect(metrics.lowestScore).toEqual({ score: 100, fromIndex: 0, toIndex: 1 });
  });

  it('2.5 High-Scale Set Benchmark (1,000 Tracks)', () => {
    const tracks: Track[] = Array.from({ length: 1000 }, (_, i) =>
      createMockTrack(`${i + 1}`, 120 + (i % 10), 1 + (i % 10), 180)
    );

    const startTime = performance.now();
    const metrics = calculateSetMetrics(tracks, 'build-to-peak');
    const endTime = performance.now();

    expect(metrics.totalTracks).toBe(1000);
    expect(metrics.transitions.length).toBe(999);
    expect(endTime - startTime).toBeLessThan(500); // Execution completes under 500ms
  });
});

describe('Challenger 2 R2 Gate — Vocal Overlay Collision Empirical Stress Suite', () => {
  it('3.1 Full 3x3 Matrix Empirical Verification', () => {
    const matrix: Array<{ from: VocalType; to: VocalType; expectedScore: number; hasWarning: boolean }> = [
      { from: 'instrumental', to: 'instrumental', expectedScore: 100, hasWarning: false },
      { from: 'instrumental', to: 'light-vocal', expectedScore: 100, hasWarning: false },
      { from: 'instrumental', to: 'vocal', expectedScore: 85, hasWarning: false },
      { from: 'light-vocal', to: 'instrumental', expectedScore: 95, hasWarning: false },
      { from: 'light-vocal', to: 'light-vocal', expectedScore: 75, hasWarning: false },
      { from: 'light-vocal', to: 'vocal', expectedScore: 65, hasWarning: false },
      { from: 'vocal', to: 'instrumental', expectedScore: 90, hasWarning: false },
      { from: 'vocal', to: 'light-vocal', expectedScore: 70, hasWarning: false },
      { from: 'vocal', to: 'vocal', expectedScore: 45, hasWarning: true },
    ];

    for (const cell of matrix) {
      const res = scoreVocal(cell.from, cell.to);
      expect(res.score).toBe(cell.expectedScore);
      if (cell.hasWarning) {
        expect(res.warning).toBe(
          'Potential vocal overlap. Consider using an instrumental section, loop or faster handoff.'
        );
      } else {
        expect(res.warning).toBeUndefined();
      }
    }
  });

  it('3.2 Malformed / Unexpected Vocal Types Fallback to Vocal Penalty', () => {
    // Unknown input falls to default branch ('vocal')
    const invalidFrom = scoreVocal('acapella' as unknown as VocalType, 'vocal');
    expect(invalidFrom.score).toBe(45);
    expect(invalidFrom.warning).toBeDefined();

    const invalidTo = scoreVocal('vocal', null as unknown as VocalType);
    expect(invalidTo.score).toBe(45);
    expect(invalidTo.warning).toBeDefined();
  });

  it('3.3 Vocal Collision Overrides Recommendation Engine Rules', () => {
    const trackA: Track = {
      id: 'a',
      title: 'Track A',
      artist: 'Artist A',
      genre: 'Tech House',
      bpm: 124,
      camelotKey: '8A', // Perfect key match (100)
      energy: 5,
      vocalType: 'vocal', // Full vocal
      familiarity: 'reliable',
      durationSeconds: 300,
    };

    const trackB: Track = {
      id: 'b',
      title: 'Track B',
      artist: 'Artist B',
      genre: 'Tech House',
      bpm: 124, // Perfect BPM match (100)
      camelotKey: '8A',
      energy: 5,
      vocalType: 'vocal', // Full vocal -> Collision!
      familiarity: 'reliable',
      durationSeconds: 300,
    };

    const analysis = scoreTransition(trackA, trackB, 'build-to-peak');
    // Even though BPM = 100 and Harmonic = 100 (normally triggering "Use a long 16- or 32-bar blend"),
    // Vocal warning rule MUST override Rule 2 and return vocal advice.
    expect(analysis.vocal.score).toBe(45);
    expect(analysis.vocal.warning).toBeDefined();
    expect(analysis.recommendation).toBe(
      'Avoid overlapping vocal phrases. Use a short handoff or loop an instrumental section.'
    );
  });
});
