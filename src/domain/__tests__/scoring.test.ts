import { describe, it, expect } from 'vitest';
import { scoreBpm } from '../transitions/bpm-scoring';
import { scoreHarmonic } from '../transitions/harmonic-scoring';
import { scoreEnergy } from '../transitions/energy-scoring';
import { scoreVocal } from '../transitions/vocal-scoring';
import { scoreTransition, getScoreLabel } from '../transitions/overall-scoring';
import { calculateSetMetrics } from '../sets/set-metrics';
import { calculatePracticePriority, getPriorityTier } from '../scoring/practice-priority';
import { parseCamelotKey, getCamelotDistance, areCamelotCompatible, getCamelotColor } from '../tracks/camelot';
import { TrackSchema, type Track } from '../tracks/track';
import { DJSetSchema, SetTrackItemSchema } from '../sets/set';
import { TransitionRecordSchema } from '../transitions/transition';

describe('Camelot Utilities', () => {
  it('parses valid Camelot keys accurately', () => {
    expect(parseCamelotKey('8A')).toEqual({ number: 8, letter: 'A' });
    expect(parseCamelotKey('12B')).toEqual({ number: 12, letter: 'B' });
    expect(parseCamelotKey('1a')).toEqual({ number: 1, letter: 'A' });
  });

  it('throws on invalid Camelot key', () => {
    expect(() => parseCamelotKey('13A')).toThrow();
    expect(() => parseCamelotKey('XYZ')).toThrow();
  });

  it('calculates Camelot distance with 12<->1 wraparound', () => {
    expect(getCamelotDistance('12A', '1A')).toBe(1);
    expect(getCamelotDistance('1A', '12A')).toBe(1);
    expect(getCamelotDistance('11B', '1B')).toBe(2);
    expect(getCamelotDistance('8A', '8A')).toBe(0);
    expect(getCamelotDistance('6A', '12A')).toBe(6);
  });

  it('evaluates Camelot compatibility rules', () => {
    expect(areCamelotCompatible('8A', '8A')).toEqual({ compatible: true, rule: 'Same key' });
    expect(areCamelotCompatible('8A', '9A')).toEqual({ compatible: true, rule: 'Compatible adjacent key' });
    expect(areCamelotCompatible('8A', '8B')).toEqual({ compatible: true, rule: 'Relative major/minor' });
    expect(areCamelotCompatible('8A', '10A')).toEqual({ compatible: false, rule: 'Moderate key jump' });
    expect(areCamelotCompatible('8A', '3B')).toEqual({ compatible: false, rule: 'Large harmonic jump' });
  });

  it('returns contrast-compliant colors for Camelot keys', () => {
    const color8A = getCamelotColor('8A');
    expect(color8A.bg).toBe('#0F766E');
    expect(color8A.text).toBe('#FFFFFF');

    const color12B = getCamelotColor('12B');
    expect(color12B.bg).toBe('#A855F7');

    const invalidColor = getCamelotColor('INVALID');
    expect(invalidColor).toEqual({ bg: '#3E3E46', text: '#E8E8EC' });
  });
});

describe('BPM Scoring Engine', () => {
  it('scores exact BPM match as 100', () => {
    const res = scoreBpm(124, 124);
    expect(res.score).toBe(100);
    expect(res.diff).toBe(0);
    expect(res.isHalfDouble).toBe(false);
  });

  it('scores 1 BPM diff as 100', () => {
    expect(scoreBpm(124, 125).score).toBe(100);
  });

  it('scores 2 BPM diff as 90', () => {
    expect(scoreBpm(120, 122).score).toBe(90);
  });

  it('scores 4 BPM diff as 75', () => {
    expect(scoreBpm(120, 124).score).toBe(75);
  });

  it('scores 5 BPM diff as 55', () => {
    expect(scoreBpm(120, 125).score).toBe(55);
  });

  it('scores 8 BPM diff as 35', () => {
    expect(scoreBpm(120, 128).score).toBe(35);
  });

  it('scores 10 BPM diff as 15', () => {
    expect(scoreBpm(120, 130).score).toBe(15);
  });

  it('handles half-time BPM transition (60 vs 120)', () => {
    const res = scoreBpm(60, 120);
    expect(res.score).toBe(100);
    expect(res.isHalfDouble).toBe(true);
  });

  it('handles double-time BPM transition (130 vs 65)', () => {
    const res = scoreBpm(130, 65);
    expect(res.score).toBe(100);
    expect(res.isHalfDouble).toBe(true);
  });

  it('handles invalid BPM gracefully', () => {
    expect(scoreBpm(0, 120).score).toBe(15);
  });
});

