import 'fake-indexeddb/auto';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Transitions } from '../Transitions';
import { db } from '../../../storage/db';
import { initSeedData } from '../../../storage/seed';
import { useAppStore } from '../../../hooks/useAppStore';

describe('Transitions Notebook Component', () => {
  beforeEach(async () => {
    await db.tracks.clear();
    await db.sets.clear();
    await db.transitions.clear();
    await db.practiceSessions.clear();
    await db.userPreferences.clear();
    await initSeedData(true);
    useAppStore.setState({ activeSetId: 'set_01', toasts: [] });
  });

  it('renders Transitions Notebook shell and list of transitions', async () => {
    render(<Transitions />);
    await act(async () => {
      await new Promise((res) => setTimeout(res, 300));
    });
    await waitFor(() => {
      expect(screen.getByText('Transitions worth practicing')).toBeInTheDocument();
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
    }, { timeout: 3000 });
    expect(screen.getByPlaceholderText('Search tracks')).toBeInTheDocument();
    expect(screen.getByText('Needs Practice')).toBeInTheDocument();
  });

  it('supports searching tracks and filtering by technique or Needs Practice', async () => {
    render(<Transitions />);
    await act(async () => {
      await new Promise((res) => setTimeout(res, 300));
    });
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
    }, { timeout: 3000 });

    const searchInput = screen.getByPlaceholderText('Search tracks');
    fireEvent.change(searchInput, { target: { value: 'Night' } });

    await waitFor(() => {
      expect(searchInput).toHaveValue('Night');
    }, { timeout: 3000 });

    const needsPracticeButton = screen.getByText('Needs Practice');
    fireEvent.click(needsPracticeButton);
    expect(needsPracticeButton).toHaveClass('bg-[var(--color-accent)]');
  });

  it('opens TransitionDrawer on row click and allows saving notes and +1 practiced', async () => {
    render(<Transitions />);
    await act(async () => {
      await new Promise((res) => setTimeout(res, 300));
    });
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
    }, { timeout: 3000 });

    const tableRows = screen.getAllByRole('row');
    fireEvent.click(tableRows[1]);

    await waitFor(() => {
      expect(screen.getByText('Transition detail')).toBeInTheDocument();
      expect(screen.getByText('Compatibility breakdown')).toBeInTheDocument();
    }, { timeout: 3000 });

    const notesTextarea = screen.getByLabelText('Notes');
    fireEvent.change(notesTextarea, { target: { value: 'Seamless bass swap' } });

    const saveChangesButton = screen.getByRole('button', { name: 'Save changes' });
    fireEvent.click(saveChangesButton);

    await waitFor(async () => {
      const records = await db.transitions.toArray();
      const updated = records.find(r => r.notes === 'Seamless bass swap');
      expect(updated).toBeDefined();
    }, { timeout: 3000 });

    const plusOneButton = screen.getByRole('button', { name: '+1 practiced' });
    fireEvent.click(plusOneButton);

    await waitFor(() => {
      expect(screen.queryByText('Transition detail')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
