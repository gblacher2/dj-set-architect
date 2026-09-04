import { describe, it, expect } from 'vitest';
import { scoreBpm } from '../transitions/bpm-scoring';
import { parseCamelotKey, getCamelotDistance, areCamelotCompatible } from '../tracks/camelot';
import { scoreHarmonic } from '../transitions/harmonic-scoring';
import { scoreEnergy } from '../transitions/energy-scoring';
import { scoreVocal } from '../transitions/vocal-scoring';
import { scoreTransition, getScoreLabel } from '../transitions/overall-scoring';
import { calculatePracticePriority, getPriorityTier } from '../scoring/practice-priority';
import type { Track, VocalType } from '../tracks/track';
import type { EnergyProfile } from '../sets/set';

describe('Empirical Verification Harness — R2 Domain Scoring Logic', () => {

  // =========================================================================
  // 1. BPM Half/Double Time & Edge Cases
  // =========================================================================
  describe('1. BPM Half/Double Time & Boundary Safety', () => {
    it('accurately identifies exact half-time pairs (low -> high)', () => {
      const pairs = [
        [60, 120],
        [65, 130],
        [70, 140],
        [75, 150],
        [80, 160],
      ];
      for (const [from, to] of pairs) {
        const res = scoreBpm(from, to);
        expect(res.score).toBe(100);
        expect(res.isHalfDouble).toBe(true);
        expect(res.diff).toBe(0);
      }
    });

    it('accurately identifies exact double-time pairs (high -> low)', () => {
      const pairs = [
        [120, 60],
        [130, 65],
        [140, 70],
        [150, 75],
        [160, 80],
      ];
      for (const [from, to] of pairs) {
        const res = scoreBpm(from, to);
        expect(res.score).toBe(100);
        expect(res.isHalfDouble).toBe(true);
        expect(res.diff).toBe(0);
      }
    });

    it('handles near half/double time ratios within tolerance', () => {
      // 70 vs 141 -> halfDiff2 = |70 - 70.5| = 0.5 <= 1 -> score 100
      const res1 = scoreBpm(70, 141);
      expect(res1.score).toBe(100);
      expect(res1.isHalfDouble).toBe(true);
      expect(res1.diff).toBe(0.5);

      // 69 vs 140 -> halfDiff2 = |69 - 70| = 1 <= 1 -> score 100
      const res2 = scoreBpm(69, 140);
      expect(res2.score).toBe(100);
      expect(res2.isHalfDouble).toBe(true);
      expect(res2.diff).toBe(1);

      // 70 vs 145 -> halfDiff2 = |70 - 72.5| = 2.5 <= 4 -> score 75
      const res3 = scoreBpm(70, 145);
      expect(res3.score).toBe(75);
      expect(res3.isHalfDouble).toBe(true);
      expect(res3.diff).toBe(2.5);
    });

    it('evaluates standard BPM delta scoring buckets', () => {
      expect(scoreBpm(120, 120.5).score).toBe(100); // diff 0.5 <= 1
      expect(scoreBpm(120, 121.8).score).toBe(90);  // diff 1.8 <= 2
      expect(scoreBpm(120, 123.5).score).toBe(75);  // diff 3.5 <= 4
      expect(scoreBpm(120, 125.5).score).toBe(55);  // diff 5.5 <= 6
      expect(scoreBpm(120, 127.8).score).toBe(35);  // diff 7.8 <= 8
      expect(scoreBpm(120, 135.0).score).toBe(15);  // diff 15 > 8
    });

    it('safely handles zero and negative BPM values', () => {
      const badInputs = [[0, 120], [120, 0], [0, 0], [-120, 120], [120, -50]];
      for (const [f, t] of badInputs) {
        const res = scoreBpm(f, t);
        expect(res.score).toBe(15);
        expect(res.isHalfDouble).toBe(false);
        expect(Number.isNaN(res.diff)).toBe(false);
      }
    });

    it('handles floating point precision without producing NaN or Infinity', () => {
      const res = scoreBpm(124.33333, 124.66667);
      expect(res.score).toBe(100);
      expect(res.diff).toBe(0.33);
      expect(Number.isFinite(res.percentDiff)).toBe(true);
    });
  });

  // =========================================================================
  // 2. Camelot Key Wraparound & Harmonic Scoring
  // =========================================================================
  describe('2. Camelot Key Wraparound & Harmonic Compatibility', () => {
    it('verifies 12 <-> 1 wraparound for distance and scoring', () => {
      // 12A <-> 1A
      expect(getCamelotDistance('12A', '1A')).toBe(1);
      expect(getCamelotDistance('1A', '12A')).toBe(1);
      expect(scoreHarmonic('12A', '1A').score).toBe(90);
      expect(scoreHarmonic('1A', '12A').score).toBe(90);

      // 12B <-> 1B
      expect(getCamelotDistance('12B', '1B')).toBe(1);
      expect(getCamelotDistance('1B', '12B')).toBe(1);
      expect(scoreHarmonic('12B', '1B').score).toBe(90);
      expect(scoreHarmonic('1B', '12B').score).toBe(90);
    });

    it('verifies mode switch (8A <-> 8B, 1A <-> 1B, 12A <-> 12B)', () => {
      const modeSwitches = [
        ['8A', '8B'],
        ['1A', '1B'],
        ['12A', '12B'],
      ];
      for (const [k1, k2] of modeSwitches) {
        expect(scoreHarmonic(k1, k2).score).toBe(85);
        expect(scoreHarmonic(k1, k2).rule).toBe('Relative major/minor');
        expect(areCamelotCompatible(k1, k2).compatible).toBe(true);
      }
    });

    it('verifies 2-step jump wraparound (11A <-> 1A, 12B <-> 2B)', () => {
      expect(getCamelotDistance('11A', '1A')).toBe(2);
      expect(scoreHarmonic('11A', '1A').score).toBe(65);
      expect(scoreHarmonic('11A', '1A').rule).toBe('Moderate key jump');

      expect(getCamelotDistance('12B', '2B')).toBe(2);
      expect(scoreHarmonic('12B', '2B').score).toBe(65);
    });

    it('tests all 12 same-key pairs (score 100)', () => {
      for (let i = 1; i <= 12; i++) {
        const keyA = `${i}A`;
        const keyB = `${i}B`;
        expect(scoreHarmonic(keyA, keyA).score).toBe(100);
        expect(scoreHarmonic(keyB, keyB).score).toBe(100);
      }
    });

    it('handles case-insensitivity and whitespace in Camelot parsing', () => {
      expect(parseCamelotKey(' 8a ')).toEqual({ number: 8, letter: 'A' });
      expect(scoreHarmonic('8a', '8A').score).toBe(100);
    });

    it('handles malformed key strings gracefully with score 30', () => {
      const invalidKeys = ['0A', '13A', 'XYZ', '', '12C', 'A8'];
      for (const inv of invalidKeys) {
        const res = scoreHarmonic(inv, '8A');
        expect(res.score).toBe(30);
        expect(res.rule).toBe('Invalid key');
      }
    });
  });

  // =========================================================================
  // 3. Energy Profile Matrix (5x5 Energy Matrix for All 4 Profiles)
  // =========================================================================
  describe('3. Energy Profile Matrix & Edge Cases', () => {
    const profiles: EnergyProfile[] = ['build-to-peak', 'warm-up', 'steady-groove', 'peak-time'];

    it('evaluates complete 5x5 energy transition grid for all profiles', () => {
      for (const profile of profiles) {
        for (let e1 = 1; e1 <= 5; e1++) {
          for (let e2 = 1; e2 <= 5; e2++) {
            const res = scoreEnergy(e1, e2, profile);
            expect(res.score).toBeGreaterThanOrEqual(0);
            expect(res.score).toBeLessThanOrEqual(100);
            expect(res.change).toBe(e2 - e1);
            expect(typeof res.label).toBe('string');
          }
        }
      }
    });

    it('handles extreme energy transitions (e.g. 1 to 10 or 10 to 1)', () => {
      expect(scoreEnergy(1, 10, 'build-to-peak').score).toBe(40);
      expect(scoreEnergy(1, 10, 'warm-up').score).toBe(25);
      expect(scoreEnergy(10, 1, 'steady-groove').score).toBe(25);
      expect(scoreEnergy(10, 1, 'peak-time').score).toBe(20);
    });

    it('returns score 50 for unknown energy profile string', () => {
      const res = scoreEnergy(5, 6, 'invalid-profile' as unknown as EnergyProfile);
      expect(res.score).toBe(50);
      expect(res.label).toBe('Unknown profile');
    });
  });

  // =========================================================================
  // 4. Vocal Overlay Combinations (3x3 Complete Matrix)
  // =========================================================================
  describe('4. Vocal Overlay Combinations', () => {
    const vocalTypes: VocalType[] = ['instrumental', 'light-vocal', 'vocal'];

    it('evaluates complete 3x3 vocal transition grid', () => {
      const expectedScores: Record<string, number> = {
        'instrumental->instrumental': 100,
        'instrumental->light-vocal': 100,
        'instrumental->vocal': 85,
        'light-vocal->instrumental': 95,
        'light-vocal->light-vocal': 75,
        'light-vocal->vocal': 65,
        'vocal->instrumental': 90,
        'vocal->light-vocal': 70,
        'vocal->vocal': 45,
      };

      for (const v1 of vocalTypes) {
        for (const v2 of vocalTypes) {
          const res = scoreVocal(v1, v2);
          const key = `${v1}->${v2}`;
          expect(res.score).toBe(expectedScores[key]);
          if (key === 'vocal->vocal') {
            expect(res.warning).toBeDefined();
            expect(res.warning).toContain('vocal overlap');
          } else {
            expect(res.warning).toBeUndefined();
          }
        }
      }
    });

    it('handles unexpected vocal types gracefully by falling through', () => {
      const res = scoreVocal('unknown' as unknown as VocalType, 'vocal');
      expect(res.score).toBe(45); // falls to vocal default block
    });
  });

  // =========================================================================
  // 5. Practice Priority Calculations
  // =========================================================================
  describe('5. Practice Priority Calculations & Boundary Safety', () => {
    it('verifies 0-100 normalization scale bounds (higher = more urgent)', () => {
      // Max urgency: diff=5, rating=1, count=0, comp=0 -> score 100
      const maxPriority = calculatePracticePriority(
        { difficulty: 5, rating: 1, practicedCount: 0 },
        0
      );
      expect(maxPriority).toBe(100);
      expect(getPriorityTier(maxPriority).label).toBe('Critical');

      // Min urgency: diff=1, rating=5, count=5, comp=100 -> score 0
      const minPriority = calculatePracticePriority(
        { difficulty: 1, rating: 5, practicedCount: 5 },
        100
      );
      expect(minPriority).toBe(0);
      expect(getPriorityTier(minPriority).label).toBe('Low');
    });

    it('calculates unrated transition (rating = undefined) using default 0.5 norm', () => {
      const unrated = calculatePracticePriority(
        { difficulty: 3, practicedCount: 2 },
        80
      );
      // diffNorm = 2/4 = 0.5 (weight 35 * 0.5 = 17.5)
      // ratingNorm = 0.5 (weight 30 * 0.5 = 15)
      // countNorm = 1 - 2/5 = 0.6 (weight 20 * 0.6 = 12)
      // compNorm = 1 - 80/100 = 0.2 (weight 15 * 0.2 = 3)
      // sum = 17.5 + 15 + 12 + 3 = 47.5 -> round to 48
      expect(unrated).toBe(48);
      expect(getPriorityTier(unrated).label).toBe('Medium');
    });

    it('clamps out-of-range inputs (difficulty, rating, count, compatibility)', () => {
      const priority = calculatePracticePriority(
        { difficulty: 10, rating: -5, practicedCount: -3 },
        -50
      );
      // difficulty 10 -> clamped to 5 -> norm 1
      // rating -5 -> clamped to 1 -> norm 1
      // count -3 -> clamped to 0 -> norm 1
      // comp -50 -> clamped to 0 -> norm 1
      expect(priority).toBe(100);
    });

    it('handles high practice count (>5) by capping count norm at 0', () => {
      const p5 = calculatePracticePriority({ difficulty: 3, rating: 3, practicedCount: 5 }, 50);
      const p100 = calculatePracticePriority({ difficulty: 3, rating: 3, practicedCount: 100 }, 50);
      expect(p5).toBe(p100);
    });

    it('correctly maps all priority ranges to tiers', () => {
      expect(getPriorityTier(100).label).toBe('Critical');
      expect(getPriorityTier(75).label).toBe('Critical');
      expect(getPriorityTier(74).label).toBe('High');
      expect(getPriorityTier(50).label).toBe('High');
      expect(getPriorityTier(49).label).toBe('Medium');
      expect(getPriorityTier(25).label).toBe('Medium');
      expect(getPriorityTier(24).label).toBe('Low');
      expect(getPriorityTier(0).label).toBe('Low');
    });
  });

  // =========================================================================
  // 6. Overall Transition Scoring Weight & Label Consistency
  // =========================================================================
  describe('6. Overall Transition Scoring Integrity', () => {
    const baseTrack1: Track = {
      id: 't1', title: 'T1', artist: 'A1', genre: 'House', bpm: 124, camelotKey: '8A',
      energy: 5, durationSeconds: 300, vocalType: 'instrumental', familiarity: 'reliable',
      createdAt: '', updatedAt: ''
    };

    const baseTrack2: Track = {
      id: 't2', title: 'T2', artist: 'A2', genre: 'House', bpm: 124, camelotKey: '8A',
      energy: 5, durationSeconds: 300, vocalType: 'instrumental', familiarity: 'reliable',
      createdAt: '', updatedAt: ''
    };

    it('applies exact weights: 40% BPM + 30% Harmonic + 20% Energy + 10% Vocal', () => {
      // Perfect match track1 & track2: 100*0.4 + 100*0.3 + 100*0.2 + 100*0.1 = 100
      const perfect = scoreTransition(baseTrack1, baseTrack2, 'build-to-peak');
      expect(perfect.overall).toBe(100);
      expect(perfect.scoreLabel).toBe('Smooth');

      // Modifying keys to distant (scoreHarmonic = 30):
      // 100*0.4 + 30*0.3 + 100*0.2 + 100*0.1 = 40 + 9 + 20 + 10 = 79
      const distantKeyTrack = { ...baseTrack2, camelotKey: '3B' };
      const resKey = scoreTransition(baseTrack1, distantKeyTrack, 'build-to-peak');
      expect(resKey.overall).toBe(79);
      expect(resKey.scoreLabel).toBe('Acceptable');

      // Modifying vocals to vocal->vocal (scoreVocal = 45):
      // 100*0.4 + 100*0.3 + 100*0.2 + 45*0.1 = 40 + 30 + 20 + 4.5 = 94.5 -> 95
      const vocal1 = { ...baseTrack1, vocalType: 'vocal' as VocalType };
      const vocal2 = { ...baseTrack2, vocalType: 'vocal' as VocalType };
      const resVocal = scoreTransition(vocal1, vocal2, 'build-to-peak');
      expect(resVocal.overall).toBe(95);
    });

    it('correctly maps overall score to getScoreLabel thresholds', () => {
      expect(getScoreLabel(100)).toBe('Smooth');
      expect(getScoreLabel(80)).toBe('Smooth');
      expect(getScoreLabel(79)).toBe('Acceptable');
      expect(getScoreLabel(60)).toBe('Acceptable');
      expect(getScoreLabel(59)).toBe('Watch');
      expect(getScoreLabel(40)).toBe('Watch');
      expect(getScoreLabel(39)).toBe('Risky');
      expect(getScoreLabel(0)).toBe('Risky');
    });

    it('generates warnings for BPM score < 50, Harmonic score < 50, and Vocal warnings', () => {
      const problematicTrack: Track = {
        ...baseTrack2,
        bpm: 140, // BPM diff 16 -> bpm score 15 (<50)
        camelotKey: '3B', // distant key -> harmonic score 30 (<50)
        vocalType: 'vocal',
      };
      const problematicFrom: Track = {
        ...baseTrack1,
        vocalType: 'vocal',
      };

      const analysis = scoreTransition(problematicFrom, problematicTrack, 'build-to-peak');
      expect(analysis.warnings.length).toBe(3);
      expect(analysis.warnings[0]).toContain('vocal overlap');
      expect(analysis.warnings[1]).toContain('Large BPM difference');
      expect(analysis.warnings[2]).toContain('Harmonic conflict');
    });
  });
});
