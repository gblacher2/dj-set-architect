import { describe, expect, it } from 'vitest';
import { parseCsvTracks } from '../tracks/csv';
import { filterTracks, sortTracks } from '../tracks/library';
import type { Track } from '../tracks/track';

const base: Track = { id: 'one', title: 'Amber Line', artist: 'Mira', genre: 'House', bpm: 120, camelotKey: '8A', energy: 5, durationSeconds: 300, vocalType: 'instrumental', familiarity: 'new' };

describe('R4 library domain helpers', () => {
  it('parses required and optional CSV fields', () => {
    const result = parseCsvTracks('title,artist,genre,bpm,camelotKey,energy,durationSeconds,tags\nA,B,House,120,8A,5,300,one|two', (row) => `csv-${row}`);
    expect(result.errors).toEqual([]);
    expect(result.tracks[0]).toMatchObject({ title: 'A', bpm: 120, camelotKey: '8A', tags: ['one', 'two'] });
  });

  it('rejects invalid BPM, energy and Camelot key values', () => {
    const result = parseCsvTracks('title,artist,genre,bpm,camelotKey,energy,durationSeconds\nA,B,House,220,13Z,11,0');
    expect(result.tracks).toHaveLength(0);
    expect(result.errors[0]).toContain('Row 2');
  });

  it('filters by query, range, key and familiarity and sorts deterministically', () => {
    const tracks = [base, { ...base, id: 'two', title: 'Blue Line', bpm: 124, energy: 8, camelotKey: '9A', familiarity: 'reliable' as const }];
    expect(filterTracks(tracks, { query: 'amber', bpmMin: 119, bpmMax: 121 })).toHaveLength(1);
    expect(filterTracks(tracks, { camelotKey: '9A', familiarity: 'reliable' })).toHaveLength(1);
    expect(sortTracks(tracks, 'bpm', 'desc').map((track) => track.id)).toEqual(['two', 'one']);
  });
});
