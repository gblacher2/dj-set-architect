import type { Track, Familiarity } from './track';

export interface TrackFilters {
  query?: string;
  genre?: string;
  bpmMin?: number;
  bpmMax?: number;
  energyMin?: number;
  energyMax?: number;
  camelotKey?: string;
  familiarity?: Familiarity | '';
}

export function filterTracks(tracks: Track[], filters: TrackFilters): Track[] {
  const query = filters.query?.trim().toLowerCase() ?? '';
  return tracks.filter((track) => {
    const matchesQuery = !query || `${track.title} ${track.artist}`.toLowerCase().includes(query);
    const matchesGenre = !filters.genre || track.genre === filters.genre;
    const matchesBpm = (filters.bpmMin === undefined || track.bpm >= filters.bpmMin) && (filters.bpmMax === undefined || track.bpm <= filters.bpmMax);
    const matchesEnergy = (filters.energyMin === undefined || track.energy >= filters.energyMin) && (filters.energyMax === undefined || track.energy <= filters.energyMax);
    const matchesKey = !filters.camelotKey || track.camelotKey === filters.camelotKey;
    const matchesFamiliarity = !filters.familiarity || track.familiarity === filters.familiarity;
    return matchesQuery && matchesGenre && matchesBpm && matchesEnergy && matchesKey && matchesFamiliarity;
  });
}

export function sortTracks(tracks: Track[], sort: 'bpm' | 'energy' | 'title' | 'rating', direction: 'asc' | 'desc'): Track[] {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...tracks].sort((a, b) => {
    const left = sort === 'title' ? a.title.toLowerCase() : sort === 'rating' ? (a.rating ?? 0) : a[sort];
    const right = sort === 'title' ? b.title.toLowerCase() : sort === 'rating' ? (b.rating ?? 0) : b[sort];
    return (left < right ? -1 : left > right ? 1 : 0) * multiplier;
  });
}
