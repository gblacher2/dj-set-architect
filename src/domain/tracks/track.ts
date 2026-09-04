import { z } from 'zod';

export const VocalTypeSchema = z.enum(['instrumental', 'light-vocal', 'vocal']);
export type VocalType = z.infer<typeof VocalTypeSchema>;

export const FamiliaritySchema = z.enum(['new', 'practiced', 'reliable']);
export type Familiarity = z.infer<typeof FamiliaritySchema>;

export const camelotKeyRegex = /^(1[0-2]|[1-9])[AB]$/;

export const TrackSchema = z.object({
  id: z.string().min(1, 'Track ID is required'),
  title: z.string().min(1, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  genre: z.string().min(1, 'Genre is required'),
  subgenre: z.string().optional(),
  musicalKey: z.string().optional(),
  bpm: z.number().min(50, 'BPM must be at least 50').max(200, 'BPM must be at most 200'),
  camelotKey: z.string().regex(camelotKeyRegex, 'Invalid Camelot key format (e.g. 8A, 11B)'),
  energy: z.number().int().min(1, 'Energy must be between 1 and 10').max(10, 'Energy must be between 1 and 10'),
  vocalType: VocalTypeSchema,
  familiarity: FamiliaritySchema,
  durationSeconds: z.number().int().positive('Duration must be positive'),
  rating: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Track = z.infer<typeof TrackSchema>;
