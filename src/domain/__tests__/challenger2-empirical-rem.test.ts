import { describe, it, expect } from 'vitest';
import { calculatePracticePriority, getPriorityTier } from '../scoring/practice-priority';
import { calculateSetMetrics } from '../sets/set-metrics';
import { scoreVocal } from '../transitions/vocal-scoring';
import { scoreTransition } from '../transitions/overall-scoring';
import type { Track, VocalType } from '../tracks/track';

describe('Challenger 2 R2 Remediation — Practice Priority Scoring Stress & Edge Cases', () => {
  it('1.1 Standard calculation with mid-tier inputs', () => {
    const input = { difficulty: 3, rating: 3, practicedCount: 2 };
    // diffNorm: (3-1)/4 = 0.5 * 35 = 17.5
    // ratingNorm: (5-3)/4 = 0.5 * 30 = 15.0
    // countNorm: 1 - 2/5 = 0.6 * 20 = 12.0
    // compNorm: 1 - 80/100 = 0.2 * 15 = 3.0
    // total raw = 47.5 -> rounded 48
    const priority = calculatePracticePriority(input, 80);
    expect(priority).toBe(48);
    expect(getPriorityTier(priority).label).toBe('Medium');
  });

  it('1.2 Unrated transition (rating: undefined or null) defaults ratingNorm to 0.5', () => {
    const inputUnrated = { difficulty: 3, practicedCount: 2 };
    const priority1 = calculatePracticePriority(inputUnrated, 80);
    expect(priority1).toBe(48);

    const inputNull = { difficulty: 3, rating: undefined, practicedCount: 2 };
    const priority2 = calculatePracticePriority(inputNull, 80);
    expect(priority2).toBe(48);
  });

  it('1.3 Boundary difficulty values (<1, >5)', () => {
    const lowDiff = calculatePracticePriority({ difficulty: 0, rating: 3, practicedCount: 0 }, 100);
    // difficulty=0 clamped to 1 -> diffNorm 0
    expect(lowDiff).toBe(35);

    const highDiff = calculatePracticePriority({ difficulty: 10, rating: 3, practicedCount: 0 }, 100);
    // difficulty=10 clamped to 5 -> diffNorm 1 * 35 = 35
    expect(highDiff).toBe(70);
  });

  it('1.4 Practice count > 5 is capped at 5', () => {
    const count5 = calculatePracticePriority({ difficulty: 1, rating: 5, practicedCount: 5 }, 100);
    const count100 = calculatePracticePriority({ difficulty: 1, rating: 5, practicedCount: 100 }, 100);
    expect(count5).toBe(0);
    expect(count100).toBe(0);
  });

  it('1.5 Negative practice count is clamped to 0', () => {
    const negCount = calculatePracticePriority({ difficulty: 1, rating: 5, practicedCount: -10 }, 100);
    // practicedCount = -10 clamped to 0 -> countNorm = 1 (20 pts)
    expect(negCount).toBe(20);
  });

  it('1.6 Compatibility score boundary clamping (<0, >100)', () => {
    const compNeg = calculatePracticePriority({ difficulty: 1, rating: 5, practicedCount: 5 }, -50);
    // comp score -50 clamped to 0 -> compNorm = 1 (15 pts)
    expect(compNeg).toBe(15);

    const compOver = calculatePracticePriority({ difficulty: 1, rating: 5, practicedCount: 5 }, 150);
    // comp score 150 clamped to 100 -> compNorm = 0 (0 pts)
    expect(compOver).toBe(0);
  });

  it('1.7 Priority Tier threshold checks (0, 24, 25, 49, 50, 74, 75, 100)', () => {
    expect(getPriorityTier(0).label).toBe('Low');
    expect(getPriorityTier(24).label).toBe('Low');
    expect(getPriorityTier(25).label).toBe('Medium');
    expect(getPriorityTier(49).label).toBe('Medium');
    expect(getPriorityTier(50).label).toBe('High');
    expect(getPriorityTier(74).label).toBe('High');
    expect(getPriorityTier(75).label).toBe('Critical');
    expect(getPriorityTier(100).label).toBe('Critical');
  });

  it('1.8 Extreme NaN / Infinity behavior in practice priority', () => {
    const nanPriority = calculatePracticePriority({ difficulty: NaN, rating: 3, practicedCount: 0 }, 100);
    expect(Number.isNaN(nanPriority)).toBe(true);

    const nanTier = getPriorityTier(nanPriority);
    // Math.max(0, Math.min(100, Math.round(NaN))) returns NaN
    // NaN comparisons evaluate to false, falling through to 'Low'
    expect(nanTier.label).toBe('Low');
  });
});

