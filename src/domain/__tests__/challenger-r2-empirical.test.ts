import { describe, it, expect } from 'vitest';
import { scoreBpm } from '../transitions/bpm-scoring';
import { scoreHarmonic } from '../transitions/harmonic-scoring';
import { scoreEnergy } from '../transitions/energy-scoring';
import { scoreTransition, getScoreLabel } from '../transitions/overall-scoring';
import type { EnergyProfile } from '../sets/set';

describe('Challenger Empirical R2 — scoreBpm Edge Cases & Stress Harness', () => {
  it('1.1 Half-time BPM transitions (60 vs 120)', () => {
    const res = scoreBpm(60, 120);
    expect(res.score).toBe(100);
    expect(res.diff).toBe(0);
    expect(res.isHalfDouble).toBe(true);
    expect(res.percentDiff).toBe(0);
  });

  it('1.2 Double-time BPM transitions (130 vs 65)', () => {
    const res = scoreBpm(130, 65);
    expect(res.score).toBe(100);
    expect(res.diff).toBe(0);
    expect(res.isHalfDouble).toBe(true);
    expect(res.percentDiff).toBe(0);
  });

  it('1.3 Float BPMs (122.5 vs 123.5 -> diff 1.0 -> score 100)', () => {
    const res = scoreBpm(122.5, 123.5);
    expect(res.score).toBe(100);
    expect(res.diff).toBe(1);
    expect(res.isHalfDouble).toBe(false);
  });

  it('1.4 Float BPMs with fractional diffs (122.5 vs 123.6 -> diff 1.1 -> score 90)', () => {
    const res = scoreBpm(122.5, 123.6);
    expect(res.score).toBe(90);
    expect(res.diff).toBe(1.1);
    expect(res.isHalfDouble).toBe(false);
  });

  it('1.5 Float BPMs with half-time (122.5 vs 61.25 -> diff 0 -> score 100)', () => {
    const res = scoreBpm(122.5, 61.25);
    expect(res.score).toBe(100);
    expect(res.diff).toBe(0);
    expect(res.isHalfDouble).toBe(true);
  });

  it('1.6 Float BPMs with double-time (122.5 vs 245 -> diff 0 -> score 100)', () => {
    const res = scoreBpm(122.5, 245);
    expect(res.score).toBe(100);
    expect(res.diff).toBe(0);
    expect(res.isHalfDouble).toBe(true);
  });

  it('1.7 Threshold boundary checks for scoreBpm diffs', () => {
    expect(scoreBpm(120, 120.99).score).toBe(100);
    expect(scoreBpm(120, 121.00).score).toBe(100);
    expect(scoreBpm(120, 121.01).score).toBe(90);
    expect(scoreBpm(120, 122.00).score).toBe(90);
    expect(scoreBpm(120, 122.01).score).toBe(75);
    expect(scoreBpm(120, 124.00).score).toBe(75);
    expect(scoreBpm(120, 124.01).score).toBe(55);
    expect(scoreBpm(120, 126.00).score).toBe(55);
    expect(scoreBpm(120, 126.01).score).toBe(35);
    expect(scoreBpm(120, 128.00).score).toBe(35);
    expect(scoreBpm(120, 128.01).score).toBe(15);
  });

  it('1.8 Zero and negative BPM inputs', () => {
    expect(scoreBpm(0, 120)).toEqual({ score: 15, diff: 120, percentDiff: 0, isHalfDouble: false });
    expect(scoreBpm(120, 0)).toEqual({ score: 15, diff: 120, percentDiff: 0, isHalfDouble: false });
    expect(scoreBpm(-120, 120)).toEqual({ score: 15, diff: 240, percentDiff: 0, isHalfDouble: false });
    expect(scoreBpm(-100, -100)).toEqual({ score: 15, diff: 0, percentDiff: 0, isHalfDouble: false });
  });

  it('1.9 Probing effectiveDiff halving anomaly (120 vs 244 vs 120 vs 124)', () => {
    // 120 to 124: rawDiff = 4 -> score = 75
    const sameSpeed = scoreBpm(120, 124);
    expect(sameSpeed.score).toBe(75);
    expect(sameSpeed.diff).toBe(4);

    // 120 to 244: double speed, target is 240. 244 vs 240 is 4 BPM off!
    // But scoreBpm selects halfDiff2 (|120 - 122| = 2) instead of doubleDiff1 (|240 - 244| = 4)
    const doubleSpeed = scoreBpm(120, 244);
    expect(doubleSpeed.isHalfDouble).toBe(true);
    expect(doubleSpeed.diff).toBe(2); // Asymmetry: diff reported as 2 instead of 4
    expect(doubleSpeed.score).toBe(90); // Gets score 90 (better than 75!) due to halved effectiveDiff
  });
});