describe('Harmonic Scoring Engine', () => {
  it('scores same Camelot key as 100', () => {
    expect(scoreHarmonic('8A', '8A').score).toBe(100);
  });

  it('scores adjacent key as 90', () => {
    expect(scoreHarmonic('8A', '9A').score).toBe(90);
  });

  it('handles 12 <-> 1 wraparound adjacent keys (12A to 1A)', () => {
    expect(scoreHarmonic('12A', '1A').score).toBe(90);
    expect(scoreHarmonic('1A', '12A').score).toBe(90);
  });

  it('scores relative major/minor mode switch (8A to 8B) as 85', () => {
    expect(scoreHarmonic('8A', '8B').score).toBe(85);
  });

  it('scores 2-step key jump (8A to 10A) as 65', () => {
    expect(scoreHarmonic('8A', '10A').score).toBe(65);
  });

  it('handles 12 <-> 1 wraparound 2-step jump (11B to 1B)', () => {
    expect(scoreHarmonic('11B', '1B').score).toBe(65);
  });

  it('scores distant key jump (8A to 3B) as 30', () => {
    expect(scoreHarmonic('8A', '3B').score).toBe(30);
  });

  it('handles invalid key format gracefully', () => {
    expect(scoreHarmonic('invalid', '8A').score).toBe(30);
  });
});

describe('Energy Scoring Engine', () => {
  it('scores build-to-peak profile correctly', () => {
    expect(scoreEnergy(5, 5, 'build-to-peak').score).toBe(100);
    expect(scoreEnergy(5, 6, 'build-to-peak').score).toBe(100);
    expect(scoreEnergy(5, 7, 'build-to-peak').score).toBe(75);
    expect(scoreEnergy(5, 8, 'build-to-peak').score).toBe(40);
    expect(scoreEnergy(5, 4, 'build-to-peak').score).toBe(70);
    expect(scoreEnergy(5, 3, 'build-to-peak').score).toBe(30);
  });

  it('scores warm-up profile correctly', () => {
    expect(scoreEnergy(3, 4, 'warm-up').score).toBe(100);
    expect(scoreEnergy(3, 5, 'warm-up').score).toBe(55);
    expect(scoreEnergy(3, 6, 'warm-up').score).toBe(25);
    expect(scoreEnergy(3, 2, 'warm-up').score).toBe(80);
    expect(scoreEnergy(3, 1, 'warm-up').score).toBe(50);
  });

  it('scores steady-groove profile correctly', () => {
    expect(scoreEnergy(6, 6, 'steady-groove').score).toBe(100);
    expect(scoreEnergy(6, 7, 'steady-groove').score).toBe(100);
    expect(scoreEnergy(6, 5, 'steady-groove').score).toBe(100);
    expect(scoreEnergy(6, 8, 'steady-groove').score).toBe(55);
    expect(scoreEnergy(6, 9, 'steady-groove').score).toBe(25);
  });

  it('scores peak-time profile correctly', () => {
    expect(scoreEnergy(8, 8, 'peak-time').score).toBe(100);
    expect(scoreEnergy(8, 9, 'peak-time').score).toBe(90);
    expect(scoreEnergy(7, 9, 'peak-time').score).toBe(70);
    expect(scoreEnergy(6, 9, 'peak-time').score).toBe(45);
    expect(scoreEnergy(8, 7, 'peak-time').score).toBe(75);
    expect(scoreEnergy(8, 6, 'peak-time').score).toBe(40);
    expect(scoreEnergy(8, 5, 'peak-time').score).toBe(20);
  });
});

