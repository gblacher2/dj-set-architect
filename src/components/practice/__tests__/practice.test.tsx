import 'fake-indexeddb/auto';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Practice } from '../Practice';
import { db } from '../../../storage/db';
import { initSeedData } from '../../../storage/seed';
import { useAppStore } from '../../../hooks/useAppStore';

describe('Practice Log Component', () => {
  beforeEach(async () => {
    await db.tracks.clear();
    await db.sets.clear();
    await db.transitions.clear();
    await db.practiceSessions.clear();
    await db.userPreferences.clear();
    await initSeedData(true);
    useAppStore.setState({ toasts: [] });
  });

  it('renders Practice Log shell and loads first set', async () => {
    render(<Practice />);
    await act(async () => {
      await new Promise((res) => setTimeout(res, 300));
    });
    expect(screen.getByText('Turn a plan into muscle memory')).toBeInTheDocument();
    expect(screen.getByText('Current transition')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start practice/i })).toBeInTheDocument();
  });

  it('allows starting practice session, timer control, and step navigation', async () => {
    render(<Practice />);
    await act(async () => {
      await new Promise((res) => setTimeout(res, 300));
    });

    const startButton = screen.getByRole('button', { name: /Start practice/i });
    fireEvent.click(startButton);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();

    const markPracticedButton = screen.getByRole('button', { name: 'Mark transition practiced' });
    fireEvent.click(markPracticedButton);

    await waitFor(async () => {
      const records = await db.transitions.toArray();
      const practiced = records.find(r => r.practicedCount > 0);
      expect(practiced).toBeDefined();
    }, { timeout: 3000 });

    const nextButton = screen.getByRole('button', { name: 'Next →' });
    fireEvent.click(nextButton);

    const prevButton = screen.getByRole('button', { name: '← Previous' });
    expect(prevButton).not.toBeDisabled();
    fireEvent.click(prevButton);
  });

  it('supports ending session and saving end-of-session review form', async () => {
    render(<Practice />);
    await act(async () => {
      await new Promise((res) => setTimeout(res, 300));
    });

    fireEvent.click(screen.getByRole('button', { name: /Start practice/i }));

    const endSessionButton = screen.getByRole('button', { name: /End session/i });
    fireEvent.click(endSessionButton);

    await waitFor(() => {
      expect(screen.getByText('What did you learn?')).toBeInTheDocument();
    });

    const starContainer = screen.getByText('Overall rating').parentElement;
    const stars = starContainer?.querySelectorAll('button');
    if (stars && stars.length >= 4) {
      fireEvent.click(stars[3]); // 4-star rating
    }

    const successesInput = screen.getByLabelText('What went well');
    fireEvent.change(successesInput, { target: { value: 'Great phrasing on transition 2' } });

    const saveSessionButton = screen.getByRole('button', { name: 'Save session' });
    expect(saveSessionButton).not.toBeDisabled();
    fireEvent.click(saveSessionButton);

    await waitFor(async () => {
      const sessions = await db.practiceSessions.toArray();
      expect(sessions.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});