describe('Challenger Empirical R2 — scoreHarmonic Wraparound & Edge Cases', () => {
  it('2.1 Wraparound distance = 1 for 12A vs 1A', () => {
    const res1 = scoreHarmonic('12A', '1A');
    expect(res1.score).toBe(90);
    expect(res1.rule).toBe('Compatible adjacent key');

    const res2 = scoreHarmonic('1A', '12A');
    expect(res2.score).toBe(90);
    expect(res2.rule).toBe('Compatible adjacent key');
  });

  it('2.2 Wraparound distance = 1 for 12B vs 1B', () => {
    const res1 = scoreHarmonic('12B', '1B');
    expect(res1.score).toBe(90);
    expect(res1.rule).toBe('Compatible adjacent key');

    const res2 = scoreHarmonic('1B', '12B');
    expect(res2.score).toBe(90);
    expect(res2.rule).toBe('Compatible adjacent key');
  });

  it('2.3 Wraparound distance = 2 for 11B vs 1B and 12B vs 2B', () => {
    const res1 = scoreHarmonic('11B', '1B');
    expect(res1.score).toBe(65);
    expect(res1.rule).toBe('Moderate key jump');

    const res2 = scoreHarmonic('12B', '2B');
    expect(res2.score).toBe(65);
    expect(res2.rule).toBe('Moderate key jump');
  });

  it('2.4 Case insensitivity and whitespace handling', () => {
    expect(scoreHarmonic('12a', '1a').score).toBe(90);
    expect(scoreHarmonic(' 12A ', ' 1A ').score).toBe(90);
  });

  it('2.5 Same key matching (12A vs 12A, 1B vs 1B)', () => {
    expect(scoreHarmonic('12A', '12A').score).toBe(100);
    expect(scoreHarmonic('1B', '1B').score).toBe(100);
  });

  it('2.6 Relative major/minor switch (12A vs 12B)', () => {
    expect(scoreHarmonic('12A', '12B').score).toBe(85);
    expect(scoreHarmonic('1B', '1A').score).toBe(85);
  });

  it('2.7 Diagonal step on wheel (distance 1 with letter switch e.g. 12A vs 1B)', () => {
    // 12A to 1B is distance 1, but letter C switches A->B.
    // Currently falls into "Everything else" -> score 30
    const res = scoreHarmonic('12A', '1B');
    expect(res.score).toBe(30);
    expect(res.rule).toBe('Large harmonic jump');
  });

  it('2.8 Invalid key inputs return score 30 and rule Invalid key', () => {
    const invalidInputs = ['0A', '13A', '8C', 'XYZ', '', '12 A'];
    for (const key of invalidInputs) {
      expect(scoreHarmonic(key, '1A')).toEqual({
        score: 30,
        rule: 'Invalid key',
        description: 'Invalid Camelot key format',
      });
    }
  });
});

