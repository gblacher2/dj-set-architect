import { z } from 'zod';

export const EnergyProfileSchema = z.enum([
  'warm-up',
  'steady-groove',
  'build-to-peak',
  'peak-time',
]);
export type EnergyProfile = z.infer<typeof EnergyProfileSchema>;

export const SetTrackItemSchema = z.object({
  id: z.string().min(1, 'Occurrence ID is required'),
  trackId: z.string().min(1, 'Track ID is required'),
  notes: z.string().optional(),
});
export type SetTrackItem = z.infer<typeof SetTrackItemSchema>;

export const DJSetSchema = z.object({
  id: z.string().min(1, 'Set ID is required'),
  name: z.string().min(1, 'Set name is required'),
  description: z.string().optional(),
  targetDurationMinutes: z.number().positive('Target duration must be positive'),
  energyProfile: EnergyProfileSchema,
  items: z.array(SetTrackItemSchema),
  trackIds: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type DJSet = z.infer<typeof DJSetSchema>;
