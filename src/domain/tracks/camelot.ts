export interface ParsedCamelotKey {
  number: number; // 1-12
  letter: 'A' | 'B';
}

export function parseCamelotKey(key: string): ParsedCamelotKey {
  const match = key.trim().match(/^(1[0-2]|[1-9])([AB])$/i);
  if (!match) {
    throw new Error(`Invalid Camelot key: ${key}`);
  }
  return {
    number: parseInt(match[1], 10),
    letter: match[2].toUpperCase() as 'A' | 'B',
  };
}

export function getCamelotDistance(key1: string, key2: string): number {
  const parsed1 = parseCamelotKey(key1);
  const parsed2 = parseCamelotKey(key2);

  const diff = Math.abs(parsed1.number - parsed2.number);
  return Math.min(diff, 12 - diff);
}

export interface CamelotCompatibility {
  compatible: boolean;
  rule: string;
}

export function areCamelotCompatible(key1: string, key2: string): CamelotCompatibility {
  const p1 = parseCamelotKey(key1);
  const p2 = parseCamelotKey(key2);
  const dist = getCamelotDistance(key1, key2);

  if (p1.number === p2.number && p1.letter === p2.letter) {
    return { compatible: true, rule: 'Same key' };
  }
  if (dist === 1 && p1.letter === p2.letter) {
    return { compatible: true, rule: 'Compatible adjacent key' };
  }
  if (p1.number === p2.number && p1.letter !== p2.letter) {
    return { compatible: true, rule: 'Relative major/minor' };
  }
  if (dist === 2 && p1.letter === p2.letter) {
    return { compatible: false, rule: 'Moderate key jump' };
  }
  return { compatible: false, rule: 'Large harmonic jump' };
}

export interface CamelotColor {
  bg: string;
  text: string;
}

// 12 deterministic hues map (1-12)
// A = Minor (richer/darker background with white text), B = Major (brighter background with appropriate text contrast)
export const CAMELOT_COLORS: Record<number, { A: CamelotColor; B: CamelotColor }> = {
  1:  { A: { bg: '#991B1B', text: '#FFFFFF' }, B: { bg: '#EF4444', text: '#FFFFFF' } }, // Red
  2:  { A: { bg: '#9A3412', text: '#FFFFFF' }, B: { bg: '#F97316', text: '#FFFFFF' } }, // Red-Orange
  3:  { A: { bg: '#C2410C', text: '#FFFFFF' }, B: { bg: '#FB923C', text: '#1A1A1E' } }, // Orange
  4:  { A: { bg: '#B45309', text: '#FFFFFF' }, B: { bg: '#FBBF24', text: '#1A1A1E' } }, // Yellow-Orange
  5:  { A: { bg: '#A16207', text: '#FFFFFF' }, B: { bg: '#EAB308', text: '#1A1A1E' } }, // Yellow
  6:  { A: { bg: '#4D7C0F', text: '#FFFFFF' }, B: { bg: '#84CC16', text: '#1A1A1E' } }, // Yellow-Green
  7:  { A: { bg: '#15803D', text: '#FFFFFF' }, B: { bg: '#22C55E', text: '#1A1A1E' } }, // Green
  8:  { A: { bg: '#0F766E', text: '#FFFFFF' }, B: { bg: '#14B8A6', text: '#1A1A1E' } }, // Teal
  9:  { A: { bg: '#0E7490', text: '#FFFFFF' }, B: { bg: '#06B6D4', text: '#1A1A1E' } }, // Cyan
  10: { A: { bg: '#1D4ED8', text: '#FFFFFF' }, B: { bg: '#3B82F6', text: '#FFFFFF' } }, // Blue
  11: { A: { bg: '#4338CA', text: '#FFFFFF' }, B: { bg: '#6366F1', text: '#FFFFFF' } }, // Indigo
  12: { A: { bg: '#6B21A8', text: '#FFFFFF' }, B: { bg: '#A855F7', text: '#FFFFFF' } }, // Purple
};

export function getCamelotColor(key: string): CamelotColor {
  try {
    const parsed = parseCamelotKey(key);
    const colorPair = CAMELOT_COLORS[parsed.number];
    if (!colorPair) {
      return { bg: '#3E3E46', text: '#E8E8EC' };
    }
    return colorPair[parsed.letter];
  } catch {
    return { bg: '#3E3E46', text: '#E8E8EC' };
  }
}
