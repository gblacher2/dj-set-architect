import 'fake-indexeddb/auto';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SetBuilder } from '../SetBuilder';
import { db } from '../../../storage/db';
import { initSeedData } from '../../../storage/seed';
import { useAppStore } from '../../../hooks/useAppStore';

describe('SetBuilder Component', () => {
  beforeEach(async () => {
    await db.tracks.clear();
    await db.sets.clear();
    await db.transitions.clear();
    await db.practiceSessions.clear();
    await db.userPreferences.clear();
    await initSeedData(true);
    useAppStore.setState({ activeSetId: 'set_01', timelineHistoryBySet: {}, timelineRedoBySet: {}, toasts: [] });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders Set Builder shell and seeded tracks/sets', async () => {
    render(<SetBuilder />);
    await act(async () => {
      await new Promise((res) => setTimeout(res, 300));
    });
    expect(screen.getByText('Shape the journey')).toBeInTheDocument();
    expect(screen.getByText('Track library')).toBeInTheDocument();
    expect(screen.getByLabelText(/Overlap assumption/)).toBeInTheDocument();
    expect(screen.getByText('BPM curve')).toBeInTheDocument();
    expect(screen.getByText('Energy curve')).toBeInTheDocument();
  });

  it('allows inspecting a timeline track and updating track notes', async () => {
    render(<SetBuilder />);
    await act(async () => {
      await new Promise((res) => setTimeout(res, 300));
    });

    const setNotesInput = screen.getByLabelText('Set notes');
    fireEvent.change(setNotesInput, { target: { value: 'Test track note' } });

    const saveButton = screen.getByRole('button', { name: 'Save track detail' });
    await act(async () => {
      fireEvent.click(saveButton);
      await new Promise((res) => setTimeout(res, 400));
    });

    const set = await db.sets.get('set_01');
    expect(set?.items[0].notes).toBe('Test track note');
  });

  it('allows inspecting a transition connector and viewing compatibility subscores', async () => {
    render(<SetBuilder />);
    await act(async () => {
      await new Promise((res) => setTimeout(res, 300));
    });

    const transitionButtons = screen.getAllByTitle(/Transition compatibility score/i);
    expect(transitionButtons.length).toBeGreaterThan(0);

    fireEvent.click(transitionButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Transition detail')).toBeInTheDocument();
      expect(screen.getByText('Compatibility')).toBeInTheDocument();
    });
  });

  it('supports changing energy profile and overlap assumption', async () => {
    render(<SetBuilder />);
    await act(async () => {
      await new Promise((res) => setTimeout(res, 300));
    });

    const profileSelect = screen.getByLabelText('Profile');
    fireEvent.change(profileSelect, { target: { value: 'warm-up' } });

    const overlapInput = screen.getByLabelText(/Overlap assumption/);
    fireEvent.change(overlapInput, { target: { value: '60' } });

    await waitFor(() => {
      expect((overlapInput as HTMLInputElement).value).toBe('60');
    }, { timeout: 3000 });
  });

  it('supports track position duplication and removal', async () => {
    render(<SetBuilder />);
    await act(async () => {
      await new Promise((res) => setTimeout(res, 300));
    });

    const duplicateButtons = screen.getAllByTitle('Duplicate position');
    const initialTrackCount = duplicateButtons.length;

    fireEvent.click(duplicateButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByTitle('Duplicate position').length).toBe(initialTrackCount + 1);
    }, { timeout: 3000 });

    const removeButtons = screen.getAllByTitle('Remove from set');
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByTitle('Duplicate position').length).toBe(initialTrackCount);
    }, { timeout: 3000 });
  });
});
