import { TrackSchema, type Track } from './track';

export interface CsvImportResult {
  tracks: Track[];
  errors: string[];
  rows: string[][];
}

function parseLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
    else cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

const required = ['title', 'artist', 'genre', 'bpm', 'camelotKey', 'energy', 'durationSeconds'];

export function parseCsvTracks(csv: string, idFactory = (row: number) => `csv_${Date.now()}_${row}`): CsvImportResult {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { tracks: [], errors: ['CSV is empty.'], rows: [] };
  const headers = parseLine(lines[0]).map((header) => header.trim());
  const missing = required.filter((field) => !headers.includes(field));
  if (missing.length > 0) return { tracks: [], errors: [`Missing required field(s): ${missing.join(', ')}`], rows: [] };
  const tracks: Track[] = [];
  const errors: string[] = [];
  const rows: string[][] = [];
  lines.slice(1).forEach((line, offset) => {
    const cells = parseLine(line);
    rows.push(cells);
    const value = (field: string) => cells[headers.indexOf(field)]?.trim() ?? '';
    const rowNumber = offset + 2;
    const track = {
      id: idFactory(rowNumber), title: value('title'), artist: value('artist'), genre: value('genre'), subgenre: value('subgenre') || undefined,
      bpm: Number(value('bpm')), camelotKey: value('camelotKey').toUpperCase(), energy: Number(value('energy')), durationSeconds: Number(value('durationSeconds')),
      vocalType: (value('vocalType') || 'instrumental') as Track['vocalType'], familiarity: (value('familiarity') || 'new') as Track['familiarity'],
      rating: value('rating') ? Number(value('rating')) : undefined, tags: value('tags') ? value('tags').split(/[|;]/).map((tag) => tag.trim()).filter(Boolean) : [], notes: value('notes') || undefined,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const validated = TrackSchema.safeParse(track);
    if (!validated.success) errors.push(`Row ${rowNumber}: ${validated.error.issues.map((issue) => issue.message).join(', ')}`);
    else tracks.push(validated.data);
  });
  return { tracks, errors, rows };
}

export const SAMPLE_CSV = `title,artist,genre,bpm,camelotKey,energy,durationSeconds,subgenre,vocalType,familiarity,rating,tags,notes\nGolden Hour,Sample Artist,Deep House,120,8A,5,360,Deep,instrumental,new,4,sunset|warm-up,`;
