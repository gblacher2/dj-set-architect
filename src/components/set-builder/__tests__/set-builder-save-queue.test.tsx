import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { db } from '../../../storage/db';
import { initSeedData } from '../../../storage/seed';
import * as operations from '../../../storage/operations';
import { SetBuilder } from '../SetBuilder';
import { useAppStore } from '../../../hooks/useAppStore';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('SetBuilder Serialized Save Queue Ordering & Persistence Verification Suite', () => {
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

  it('serializes rapid edits: hold save 1 proves save 2 has not begun persistence before save 1 settles, and final DB state is the second edit (10 items)', async () => {
    const deferred1 = createDeferred<void>();
    const deferred2 = createDeferred<void>();

    const realReorderSetItems = operations.reorderSetItems;
    const reorderCalls: Array<{ setId: string; itemCount: number }> = [];

    vi.spyOn(operations, 'reorderSetItems').mockImplementation((setId, items, transitions) => {
      const callIndex = reorderCalls.length + 1;
      reorderCalls.push({ setId, itemCount: items.length });

      if (callIndex === 1) {
        return deferred1.promise.then(() => realReorderSetItems(setId, items, transitions));
      }
      if (callIndex === 2) {
        return deferred2.promise.then(() => realReorderSetItems(setId, items, transitions));
      }
      return realReorderSetItems(setId, items, transitions);
    });

    render(<SetBuilder />);
    await waitForLiveQuery();

    const initialSet = await db.sets.get('set_01');
    expect(initialSet?.items.length).toBe(8);

    const duplicateButtons = screen.getAllByTitle('Duplicate position');

    // Trigger Edit #1 (duplicate item 0)
    await act(async () => {
      fireEvent.click(duplicateButtons[0]);
    });

    // Save #1 has started persistence
    expect(reorderCalls.length).toBe(1);

    // Trigger Edit #2 immediately while Save #1 is held
    await act(async () => {
      fireEvent.click(duplicateButtons[1]);
    });

    // PROOF OF SERIALIZATION: Save #2 has NOT begun persistence before save 1 settles!
    expect(reorderCalls.length).toBe(1);

    // Release Save #1
    await act(async () => {
      deferred1.resolve();
      await new Promise((res) => setTimeout(res, 50));
    });

    // Save #2 has now begun persistence after save 1 settled!
    expect(reorderCalls.length).toBe(2);

    // Release Save #2
    await act(async () => {
      deferred2.resolve();
      await new Promise((res) => setTimeout(res, 100));
    });

    // Verify UI save state returns to Saved once all pending operations settle
    expect(screen.getByText(/Saved/i)).toBeInTheDocument();

    // Verify final persisted set in DB reflects second edit (10 items total)
    const finalSet = await db.sets.get('set_01');
    expect(finalSet?.items.length).toBe(10);
  });

  it('ensures an earlier failed save does not poison the queue so later saves still run and succeed', async () => {
    const deferred1 = createDeferred<void>();
    const deferred2 = createDeferred<void>();

    const realReorderSetItems = operations.reorderSetItems;
    const reorderCalls: Array<{ setId: string; itemCount: number }> = [];

    vi.spyOn(operations, 'reorderSetItems').mockImplementation((setId, items, transitions) => {
      const callIndex = reorderCalls.length + 1;
      reorderCalls.push({ setId, itemCount: items.length });

      if (callIndex === 1) {
        return deferred1.promise.then(() => {
          throw new Error('Save 1 failed');
        });
      }
      if (callIndex === 2) {
        return deferred2.promise.then(() => realReorderSetItems(setId, items, transitions));
      }
      return realReorderSetItems(setId, items, transitions);
    });

    render(<SetBuilder />);
    await waitForLiveQuery();

    const duplicateButtons = screen.getAllByTitle('Duplicate position');

    // Trigger Edit #1
    await act(async () => {
      fireEvent.click(duplicateButtons[0]);
    });

    // Trigger Edit #2
    await act(async () => {
      fireEvent.click(duplicateButtons[1]);
    });

    expect(reorderCalls.length).toBe(1);

    // Reject Save 1
    await act(async () => {
      deferred1.reject(new Error('Save 1 failed'));
      await new Promise((res) => setTimeout(res, 50));
    });

    // Save 2 should still run despite Save 1 failing!
    expect(reorderCalls.length).toBe(2);

    // Resolve Save 2
    await act(async () => {
      deferred2.resolve();
      await new Promise((res) => setTimeout(res, 100));
    });

    expect(screen.getByText(/Saved/i)).toBeInTheDocument();
    const finalSet = await db.sets.get('set_01');
    expect(finalSet?.items.length).toBe(10);
  });

  it('preserves unload protection until all queued saves settle, even when changing active set', async () => {
    const deferred1 = createDeferred<void>();
    const realReorderSetItems = operations.reorderSetItems;

    vi.spyOn(operations, 'reorderSetItems').mockImplementation((setId, items, transitions) => {
      return deferred1.promise.then(() => realReorderSetItems(setId, items, transitions));
    });

    render(<SetBuilder />);
    await waitForLiveQuery();

    const duplicateButtons = screen.getAllByTitle('Duplicate position');

    // Trigger Edit #1 on set_01
    await act(async () => {
      fireEvent.click(duplicateButtons[0]);
    });

    // Switch active set to set_02 while save 1 is still in-flight
    const setSelect = screen.getByDisplayValue('Sunset Warm-Up');
    await act(async () => {
      fireEvent.change(setSelect, { target: { value: 'set_02' } });
    });

    // Dispatch beforeunload event
    const beforeUnloadEvent = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(beforeUnloadEvent);

    // Unload protection should still be active because set_01 save is still in flight!
    expect(beforeUnloadEvent.defaultPrevented).toBe(true);

    // Resolve save 1
    await act(async () => {
      deferred1.resolve();
      await new Promise((res) => setTimeout(res, 50));
    });

    // Dispatch beforeunload event again
    const settledUnloadEvent = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(settledUnloadEvent);

    expect(settledUnloadEvent.defaultPrevented).toBe(false);
  });

  it('tracks save status per active set independently, returning set A to Saved when A settles even while set B remains pending', async () => {
    const deferredA = createDeferred<void>();
    const deferredB = createDeferred<void>();

    const realReorderSetItems = operations.reorderSetItems;
    const reorderCalls: Array<{ setId: string }> = [];

    vi.spyOn(operations, 'reorderSetItems').mockImplementation((setId, items, transitions) => {
      reorderCalls.push({ setId });
      if (setId === 'set_01') {
        return deferredA.promise.then(() => realReorderSetItems(setId, items, transitions));
      }
      if (setId === 'set_02') {
        return deferredB.promise.then(() => realReorderSetItems(setId, items, transitions));
      }
      return realReorderSetItems(setId, items, transitions);
    });

    render(<SetBuilder />);
    await waitForLiveQuery();

    // 1. Start delayed save for set_01 (Set A)
    const duplicateButtonsA = screen.getAllByTitle('Duplicate position');
    await act(async () => {
      fireEvent.click(duplicateButtonsA[0]);
    });
    expect(reorderCalls.some((call) => call.setId === 'set_01')).toBe(true);

    // Switch to set_02 (Set B)
    const setSelect = screen.getByDisplayValue('Sunset Warm-Up');
    await act(async () => {
      fireEvent.change(setSelect, { target: { value: 'set_02' } });
    });
    await waitForLiveQuery();

    // Start delayed save for set_02 (Set B)
    const duplicateButtonsB = screen.getAllByTitle('Duplicate position');
    await act(async () => {
      fireEvent.click(duplicateButtonsB[0]);
    });
    expect(reorderCalls.some((call) => call.setId === 'set_02')).toBe(true);

    // 2. Switch back to set_01 (Set A) while both saves are pending
    await act(async () => {
      fireEvent.change(screen.getByDisplayValue('Peak-Time Practice'), { target: { value: 'set_01' } });
    });
    await waitForLiveQuery();

    // Set A should display Saving while A's save is pending
    expect(screen.getByText(/Saving/i)).toBeInTheDocument();

    // 3. Resolve Set A only
    await act(async () => {
      deferredA.resolve();
      await new Promise((res) => setTimeout(res, 50));
    });

    // UI for Set A becomes Saved
    expect(screen.getByText(/Saved/i)).toBeInTheDocument();

    // 4. Keep B pending: A must remain Saved, but global unload protection is still active for B
    const beforeUnloadEvent = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(beforeUnloadEvent);
    expect(beforeUnloadEvent.defaultPrevented).toBe(true);
    expect(screen.getByText(/Saved/i)).toBeInTheDocument();

    // 5. Resolve B and confirm global unload protection clears only then
    await act(async () => {
      deferredB.resolve();
      await new Promise((res) => setTimeout(res, 50));
    });

    const settledUnloadEvent = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(settledUnloadEvent);
    expect(settledUnloadEvent.defaultPrevented).toBe(false);
  });
});
