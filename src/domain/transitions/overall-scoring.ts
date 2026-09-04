import type { Track } from '../tracks/track';
import type { BpmScore } from './bpm-scoring';
import { scoreBpm } from './bpm-scoring';
import type { HarmonicScore } from './harmonic-scoring';
import { scoreHarmonic } from './harmonic-scoring';
import type { EnergyScore } from './energy-scoring';
import type { EnergyProfile } from '../sets/set';
import { scoreEnergy } from './energy-scoring';
import type { VocalScore } from './vocal-scoring';
import { scoreVocal } from './vocal-scoring';
import { getRecommendation } from './recommendations';

export type ScoreLabel = 'Smooth' | 'Acceptable' | 'Watch' | 'Risky';

export interface TransitionAnalysis {
  overall: number;
  bpm: BpmScore;
  harmonic: HarmonicScore;
  energy: EnergyScore;
  vocal: VocalScore;
  recommendation: string;
  warnings: string[];
  scoreLabel: ScoreLabel;
}

export function getScoreLabel(score: number): ScoreLabel {
  if (score >= 80) return 'Smooth';
  if (score >= 60) return 'Acceptable';
  if (score >= 40) return 'Watch';
  return 'Risky';
}

export function scoreTransition(
  fromTrack: Track,
  toTrack: Track,
  profile: EnergyProfile
): TransitionAnalysis {
  const bpm = scoreBpm(fromTrack.bpm, toTrack.bpm);
  const harmonic = scoreHarmonic(fromTrack.camelotKey, toTrack.camelotKey);
  const energy = scoreEnergy(fromTrack.energy, toTrack.energy, profile);
  const vocal = scoreVocal(fromTrack.vocalType, toTrack.vocalType);

  const overallRaw = bpm.score * 0.4 + harmonic.score * 0.3 + energy.score * 0.2 + vocal.score * 0.1;
  const overall = Math.round(overallRaw);

  const scoreLabel = getScoreLabel(overall);

  const warnings: string[] = [];
  if (vocal.warning) {
    warnings.push(vocal.warning);
  }
  if (bpm.score < 50) {
    warnings.push(`Large BPM difference (${bpm.diff} BPM)`);
  }
  if (harmonic.score < 50) {
    warnings.push(`Harmonic conflict: ${harmonic.description}`);
  }

  const analysisWithoutRec: Omit<TransitionAnalysis, 'recommendation'> = {
    overall,
    bpm,
    harmonic,
    energy,
    vocal,
    warnings,
    scoreLabel,
  };

  const recommendation = getRecommendation(analysisWithoutRec);

  return {
    ...analysisWithoutRec,
    recommendation,
  };
}
