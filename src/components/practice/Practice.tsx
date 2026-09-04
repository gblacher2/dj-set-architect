import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Clock3, Play, RotateCcw, Square } from 'lucide-react';
import { db, type PracticeSession, type PracticeStepLog } from '../../storage/db';
import { incrementTransitionPractice, savePracticeSession, updateTransition } from '../../storage/operations';
import { scoreTransition } from '../../domain/transitions/overall-scoring';
import type { TransitionRecord } from '../../domain/transitions/transition';
import { StarRating } from '../shared/StarRating';
import { EmptyState } from '../shared/EmptyState';
import { useAppStore } from '../../hooks/useAppStore';
import { usePracticeTimer } from './usePracticeTimer';

const inputClass = 'w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-2.5 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]';
const buttonClass = 'inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-subtle)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-hover)] hover:text-[var(--color-text-primary)]';
const primaryButton = 'inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)]';

function formatTime(seconds: number): string { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

export const Practice: React.FC = () => {
  const sets = useLiveQuery(() => db.sets.toArray(), []) ?? [];
  const tracks = useLiveQuery(() => db.tracks.toArray(), []) ?? [];
  const transitions = useLiveQuery(() => db.transitions.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.practiceSessions.toArray(), []) ?? [];
  const addToast = useAppStore((state) => state.addToast);
  const [setId, setSetId] = useState('');

  const timer = usePracticeTimer();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});
  const [stepRatings, setStepRatings] = useState<Record<string, number>>({});
  const [reviewing, setReviewing] = useState(false);
  const [confidenceBefore, setConfidenceBefore] = useState(5);
  const [confidenceAfter, setConfidenceAfter] = useState(5);
  const [overallRating, setOverallRating] = useState(0);
  const [successes, setSuccesses] = useState('');
  const [mistakes, setMistakes] = useState('');
  const [nextFocus, setNextFocus] = useState('');
  const [manualDuration, setManualDuration] = useState('');

  useEffect(() => { if (!setId && sets[0]) setSetId(sets[0].id); }, [sets, setId]);

  const set = sets.find((candidate) => candidate.id === setId);
  const trackMap = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks]);
  const setTracks = set?.items.map((item) => trackMap.get(item.trackId)).filter((track): track is NonNullable<typeof track> => Boolean(track)) ?? [];
  const setTransitions = set?.items.slice(0, -1).map((item, index) => transitions.find((record) => record.setId === setId && record.fromItemId === item.id && record.toItemId === set.items[index + 1].id)).filter((record): record is TransitionRecord => Boolean(record)) ?? [];
  const currentTransition = setTransitions[currentIndex];
  const fromItem = set?.items[currentIndex]; const toItem = set?.items[currentIndex + 1]; const from = fromItem ? trackMap.get(fromItem.trackId) : undefined; const to = toItem ? trackMap.get(toItem.trackId) : undefined; const analysis = from && to && set ? scoreTransition(from, to, set.energyProfile) : null;

  const begin = () => { timer.start(); setReviewing(false); setMarked(new Set()); setCurrentIndex(0); };
  const markCurrent = async () => { if (!currentTransition) return; if (!marked.has(currentTransition.id)) { await incrementTransitionPractice(currentTransition.id); setMarked((current) => new Set(current).add(currentTransition.id)); addToast({ type: 'success', title: 'Transition marked practiced' }); } };
  const saveStep = async (rating: number) => { if (!currentTransition) return; setStepRatings({ ...stepRatings, [currentTransition.id]: rating }); await updateTransition({ ...currentTransition, rating }); };
  const endSession = () => { timer.pause(); setReviewing(true); };

  const saveReview = async () => {
    if (!set || overallRating < 1) return;
    const durationSeconds = manualDuration ? Math.max(0, Number(manualDuration) * 60) : timer.elapsed;
    const durationMinutes = Math.round(durationSeconds / 60);
    const now = new Date().toISOString();

    const logs: PracticeStepLog[] = setTransitions.map((transition) => ({
      transitionId: transition.id,
      fromItemId: transition.fromItemId,
      toItemId: transition.toItemId,
      rating: stepRatings[transition.id],
      notes: stepNotes[transition.id],
      practiceCounted: marked.has(transition.id)
    }));

    const session: PracticeSession = {
      id: `session_${Date.now()}`,
      setId: set.id,
      startedAt: timer.startedAt ?? now,
      practicedAt: now,
      completedAt: now,
      durationSeconds,
      durationMinutes,
      overallRating,
      confidenceBefore,
      confidenceAfter,
      mistakes,
      successes,
      nextFocus,
      stepsCompleted: marked.size,
      totalSteps: setTransitions.length,
      notes: `What went well: ${successes}\nWhat went wrong: ${mistakes}\nNext focus: ${nextFocus}`,
      logs
    };

    await savePracticeSession(session);
    addToast({ type: 'success', title: 'Practice session saved' });
    setReviewing(false);
    timer.reset();
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-accent-text)]">Practice Log</p>
        <h2 className="mt-1 text-2xl font-bold">Turn a plan into muscle memory</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Work through a saved set one transition at a time.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3">
        <select className={`${inputClass} max-w-sm`} value={setId} onChange={(e) => { setSetId(e.target.value); setReviewing(false); }}>
          <option value="">Choose a set</option>
          {sets.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
        </select>
        {set && !timer.running && !reviewing && (
          <button className={primaryButton} onClick={begin}><Play className="h-4 w-4" /> Start practice</button>
        )}
        {(timer.running || timer.elapsed > 0) && !reviewing && (
          <>
            <span className="ml-auto flex items-center gap-1.5 numeric text-sm text-[var(--color-accent-text)]">
              <Clock3 className="h-4 w-4" /> {formatTime(timer.elapsed)}
            </span>
            <button className={buttonClass} onClick={timer.running ? timer.pause : timer.resume}>
              {timer.running ? 'Pause' : 'Resume'}
            </button>
            <button className={buttonClass} onClick={timer.reset}>
              <RotateCcw className="h-4 w-4" /> Reset timer
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-red-700/50 px-3 py-2 text-sm text-red-300" onClick={endSession}>
              <Square className="h-4 w-4" /> End session
            </button>
          </>
        )}
      </div>

      {!set ? (
        <EmptyState title="Choose a set to practice" description="Saved sets and their transition records will appear here." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(420px,1fr)]">
          <aside className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
            <h3 className="text-sm font-bold">{set.name}</h3>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{setTracks.length} tracks · {setTransitions.length} transitions</p>
            <ol className="mt-4 space-y-2">
              {setTracks.map((track, index) => (
                <li key={`${track.id}-${index}`} className={`rounded-md border px-2.5 py-2 text-xs ${index === currentIndex || index === currentIndex + 1 ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]' : 'border-[var(--color-border-subtle)]'}`}>
                  <span className="numeric mr-2 text-[var(--color-accent-text)]">{String(index + 1).padStart(2, '0')}</span>{track.title}
                </li>
              ))}
            </ol>
          </aside>
          <section className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
            {reviewing ? (
              <ReviewForm
                duration={timer.elapsed}
                confidenceBefore={confidenceBefore}
                setConfidenceBefore={setConfidenceBefore}
                confidenceAfter={confidenceAfter}
                setConfidenceAfter={setConfidenceAfter}
                overallRating={overallRating}
                setOverallRating={setOverallRating}
                successes={successes}
                setSuccesses={setSuccesses}
                mistakes={mistakes}
                setMistakes={setMistakes}
                nextFocus={nextFocus}
                setNextFocus={setNextFocus}
                manualDuration={manualDuration}
                setManualDuration={setManualDuration}
                onSave={() => void saveReview()}
              />
            ) : setTransitions.length === 0 ? (
              <EmptyState title="This set has no adjacent transitions" description="Add at least two tracks in Set Builder to create a practice path." />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--color-accent-text)]">Current transition</p>
                    <h3 className="mt-1 text-xl font-bold">{from?.title} <span className="text-[var(--color-text-muted)]">→</span> {to?.title}</h3>
                  </div>
                  <span className="numeric text-sm text-[var(--color-text-muted)]">{currentIndex + 1} / {setTransitions.length}</span>
                </div>
                {analysis && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    {[['BPM', analysis.bpm.score], ['Key', analysis.harmonic.score], ['Energy', analysis.energy.score], ['Vocals', analysis.vocal.score]].map(([label, score]) => (
                      <div key={String(label)} className="rounded-md bg-[var(--color-bg-base)] p-3">
                        <div className="text-xs text-[var(--color-text-secondary)]">{label}</div>
                        <div className="numeric mt-1 text-lg font-bold">{score}/100</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-4">
                  <p className="text-sm font-semibold">Technique suggestion</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{analysis?.recommendation ?? 'Listen through the phrase boundary and decide which element should lead.'}</p>
                  <p className="mt-3 text-xs text-[var(--color-text-muted)]">Difficulty: {currentTransition?.difficulty}/5 · {currentTransition?.notes ?? 'No notes yet'}</p>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button className={buttonClass} disabled={currentIndex === 0} onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}>← Previous</button>
                  <button className={primaryButton} onClick={() => void markCurrent()}>Mark transition practiced</button>
                  <button className={buttonClass} disabled={currentIndex >= setTransitions.length - 1} onClick={() => setCurrentIndex((value) => Math.min(setTransitions.length - 1, value + 1))}>Next →</button>
                </div>
                <div className="mt-5 border-t border-[var(--color-border-subtle)] pt-4">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Quick rating</p>
                  <StarRating value={stepRatings[currentTransition?.id ?? '']} onChange={(value) => void saveStep(value)} className="mt-2" />
                  <label className="mt-4 block text-sm text-[var(--color-text-secondary)]">Step notes
                    <textarea className={`${inputClass} mt-1 min-h-24`} value={stepNotes[currentTransition?.id ?? ''] ?? ''} onChange={(e) => setStepNotes({ ...stepNotes, [currentTransition?.id ?? '']: e.target.value })} />
                  </label>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      <SessionHistory sessions={sessions.filter((session) => session.setId === setId).sort((a, b) => b.startedAt.localeCompare(a.startedAt))} />
    </div>
  );
};

function ReviewForm({ duration, confidenceBefore, setConfidenceBefore, confidenceAfter, setConfidenceAfter, overallRating, setOverallRating, successes, setSuccesses, mistakes, setMistakes, nextFocus, setNextFocus, manualDuration, setManualDuration, onSave }: { duration: number; confidenceBefore: number; setConfidenceBefore: (value: number) => void; confidenceAfter: number; setConfidenceAfter: (value: number) => void; overallRating: number; setOverallRating: (value: number) => void; successes: string; setSuccesses: (value: string) => void; mistakes: string; setMistakes: (value: string) => void; nextFocus: string; setNextFocus: (value: string) => void; manualDuration: string; setManualDuration: (value: string) => void; onSave: () => void }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--color-accent-text)]">End-of-session review</p>
      <h3 className="mt-1 text-xl font-bold">What did you learn?</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-[var(--color-text-secondary)]">Duration (minutes)
          <input className={`${inputClass} mt-1`} type="number" min="0" placeholder={String(Math.round(duration / 60))} value={manualDuration} onChange={(e) => setManualDuration(e.target.value)} />
        </label>
        <label className="text-sm text-[var(--color-text-secondary)]">Overall rating
          <div className="mt-1"><StarRating value={overallRating} onChange={setOverallRating} /></div>
        </label>
        <label className="text-sm text-[var(--color-text-secondary)]">Confidence before: {confidenceBefore}
          <input className="mt-2 w-full accent-[var(--color-accent)]" type="range" min="1" max="10" value={confidenceBefore} onChange={(e) => setConfidenceBefore(Number(e.target.value))} />
        </label>
        <label className="text-sm text-[var(--color-text-secondary)]">Confidence after: {confidenceAfter}
          <input className="mt-2 w-full accent-[var(--color-accent)]" type="range" min="1" max="10" value={confidenceAfter} onChange={(e) => setConfidenceAfter(Number(e.target.value))} />
        </label>
      </div>
      <div className="mt-4 grid gap-3">
        <label className="text-sm text-[var(--color-text-secondary)]">What went well
          <textarea className={`${inputClass} mt-1 min-h-20`} value={successes} onChange={(e) => setSuccesses(e.target.value)} />
        </label>
        <label className="text-sm text-[var(--color-text-secondary)]">What went wrong
          <textarea className={`${inputClass} mt-1 min-h-20`} value={mistakes} onChange={(e) => setMistakes(e.target.value)} />
        </label>
        <label className="text-sm text-[var(--color-text-secondary)]">Next focus
          <textarea className={`${inputClass} mt-1 min-h-20`} value={nextFocus} onChange={(e) => setNextFocus(e.target.value)} />
        </label>
      </div>
      <button className={`${primaryButton} mt-5`} disabled={overallRating < 1} onClick={onSave}>Save session</button>
    </div>
  );
}

