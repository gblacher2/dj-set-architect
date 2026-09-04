import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, type PracticeSession } from '../db';
import { initSeedData } from '../seed';
import { createExportData, importExportData, validateExportData } from '../transfer';

describe('R4 versioned JSON transfer', () => {
  beforeEach(async () => {
    await db.tracks.clear();
    await db.sets.clear();
    await db.transitions.clear();
    await db.practiceSessions.clear();
    await db.userPreferences.clear();
    await initSeedData(true);
  });

  it('exports every table and includes the schema version', async () => {
    const data = await createExportData();
    expect(data.schemaVersion).toBe(1);
    expect(data.tracks).toHaveLength(30);
    expect(data.sets).toHaveLength(2);
    expect(data.transitions).toHaveLength(15);
    expect(data.userPreferences.id).toBe('default');
  });

  it('imports a valid file and rejects a bad Camelot key atomically', async () => {
    const data = await createExportData();
    data.tracks[0].title = 'Imported track';
    const summary = await importExportData(data);
    expect(summary.tracks).toBe(30);
    expect((await db.tracks.get(data.tracks[0].id))?.title).toBe('Imported track');
    const invalid = { ...data, tracks: data.tracks.map((track, index) => index === 1 ? { ...track, camelotKey: '99Z' } : track) };
    const validation = validateExportData(invalid);
    expect(validation.success).toBe(false);
    await expect(importExportData(invalid)).rejects.toThrow();
    expect((await db.tracks.get(data.tracks[0].id))?.title).toBe('Imported track');
  });

  it('preserves full PracticeSession review fields on export and import with migration fallback', async () => {
    const fullSession: PracticeSession = {
      id: 'session_transfer_1',
      setId: 'set_01',
      startedAt: new Date().toISOString(),
      practicedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: 600,
      durationMinutes: 10,
      overallRating: 5,
      confidenceBefore: 4,
      confidenceAfter: 8,
      successes: 'Smooth blends',
      mistakes: 'Slight vocal crash',
      nextFocus: 'EQ timing',
      stepsCompleted: 2,
      totalSteps: 2,
      logs: []
    };

    await db.practiceSessions.add(fullSession);

    const exportData = await createExportData();
    const exportedSession = exportData.practiceSessions.find((s) => s.id === 'session_transfer_1');
    expect(exportedSession).toBeDefined();
    expect(exportedSession?.overallRating).toBe(5);
    expect(exportedSession?.confidenceBefore).toBe(4);
    expect(exportedSession?.confidenceAfter).toBe(8);
    expect(exportedSession?.successes).toBe('Smooth blends');

    // Test legacy import migration fallback
    const legacySessionJson = {
      ...exportData,
      practiceSessions: [
        {
          id: 'session_legacy_1',
          setId: 'set_01',
          startedAt: new Date().toISOString(),
          durationSeconds: 300,
          stepsCompleted: 1,
          totalSteps: 1,
          logs: []
          // Missing overallRating, durationMinutes, confidence ratings
        }
      ]
    };

    const validated = validateExportData(legacySessionJson);
    expect(validated.success).toBe(true);

    await importExportData(legacySessionJson);

    const importedSession = await db.practiceSessions.get('session_legacy_1');
    expect(importedSession).toBeDefined();
    expect(importedSession?.overallRating).toBe(3); // Safe default fallback
    expect(importedSession?.durationMinutes).toBe(5); // Derived from durationSeconds
  });
});
