import type { DJSet } from '../domain/sets/set';
import type { TransitionRecord } from '../domain/transitions/transition';

const DEFAULT_TIMESTAMP = '2026-08-01T12:00:00.000Z';

export const SEED_SETS: DJSet[] = [
  {
    id: 'set_01', name: 'Sunset Warm-Up', description: 'A patient House journey from first light into a comfortable groove.', energyProfile: 'warm-up', targetDurationMinutes: 48,
    items: [
      { id: 'item_01_1', trackId: 'trk_02', notes: 'Open with room to breathe' }, { id: 'item_01_2', trackId: 'trk_01', notes: 'Keep the low end gentle' },
      { id: 'item_01_3', trackId: 'trk_03' }, { id: 'item_01_4', trackId: 'trk_04' }, { id: 'item_01_5', trackId: 'trk_05' },
      { id: 'item_01_6', trackId: 'trk_06' }, { id: 'item_01_7', trackId: 'trk_07' }, { id: 'item_01_8', trackId: 'trk_21', notes: 'Leave the room ready for lift-off' },
    ], trackIds: ['trk_02', 'trk_01', 'trk_03', 'trk_04', 'trk_05', 'trk_06', 'trk_07', 'trk_21'], createdAt: DEFAULT_TIMESTAMP, updatedAt: DEFAULT_TIMESTAMP,
  },
  {
    id: 'set_02', name: 'Peak-Time Practice', description: 'A focused peak-time run with two deliberate harmonic and energy challenges.', energyProfile: 'peak-time', targetDurationMinutes: 58,
    items: [
      { id: 'item_02_1', trackId: 'trk_09', notes: 'Set the floor at a steady peak' }, { id: 'item_02_2', trackId: 'trk_08' },
      { id: 'item_02_3', trackId: 'trk_11' }, { id: 'item_02_4', trackId: 'trk_12', notes: 'Practice the vocal handoff' },
      { id: 'item_02_5', trackId: 'trk_13' }, { id: 'item_02_6', trackId: 'trk_08' }, { id: 'item_02_7', trackId: 'trk_14' },
      { id: 'item_02_8', trackId: 'trk_15' }, { id: 'item_02_9', trackId: 'trk_16', notes: 'Intentional reset before the final push' },
    ], trackIds: ['trk_09', 'trk_08', 'trk_11', 'trk_12', 'trk_13', 'trk_08', 'trk_14', 'trk_15', 'trk_16'], createdAt: DEFAULT_TIMESTAMP, updatedAt: DEFAULT_TIMESTAMP,
  },
];

function transitionFor(set: DJSet, index: number): TransitionRecord {
  const from = set.items[index];
  const to = set.items[index + 1];
  return {
    id: `trans_${set.id === 'set_01' ? '01' : '02'}_${index + 1}`, setId: set.id, fromItemId: from.id, toItemId: to.id,
    transitionType: index % 3 === 0 ? 'blend' : index % 3 === 1 ? 'eq-swap' : 'bass-swap', phraseLengthBars: index % 2 === 0 ? 32 : 16,
    difficulty: set.id === 'set_02' && (index === 2 || index === 5) ? 5 : Math.min(4, index + 2), rating: index === 0 ? 4 : undefined,
    notes: index === 2 ? 'Short handoff: listen for the phrase boundary.' : undefined, practicedCount: index === 0 ? 3 : index === 1 ? 1 : 0,
  };
}

export const SEED_TRANSITIONS: TransitionRecord[] = SEED_SETS.flatMap((set) => set.items.slice(0, -1).map((_, index) => transitionFor(set, index)));