describe('Vocal Scoring Engine', () => {
  it('scores instrumental to instrumental as 100', () => {
    expect(scoreVocal('instrumental', 'instrumental').score).toBe(100);
  });

  it('scores instrumental to vocal as 85', () => {
    expect(scoreVocal('instrumental', 'vocal').score).toBe(85);
  });

  it('scores light-vocal transitions correctly', () => {
    expect(scoreVocal('light-vocal', 'instrumental').score).toBe(95);
    expect(scoreVocal('light-vocal', 'light-vocal').score).toBe(75);
    expect(scoreVocal('light-vocal', 'vocal').score).toBe(65);
  });

  it('scores vocal to vocal as 45 with warning', () => {
    const res = scoreVocal('vocal', 'vocal');
    expect(res.score).toBe(45);
    expect(res.warning).toContain('vocal overlap');
  });
});

describe('Overall Transition Scoring & Recommendations', () => {
  const track1: Track = {
    id: 't1', title: 'Track 1', artist: 'Artist 1', genre: 'House', bpm: 124, camelotKey: '8A',
    energy: 6, durationSeconds: 300, vocalType: 'instrumental', familiarity: 'reliable',
    createdAt: '', updatedAt: ''
  };

  const track2: Track = {
    id: 't2', title: 'Track 2', artist: 'Artist 2', genre: 'House', bpm: 124, camelotKey: '8A',
    energy: 7, durationSeconds: 300, vocalType: 'instrumental', familiarity: 'reliable',
    createdAt: '', updatedAt: ''
  };

  it('calculates weighted overall score and label correctly', () => {
    const analysis = scoreTransition(track1, track2, 'build-to-peak');
    expect(analysis.overall).toBe(100);
    expect(analysis.scoreLabel).toBe('Smooth');
    expect(analysis.recommendation).toContain('16- or 32-bar blend');
  });

  it('assigns correct score labels for thresholds', () => {
    expect(getScoreLabel(85)).toBe('Smooth');
    expect(getScoreLabel(75)).toBe('Acceptable');
    expect(getScoreLabel(55)).toBe('Watch');
    expect(getScoreLabel(35)).toBe('Risky');
  });

  it('prioritizes vocal warnings in recommendations', () => {
    const vTrack1 = { ...track1, vocalType: 'vocal' as const };
    const vTrack2 = { ...track2, vocalType: 'vocal' as const };
    const analysis = scoreTransition(vTrack1, vTrack2, 'build-to-peak');
    expect(analysis.warnings).toHaveLength(1);
    expect(analysis.recommendation).toContain('Avoid overlapping vocal phrases');
  });

  it('recommends EQ-led transition for good BPM but low Key match', () => {
    const kTrack2 = { ...track2, camelotKey: '3B' }; // distant key
    const analysis = scoreTransition(track1, kTrack2, 'build-to-peak');
    expect(analysis.recommendation).toContain('EQ-led transition');
  });

  it('recommends energy jump management when energy change >= 3', () => {
    const eTrack2 = { ...track2, energy: 10, camelotKey: '10A', bpm: 124 };
    const analysis = scoreTransition(track1, eTrack2, 'build-to-peak');
    expect(analysis.recommendation).toContain('Delay the bass swap');
  });
});