describe('Challenger Empirical R2 — scoreEnergy for All 4 Profiles', () => {

  describe('3.1 Profile: build-to-peak', () => {
    it('handles integer energy changes correctly', () => {
      expect(scoreEnergy(5, 5, 'build-to-peak').score).toBe(100); // change 0
      expect(scoreEnergy(5, 6, 'build-to-peak').score).toBe(100); // change +1
      expect(scoreEnergy(5, 7, 'build-to-peak').score).toBe(75);  // change +2
      expect(scoreEnergy(5, 8, 'build-to-peak').score).toBe(40);  // change +3
      expect(scoreEnergy(5, 10, 'build-to-peak').score).toBe(40); // change +5
      expect(scoreEnergy(5, 4, 'build-to-peak').score).toBe(70);  // change -1
      expect(scoreEnergy(5, 3, 'build-to-peak').score).toBe(30);  // change -2
      expect(scoreEnergy(5, 1, 'build-to-peak').score).toBe(30);  // change -4
    });

    it('correctly maps float energy values via rounding (e.g. +0.5 to +1, +1.5 to +2)', () => {
      // Small positive build of +0.5 (e.g. 5 to 5.5 -> rounds to 1)
      const resFloatSmall = scoreEnergy(5, 5.5, 'build-to-peak');
      expect(resFloatSmall.score).toBe(100);
      expect(resFloatSmall.label).toBe('Smooth progression');

      // Moderate build of +1.5 (5 to 6.5 -> rounds to 2)
      const resFloatMod = scoreEnergy(5, 6.5, 'build-to-peak');
      expect(resFloatMod.score).toBe(75);
      expect(resFloatMod.label).toBe('Moderate increase');
    });
  });

  describe('3.2 Profile: warm-up', () => {
    it('handles integer energy changes correctly', () => {
      expect(scoreEnergy(3, 3, 'warm-up').score).toBe(100); // change 0
      expect(scoreEnergy(3, 4, 'warm-up').score).toBe(100); // change +1
      expect(scoreEnergy(3, 5, 'warm-up').score).toBe(55);  // change +2
      expect(scoreEnergy(3, 6, 'warm-up').score).toBe(25);  // change +3
      expect(scoreEnergy(3, 9, 'warm-up').score).toBe(25);  // change +6
      expect(scoreEnergy(3, 2, 'warm-up').score).toBe(80);  // change -1
      expect(scoreEnergy(3, 1, 'warm-up').score).toBe(50);  // change -2
    });

    it('correctly maps float energy values in warm-up (e.g. +0.5 to +1)', () => {
      const resFloat = scoreEnergy(3, 3.5, 'warm-up');
      expect(resFloat.score).toBe(100);
      expect(resFloat.label).toBe('Gentle build');
    });
  });

  describe('3.3 Profile: steady-groove', () => {
    it('handles integer energy changes correctly', () => {
      expect(scoreEnergy(6, 6, 'steady-groove').score).toBe(100); // change 0
      expect(scoreEnergy(6, 7, 'steady-groove').score).toBe(100); // change +1
      expect(scoreEnergy(6, 5, 'steady-groove').score).toBe(100); // change -1
      expect(scoreEnergy(6, 8, 'steady-groove').score).toBe(55);  // change +2
      expect(scoreEnergy(6, 4, 'steady-groove').score).toBe(55);  // change -2
      expect(scoreEnergy(6, 9, 'steady-groove').score).toBe(25);  // change +3
      expect(scoreEnergy(6, 3, 'steady-groove').score).toBe(25);  // change -3
    });

    it('handles float energy changes within [-1, 1] range correctly', () => {
      const resWithinRange = scoreEnergy(6, 6.5, 'steady-groove');
      expect(resWithinRange.score).toBe(100); // 0.5 is within [-1, 1]
    });

    it('correctly maps float energy values outside [-1, 1] (e.g. 1.5 to 2)', () => {
      const resFloat = scoreEnergy(6, 7.5, 'steady-groove'); // change 1.5 -> rounds to 2
      expect(resFloat.score).toBe(55); // Math.abs(2) === 2 -> score 55
    });
  });

  describe('3.4 Profile: peak-time', () => {
    it('handles integer energy changes correctly', () => {
      expect(scoreEnergy(8, 8, 'peak-time').score).toBe(100); // change 0
      expect(scoreEnergy(8, 9, 'peak-time').score).toBe(90);  // change +1
      expect(scoreEnergy(7, 9, 'peak-time').score).toBe(70);  // change +2
      expect(scoreEnergy(6, 9, 'peak-time').score).toBe(45);  // change +3
      expect(scoreEnergy(5, 9, 'peak-time').score).toBe(45);  // change +4
      expect(scoreEnergy(8, 7, 'peak-time').score).toBe(75);  // change -1
      expect(scoreEnergy(8, 6, 'peak-time').score).toBe(40);  // change -2
      expect(scoreEnergy(8, 5, 'peak-time').score).toBe(20);  // change -3
      expect(scoreEnergy(8, 2, 'peak-time').score).toBe(20);  // change -6
    });

    it('correctly maps float energy values in peak-time (e.g. +0.5 to +1)', () => {
      const resFloat = scoreEnergy(8, 8.5, 'peak-time'); // change +0.5 -> rounds to +1
      expect(resFloat.score).toBe(90);
      expect(resFloat.label).toBe('Building intensity');
    });
  });

  describe('3.5 Unknown profile handling', () => {
    it('handles invalid profile gracefully', () => {
      const res = scoreEnergy(5, 6, 'invalid-profile' as unknown as EnergyProfile);
      expect(res.score).toBe(50);
      expect(res.label).toBe('Unknown profile');
    });
  });
});

describe('Challenger Empirical R2 — Overall Scoring Integration & Threshold Boundaries', () => {
  it('4.1 Verifies getScoreLabel score boundaries', () => {
    expect(getScoreLabel(100)).toBe('Smooth');
    expect(getScoreLabel(80)).toBe('Smooth');
    expect(getScoreLabel(79)).toBe('Acceptable');
    expect(getScoreLabel(60)).toBe('Acceptable');
    expect(getScoreLabel(59)).toBe('Watch');
    expect(getScoreLabel(40)).toBe('Watch');
    expect(getScoreLabel(39)).toBe('Risky');
    expect(getScoreLabel(0)).toBe('Risky');
  });

  it('4.2 Verifies transition score weights (40% BPM, 30% Key, 20% Energy, 10% Vocal)', () => {
    const track1 = {
      id: 't1', title: 'T1', artist: 'A1', genre: 'House', bpm: 120, camelotKey: '8A',
      energy: 5, durationSeconds: 300, vocalType: 'instrumental' as const, familiarity: 'reliable' as const
    };
    const track2 = {
      id: 't2', title: 'T2', artist: 'A2', genre: 'House', bpm: 120, camelotKey: '8A',
      energy: 5, durationSeconds: 300, vocalType: 'instrumental' as const, familiarity: 'reliable' as const
    };

    // Perfect match: 100*0.4 + 100*0.3 + 100*0.2 + 100*0.1 = 100
    const perfect = scoreTransition(track1, track2, 'build-to-peak');
    expect(perfect.overall).toBe(100);

    // Change key to distant 3B (score 30): 100*0.4 + 30*0.3 + 100*0.2 + 100*0.1 = 40 + 9 + 20 + 10 = 79
    const keyChange = scoreTransition(track1, { ...track2, camelotKey: '3B' }, 'build-to-peak');
    expect(keyChange.overall).toBe(79);
    expect(keyChange.scoreLabel).toBe('Acceptable');
  });
});
