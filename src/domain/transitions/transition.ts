import { z } from 'zod';

export const TransitionTypeSchema = z.enum([
  'blend',
  'eq-swap',
  'bass-swap',
  'echo-out',
  'loop',
  'hard-cut',
  'vocal-swap',
  'other',
]);
export type TransitionType = z.infer<typeof TransitionTypeSchema>;

export const PhraseLengthBarsSchema = z.union([
  z.literal(8),
  z.literal(16),
  z.literal(32),
  z.literal(64),
]);
export type PhraseLengthBars = z.infer<typeof PhraseLengthBarsSchema>;

export const TransitionRecordSchema = z.object({
  id: z.string().min(1, 'Transition ID is required'),
  setId: z.string().min(1, 'Set ID is required'),
  fromItemId: z.string().min(1, 'fromItemId is required'),
  toItemId: z.string().min(1, 'toItemId is required'),
  transitionType: TransitionTypeSchema,
  outgoingCueSeconds: z.number().nonnegative().optional(),
  incomingCueSeconds: z.number().nonnegative().optional(),
  phraseLengthBars: PhraseLengthBarsSchema.optional(),
  difficulty: z.number().int().min(1).max(5),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  practicedCount: z.number().int().nonnegative(),
  lastPracticedAt: z.string().optional(),
});

export type TransitionRecord = z.infer<typeof TransitionRecordSchema>;
