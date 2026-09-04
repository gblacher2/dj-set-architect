import type { BpmScore } from './bpm-scoring';
import type { HarmonicScore } from './harmonic-scoring';
import type { EnergyScore } from './energy-scoring';
import type { VocalScore } from './vocal-scoring';

export interface TransitionScoresInput {
  bpm: BpmScore;
  harmonic: HarmonicScore;
  energy: EnergyScore;
  vocal: VocalScore;
}

export function getRecommendation(analysis: TransitionScoresInput): string {
  // 1. Vocal warning rule
  if (analysis.vocal.warning) {
    return 'Avoid overlapping vocal phrases. Use a short handoff or loop an instrumental section.';
  }

  // 2. Both BPM and Key well matched
  if (analysis.bpm.score >= 80 && analysis.harmonic.score >= 80) {
    return 'Use a long 16- or 32-bar blend. BPM and key are well-matched.';
  }

  // 3. Good BPM, low Key match
  if (analysis.bpm.score >= 80 && analysis.harmonic.score < 60) {
    return 'Use an EQ-led transition, percussion loop or shorter handoff to mask the key change.';
  }

  // 4. Steep energy increase
  if (analysis.energy.change >= 3) {
    return 'Delay the bass swap or introduce the incoming track gradually to manage the energy jump.';
  }

  // 5. Significant energy drop/reset
  if (analysis.energy.change <= -2) {
    return 'Treat this as an intentional reset. Consider an echo-out or filter sweep.';
  }

  // 6. Large BPM gap
  if (analysis.bpm.score < 50) {
    return 'Large BPM gap. Use a hard cut, echo-out or loop to bridge the tempo change.';
  }

  // 7. Default fallback
  return 'Standard mix. Monitor phrase alignment and energy flow.';
}
