import type { TransitionRecord } from '../transitions/transition';

export interface PracticePriorityInputs {
  difficulty: number; // 1-5
  rating?: number; // 1-5 (optional)
  practicedCount: number; // >= 0
}

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface PriorityTier {
  label: 'Critical' | 'High' | 'Medium' | 'Low';
  colorClass: string;
}

/**
 * Calculates practice priority on a 0-100 scale where HIGHER = MORE URGENT.
 *
 * Formula weights:
 * - 35% Difficulty: (difficulty - 1) / 4  [1->0, 5->1]
 * - 30% Rating: (5 - rating) / 4          [5->0, 1->1; unrated defaults to 0.5]
 * - 20% Practice Count: 1 - min(count, 5)/5 [0->1, 5+->0]
 * - 15% Compatibility: 1 - score / 100   [100->0, 0->1]
 */
export function calculatePracticePriority(
  transition: PracticePriorityInputs | TransitionRecord,
  compatibilityScore: number
): number {
  // 1. Difficulty term: 1 to 5 scale
  const diffNorm = (Math.max(1, Math.min(5, transition.difficulty)) - 1) / 4;

  // 2. Rating term: optional 1 to 5 scale. If unrated, default to 0.5 (mid-tier urgency)
  const ratingNorm = transition.rating === undefined || transition.rating === null
    ? 0.5
    : (5 - Math.max(1, Math.min(5, transition.rating))) / 4;

  // 3. Practice count term: capped at 5
  const countNorm = 1 - Math.min(Math.max(0, transition.practicedCount), 5) / 5;

  // 4. Compatibility score term: 0 to 100 quality score
  const compNorm = 1 - Math.max(0, Math.min(100, compatibilityScore)) / 100;

  const rawPriority =
    35 * diffNorm +
    30 * ratingNorm +
    20 * countNorm +
    15 * compNorm;

  return Math.max(0, Math.min(100, Math.round(rawPriority)));
}

export function getPriorityTier(priority: number): PriorityTier {
  const clamped = Math.max(0, Math.min(100, Math.round(priority)));
  if (clamped >= 75) {
    return {
      label: 'Critical',
      colorClass: 'bg-red-950/80 border-red-700/50 text-[var(--color-priority-critical,#F87171)]',
    };
  }
  if (clamped >= 50) {
    return {
      label: 'High',
      colorClass: 'bg-orange-950/80 border-orange-700/50 text-[var(--color-priority-high,#FB923C)]',
    };
  }
  if (clamped >= 25) {
    return {
      label: 'Medium',
      colorClass: 'bg-amber-950/80 border-amber-700/50 text-[var(--color-priority-medium,#FBBF24)]',
    };
  }
  return {
    label: 'Low',
    colorClass: 'bg-emerald-950/80 border-emerald-700/50 text-[var(--color-priority-low,#4ADE80)]',
  };
}
