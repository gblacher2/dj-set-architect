import { describe, it, expect } from 'vitest';
import { scoreEnergy } from '../transitions/energy-scoring';
import { getCamelotDistance, areCamelotCompatible, getCamelotColor } from '../tracks/camelot';
import { scoreBpm } from '../transitions/bpm-scoring';
import { scoreTransition } from '../transitions/overall-scoring';
import type { Track } from '../tracks/track';

describe('Challenger 1 R2 Deep Stress Harness — scoreEnergy Float Matrix', () => {

  describe('1.1 Requested Float Inputs (0.5, 1.2, 2.7, -0.4)', () => {
    it('verifies scoreEnergy for (from: 0.5, to: 1.2) -> diff = 0.7 -> rounded change = 1', () => {
      // Profile: build-to-peak (change 1 -> 100, Smooth progression)
      const b2p = scoreEnergy(0.5, 1.2, 'build-to-peak');
      expect(b2p).toEqual({ score: 100, change: 1, label: 'Smooth progression' });

      // Profile: warm-up (change 1 -> 100, Gentle build)
      const wu = scoreEnergy(0.5, 1.2, 'warm-up');
      expect(wu).toEqual({ score: 100, change: 1, label: 'Gentle build' });

      // Profile: steady-groove (change 1 -> 100, Maintaining groove)
      const sg = scoreEnergy(0.5, 1.2, 'steady-groove');
      expect(sg).toEqual({ score: 100, change: 1, label: 'Maintaining groove' });

      // Profile: peak-time (change 1 -> 90, Building intensity)
      const pt = scoreEnergy(0.5, 1.2, 'peak-time');
      expect(pt).toEqual({ score: 90, change: 1, label: 'Building intensity' });
    });

    it('verifies scoreEnergy for (from: 1.2, to: 2.7) -> diff = 1.5 -> rounded change = 2', () => {
      // Profile: build-to-peak (change 2 -> 75, Moderate increase)
      const b2p = scoreEnergy(1.2, 2.7, 'build-to-peak');
      expect(b2p).toEqual({ score: 75, change: 2, label: 'Moderate increase' });

      // Profile: warm-up (change 2 -> 55, Quick increase for warm-up)
      const wu = scoreEnergy(1.2, 2.7, 'warm-up');
      expect(wu).toEqual({ score: 55, change: 2, label: 'Quick increase for warm-up' });

      // Profile: steady-groove (change 2 -> 55, Noticeable shift)
      const sg = scoreEnergy(1.2, 2.7, 'steady-groove');
      expect(sg).toEqual({ score: 55, change: 2, label: 'Noticeable shift' });

      // Profile: peak-time (change 2 -> 70, Strong push)
      const pt = scoreEnergy(1.2, 2.7, 'peak-time');
      expect(pt).toEqual({ score: 70, change: 2, label: 'Strong push' });
    });

    it('verifies scoreEnergy for (from: 2.7, to: -0.4) -> diff = -3.1 -> rounded change = -3', () => {
      // Profile: build-to-peak (change -3 -> 30, Strong energy drop)
      const b2p = scoreEnergy(2.7, -0.4, 'build-to-peak');
      expect(b2p).toEqual({ score: 30, change: -3, label: 'Strong energy drop' });

      // Profile: warm-up (change -3 -> 50, Unexpected drop)
      const wu = scoreEnergy(2.7, -0.4, 'warm-up');
      expect(wu).toEqual({ score: 50, change: -3, label: 'Unexpected drop' });

      // Profile: steady-groove (change -3 -> 25, Breaking the groove)
      const sg = scoreEnergy(2.7, -0.4, 'steady-groove');
      expect(sg).toEqual({ score: 25, change: -3, label: 'Breaking the groove' });

      // Profile: peak-time (change -3 -> 20, Losing the floor)
      const pt = scoreEnergy(2.7, -0.4, 'peak-time');
      expect(pt).toEqual({ score: 20, change: -3, label: 'Losing the floor' });
    });

    it('verifies scoreEnergy for (from: -0.4, to: 0.5) -> diff = 0.9 -> rounded change = 1', () => {
      const b2p = scoreEnergy(-0.4, 0.5, 'build-to-peak');
      expect(b2p).toEqual({ score: 100, change: 1, label: 'Smooth progression' });
    });
  });

  describe('1.2 Half-Integer Rounding Asymmetry in JavaScript', () => {
    it('reveals JS Math.round asymmetry on positive (+1.5 -> +2) vs negative (-1.5 -> -1) float deltas', () => {
      // Increase of 1.5 units (2.0 to 3.5): 3.5 - 2.0 = 1.5 -> Math.round(1.5) = 2
      const increase = scoreEnergy(2.0, 3.5, 'build-to-peak');
      expect(increase.change).toBe(2);
      expect(increase.score).toBe(75);

      // Decrease of 1.5 units (3.5 to 2.0): 2.0 - 3.5 = -1.5 -> Math.round(-1.5) = -1 (in JS!)
      const decrease = scoreEnergy(3.5, 2.0, 'build-to-peak');
      expect(decrease.change).toBe(-1);
      expect(decrease.score).toBe(70);
    });
  });

  describe('1.3 Boundary Float Sweeps across all Profiles', () => {
    it('correctly categorizes fractional deltas around rounding thresholds (0.49 vs 0.5, -0.49 vs -0.51)', () => {
      // 5.0 to 5.49 -> change 0 -> score 100
      expect(scoreEnergy(5.0, 5.49, 'build-to-peak').change).toBe(0);
      expect(scoreEnergy(5.0, 5.49, 'build-to-peak').score).toBe(100);

      // 5.0 to 5.50 -> change 1 -> score 100
      expect(scoreEnergy(5.0, 5.50, 'build-to-peak').change).toBe(1);

      // 5.0 to 4.51 -> change -0.49 -> Math.round yields JS signed negative zero -0
      const negZeroRes = scoreEnergy(5.0, 4.51, 'build-to-peak');
      expect(negZeroRes.change == 0).toBe(true); // numeric equality holds for -0
      expect(negZeroRes.score).toBe(100);

      // 5.0 to 4.49 -> change -0.51 -> rounds to -1
      expect(scoreEnergy(5.0, 4.49, 'build-to-peak').change).toBe(-1);
      expect(scoreEnergy(5.0, 4.49, 'build-to-peak').score).toBe(70);
    });
  });

  describe('1.4 Non-finite / Out-of-bounds Float Inputs', () => {
    it('handles NaN and Infinity without crashing', () => {
      const nanRes = scoreEnergy(NaN, 5, 'build-to-peak');
      expect(nanRes.change).toBeNaN();
      expect(nanRes.score).toBe(30); // hits default else block

      const infRes = scoreEnergy(1, Infinity, 'warm-up');
      expect(infRes.change).toBe(Infinity);
      expect(infRes.score).toBe(25); // hits change >= 3 block
    });
  });
});