describe('Set Metrics', () => {
  const tracks: Track[] = [
    { id: 't1', title: 'A', artist: 'A', genre: 'Tech', bpm: 120, camelotKey: '8A', energy: 5, durationSeconds: 300, vocalType: 'instrumental', familiarity: 'reliable' },
    { id: 't2', title: 'B', artist: 'B', genre: 'Tech', bpm: 122, camelotKey: '9A', energy: 6, durationSeconds: 240, vocalType: 'instrumental', familiarity: 'reliable' },
    { id: 't3', title: 'C', artist: 'C', genre: 'Tech', bpm: 124, camelotKey: '10A', energy: 8, durationSeconds: 360, vocalType: 'vocal', familiarity: 'reliable' },
  ];

  it('returns default metrics for empty tracks array', () => {
    const metrics = calculateSetMetrics([], 'build-to-peak');
    expect(metrics.totalTracks).toBe(0);
    expect(metrics.rawDurationSeconds).toBe(0);
    expect(metrics.mixedDurationSeconds).toBe(0);
    expect(metrics.averageScore).toBe(100);
  });

  it('calculates metrics for a single track set', () => {
    const metrics = calculateSetMetrics([tracks[0]], 'build-to-peak');
    expect(metrics.totalTracks).toBe(1);
    expect(metrics.rawDurationSeconds).toBe(300);
    expect(metrics.mixedDurationSeconds).toBe(300);
  });

  it('calculates metrics for a 3-track set with 45s overlap', () => {
    const metrics = calculateSetMetrics(tracks, 'build-to-peak', 45);
    expect(metrics.totalTracks).toBe(3);
    expect(metrics.rawDurationSeconds).toBe(900); // 300 + 240 + 360
    expect(metrics.mixedDurationSeconds).toBe(810); // 900 - (45 * 2)
    expect(metrics.startBpm).toBe(120);
    expect(metrics.endBpm).toBe(124);
    expect(metrics.startEnergy).toBe(5);
    expect(metrics.endEnergy).toBe(8);
    expect(metrics.peakEnergy).toBe(8);
  });
});

describe('Practice Priority Calculation', () => {
  it('calculates high priority for urgent transition', () => {
    const priority = calculatePracticePriority(
      { difficulty: 5, rating: 1, practicedCount: 0 },
      30
    );
    expect(priority).toBeGreaterThanOrEqual(75);
    expect(getPriorityTier(priority).label).toBe('Critical');
  });

  it('calculates low priority for well-practiced easy transition', () => {
    const priority = calculatePracticePriority(
      { difficulty: 1, rating: 5, practicedCount: 5 },
      95
    );
    expect(priority).toBeLessThan(25);
    expect(getPriorityTier(priority).label).toBe('Low');
  });

  it('handles unrated transitions gracefully', () => {
    const priority = calculatePracticePriority(
      { difficulty: 3, practicedCount: 1 },
      80
    );
    expect(priority).toBeGreaterThanOrEqual(0);
    expect(priority).toBeLessThanOrEqual(100);
  });

  it('maps priority score tiers to correct labels and color classes', () => {
    expect(getPriorityTier(80).label).toBe('Critical');
    expect(getPriorityTier(60).label).toBe('High');
    expect(getPriorityTier(35).label).toBe('Medium');
    expect(getPriorityTier(15).label).toBe('Low');
  });
});

describe('Zod Schemas Integrity', () => {
  it('validates a correct Track object', () => {
    const track = TrackSchema.parse({
      id: 'tr-1',
      title: 'Strobe',
      artist: 'deadmau5',
      genre: 'Progressive House',
      bpm: 128,
      camelotKey: '8A',
      energy: 7,
      vocalType: 'instrumental',
      familiarity: 'reliable',
      durationSeconds: 637,
    });
    expect(track.title).toBe('Strobe');
  });

  it('rejects invalid Track values', () => {
    expect(() => TrackSchema.parse({
      id: 'tr-1',
      title: 'Bad',
      artist: 'Test',
      genre: 'EDM',
      bpm: 240, // exceeds max 200
      camelotKey: '8A',
      energy: 7,
      vocalType: 'instrumental',
      familiarity: 'reliable',
      durationSeconds: 100,
    })).toThrow();
  });

  it('validates SetTrackItem and DJSet schemas', () => {
    const item = SetTrackItemSchema.parse({ id: 'occ-1', trackId: 'tr-1' });
    expect(item.id).toBe('occ-1');

    const setObj = DJSetSchema.parse({
      id: 'set-1',
      name: 'Peak Time Set',
      targetDurationMinutes: 60,
      energyProfile: 'peak-time',
      items: [item],
    });
    expect(setObj.energyProfile).toBe('peak-time');
  });

  it('validates TransitionRecord schema', () => {
    const record = TransitionRecordSchema.parse({
      id: 'trans-1',
      setId: 'set-1',
      fromItemId: 'occ-1',
      toItemId: 'occ-2',
      transitionType: 'bass-swap',
      difficulty: 3,
      practicedCount: 2,
    });
    expect(record.fromItemId).toBe('occ-1');
  });
});
