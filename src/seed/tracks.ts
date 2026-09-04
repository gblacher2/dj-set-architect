import type { Track } from '../domain/tracks/track';

const DEFAULT_TIMESTAMP = '2026-08-01T12:00:00.000Z';
const GENRES = ['House', 'Deep House', 'Disco House', 'Melodic House', 'Tech House', 'Afro House'] as const;

const seedRows = [
  ['Sunlit Steps', 'Mira Sol', 'House', 116, '1A', 2, 'instrumental', 'reliable', 340],
  ['Cedar Lounge', 'Nilo Frame', 'Deep House', 117, '1B', 3, 'light-vocal', 'practiced', 368],
  ['Soft Focus', 'Lumen Vale', 'Disco House', 118, '2A', 3, 'vocal', 'new', 352],
  ['Terrace Lines', 'Ari Coast', 'Melodic House', 119, '2B', 4, 'instrumental', 'reliable', 390],
  ['Paper Lanterns', 'Kite Season', 'Tech House', 120, '3A', 4, 'light-vocal', 'practiced', 330],
  ['Mango Current', 'Rio Bloom', 'Afro House', 120, '3B', 5, 'vocal', 'new', 375],
  ['Amber Steps', 'North Atlas', 'House', 121, '4A', 5, 'instrumental', 'reliable', 360],
  ['Dusk on 5th', 'Vela Room', 'Deep House', 121, '4B', 6, 'light-vocal', 'practiced', 402],
  ['Open Windows', 'Sora Field', 'Disco House', 122, '5A', 6, 'instrumental', 'reliable', 348],
  ['Neat Horizon', 'Glass Garden', 'Melodic House', 123, '5B', 7, 'light-vocal', 'new', 380],
  ['Signal Bloom', 'Mono Palm', 'Tech House', 124, '6A', 8, 'vocal', 'practiced', 342],
  ['Cobalt Morning', 'Iris Static', 'Afro House', 124, '6B', 9, 'instrumental', 'reliable', 365],
  ['Quiet Geometry', 'Aster Lane', 'House', 125, '7A', 8, 'light-vocal', 'new', 355],
  ['Rooftop Cinema', 'Nova June', 'Deep House', 125, '7B', 9, 'vocal', 'practiced', 374],
  ['Velvet Transit', 'Orchid Unit', 'Disco House', 126, '8A', 10, 'instrumental', 'reliable', 326],
  ['Copper Sky', 'Field Notes', 'Melodic House', 126, '8B', 9, 'light-vocal', 'new', 396],
  ['Late Checkout', 'Pillar Park', 'Tech House', 127, '9A', 10, 'vocal', 'practiced', 338],
  ['Palm Theory', 'Mosaic Sun', 'Afro House', 127, '9B', 8, 'instrumental', 'reliable', 410],
  ['Blue Hour Relay', 'Civic Bloom', 'House', 128, '10A', 9, 'light-vocal', 'new', 346],
  ['Marble Echo', 'Lowlight Club', 'Deep House', 128, '10B', 10, 'vocal', 'practiced', 358],
  ['Slow Orbit', 'Kora Miles', 'Disco House', 118, '11A', 3, 'instrumental', 'reliable', 370],
  ['Golden Thread', 'Sunroom Assembly', 'Melodic House', 119, '11B', 4, 'light-vocal', 'new', 382],
  ['Sidewalk Heat', 'Transit Club', 'Tech House', 122, '12A', 7, 'vocal', 'practiced', 334],
  ['Garden Frequency', 'Ava Meridian', 'Afro House', 123, '12B', 6, 'instrumental', 'reliable', 388],
  ['Afterglow Index', 'West Arcade', 'House', 120, '1A', 5, 'light-vocal', 'new', 344],
  ['Honey Circuit', 'Cleo Park', 'Deep House', 121, '2B', 6, 'vocal', 'practiced', 362],
  ['Mirage Social', 'Canto Verde', 'Disco House', 124, '6B', 7, 'instrumental', 'reliable', 350],
  ['Linen Motion', 'Swell Theory', 'Melodic House', 125, '8A', 8, 'light-vocal', 'new', 378],
  ['Night Orchard', 'Sable West', 'Tech House', 126, '10A', 9, 'vocal', 'practiced', 341],
  ['Final Terrace', 'Eon Harbor', 'Afro House', 128, '12B', 10, 'instrumental', 'reliable', 399],
] as const;

export const SEED_TRACKS: Track[] = seedRows.map((row, index) => ({
  id: `trk_${String(index + 1).padStart(2, '0')}`,
  title: row[0], artist: row[1], genre: row[2], bpm: row[3], camelotKey: row[4], energy: row[5], vocalType: row[6], familiarity: row[7], durationSeconds: row[8],
  rating: ((index % 5) + 1), tags: [row[2].toLowerCase(), index < 10 ? 'warm-up' : 'peak-time'], createdAt: DEFAULT_TIMESTAMP, updatedAt: DEFAULT_TIMESTAMP,
}));

export const SEED_GENRES = GENRES;