describe('Challenger 1 R2 Deep Stress Harness — Camelot Key Distance & Compatibility', () => {

  describe('2.1 Exhaustive 144-Pair Distance Symmetry & Boundary Check', () => {
    it('verifies getCamelotDistance is symmetric and bounded [0, 6] for all 144 key combinations', () => {
      const numbers = Array.from({ length: 12 }, (_, i) => i + 1);
      const letters: ('A' | 'B')[] = ['A', 'B'];

      for (const n1 of numbers) {
        for (const l1 of letters) {
          const k1 = `${n1}${l1}`;
          for (const n2 of numbers) {
            for (const l2 of letters) {
              const k2 = `${n2}${l2}`;
              const d1 = getCamelotDistance(k1, k2);
              const d2 = getCamelotDistance(k2, k1);

              expect(d1).toBe(d2); // Symmetry
              expect(d1).toBeGreaterThanOrEqual(0);
              expect(d1).toBeLessThanOrEqual(6); // Max distance on 12-hour wheel is 6
            }
          }
        }
      }
    });

    it('verifies explicit wraparound distances across wheel boundaries', () => {
      expect(getCamelotDistance('12A', '1A')).toBe(1);
      expect(getCamelotDistance('12B', '1B')).toBe(1);
      expect(getCamelotDistance('11A', '1A')).toBe(2);
      expect(getCamelotDistance('10A', '1A')).toBe(3);
      expect(getCamelotDistance('9A', '1A')).toBe(4);
      expect(getCamelotDistance('8A', '1A')).toBe(5);
      expect(getCamelotDistance('7A', '1A')).toBe(6); // Opposite key
    });
  });

  describe('2.2 Compatibility & Color Lookup Exception Safety', () => {
    it('demonstrates that getCamelotColor handles invalid keys gracefully', () => {
      expect(getCamelotColor('invalid')).toEqual({ bg: '#3E3E46', text: '#E8E8EC' });
    });

    it('uncovers that areCamelotCompatible throws on invalid key (no try-catch wrapper)', () => {
      expect(() => areCamelotCompatible('invalid', '8A')).toThrow('Invalid Camelot key: invalid');
    });
  });
});

