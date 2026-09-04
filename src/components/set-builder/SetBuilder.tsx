import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLiveQuery } from 'dexie-react-hooks';
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Copy, GripVertical, HelpCircle, History, Plus, Redo2, Undo2, X } from 'lucide-react';
import { calculateSetMetrics } from '../../domain/sets/set-metrics';
import { EnergyProfileSchema, type DJSet, type EnergyProfile, type SetTrackItem } from '../../domain/sets/set';
import type { Track } from '../../domain/tracks/track';
import { scoreTransition } from '../../domain/transitions/overall-scoring';
import { TransitionRecordSchema, type TransitionRecord } from '../../domain/transitions/transition';
import { db } from '../../storage/db';
import { incrementTransitionPractice, reorderSetItems, restoreSetSnapshot, saveTrack, updateSet, updateTransition } from '../../storage/operations';
import { DEFAULT_PREFERENCES } from '../../app/config';
import { CamelotBadge } from '../shared/CamelotBadge';
import { EnergyIndicator } from '../shared/EnergyIndicator';
import { ScoreBadge } from '../shared/ScoreBadge';
import { SaveStatus } from '../shared/SaveStatus';
import { StarRating } from '../shared/StarRating';
import { useAppStore } from '../../hooks/useAppStore';

const panel = 'rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]';
const inputClass = 'w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-2.5 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]';
const buttonClass = 'inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-subtle)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-hover)] hover:text-[var(--color-text-primary)]';

function formatTime(seconds: number): string { return `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`; }

function transitionKey(from: string, to: string): string { return `${from}|${to}`; }

function TransitionConnector({ analysis, onClick, selected }: { analysis: ReturnType<typeof scoreTransition>; onClick: () => void; selected: boolean }) {
  return (
    <button
      onClick={onClick}
      title="Transition compatibility score (0-100): 40% BPM + 30% Key + 20% Energy + 10% Vocals"
      className={`my-1 flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left ${selected ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]' : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] hover:border-[var(--color-border-active)]'}`}
    >
      <span className="text-[var(--color-text-muted)]">↓</span>
      <ScoreBadge score={analysis.overall} size="sm" />
      <span className="text-xs text-[var(--color-text-secondary)]">
        BPM {analysis.bpm.score} · Key {analysis.harmonic.score} · {analysis.energy.label}
      </span>
      {analysis.warnings.length > 0 && <span className="ml-auto text-xs text-[var(--color-status-warning)]">⚠ {analysis.warnings.length}</span>}
    </button>
  );
}