function SessionHistory({ sessions }: { sessions: PracticeSession[] }) {
  return (
    <section className="mt-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
      <div className="flex items-center gap-2">
        <Clock3 className="h-4 w-4 text-[var(--color-accent-text)]" />
        <h3 className="text-sm font-bold">Session history</h3>
      </div>
      {sessions.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">No saved sessions for this set yet.</p>
      ) : (
        <div className="mt-3 divide-y divide-[var(--color-border-subtle)]">
          {sessions.map((session) => {
            const ratingStars = '★'.repeat(Math.max(0, session.overallRating ?? 0)) || '—';
            return (
              <details key={session.id} className="py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm">
                  <span>
                    {new Date(session.practicedAt ?? session.startedAt).toLocaleDateString()} · <span className="numeric">{formatTime(session.durationSeconds)}</span>
                  </span>
                  <span className="text-[var(--color-accent-text)]">{ratingStars}</span>
                </summary>
                <div className="mt-2 space-y-1.5 text-xs text-[var(--color-text-secondary)]">
                  {session.confidenceBefore !== undefined && session.confidenceAfter !== undefined && (
                    <p className="font-medium text-[var(--color-text-primary)]">
                      Confidence: {session.confidenceBefore} → {session.confidenceAfter}
                    </p>
                  )}
                  {session.successes && <p><strong className="text-[var(--color-text-primary)]">Went well:</strong> {session.successes}</p>}
                  {session.mistakes && <p><strong className="text-[var(--color-text-primary)]">Mistakes:</strong> {session.mistakes}</p>}
                  {session.nextFocus && <p><strong className="text-[var(--color-text-primary)]">Next focus:</strong> {session.nextFocus}</p>}
                  {!session.successes && !session.mistakes && !session.nextFocus && (
                    <p className="whitespace-pre-wrap">{session.notes || 'No notes recorded.'}</p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
