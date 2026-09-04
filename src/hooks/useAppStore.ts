import { create } from 'zustand';
import type { SetTrackItem } from '../domain/sets/set';
import type { TransitionRecord } from '../domain/transitions/transition';

export type NavSection = 'library' | 'set-builder' | 'transitions' | 'practice';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

export interface TimelineSnapshot {
  setId: string;
  items: SetTrackItem[];
  transitions: TransitionRecord[];
}

interface AppStoreState {
  activeSection: NavSection;
  activeSetId: string | null;
  toasts: ToastMessage[];
  setActiveSection: (section: NavSection) => void;
  setActiveSetId: (setId: string | null) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  timelineHistoryBySet: Record<string, TimelineSnapshot[]>;
  timelineRedoBySet: Record<string, TimelineSnapshot[]>;
  pushTimeline: (setId: string, items: SetTrackItem[], transitions?: TransitionRecord[]) => void;
  undoTimeline: (setId: string, currentItems: SetTrackItem[], currentTransitions?: TransitionRecord[]) => TimelineSnapshot | null;
  redoTimeline: (setId: string, currentItems: SetTrackItem[], currentTransitions?: TransitionRecord[]) => TimelineSnapshot | null;
  clearTimelineHistory: () => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  activeSection: 'set-builder',
  activeSetId: null,
  toasts: [],
  timelineHistoryBySet: {},
  timelineRedoBySet: {},
  setActiveSection: (section) => set({ activeSection: section }),
  setActiveSetId: (setId) => set({ activeSetId: setId }),
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  pushTimeline: (setId, items, transitions = []) => set((state) => {
    if (!setId) return state;
    const history = state.timelineHistoryBySet[setId] ?? [];
    return {
      timelineHistoryBySet: {
        ...state.timelineHistoryBySet,
        [setId]: [
          ...history,
          {
            setId,
            items: items.map((item) => ({ ...item })),
            transitions: transitions.map((t) => ({ ...t })),
          }
        ].slice(-30)
      },
      timelineRedoBySet: {
        ...state.timelineRedoBySet,
        [setId]: []
      }
    };
  }),
  undoTimeline: (setId, currentItems, currentTransitions = []) => {
    let previous: TimelineSnapshot | null = null;
    set((state) => {
      if (!setId) return state;
      const history = [...(state.timelineHistoryBySet[setId] ?? [])];
      if (history.length === 0) return state;

      const candidate = history.pop() ?? null;
      if (!candidate || candidate.setId !== setId) return state;

      previous = candidate;
      const redo = [...(state.timelineRedoBySet[setId] ?? [])];
      const currentSnapshot: TimelineSnapshot = {
        setId,
        items: currentItems.map((item) => ({ ...item })),
        transitions: currentTransitions.map((t) => ({ ...t })),
      };

      return {
        timelineHistoryBySet: {
          ...state.timelineHistoryBySet,
          [setId]: history
        },
        timelineRedoBySet: {
          ...state.timelineRedoBySet,
          [setId]: [...redo, currentSnapshot].slice(-30)
        }
      };
    });
    return previous;
  },
  redoTimeline: (setId, currentItems, currentTransitions = []) => {
    let next: TimelineSnapshot | null = null;
    set((state) => {
      if (!setId) return state;
      const redo = [...(state.timelineRedoBySet[setId] ?? [])];
      if (redo.length === 0) return state;

      const candidate = redo.pop() ?? null;
      if (!candidate || candidate.setId !== setId) return state;

      next = candidate;
      const history = [...(state.timelineHistoryBySet[setId] ?? [])];
      const currentSnapshot: TimelineSnapshot = {
        setId,
        items: currentItems.map((item) => ({ ...item })),
        transitions: currentTransitions.map((t) => ({ ...t })),
      };

      return {
        timelineRedoBySet: {
          ...state.timelineRedoBySet,
          [setId]: redo
        },
        timelineHistoryBySet: {
          ...state.timelineHistoryBySet,
          [setId]: [...history, currentSnapshot].slice(-30)
        }
      };
    });
    return next;
  },
  clearTimelineHistory: () => set({ timelineHistoryBySet: {}, timelineRedoBySet: {} })
}));