function DraggableLibraryTrack({ track, alreadyInSet }: { track: Track; alreadyInSet: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `library:${track.id}`, data: { trackId: track.id } });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-md border border-transparent p-2 hover:border-[var(--color-border-active)] hover:bg-[var(--color-bg-surface-hover)] ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">{track.title}</div>
          <div className="truncate text-[11px] text-[var(--color-text-secondary)]">{track.artist}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
            <span className="numeric" title="Beats Per Minute">{track.bpm}</span>
            <CamelotBadge camelotKey={track.camelotKey} size="sm" />
            <EnergyIndicator energy={track.energy} size="sm" />
            <span className="rounded bg-[var(--color-bg-base)] px-1 text-[10px] text-[var(--color-text-muted)]">{track.vocalType}</span>
            {alreadyInSet && <span className="ml-auto text-[var(--color-accent-text)]">in set</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableTimelineTrack({ track, item, position, startSeconds, selected, onSelect, onRemove, onDuplicate }: { track: Track; item: SetTrackItem; position: number; startSeconds: number; selected: boolean; onSelect: () => void; onRemove: () => void; onDuplicate: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`group rounded-lg border p-3 ${selected ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]' : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]'}`}>
      <div className="flex items-start gap-2">
        <button className="cursor-grab pt-0.5 text-[var(--color-text-muted)]" {...listeners} {...attributes} aria-label={`Drag ${track.title}`}><GripVertical className="h-4 w-4" /></button>
        <button className="min-w-0 flex-1 text-left" onClick={onSelect}>
          <div className="flex items-center gap-2">
            <span className="numeric text-xs text-[var(--color-accent-text)]">{String(position).padStart(2, '0')}</span>
            <span className="truncate text-sm font-semibold">{track.title}</span>
            <span className="ml-auto shrink-0 text-xs text-[var(--color-text-muted)]">starts {formatTime(startSeconds)}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <span>{track.artist}</span>
            <span className="numeric" title="Beats Per Minute">{track.bpm} BPM</span>
            <CamelotBadge camelotKey={track.camelotKey} size="sm" />
            <EnergyIndicator energy={track.energy} size="sm" showNumeric />
            <span className="rounded-full border border-[var(--color-border-subtle)] px-1.5 py-0.5">{track.familiarity}</span>
            <span className="numeric">{formatTime(track.durationSeconds)}</span>
          </div>
        </button>
        <div className="flex gap-1 opacity-50 group-hover:opacity-100">
          <button className="rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-text)]" title="Duplicate position" onClick={onDuplicate}><Copy className="h-3.5 w-3.5" /></button>
          <button className="rounded p-1 text-[var(--color-text-secondary)] hover:text-red-300" title="Remove from set" onClick={onRemove}><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

export const SetBuilder: React.FC = () => {
  const tracks = useLiveQuery(() => db.tracks.toArray(), []) ?? [];
  const sets = useLiveQuery(() => db.sets.toArray(), []) ?? [];
  const transitions = useLiveQuery(() => db.transitions.toArray(), []) ?? [];
  const preferences = useLiveQuery(() => db.userPreferences.get('default'), []) ?? { id: 'default', ...DEFAULT_PREFERENCES };
  const activeSetId = useAppStore((state) => state.activeSetId);
  const setActiveSetId = useAppStore((state) => state.setActiveSetId);
  const addToast = useAppStore((state) => state.addToast);
  const pushTimeline = useAppStore((state) => state.pushTimeline);
  const undoTimeline = useAppStore((state) => state.undoTimeline);
  const redoTimeline = useAppStore((state) => state.redoTimeline);

  const [items, setItems] = useState<SetTrackItem[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [selected, setSelected] = useState<{ type: 'track' | 'transition'; index: number }>({ type: 'track', index: 0 });
  const [libraryQuery, setLibraryQuery] = useState('');
  const [trackNotes, setTrackNotes] = useState('');
  const [overlap, setOverlap] = useState(45);

  const isMountedRef = useRef(true);
  const pendingSaveCountRef = useRef(0);
  const pendingSaveCountsBySetRef = useRef<Map<string, number>>(new Map());
  const saveStatusBySetRef = useRef<Map<string, 'idle' | 'saving' | 'saved' | 'error'>>(new Map());
  const latestSaveRevisionBySetRef = useRef<Map<string, number>>(new Map());
  const queuesBySetRef = useRef<Map<string, Promise<void>>>(new Map());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const deriveSetSaveStatus = useCallback((setId: string): 'idle' | 'saving' | 'saved' | 'error' => {
    const setPending = pendingSaveCountsBySetRef.current.get(setId) ?? 0;
    if (setPending > 0) return 'saving';
    const status = saveStatusBySetRef.current.get(setId);
    if (status === 'error') return 'error';
    return 'saved';
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const currentSet = sets.find((set) => set.id === activeSetId) ?? sets[0];

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const currentSetIdRef = useRef(currentSet?.id);
  currentSetIdRef.current = currentSet?.id;
  const transitionsRef = useRef(transitions);
  transitionsRef.current = transitions;

  const enqueueSave = useCallback((setId: string, operation: () => Promise<void>): Promise<void> => {
    pendingSaveCountRef.current += 1;
    const currentSetPending = (pendingSaveCountsBySetRef.current.get(setId) ?? 0) + 1;
    pendingSaveCountsBySetRef.current.set(setId, currentSetPending);

    const currentRevision = (latestSaveRevisionBySetRef.current.get(setId) ?? 0) + 1;
    latestSaveRevisionBySetRef.current.set(setId, currentRevision);

    saveStatusBySetRef.current.set(setId, 'saving');

    if (isMountedRef.current && currentSetIdRef.current === setId) {
      setSaveState('saving');
    }

    const prevChain = queuesBySetRef.current.get(setId) ?? Promise.resolve();

    const task = async () => {
      let succeeded = false;
      try {
        await operation();
        succeeded = true;
      } catch {
        succeeded = false;
      } finally {
        pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1);
        const nextSetPending = Math.max(0, (pendingSaveCountsBySetRef.current.get(setId) ?? 1) - 1);
        pendingSaveCountsBySetRef.current.set(setId, nextSetPending);

        const isLatest = latestSaveRevisionBySetRef.current.get(setId) === currentRevision;

        if (isLatest) {
          if (succeeded) {
            saveStatusBySetRef.current.set(setId, 'saved');
          } else {
            saveStatusBySetRef.current.set(setId, 'error');
          }
        }

        if (isMountedRef.current && currentSetIdRef.current === setId) {
          setSaveState(deriveSetSaveStatus(setId));
        }
      }
    };

    const nextChain = prevChain.then(task, task);
    queuesBySetRef.current.set(setId, nextChain);

    return nextChain;
  }, [deriveSetSaveStatus]);

  // Ref-backed synchronous flush on unmount if any save operation is pending
  useEffect(() => {
    return () => {
      if (pendingSaveCountRef.current > 0 && currentSetIdRef.current) {
        const setId = currentSetIdRef.current;
        void enqueueSave(setId, () => reorderSetItems(setId, itemsRef.current, transitionsRef.current));
      }
    };
  }, [enqueueSave]);

  // beforeunload listener protection for unsaved browser close/navigate
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSaveCountRef.current > 0 && currentSetIdRef.current) {
        const setId = currentSetIdRef.current;
        void enqueueSave(setId, () => reorderSetItems(setId, itemsRef.current, transitionsRef.current));
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enqueueSave]);

  useEffect(() => { if (currentSet && currentSet.id !== activeSetId) setActiveSetId(currentSet.id); }, [currentSet, activeSetId, setActiveSetId]);
  useEffect(() => {
    if (currentSet) {
      setItems(currentSet.items);
      setOverlap(preferences.defaultOverlapSeconds);
      setSelected({ type: 'track', index: 0 });
      setSaveState(deriveSetSaveStatus(currentSet.id));
    }
  }, [currentSet?.id, preferences.defaultOverlapSeconds, deriveSetSaveStatus]);

  const setTransitions = useMemo<TransitionRecord[]>(() => {
    if (!currentSet) return [];
    return items.slice(0, -1).map((item, index) => {
      const found = transitions.find((record) => transitionKey(record.fromItemId, record.toItemId) === transitionKey(item.id, items[index + 1].id) && record.setId === currentSet.id);
      return found ?? {
        id: `trans_${currentSet.id}_${item.id}_${items[index + 1].id}`,
        setId: currentSet.id,
        fromItemId: item.id,
        toItemId: items[index + 1].id,
        transitionType: 'blend' as const,
        difficulty: 3,
        practicedCount: 0,
      };
    });
  }, [items, transitions, currentSet]);

  const executeSave = (setId: string, saveItems: SetTrackItem[], saveTransitions: TransitionRecord[]) => {
    return enqueueSave(setId, () => reorderSetItems(setId, saveItems, saveTransitions));
  };

  const handleUndo = () => {
    if (!currentSet) return;
    const next = undoTimeline(currentSet.id, items, setTransitions);
    if (next && next.setId === currentSet.id) {
      setItems(next.items);
      void enqueueSave(currentSet.id, () => restoreSetSnapshot(currentSet.id, next.items, next.transitions));
    }
  };

  const handleRedo = () => {
    if (!currentSet) return;
    const next = redoTimeline(currentSet.id, items, setTransitions);
    if (next && next.setId === currentSet.id) {
      setItems(next.items);
      void enqueueSave(currentSet.id, () => restoreSetSnapshot(currentSet.id, next.items, next.transitions));
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) handleRedo(); else handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items, redoTimeline, undoTimeline, currentSet]);

  const trackMap = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks]);
  const currentTracks = items.map((item) => trackMap.get(item.trackId)).filter((track): track is Track => Boolean(track));
  const profile = currentSet?.energyProfile ?? 'build-to-peak';
  const metrics = calculateSetMetrics(currentTracks, profile, overlap);

  const currentTransition = selected.type === 'transition' && selected.index < items.length - 1 ? transitions.find((record) => transitionKey(record.fromItemId, record.toItemId) === transitionKey(items[selected.index].id, items[selected.index + 1].id) && record.setId === currentSet?.id) : undefined;
  const selectedAnalysis = selected.type === 'transition' && selected.index < metrics.transitions.length ? metrics.transitions[selected.index] : undefined;

  const fallbackTransition = useMemo<TransitionRecord | null>(() => {
    if (selected.type !== 'transition' || selected.index >= items.length - 1 || !currentSet) return null;
    return {
      id: `trans_${currentSet.id}_${items[selected.index].id}_${items[selected.index + 1].id}`,
      setId: currentSet.id,
      fromItemId: items[selected.index].id,
      toItemId: items[selected.index + 1].id,
      transitionType: 'blend' as const,
      difficulty: 3,
      practicedCount: 0,
    };
  }, [selected, items, currentSet]);

  const effectiveTransition = currentTransition ?? fallbackTransition;
  const inspectorTrack = selected.type === 'track' && selected.index < currentTracks.length ? currentTracks[selected.index] : null;

  useEffect(() => {
    if (selected.type === 'track') {
      setTrackNotes(items[selected.index]?.notes ?? '');
    }
  }, [selected.type, selected.index, currentSet?.id]);

  const availableTracks = tracks.filter((track) => `${track.title} ${track.artist}`.toLowerCase().includes(libraryQuery.toLowerCase()));

  // Rapid consecutive edits increment pending counter and update latestSaveRevisionRef
  const markChange = (next: SetTrackItem[]) => {
    if (!currentSet) return;
    pushTimeline(currentSet.id, items, setTransitions);
    setItems(next);
    void executeSave(currentSet.id, next, setTransitions);
  };

  const removeItem = (itemId: string) => {
    const isConfirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm('Are you sure you want to remove this track from the set timeline?')
      : true;

    if (isConfirmed) {
      const next = items.filter((candidate) => candidate.id !== itemId);
      markChange(next);
      if (selected.index >= next.length) setSelected({ type: 'track', index: Math.max(0, next.length - 1) });
    }
  };

  const addItem = (trackId: string, atIndex = items.length) => {
    const next = [...items];
    next.splice(atIndex, 0, { id: `item_${currentSet?.id ?? 'new'}_${Date.now()}`, trackId });
    markChange(next);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || !currentSet) return;
    const activeId = String(active.id);
    if (activeId.startsWith('library:')) {
      const trackId = activeId.replace('library:', '');
      const at = over.id === 'timeline' ? items.length : Math.max(0, items.findIndex((item) => item.id === over.id));
      addItem(trackId, at < 0 ? items.length : at);
      return;
    }
    const from = items.findIndex((item) => item.id === activeId);
    const to = over.id === 'timeline' ? items.length - 1 : items.findIndex((item) => item.id === over.id);
    if (from >= 0 && to >= 0 && from !== to) {
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      markChange(next);
    }
  };

  const newSet = async () => {
    const id = `set_${Date.now()}`;
    const now = new Date().toISOString();
    const set: DJSet = { id, name: 'Untitled set', description: 'A new preparation workspace.', targetDurationMinutes: 60, energyProfile: preferences.defaultEnergyProfile, items: [], trackIds: [], createdAt: now, updatedAt: now };
    await db.sets.add(set);
    setActiveSetId(id);
    if (isMountedRef.current) addToast({ type: 'success', title: 'New set created' });
  };

  const changeProfile = async (next: EnergyProfile) => {
    if (currentSet) await updateSet(currentSet.id, { energyProfile: next });
  };

  const changeOverlap = async (next: number) => {
    const value = Math.max(0, Math.min(300, next));
    setOverlap(value);
    await db.userPreferences.put({ ...preferences, defaultOverlapSeconds: value, updatedAt: new Date().toISOString() });
  };

  const saveInspectorTrack = async (targetTrack?: Track | null) => {
    const target = targetTrack ?? inspectorTrack;
    if (!target || selected.index >= items.length) return;
    await saveTrack(target);
    const next = items.map((item, index) => index === selected.index ? { ...item, notes: trackNotes } : item);
    await executeSave(currentSet!.id, next, setTransitions);
    setItems(next);
    if (isMountedRef.current) addToast({ type: 'success', title: 'Track metadata saved' });
  };

  const saveInspectorTransition = async (draftToSave?: TransitionRecord | null) => {
    const target = draftToSave ?? effectiveTransition;
    if (!target) return;
    const parsed = TransitionRecordSchema.safeParse(target);
    if (!parsed.success) {
      if (isMountedRef.current) addToast({ type: 'error', title: 'Transition could not be saved', message: parsed.error.issues[0]?.message });
      return;
    }
    await updateTransition(parsed.data);
    if (isMountedRef.current) addToast({ type: 'success', title: 'Transition notes saved' });
  };

  const totalWarnings = metrics.transitions.reduce((count, analysis) => count + analysis.warnings.length + (Math.abs(analysis.energy.change) >= 3 ? 1 : 0), 0);
  const chartData = currentTracks.map((track, index) => ({
    position: index + 1,
    bpm: track.bpm,
    energy: track.energy,
    ideal: profile === 'warm-up' ? Math.min(6, 2 + index * 0.5) : profile === 'peak-time' ? 8 + index * 0.2 : profile === 'steady-groove' ? 6 : 4 + index * 0.8
  }));
  const timelineRef = useDroppable({ id: 'timeline' });

  const selectedTrackStartSeconds = selected.type === 'track' && selected.index < currentTracks.length
    ? Math.max(0, currentTracks.slice(0, selected.index).reduce((sum, candidate) => sum + candidate.durationSeconds, 0) - overlap * selected.index)
    : 0;

  const lowestScoreLabel = metrics.lowestScore.fromIndex >= 0
    ? `#${metrics.lowestScore.fromIndex + 1}→#${metrics.lowestScore.toIndex + 1} (${metrics.lowestScore.score})`
    : 'N/A';

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-accent-text)]">Set Builder</p>
            <h2 className="mt-1 text-2xl font-bold">Shape the journey</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Drag tracks into an order, then use the score as a conversation starter.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className={buttonClass} disabled={items.length === 0} onClick={handleUndo}><Undo2 className="h-4 w-4" /> Undo</button>
            <button className={buttonClass} onClick={handleRedo}><Redo2 className="h-4 w-4" /> Redo</button>
            <SaveStatus status={saveState} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3">
          <select className={`${inputClass} max-w-xs`} value={currentSet?.id ?? ''} onChange={(e) => setActiveSetId(e.target.value)}>
            {sets.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}
          </select>
          <button className={buttonClass} onClick={() => void newSet()}><Plus className="h-4 w-4" /> New set</button>
          {currentSet && (
            <>
              <label className="ml-auto flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">Profile
                <select className={`${inputClass} w-auto`} value={profile} onChange={(e) => void changeProfile(e.target.value as EnergyProfile)}>
                  {EnergyProfileSchema.options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <span className="text-xs text-[var(--color-text-muted)]">{currentSet.description}</span>
            </>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-[240px_minmax(420px,1fr)_300px]">
          <aside className={`${panel} p-3`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">Track library</h3>
              <span className="numeric text-xs text-[var(--color-text-muted)]">{availableTracks.length}</span>
            </div>
            <input className={inputClass} placeholder="Search library" value={libraryQuery} onChange={(e) => setLibraryQuery(e.target.value)} />
            <div className="mt-3 max-h-[680px] space-y-1 overflow-y-auto">
              {availableTracks.map((track) => (
                <DraggableLibraryTrack key={track.id} track={track} alreadyInSet={items.some((item) => item.trackId === track.id)} />
              ))}
            </div>
          </aside>

          <section className="min-w-0 space-y-3">
            <div className={`${panel} p-3`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold">{currentSet?.name ?? 'Select a set'}</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">{items.length} tracks · {formatTime(metrics.mixedDurationSeconds)} estimated mixed length</p>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">Drop anywhere in the timeline</span>
              </div>
            </div>

            <div ref={timelineRef.setNodeRef} className={`${panel} min-h-40 p-3 ${timelineRef.isOver ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]' : ''}`}>
              <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                {items.map((item, index) => {
                  const track = trackMap.get(item.trackId);
                  if (!track) return null;
                  const start = currentTracks.slice(0, index).reduce((sum, candidate) => sum + candidate.durationSeconds, 0) - overlap * index;
                  return (
                    <React.Fragment key={item.id}>
                      <SortableTimelineTrack
                        track={track}
                        item={item}
                        position={index + 1}
                        startSeconds={Math.max(0, start)}
                        selected={selected.type === 'track' && selected.index === index}
                        onSelect={() => setSelected({ type: 'track', index })}
                        onRemove={() => removeItem(item.id)}
                        onDuplicate={() => {
                          const next = [...items];
                          next.splice(index + 1, 0, { ...item, id: `item_${currentSet?.id}_${Date.now()}` });
                          markChange(next);
                        }}
                      />
                      {index < items.length - 1 && (
                        <TransitionConnector
                          analysis={metrics.transitions[index]}
                          selected={selected.type === 'transition' && selected.index === index}
                          onClick={() => setSelected({ type: 'transition', index })}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </SortableContext>
              {items.length === 0 && (
                <div className="flex min-h-32 items-center justify-center text-sm text-[var(--color-text-secondary)]">Drag a track here to start the timeline.</div>
              )}
            </div>

            <div className={`${panel} p-3`}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                {[
                  ['Tracks', metrics.totalTracks, 'Total tracks in the set timeline'],
                  ['Raw', formatTime(metrics.rawDurationSeconds), 'Unoverlapped sum of track durations'],
                  ['Mixed', formatTime(metrics.mixedDurationSeconds), 'Estimated set length considering transition overlap'],
                  ['Average', `${metrics.averageScore}/100`, 'Average transition compatibility score (40% BPM + 30% Key + 20% Energy + 10% Vocals)'],
                  ['Lowest', lowestScoreLabel, 'Lowest-scoring adjacent transition pair in the set'],
                  ['BPM', `${metrics.startBpm}→${metrics.endBpm}`, 'Beats Per Minute tempo progression from opening track to closing track'],
                  ['Energy', `${metrics.startEnergy}→${metrics.peakEnergy}`, 'Track energy progression (1-10) from start to peak intensity'],
                  ['Warnings', totalWarnings, 'Number of potential harmonic or vocal transition collision warnings']
                ].map(([label, value, hint]) => (
                  <div key={String(label)} title={String(hint)}>
                    <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
                      {label}
                      <span title={String(hint)}>
                        <HelpCircle className="h-3 w-3 opacity-60" />
                      </span>
                    </div>
                    <div className="mt-1 numeric text-xs font-semibold">{value}</div>
                  </div>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                Overlap assumption <input className={`${inputClass} w-20`} type="number" min="0" max="300" value={overlap} onChange={(e) => void changeOverlap(Number(e.target.value))} /> seconds
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ChartCard title="BPM curve" hint="Tracks tempo progression over time">
                <LineChart data={chartData}>
                  <XAxis dataKey="position" stroke="#808088" fontSize={11} />
                  <YAxis stroke="#808088" fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip contentStyle={{ background: '#242428', border: '1px solid #3E3E46', fontSize: 12 }} />
                  <Line type="monotone" dataKey="bpm" stroke="#D4A843" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ChartCard>

              <ChartCard title="Energy curve" hint="Track energy profile vs ideal profile curve (1-10 rating)">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="position" stroke="#808088" fontSize={11} />
                  <YAxis stroke="#808088" fontSize={11} domain={[1, 10]} />
                  <Tooltip contentStyle={{ background: '#242428', border: '1px solid #3E3E46', fontSize: 12 }} />
                  <Area type="monotone" dataKey="energy" stroke="#60A5FA" fillOpacity={1} fill="url(#energyGrad)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="ideal" stroke="#9A9AA0" strokeDasharray="4 4" strokeWidth={1} dot={false} />
                </AreaChart>
              </ChartCard>
            </div>

            <div className={`${panel} p-3`}>
              <div className="mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[var(--color-accent-text)]" />
                <h3 className="text-sm font-bold" title="Camelot key sequence across the set (1A-12B notation based on Circle of Fifths)">
                  Key flow
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentTracks.map((track, index) => (
                  <React.Fragment key={`${track.id}-${index}`}>
                    <CamelotBadge camelotKey={track.camelotKey} size="sm" />
                    {index < currentTracks.length - 1 && <span className="self-center text-xs text-[var(--color-text-muted)]">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className={`${panel} p-3`}>
              <div className="mb-2 flex items-center gap-2">
                <History className="h-4 w-4 text-[var(--color-status-warning)]" />
                <h3 className="text-sm font-bold">Warning summary</h3>
              </div>
              {metrics.transitions.flatMap((analysis, index) => [...analysis.warnings, ...(Math.abs(analysis.energy.change) >= 3 ? [analysis.energy.label] : [])].map((warning) => (
                <button key={`${index}-${warning}`} onClick={() => setSelected({ type: 'transition', index })} className="mb-1 block w-full rounded px-2 py-1.5 text-left text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-hover)]">
                  <span className="mr-2 numeric text-[var(--color-accent-text)]">{index + 1}→{index + 2}</span>{warning}
                </button>
              )))}
              {totalWarnings === 0 && <p className="text-sm text-[var(--color-text-secondary)]">No warnings in this order. Keep listening critically.</p>}
            </div>

            <p className="px-1 text-xs leading-relaxed text-[var(--color-text-muted)]">Compatibility scores are preparation heuristics. Phrasing, arrangement, EQ, timing and artistic intent remain decisive.</p>
          </section>

          <Inspector
            selected={selected}
            track={inspectorTrack}
            notes={trackNotes}
            setNotes={setTrackNotes}
            saveTrack={saveInspectorTrack}
            transition={selected.type === 'transition' ? (effectiveTransition ?? null) : null}
            saveTransition={saveInspectorTransition}
            markPracticed={() => effectiveTransition && void incrementTransitionPractice(effectiveTransition.id)}
            analysis={selectedAnalysis}
            startSeconds={selectedTrackStartSeconds}
          />
        </div>
      </div>
    </DndContext>
  );
};

function ChartCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactElement }) {
  return (
    <div className={`${panel} p-3`}>
      <div className="mb-2 flex items-center gap-1.5">
        <h3 className="text-sm font-bold">{title}</h3>
        {hint && (
          <span title={hint}>
            <HelpCircle className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          </span>
        )}
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

function Inspector({ selected, track, notes, setNotes, saveTrack, transition, saveTransition, markPracticed, analysis, startSeconds }: { selected: { type: 'track' | 'transition'; index: number }; track: Track | null; notes: string; setNotes: (value: string) => void; saveTrack: (targetTrack?: Track | null) => Promise<void>; transition: TransitionRecord | null; saveTransition: (draft: TransitionRecord) => Promise<void>; markPracticed: () => void; analysis?: ReturnType<typeof scoreTransition>; startSeconds: number }) {
  const [editedTrack, setEditedTrack] = useState<Track | null>(null);
  useEffect(() => { setEditedTrack(null); }, [selected.type, selected.index, track?.id]);
  const activeTrack = editedTrack ?? track;

  const [draft, setDraft] = useState<TransitionRecord | null>(null);
  useEffect(() => { setDraft(null); }, [selected.type, selected.index, transition?.id]);
  const activeDraft = draft ?? transition;

  return (
    <aside className={`${panel} min-w-0 p-4`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[var(--color-accent-text)]">Inspector</p>
          <h3 className="mt-1 text-lg font-bold">{selected.type === 'track' ? 'Track detail' : 'Transition detail'}</h3>
        </div>
        <span className="numeric text-xs text-[var(--color-text-muted)]">{selected.index + 1}{selected.type === 'transition' ? `→${selected.index + 2}` : ''}</span>
      </div>

      {selected.type === 'track' && activeTrack && (
        <div className="space-y-3">
          <div className="rounded-md bg-[var(--color-bg-base)] p-2.5 text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-text-primary)]">Position #{selected.index + 1}</span> · starts at <span className="numeric font-medium text-[var(--color-text-primary)]">{formatTime(startSeconds)}</span>
          </div>
          <Field label="Title"><input className={inputClass} value={activeTrack.title} onChange={(e) => setEditedTrack({ ...activeTrack, title: e.target.value })} /></Field>
          <Field label="Artist"><input className={inputClass} value={activeTrack.artist} onChange={(e) => setEditedTrack({ ...activeTrack, artist: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="BPM" hint="Beats Per Minute tempo"><input className={inputClass} type="number" value={activeTrack.bpm} onChange={(e) => setEditedTrack({ ...activeTrack, bpm: Number(e.target.value) })} /></Field>
            <Field label="Key" hint="Camelot harmonic notation (e.g. 8A, 11B)"><input className={inputClass} value={activeTrack.camelotKey} onChange={(e) => setEditedTrack({ ...activeTrack, camelotKey: e.target.value.toUpperCase() })} /></Field>
            <Field label="Energy" hint="Track energy level (1-10)"><input className={inputClass} type="number" min="1" max="10" value={activeTrack.energy} onChange={(e) => setEditedTrack({ ...activeTrack, energy: Number(e.target.value) })} /></Field>
            <Field label="Familiarity"><select className={inputClass} value={activeTrack.familiarity} onChange={(e) => setEditedTrack({ ...activeTrack, familiarity: e.target.value as Track['familiarity'] })}><option value="new">New</option><option value="practiced">Practiced</option><option value="reliable">Reliable</option></select></Field>
          </div>
          <Field label="Vocal type"><select className={inputClass} value={activeTrack.vocalType} onChange={(e) => setEditedTrack({ ...activeTrack, vocalType: e.target.value as Track['vocalType'] })}><option value="instrumental">Instrumental</option><option value="light-vocal">Light vocal</option><option value="vocal">Vocal</option></select></Field>
          <Field label="Set notes"><textarea className={`${inputClass} min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <button className="w-full rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-accent-fg)]" onClick={() => void saveTrack(activeTrack)}>Save track detail</button>
        </div>
      )}

      {selected.type === 'transition' && activeDraft && transition && (
        <div className="space-y-3">
          {analysis ? (
            <div className="rounded-md bg-[var(--color-bg-base)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" title="Weighted compatibility: 40% BPM, 30% Key, 20% Energy, 10% Vocals">Compatibility</span>
                <ScoreBadge score={analysis.overall} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--color-text-secondary)]">
                <span title="BPM score (40% weight)">BPM <strong className="numeric text-[var(--color-text-primary)]">{analysis.bpm.score}</strong></span>
                <span title="Harmonic score (30% weight)">Key <strong className="numeric text-[var(--color-text-primary)]">{analysis.harmonic.score}</strong></span>
                <span title="Energy score (20% weight)">Energy <strong className="numeric text-[var(--color-text-primary)]">{analysis.energy.score}</strong></span>
                <span title="Vocal score (10% weight)">Vocals <strong className="numeric text-[var(--color-text-primary)]">{analysis.vocal.score}</strong></span>
              </div>
              <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">Rule: {analysis.harmonic.rule}</p>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{analysis.recommendation}</p>
            </div>
          ) : (
            <div className="rounded-md bg-[var(--color-bg-base)] p-3"><p className="text-xs text-[var(--color-text-secondary)]">Recalculating subscores...</p></div>
          )}
          <Field label="Transition type"><select className={inputClass} value={activeDraft.transitionType} onChange={(e) => setDraft({ ...activeDraft, transitionType: e.target.value as TransitionRecord['transitionType'] })}>{['blend', 'eq-swap', 'bass-swap', 'echo-out', 'loop', 'hard-cut', 'vocal-swap', 'other'].map((value) => <option key={value}>{value}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Phrase bars"><select className={inputClass} value={activeDraft.phraseLengthBars ?? 32} onChange={(e) => setDraft({ ...activeDraft, phraseLengthBars: Number(e.target.value) as TransitionRecord['phraseLengthBars'] })}>{[8, 16, 32, 64].map((value) => <option key={value}>{value}</option>)}</select></Field>
            <Field label="Difficulty"><select className={inputClass} value={activeDraft.difficulty} onChange={(e) => setDraft({ ...activeDraft, difficulty: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></Field>
          </div>
          <Field label="Rating"><StarRating value={activeDraft.rating} onChange={(rating) => setDraft({ ...activeDraft, rating })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Outgoing cue"><input className={inputClass} type="number" value={activeDraft.outgoingCueSeconds ?? ''} onChange={(e) => setDraft({ ...activeDraft, outgoingCueSeconds: e.target.value ? Number(e.target.value) : undefined })} /></Field>
            <Field label="Incoming cue"><input className={inputClass} type="number" value={activeDraft.incomingCueSeconds ?? ''} onChange={(e) => setDraft({ ...activeDraft, incomingCueSeconds: e.target.value ? Number(e.target.value) : undefined })} /></Field>
          </div>
          <Field label="Transition notes"><textarea className={`${inputClass} min-h-24`} value={activeDraft.notes ?? ''} onChange={(e) => setDraft({ ...activeDraft, notes: e.target.value })} /></Field>
          <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">Practice suggestion: use a short phrase and listen for the point where the arrangement supports the handoff.</p>
          <div className="flex gap-2">
            <button className="flex-1 rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-accent-fg)]" onClick={() => void saveTransition(activeDraft)}>Save</button>
            <button className={buttonClass} onClick={markPracticed}>+1 practiced</button>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">Practice count: <span className="numeric">{transition.practicedCount}</span> · {transition.lastPracticedAt ? new Date(transition.lastPracticedAt).toLocaleDateString() : 'Not yet practiced'}</p>
        </div>
      )}

      {selected.type === 'track' && !activeTrack && <p className="text-sm text-[var(--color-text-secondary)]">Select a track to inspect it.</p>}
      {selected.type === 'transition' && (!activeDraft || !transition) && <p className="text-sm text-[var(--color-text-secondary)]">Select a connector to inspect it.</p>}
    </aside>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
        {hint && (
          <span title={hint}>
            <HelpCircle className="h-3 w-3 opacity-60" />
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