describe('Challenger 1 R2 Deep Stress Harness — BPM & Overall Scoring Integration', () => {

  describe('3.1 BPM Half/Double Matching and Fractional Float Precision', () => {
    it('accurately scores float BPMs with exact precision', () => {
      // Exact match with float BPM
      expect(scoreBpm(123.45, 123.45).score).toBe(100);
      expect(scoreBpm(123.45, 123.45).diff).toBe(0);

      // 0.5 BPM diff -> score 100
      expect(scoreBpm(123.0, 123.5).diff).toBe(0.5);
      expect(scoreBpm(123.0, 123.5).score).toBe(100);

      // 1.5 BPM diff -> score 90
      expect(scoreBpm(120.0, 121.5).diff).toBe(1.5);
      expect(scoreBpm(120.0, 121.5).score).toBe(90);
    });

    it('handles non-finite BPMs safely', () => {
      const nanRes = scoreBpm(NaN, 120);
      expect(nanRes.score).toBe(15);

      const infRes = scoreBpm(120, Infinity);
      expect(infRes.score).toBe(15);
    });
  });

  describe('3.2 Recommendation Engine Rules Matrix Coverage', () => {
    const dummyTrack = (bpm: number, key: string, energy: number, vocalType: 'instrumental' | 'light-vocal' | 'vocal'): Track => ({
      id: 't', title: 'T', artist: 'A', genre: 'G', durationSeconds: 180,
      bpm, camelotKey: key, energy, vocalType, familiarity: 'reliable'
    });

    it('triggers Rule 1: Vocal warning when vocal overlap occurs', () => {
      const t1 = dummyTrack(120, '8A', 5, 'vocal');
      const t2 = dummyTrack(120, '8A', 5, 'vocal');
      const analysis = scoreTransition(t1, t2, 'build-to-peak');
      expect(analysis.recommendation).toBe('Avoid overlapping vocal phrases. Use a short handoff or loop an instrumental section.');
    });

    it('triggers Rule 2: Long blend when BPM and Key are both >= 80', () => {
      const t1 = dummyTrack(120, '8A', 5, 'instrumental');
      const t2 = dummyTrack(120, '8A', 5, 'instrumental');
      const analysis = scoreTransition(t1, t2, 'build-to-peak');
      expect(analysis.recommendation).toBe('Use a long 16- or 32-bar blend. BPM and key are well-matched.');
    });

    it('triggers Rule 3: EQ-led transition when BPM >= 80 but Key < 60', () => {
      const t1 = dummyTrack(120, '8A', 5, 'instrumental');
      const t2 = dummyTrack(120, '3B', 5, 'instrumental'); // Key 3B vs 8A -> score 30
      const analysis = scoreTransition(t1, t2, 'build-to-peak');
      expect(analysis.recommendation).toBe('Use an EQ-led transition, percussion loop or shorter handoff to mask the key change.');
    });

    it('triggers Rule 4: Steep energy increase when change >= 3', () => {
      const t1 = dummyTrack(120, '8A', 5, 'instrumental');
      const t2 = dummyTrack(128, '8A', 9, 'instrumental'); // Energy 5 -> 9 (change +4 >= 3)
      // BPM diff 8 -> bpm score 35 (< 80)
      const analysis = scoreTransition(t1, t2, 'build-to-peak');
      expect(analysis.recommendation).toBe('Delay the bass swap or introduce the incoming track gradually to manage the energy jump.');
    });

    it('triggers Rule 5: Energy reset when change <= -2', () => {
      const t1 = dummyTrack(120, '8A', 8, 'instrumental');
      const t2 = dummyTrack(124, '8A', 5, 'instrumental'); // Energy 8 -> 5 (change -3 <= -2)
      // BPM diff 4 -> bpm score 75 (< 80)
      const analysis = scoreTransition(t1, t2, 'build-to-peak');
      expect(analysis.recommendation).toBe('Treat this as an intentional reset. Consider an echo-out or filter sweep.');
    });

    it('triggers Rule 6: Large BPM gap when bpm.score < 50', () => {
      const t1 = dummyTrack(120, '8A', 5, 'instrumental');
      const t2 = dummyTrack(135, '8A', 5, 'instrumental'); // BPM diff 15 -> bpm score 15 (< 50)
      const analysis = scoreTransition(t1, t2, 'build-to-peak');
      expect(analysis.recommendation).toBe('Large BPM gap. Use a hard cut, echo-out or loop to bridge the tempo change.');
    });
  });
});
