import Dexie, { type Table } from 'dexie';
import type { Track } from '../domain/tracks/track';
import type { DJSet } from '../domain/sets/set';
import type { TransitionRecord } from '../domain/transitions/transition';
import type { UserPreferences } from '../app/config';

export interface PracticeStepLog {
  transitionId: string;
  fromItemId: string;
  toItemId: string;
  rating?: number;
  notes?: string;
  durationSeconds?: number;
  practiceCounted?: boolean;
}

export interface PracticeSession {
  id: string;
  setId: string;
  startedAt: string;
  practicedAt?: string;
  completedAt?: string;
  durationSeconds: number;
  durationMinutes?: number;
  overallRating?: number;
  confidenceBefore?: number;
  confidenceAfter?: number;
  mistakes?: string;
  successes?: string;
  nextFocus?: string;
  stepsCompleted: number;
  totalSteps: number;
  notes?: string;
  logs: PracticeStepLog[];
}

export interface UserPreferencesRecord extends UserPreferences {
  id: string; // Fixed primary key: 'default'
  updatedAt?: string;
}

export class SetArchitectDB extends Dexie {
  tracks!: Table<Track, string>;
  sets!: Table<DJSet, string>;
  transitions!: Table<TransitionRecord, string>;
  practiceSessions!: Table<PracticeSession, string>;
  userPreferences!: Table<UserPreferencesRecord, string>;

  constructor() {
    super('SetArchitectDB');
    this.version(1).stores({
      tracks: 'id, title, artist, genre, bpm, camelotKey, energy, vocalType, familiarity, rating, createdAt, updatedAt',
      sets: 'id, name, energyProfile, *trackIds, createdAt, updatedAt',
      transitions: 'id, setId, fromItemId, toItemId, transitionType, difficulty, rating, practicedCount, lastPracticedAt, [setId+fromItemId+toItemId], [setId+fromItemId], [setId+toItemId]',
      practiceSessions: 'id, setId, startedAt, completedAt',
      userPreferences: 'id',
    });
  }
}

export const db = new SetArchitectDB();
