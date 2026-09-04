import type { VocalType } from '../tracks/track';

export interface VocalScore {
  score: number;
  warning?: string;
}

export function scoreVocal(fromVocal: VocalType, toVocal: VocalType): VocalScore {
  if (fromVocal === 'instrumental') {
    if (toVocal === 'instrumental' || toVocal === 'light-vocal') {
      return { score: 100 };
    }
    return { score: 85 }; // instrumental -> vocal
  }

  if (fromVocal === 'light-vocal') {
    if (toVocal === 'instrumental') {
      return { score: 95 };
    } else if (toVocal === 'light-vocal') {
      return { score: 75 };
    } else {
      return { score: 65 }; // light-vocal -> vocal
    }
  }

  // fromVocal === 'vocal'
  if (toVocal === 'instrumental') {
    return { score: 90 };
  } else if (toVocal === 'light-vocal') {
    return { score: 70 };
  } else {
    // vocal -> vocal
    return {
      score: 45,
      warning: 'Potential vocal overlap. Consider using an instrumental section, loop or faster handoff.',
    };
  }
}
