import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { db } from '../../../storage/db';
import { initSeedData } from '../../../storage/seed';
import { SetBuilder } from '../SetBuilder';
import { useAppStore } from '../../../hooks/useAppStore';

describe('SetBuilder Cross-Set Undo Isolation Regression Suite', () => {
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

  it('edits Set A (set_01), switches to Set B (set_02), triggers Undo, and proves neither set is corrupted', async () => {
    render(<SetBuilder />);
    await waitForLiveQuery();

    const set1Initial = await db.sets.get('set_01');
    const set2Initial = await db.sets.get('set_02');

    expect(set1Initial?.items.length).toBe(8);
    expect(set2Initial?.items.length).toBe(9);

    // Edit Set A by removing its first item (pushes history for set_01)
    const removeButtonsSetA = screen.getAllByTitle('Remove from set');
    await act(async () => {
      fireEvent.click(removeButtonsSetA[0]);
      await new Promise((res) => setTimeout(res, 300));
    });

    const set1AfterEdit = await db.sets.get('set_01');
    expect(set1AfterEdit?.items.length).toBe(7);

    // Switch to Set B (set_02)
    const setSelect = screen.getAllByRole('combobox')[0];
    await act(async () => {
      fireEvent.change(setSelect, { target: { value: 'set_02' } });
      await new Promise((res) => setTimeout(res, 300));
    });

    expect(useAppStore.getState().activeSetId).toBe('set_02');

    // Trigger Undo while Set B is active
    const undoButton = screen.getByRole('button', { name: /Undo/i });
    await act(async () => {
      fireEvent.click(undoButton);
      await new Promise((res) => setTimeout(res, 300));
    });

    // Verify Set B was NOT corrupted (remains 9 items)
    const set2AfterUndo = await db.sets.get('set_02');
    expect(set2AfterUndo?.items.length).toBe(9);

    // Verify Set A was NOT corrupted or restored while Set B was active (remains 7 items)
    const set1AfterUndo = await db.sets.get('set_01');
    expect(set1AfterUndo?.items.length).toBe(7);

    // Switch back to Set A and trigger Undo
    await act(async () => {
      fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'set_01' } });
      await new Promise((res) => setTimeout(res, 300));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Undo/i }));
      await new Promise((res) => setTimeout(res, 300));
    });

    // Now Set A is properly restored to its 8 items
    const set1Restored = await db.sets.get('set_01');
    expect(set1Restored?.items.length).toBe(8);
  });
});
