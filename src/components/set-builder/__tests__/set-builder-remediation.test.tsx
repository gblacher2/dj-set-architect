import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { db } from '../../../storage/db';
import { initSeedData } from '../../../storage/seed';
import { SetBuilder } from '../SetBuilder';
import { useAppStore } from '../../../hooks/useAppStore';

describe('SetBuilder Component Remediation Suite', () => {
  beforeEach(async () => {
    await db.tracks.clear();
    await db.sets.clear();
    await db.transitions.clear();
    await db.practiceSessions.clear();
    await db.userPreferences.clear();
    await initSeedData(true);

    useAppStore.setState({
      activeSection: 'set-builder',
      activeSetId: 'set_01',
      timelineHistoryBySet: {},
      timelineRedoBySet: {},
      toasts: [],
    });

    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  const waitForLiveQuery = async () => {
    await act(async () => {
      await new Promise((res) => setTimeout(res, 300));
    });
  };

  it('renders Set Builder with seeded tracks and requires confirmation to remove a track from the set', async () => {
    render(<SetBuilder />);
    await waitForLiveQuery();

    expect(screen.getByText('Shape the journey')).toBeInTheDocument();

    const removeButtons = screen.getAllByTitle('Remove from set');
    expect(removeButtons.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(removeButtons[0]);
      await new Promise((res) => setTimeout(res, 300));
    });

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to remove this track from the set timeline?');

    const setInDb = await db.sets.get('set_01');
    expect(setInDb?.items.length).toBe(7);
  });

  it('persists transition notes after editing and remounting', async () => {
    const { unmount } = render(<SetBuilder />);
    await waitForLiveQuery();

    const connectors = screen.getAllByTitle(/Transition compatibility score/i);
    expect(connectors.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(connectors[0]);
      await new Promise((res) => setTimeout(res, 200));
    });

    expect(screen.getByText('Transition detail')).toBeInTheDocument();
    const notesArea = screen.getByLabelText(/Transition notes/i);

    await act(async () => {
      fireEvent.change(notesArea, { target: { value: 'Remount test note content' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await new Promise((res) => setTimeout(res, 300));
    });

    const transitions = await db.transitions.where('setId').equals('set_01').toArray();
    expect(transitions.some((t) => t.notes === 'Remount test note content')).toBe(true);

    unmount();

    render(<SetBuilder />);
    await waitForLiveQuery();

    const remountedConnectors = screen.getAllByTitle(/Transition compatibility score/i);
    await act(async () => {
      fireEvent.click(remountedConnectors[0]);
      await new Promise((res) => setTimeout(res, 200));
    });

    const reloadedNotes = screen.getByLabelText(/Transition notes/i) as HTMLTextAreaElement;
    expect(reloadedNotes.value).toBe('Remount test note content');
  });

  it('preserves full transition payload on undo action via atomic snapshot restoration', async () => {
    render(<SetBuilder />);
    await waitForLiveQuery();

    const connectors = screen.getAllByTitle(/Transition compatibility score/i);
    await act(async () => {
      fireEvent.click(connectors[0]);
      await new Promise((res) => setTimeout(res, 200));
    });

    const notesArea = screen.getByLabelText(/Transition notes/i);
    await act(async () => {
      fireEvent.change(notesArea, { target: { value: 'Payload to preserve' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await new Promise((res) => setTimeout(res, 300));
    });

    // Remove an item (pushes timeline history)
    const removeButtons = screen.getAllByTitle('Remove from set');
    await act(async () => {
      fireEvent.click(removeButtons[0]);
      await new Promise((res) => setTimeout(res, 300));
    });

    // Trigger Undo
    const undoButton = screen.getByRole('button', { name: /Undo/i });
    await act(async () => {
      fireEvent.click(undoButton);
      await new Promise((res) => setTimeout(res, 300));
    });

    const restoredConnectors = screen.getAllByTitle(/Transition compatibility score/i);
    await act(async () => {
      fireEvent.click(restoredConnectors[0]);
      await new Promise((res) => setTimeout(res, 200));
    });

    const notes = screen.getByLabelText(/Transition notes/i) as HTMLTextAreaElement;
    expect(notes.value).toBe('Payload to preserve');
  });

  it('flushes pending timeline edits on unmount to prevent silent data loss', async () => {
    const { unmount } = render(<SetBuilder />);
    await waitForLiveQuery();

    const duplicateButtons = screen.getAllByTitle('Duplicate position');
    await act(async () => {
      fireEvent.click(duplicateButtons[0]);
      await new Promise((res) => setTimeout(res, 50));
    });

    unmount();

    const setInDb = await db.sets.get('set_01');
    expect(setInDb?.items.length).toBe(9);
  });
});
