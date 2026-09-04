import { z } from 'zod';
import { SCHEMA_VERSION, DEFAULT_PREFERENCES } from '../app/config';
import { TrackSchema } from '../domain/tracks/track';
import { DJSetSchema } from '../domain/sets/set';
import { TransitionRecordSchema } from '../domain/transitions/transition';
import { db, type PracticeSession, type UserPreferencesRecord } from './db';

const PracticeStepLogSchema = z.object({
  transitionId: z.string(),
  fromItemId: z.string(),
  toItemId: z.string(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  practiceCounted: z.boolean().optional(),
});

export const PracticeSessionSchema = z.object({
  id: z.string().min(1),
  setId: z.string().min(1),
  startedAt: z.string().min(1),
  practicedAt: z.string().optional(),
  completedAt: z.string().optional(),
  durationSeconds: z.number().nonnegative(),
  durationMinutes: z.number().nonnegative().optional(),
  overallRating: z.number().int().min(1).max(5).default(3),
  confidenceBefore: z.number().int().min(1).max(10).optional(),
  confidenceAfter: z.number().int().min(1).max(10).optional(),
  mistakes: z.string().optional(),
  successes: z.string().optional(),
  nextFocus: z.string().optional(),
  stepsCompleted: z.number().int().nonnegative(),
  totalSteps: z.number().int().nonnegative(),
  notes: z.string().optional(),
  logs: z.array(PracticeStepLogSchema),
});

export const UserPreferencesRecordSchema = z.object({
  id: z.string().min(1),
  defaultOverlapSeconds: z.number().nonnegative(),
  defaultEnergyProfile: z.enum(['warm-up', 'steady-groove', 'build-to-peak', 'peak-time']),
  showAdvancedScoring: z.boolean(),
  density: z.enum(['comfortable', 'compact']),
  updatedAt: z.string().optional(),
});

export const ExportDataSchema = z.object({
  schemaVersion: z.number().int(),
  exportedAt: z.string().min(1),
  tracks: z.array(TrackSchema),
  sets: z.array(DJSetSchema),
  transitions: z.array(TransitionRecordSchema),
  practiceSessions: z.array(PracticeSessionSchema),
  userPreferences: UserPreferencesRecordSchema,
});

export type ExportData = z.infer<typeof ExportDataSchema>;

export async function createExportData(): Promise<ExportData> {
  const [tracks, sets, transitions, practiceSessions, preferences] = await Promise.all([
    db.tracks.toArray(),
    db.sets.toArray(),
    db.transitions.toArray(),
    db.practiceSessions.toArray(),
    db.userPreferences.get('default'),
  ]);
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tracks,
    sets,
    transitions,
    practiceSessions: practiceSessions.map((session) => ({
      ...session,
      overallRating: session.overallRating ?? 3,
      durationMinutes: session.durationMinutes ?? Math.round(session.durationSeconds / 60),
      practicedAt: session.practicedAt ?? session.completedAt ?? session.startedAt,
    })),
    userPreferences: preferences ?? { id: 'default', ...DEFAULT_PREFERENCES },
  };
}

export function validateExportData(value: unknown): { success: true; data: ExportData } | { success: false; message: string } {
  const parsed = ExportDataSchema.safeParse(value);
  if (!parsed.success) return { success: false, message: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'file'}: ${issue.message}`).join('; ') };
  if (parsed.data.schemaVersion !== SCHEMA_VERSION) return { success: false, message: `Unsupported schema version ${parsed.data.schemaVersion}. Expected ${SCHEMA_VERSION}.` };
  return { success: true, data: parsed.data };
}

export async function importExportData(value: unknown): Promise<{ tracks: number; sets: number; transitions: number; practiceSessions: number }> {
  const validated = validateExportData(value);
  if (!validated.success) throw new Error(validated.message);
  const data = validated.data;
  await db.transaction('rw', [db.tracks, db.sets, db.transitions, db.practiceSessions, db.userPreferences], async () => {
    await db.tracks.clear();
    await db.sets.clear();
    await db.transitions.clear();
    await db.practiceSessions.clear();
    await db.tracks.bulkPut(data.tracks);
    await db.sets.bulkPut(data.sets);
    await db.transitions.bulkPut(data.transitions);

    // Apply migration/compatibility defaults for practice sessions
    const migratedSessions: PracticeSession[] = data.practiceSessions.map((session) => ({
      ...session,
      overallRating: session.overallRating ?? 3,
      durationMinutes: session.durationMinutes ?? Math.round(session.durationSeconds / 60),
      practicedAt: session.practicedAt ?? session.completedAt ?? session.startedAt,
    }));

    await db.practiceSessions.bulkPut(migratedSessions);
    await db.userPreferences.put(data.userPreferences as UserPreferencesRecord);
  });
  return { tracks: data.tracks.length, sets: data.sets.length, transitions: data.transitions.length, practiceSessions: data.practiceSessions.length };
}