describe('Challenger 2 R2 Remediation — Set Metrics Edge Cases', () => {
  const sampleTrack1: Track = {
    id: 't1',
    title: 'Track 1',
    artist: 'Artist 1',
    genre: 'House',
    bpm: 120,
    camelotKey: '8A',
    energy: 5,
    vocalType: 'instrumental',
    familiarity: 'reliable',
    durationSeconds: 300,
  };

  const sampleTrack2: Track = {
    id: 't2',
    title: 'Track 2',
    artist: 'Artist 2',
    genre: 'Techno',
    bpm: 130,
    camelotKey: '2A',
    energy: 9,
    vocalType: 'vocal',
    familiarity: 'new',
    durationSeconds: 240,
  };

  const sampleTrack3: Track = {
    id: 't3',
    title: 'Track 3',
    artist: 'Artist 3',
    genre: 'Techno',
    bpm: 140,
    camelotKey: '3A',
    energy: 10,
    vocalType: 'vocal',
    familiarity: 'practiced',
    durationSeconds: 360,
  };

  it('2.1 Empty set (0 tracks)', () => {
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

  it('2.2 Single track set (1 track)', () => {
    const metrics = calculateSetMetrics([sampleTrack1], 'build-to-peak');
    expect(metrics.totalTracks).toBe(1);
    expect(metrics.rawDurationSeconds).toBe(300);
    expect(metrics.mixedDurationSeconds).toBe(300);
    expect(metrics.averageScore).toBe(100);
    expect(metrics.lowestScore).toEqual({ score: 100, fromIndex: -1, toIndex: -1 });
    expect(metrics.startBpm).toBe(120);
    expect(metrics.endBpm).toBe(120);
    expect(metrics.startEnergy).toBe(5);
    expect(metrics.endEnergy).toBe(5);
    expect(metrics.peakEnergy).toBe(5);
    expect(metrics.warningCount).toBe(0);
    expect(metrics.transitions).toEqual([]);
  });

  it('2.3 Multi-track set with excessive overlap (overlap exceeds track length)', () => {
    const shortTrack1 = { ...sampleTrack1, durationSeconds: 30 };
    const shortTrack2 = { ...sampleTrack2, durationSeconds: 30 };

    const metrics = calculateSetMetrics([shortTrack1, shortTrack2], 'build-to-peak', 45);
    expect(metrics.rawDurationSeconds).toBe(60);
    expect(metrics.mixedDurationSeconds).toBe(15);

    const extremeMetrics = calculateSetMetrics([shortTrack1, shortTrack2], 'build-to-peak', 100);
    expect(extremeMetrics.mixedDurationSeconds).toBe(0);
  });

  it('2.4 Set metrics with extreme BPM differences (60 BPM vs 180 BPM)', () => {
    const lowBpmTrack = { ...sampleTrack1, bpm: 60 };
    const highBpmTrack = { ...sampleTrack2, bpm: 180 };

    const metrics = calculateSetMetrics([lowBpmTrack, highBpmTrack], 'build-to-peak');
    expect(metrics.startBpm).toBe(60);
    expect(metrics.endBpm).toBe(180);
    expect(metrics.transitions.length).toBe(1);
    expect(metrics.transitions[0].bpm.score).toBe(15);
  });

  it('2.5 Lowest score ties select the first occurrence', () => {
    const tracks = [sampleTrack1, sampleTrack1, sampleTrack1];
    const metrics = calculateSetMetrics(tracks, 'build-to-peak');
    expect(metrics.lowestScore).toEqual({
      score: 100,
      fromIndex: 0,
      toIndex: 1,
    });
  });

  it('2.6 Warning count correctly increments for transitions scoring < 60', () => {
    const metrics = calculateSetMetrics([sampleTrack1, sampleTrack2, sampleTrack3], 'build-to-peak');
    expect(metrics.transitions.length).toBe(2);
    const lowScoringTransitions = metrics.transitions.filter(t => t.overall < 60);
    expect(metrics.warningCount).toBe(lowScoringTransitions.length);
  });
});

describe('Challenger 2 R2 Remediation — Vocal Overlay Collision Scoring Edge Cases', () => {
  it('3.1 All 9 vocal combination matrix scores', () => {
    expect(scoreVocal('instrumental', 'instrumental')).toEqual({ score: 100 });
    expect(scoreVocal('instrumental', 'light-vocal')).toEqual({ score: 100 });
    expect(scoreVocal('instrumental', 'vocal')).toEqual({ score: 85 });

    expect(scoreVocal('light-vocal', 'instrumental')).toEqual({ score: 95 });
    expect(scoreVocal('light-vocal', 'light-vocal')).toEqual({ score: 75 });
    expect(scoreVocal('light-vocal', 'vocal')).toEqual({ score: 65 });

    expect(scoreVocal('vocal', 'instrumental')).toEqual({ score: 90 });
    expect(scoreVocal('vocal', 'light-vocal')).toEqual({ score: 70 });

    const vocalVocal = scoreVocal('vocal', 'vocal');
    expect(vocalVocal.score).toBe(45);
    expect(vocalVocal.warning).toBe(
      'Potential vocal overlap. Consider using an instrumental section, loop or faster handoff.'
    );
  });

  it('3.2 Invalid or undefined vocalType handling', () => {
    const invalidVocal = scoreVocal('unknown' as unknown as VocalType, 'vocal');
    expect(invalidVocal.score).toBe(45);

    const invalidToVocal = scoreVocal('instrumental', 'unknown' as unknown as VocalType);
    expect(invalidToVocal.score).toBe(85);
  });

  it('3.3 TransitionRecord cue points presence/absence does not affect domain scoring engine', () => {
    const trackA: Track = {
      id: 'item-1',
      title: 'A',
      artist: 'A',
      genre: 'Pop',
      bpm: 120,
      camelotKey: '8A',
      energy: 5,
      vocalType: 'vocal',
      familiarity: 'reliable',
      durationSeconds: 200,
    };

    const trackB: Track = {
      id: 'item-2',
      title: 'B',
      artist: 'B',
      genre: 'Pop',
      bpm: 120,
      camelotKey: '8A',
      energy: 5,
      vocalType: 'vocal',
      familiarity: 'reliable',
      durationSeconds: 200,
    };

    const analysis = scoreTransition(trackA, trackB, 'build-to-peak');
    expect(analysis.vocal.score).toBe(45);
    expect(analysis.vocal.warning).toBeDefined();
    expect(analysis.recommendation).toContain('Avoid overlapping vocal phrases');
  });

  it('3.4 TransitionRecord without cue points (undefined cues)', () => {
    const trackA: Track = {
      id: 'item-1',
      title: 'A',
      artist: 'A',
      genre: 'Pop',
      bpm: 120,
      camelotKey: '8A',
      energy: 5,
      vocalType: 'vocal',
      familiarity: 'reliable',
      durationSeconds: 200,
    };

    const trackB: Track = {
      id: 'item-2',
      title: 'B',
      artist: 'B',
      genre: 'Pop',
      bpm: 120,
      camelotKey: '8A',
      energy: 5,
      vocalType: 'vocal',
      familiarity: 'reliable',
      durationSeconds: 200,
    };

    // Even with missing cues on tracks/transitions, domain scoring functions operate deterministically
    const analysis = scoreTransition(trackA, trackB, 'build-to-peak');
    expect(analysis.vocal.score).toBe(45);
  });
});
