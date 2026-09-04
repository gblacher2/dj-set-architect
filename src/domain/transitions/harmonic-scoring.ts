import { parseCamelotKey, getCamelotDistance } from '../tracks/camelot';

export interface HarmonicScore {
  score: number;
  rule: string;
  description: string;
}

export function scoreHarmonic(fromKey: string, toKey: string): HarmonicScore {
  let parsedFrom;
  let parsedTo;
  try {
    parsedFrom = parseCamelotKey(fromKey);
    parsedTo = parseCamelotKey(toKey);
  } catch {
    return {
      score: 30,
      rule: 'Invalid key',
      description: 'Invalid Camelot key format',
    };
  }

  // 1. Same key (same number and same letter)
  if (parsedFrom.number === parsedTo.number && parsedFrom.letter === parsedTo.letter) {
    return {
      score: 100,
      rule: 'Same key',
      description: 'Perfect harmonic match in the same key',
    };
  }

  const distance = getCamelotDistance(fromKey, toKey);

  // 2. Adjacent key, same letter (distance 1 with wraparound)
  if (distance === 1 && parsedFrom.letter === parsedTo.letter) {
    return {
      score: 90,
      rule: 'Compatible adjacent key',
      description: 'Adjacent key on Camelot wheel',
    };
  }

  // 3. Same number, A/B switch (relative major/minor)
  if (parsedFrom.number === parsedTo.number && parsedFrom.letter !== parsedTo.letter) {
    return {
      score: 85,
      rule: 'Relative major/minor',
      description: 'Relative key switch (major/minor)',
    };
  }

  // 4. Two-step movement, same letter (distance 2 with wraparound)
  if (distance === 2 && parsedFrom.letter === parsedTo.letter) {
    return {
      score: 65,
      rule: 'Moderate key jump',
      description: 'Energy boost or 2-step harmonic jump',
    };
  }

  // 5. Everything else
  return {
    score: 30,
    rule: 'Large harmonic jump',
    description: 'Distant keys require careful mixing or transition techniques',
  };
}
