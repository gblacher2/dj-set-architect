import type { Track } from '../tracks/track';
import type { EnergyProfile } from '../sets/set';
import type { TransitionAnalysis } from '../transitions/overall-scoring';
import { scoreTransition } from '../transitions/overall-scoring';

export interface LowestScoreInfo {
  score: number;
  fromIndex: number;
  toIndex: number;
}

export interface SetMetrics {
  totalTracks: number;
  rawDurationSeconds: number;
  mixedDurationSeconds: number;
  averageScore: number;
  lowestScore: LowestScoreInfo;
  startBpm: number;
  endBpm: number;
  startEnergy: number;
  endEnergy: number;
  peakEnergy: number;
  warningCount: number;
  transitions: TransitionAnalysis[];
}

export function calculateSetMetrics(
  tracks: Track[],
  profile: EnergyProfile,
  overlapSeconds: number = 45
): SetMetrics {
  const totalTracks = tracks.length;

  if (totalTracks === 0) {
    return {
      totalTracks: 0,
      rawDurationSeconds: 0,
      mixedDurationSeconds: 0,
      averageScore: 100,
      lowestScore: { score: 100, fromIndex: -1, toIndex: -1 },
      startBpm: 0,
      endBpm: 0,
      startEnergy: 0,
      endEnergy: 0,
      peakEnergy: 0,
      warningCount: 0,
      transitions: [],
    };
  }

  const rawDurationSeconds = tracks.reduce((sum, t) => sum + t.durationSeconds, 0);

  const mixedDurationSeconds = totalTracks <= 1
    ? rawDurationSeconds
    : Math.max(0, rawDurationSeconds - (overlapSeconds * (totalTracks - 1)));

  const transitions: TransitionAnalysis[] = [];
  for (let i = 0; i < totalTracks - 1; i++) {
    transitions.push(scoreTransition(tracks[i], tracks[i + 1], profile));
  }

  let averageScore = 100;
  let lowestScore: LowestScoreInfo = { score: 100, fromIndex: -1, toIndex: -1 };
  let warningCount = 0;

  if (transitions.length > 0) {
    const sumScore = transitions.reduce((sum, t) => sum + t.overall, 0);
    averageScore = Math.round(sumScore / transitions.length);

    let minScore = transitions[0].overall;
    let minIndex = 0;
    for (let i = 0; i < transitions.length; i++) {
      if (transitions[i].overall < minScore) {
        minScore = transitions[i].overall;
        minIndex = i;
      }
      if (transitions[i].overall < 60) {
        warningCount++;
      }
    }
    lowestScore = {
      score: minScore,
      fromIndex: minIndex,
      toIndex: minIndex + 1,
    };
  }

  const energies = tracks.map(t => t.energy);

  return {
    totalTracks,
    rawDurationSeconds,
    mixedDurationSeconds,
    averageScore,
    lowestScore,
    startBpm: tracks[0].bpm,
    endBpm: tracks[totalTracks - 1].bpm,
    startEnergy: tracks[0].energy,
    endEnergy: tracks[totalTracks - 1].energy,
    peakEnergy: Math.max(...energies),
    warningCount,
    transitions,
  };
}
