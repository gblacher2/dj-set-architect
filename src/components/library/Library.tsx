import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, Download, FileJson, FileSpreadsheet, Pencil, Plus, RotateCcw, Search, Trash2, Upload, X } from 'lucide-react';
import { TrackSchema, type Track, type Familiarity, type VocalType } from '../../domain/tracks/track';
import { filterTracks, sortTracks, type TrackFilters } from '../../domain/tracks/library';
import { parseCsvTracks, SAMPLE_CSV, type CsvImportResult } from '../../domain/tracks/csv';
import { db } from '../../storage/db';
import { deleteTrack, saveTrack } from '../../storage/operations';
import { createExportData, importExportData } from '../../storage/transfer';
import { initSeedData } from '../../storage/seed';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { EmptyState } from '../shared/EmptyState';
import { CamelotBadge } from '../shared/CamelotBadge';
import { EnergyIndicator } from '../shared/EnergyIndicator';
import { StarRating } from '../shared/StarRating';
import { useAppStore } from '../../hooks/useAppStore';

const inputClass = 'w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-2.5 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]';
const primaryButton = 'inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]';
const secondaryButton = 'inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-hover)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]';

type TrackDraft = {
  title: string; artist: string; genre: string; subgenre: string; bpm: string; camelotKey: string; energy: string; durationSeconds: string;
  vocalType: VocalType; familiarity: Familiarity; rating: string; tags: string; notes: string;
};

const emptyDraft: TrackDraft = { title: '', artist: '', genre: 'House', subgenre: '', bpm: '120', camelotKey: '8A', energy: '5', durationSeconds: '360', vocalType: 'instrumental', familiarity: 'new', rating: '', tags: '', notes: '' };

function draftFromTrack(track: Track): TrackDraft {
  return { title: track.title, artist: track.artist, genre: track.genre, subgenre: track.subgenre ?? '', bpm: String(track.bpm), camelotKey: track.camelotKey, energy: String(track.energy), durationSeconds: String(track.durationSeconds), vocalType: track.vocalType, familiarity: track.familiarity, rating: track.rating ? String(track.rating) : '', tags: track.tags?.join(', ') ?? '', notes: track.notes ?? '' };
}

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function downloadFile(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

export const Library: React.FC = () => {
  const tracks = useLiveQuery(() => db.tracks.toArray(), []) ?? [];
  const addToast = useAppStore((state) => state.addToast);
  const [filters, setFilters] = useState<TrackFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState<'bpm' | 'energy' | 'title' | 'rating'>('title');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [modal, setModal] = useState<'track' | 'csv' | 'json' | null>(null);
  const [editing, setEditing] = useState<Track | null>(null);
  const [draft, setDraft] = useState<TrackDraft>(emptyDraft);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CsvImportResult | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'delete' | 'reset'; track?: Track } | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => setFilters((current) => ({ ...current, query: searchInput })), 250); return () => window.clearTimeout(timer); }, [searchInput]);

  const genres = useMemo(() => [...new Set(tracks.map((track) => track.genre))].sort(), [tracks]);
  const keys = useMemo(() => [...new Set(tracks.map((track) => track.camelotKey))].sort((a, b) => Number(a.slice(0, -1)) - Number(b.slice(0, -1)) || a.localeCompare(b)), [tracks]);
  const visibleTracks = useMemo(() => sortTracks(filterTracks(tracks, filters), sort, direction), [tracks, filters, sort, direction]);

  const openAdd = () => { setEditing(null); setDraft(emptyDraft); setFormErrors([]); setModal('track'); };
  const openEdit = (track: Track) => { setEditing(track); setDraft(draftFromTrack(track)); setFormErrors([]); setModal('track'); };

  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    const candidate: Track = {
      id: editing?.id ?? `trk_${Date.now()}`, title: draft.title.trim(), artist: draft.artist.trim(), genre: draft.genre.trim(), subgenre: draft.subgenre.trim() || undefined,
      bpm: Number(draft.bpm), camelotKey: draft.camelotKey.trim().toUpperCase(), energy: Number(draft.energy), durationSeconds: Number(draft.durationSeconds), vocalType: draft.vocalType,
      familiarity: draft.familiarity, rating: draft.rating ? Number(draft.rating) : undefined, tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean), notes: draft.notes.trim() || undefined,
      createdAt: editing?.createdAt ?? timestamp, updatedAt: timestamp,
    };
    const parsed = TrackSchema.safeParse(candidate);
    if (!parsed.success) { setFormErrors(parsed.error.issues.map((issue) => issue.message)); return; }
    await saveTrack(parsed.data); setModal(null); addToast({ type: 'success', title: editing ? 'Track updated' : 'Track added', message: `${parsed.data.title} is ready in the library.` });
  };

  const duplicate = async (track: Track) => { await saveTrack({ ...track, id: `trk_${Date.now()}`, title: `${track.title} (copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); addToast({ type: 'success', title: 'Track duplicated' }); };
  const confirmAction = async () => {
    if (confirm?.kind === 'delete' && confirm.track) { await deleteTrack(confirm.track.id); addToast({ type: 'success', title: 'Track deleted' }); }
    if (confirm?.kind === 'reset') { await initSeedData(true); addToast({ type: 'success', title: 'Seed data restored', message: 'Your local library and sets are back to the starter data.' }); }
    setConfirm(null);
  };

  const exportJson = async () => { const data = await createExportData(); downloadFile('set-architect-export.json', JSON.stringify(data, null, 2), 'application/json'); addToast({ type: 'success', title: 'Export downloaded' }); };
  const importJson = async (file: File) => { try { const result = await importExportData(JSON.parse(await file.text())); setModal(null); addToast({ type: 'success', title: 'Import complete', message: `${result.tracks} tracks, ${result.sets} sets, ${result.transitions} transitions.` }); } catch (error) { addToast({ type: 'error', title: 'Import rejected', message: error instanceof Error ? error.message : 'The file could not be imported.' }); } };
  const importCsv = async () => { if (!csvData || csvData.errors.length > 0 || csvData.tracks.length === 0) return; await db.tracks.bulkAdd(csvData.tracks); setModal(null); addToast({ type: 'success', title: 'CSV tracks imported', message: `${csvData.tracks.length} tracks added.` }); };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs uppercase tracking-[0.18em] text-[var(--color-accent-text)]">Library</p><h2 className="mt-1 text-2xl font-bold">Your track library</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">A compact place to prepare the ingredients of a set.</p></div>
      <div className="flex flex-wrap gap-2"><button className={primaryButton} onClick={openAdd}><Plus className="h-4 w-4" /> Add track</button><button className={secondaryButton} onClick={() => { setCsvData(null); setModal('csv'); }}><FileSpreadsheet className="h-4 w-4" /> CSV import</button><button className={secondaryButton} onClick={exportJson}><Download className="h-4 w-4" /> Export JSON</button><button className={secondaryButton} onClick={() => setModal('json')}><Upload className="h-4 w-4" /> Import JSON</button><button className={secondaryButton} onClick={() => setConfirm({ kind: 'reset' })}><RotateCcw className="h-4 w-4" /> Reset seed</button></div>
    </div>
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3 space-y-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(220px,1.5fr)_repeat(5,minmax(100px,1fr))]">
        <label className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-text-muted)]" /><input className={`${inputClass} pl-8`} placeholder="Search title or artist" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} /></label>
        <select className={inputClass} value={filters.genre ?? ''} onChange={(e) => setFilters({ ...filters, genre: e.target.value })}><option value="">All genres</option>{genres.map((genre) => <option key={genre}>{genre}</option>)}</select>
        <input className={inputClass} type="number" placeholder="BPM min" value={filters.bpmMin ?? ''} onChange={(e) => setFilters({ ...filters, bpmMin: e.target.value ? Number(e.target.value) : undefined })} />
        <input className={inputClass} type="number" placeholder="BPM max" value={filters.bpmMax ?? ''} onChange={(e) => setFilters({ ...filters, bpmMax: e.target.value ? Number(e.target.value) : undefined })} />
        <select className={inputClass} value={filters.camelotKey ?? ''} onChange={(e) => setFilters({ ...filters, camelotKey: e.target.value })}><option value="">All keys</option>{keys.map((key) => <option key={key}>{key}</option>)}</select>
        <select className={inputClass} value={filters.familiarity ?? ''} onChange={(e) => setFilters({ ...filters, familiarity: e.target.value as Familiarity | '' })}><option value="">All familiarity</option><option value="new">New</option><option value="practiced">Practiced</option><option value="reliable">Reliable</option></select>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]"><span>Energy:</span><input className={`${inputClass} w-24`} type="number" min="1" max="10" placeholder="min" value={filters.energyMin ?? ''} onChange={(e) => setFilters({ ...filters, energyMin: e.target.value ? Number(e.target.value) : undefined })} /><span>to</span><input className={`${inputClass} w-24`} type="number" min="1" max="10" placeholder="max" value={filters.energyMax ?? ''} onChange={(e) => setFilters({ ...filters, energyMax: e.target.value ? Number(e.target.value) : undefined })} /><span className="ml-2">Sort:</span><select className={`${inputClass} w-auto`} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="title">Title</option><option value="bpm">BPM</option><option value="energy">Energy</option><option value="rating">Rating</option></select><button className={secondaryButton} onClick={() => setDirection(direction === 'asc' ? 'desc' : 'asc')}>{direction === 'asc' ? '↑ Ascending' : '↓ Descending'}</button><span className="ml-auto numeric">{visibleTracks.length} of {tracks.length} tracks</span></div>
    </div>
    {tracks.length === 0 ? <EmptyState title="Your library is empty" description="Add a track or restore the starter library to begin building a set." action={{ label: 'Restore starter data', onClick: () => setConfirm({ kind: 'reset' }) }} /> : <div className="overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-b border-[var(--color-border-subtle)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]"><tr>{['Title / artist', 'Genre', 'BPM', 'Key', 'Energy', 'Vocal', 'Familiarity', 'Rating', ''].map((label) => <th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--color-border-subtle)]">{visibleTracks.map((track) => <tr key={track.id} className="group hover:bg-[var(--color-bg-surface-hover)]"><td className="px-3 py-2.5"><div className="font-medium">{track.title}</div><div className="text-xs text-[var(--color-text-secondary)]">{track.artist} · {formatDuration(track.durationSeconds)}</div></td><td className="px-3 py-2.5"><div>{track.genre}</div>{track.subgenre && <div className="text-xs text-[var(--color-text-muted)]">{track.subgenre}</div>}</td><td className="numeric px-3 py-2.5 font-semibold">{track.bpm}</td><td className="px-3 py-2.5"><CamelotBadge camelotKey={track.camelotKey} size="sm" /></td><td className="px-3 py-2.5"><EnergyIndicator energy={track.energy} size="sm" showNumeric /></td><td className="px-3 py-2.5 text-xs text-[var(--color-text-secondary)]">{track.vocalType.replace('-', ' ')}</td><td className="px-3 py-2.5"><span className={`rounded-full border px-2 py-1 text-xs ${track.familiarity === 'reliable' ? 'border-emerald-700/50 text-emerald-300' : track.familiarity === 'practiced' ? 'border-amber-700/50 text-amber-300' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'}`}>{track.familiarity}</span></td><td className="px-3 py-2.5"><StarRating value={track.rating} readOnly size="sm" /></td><td className="px-3 py-2.5"><div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100"><button className="rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)] hover:text-[var(--color-accent-text)]" title="Edit track" onClick={() => openEdit(track)}><Pencil className="h-4 w-4" /></button><button className="rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)] hover:text-[var(--color-accent-text)]" title="Duplicate track" onClick={() => duplicate(track)}><Copy className="h-4 w-4" /></button><button className="rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)] hover:text-red-300" title="Delete track" onClick={() => setConfirm({ kind: 'delete', track })}><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>{visibleTracks.length === 0 && <div className="p-8 text-center text-sm text-[var(--color-text-secondary)]">No tracks match these filters.</div>}</div>}

    {modal === 'track' && <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--color-bg-overlay)] p-4"><form onSubmit={saveDraft} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-2xl"><div className="mb-4 flex items-start justify-between"><div><p className="text-xs uppercase tracking-wide text-[var(--color-accent-text)]">{editing ? 'Edit track' : 'Add track'}</p><h3 className="mt-1 text-xl font-bold">Track metadata</h3></div><button type="button" className="text-[var(--color-text-secondary)]" onClick={() => setModal(null)}><X /></button></div>{formErrors.length > 0 && <div className="mb-4 rounded-md border border-red-700/50 bg-red-950/30 p-3 text-sm text-red-200"><ul className="list-disc pl-4">{formErrors.map((error) => <li key={error}>{error}</li>)}</ul></div>}<div className="grid gap-3 sm:grid-cols-2">{([['title', 'Title'], ['artist', 'Artist'], ['genre', 'Genre'], ['subgenre', 'Subgenre'], ['bpm', 'BPM'], ['camelotKey', 'Camelot key'], ['energy', 'Energy 1–10'], ['durationSeconds', 'Duration seconds'], ['tags', 'Tags (comma separated)']] as const).map(([key, label]) => <label key={key} className={key === 'tags' ? 'sm:col-span-2' : ''}><span className="mb-1 block text-xs text-[var(--color-text-secondary)]">{label}</span><input className={inputClass} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} /></label>)}<label><span className="mb-1 block text-xs text-[var(--color-text-secondary)]">Vocal type</span><select className={inputClass} value={draft.vocalType} onChange={(e) => setDraft({ ...draft, vocalType: e.target.value as VocalType })}><option value="instrumental">Instrumental</option><option value="light-vocal">Light vocal</option><option value="vocal">Vocal</option></select></label><label><span className="mb-1 block text-xs text-[var(--color-text-secondary)]">Familiarity</span><select className={inputClass} value={draft.familiarity} onChange={(e) => setDraft({ ...draft, familiarity: e.target.value as Familiarity })}><option value="new">New</option><option value="practiced">Practiced</option><option value="reliable">Reliable</option></select></label><label><span className="mb-1 block text-xs text-[var(--color-text-secondary)]">Rating</span><select className={inputClass} value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: e.target.value })}><option value="">Not rated</option>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></label><label className="sm:col-span-2"><span className="mb-1 block text-xs text-[var(--color-text-secondary)]">Notes</span><textarea className={`${inputClass} min-h-20`} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></label></div><div className="mt-5 flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setModal(null)}>Cancel</button><button className={primaryButton} type="submit">Save track</button></div></form></div>}
    {modal === 'csv' && <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--color-bg-overlay)] p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-wide text-[var(--color-accent-text)]">CSV import</p><h3 className="mt-1 text-xl font-bold">Bring in a prepared library</h3></div><button className="text-[var(--color-text-secondary)]" onClick={() => setModal(null)}><X /></button></div><div className="mt-4 flex flex-wrap gap-2"><label className={primaryButton}><Upload className="h-4 w-4" /> Choose CSV<input className="hidden" type="file" accept=".csv,text/csv" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setCsvData(parseCsvTracks(await file.text())); }} /></label><button className={secondaryButton} onClick={() => downloadFile('set-architect-sample.csv', SAMPLE_CSV, 'text/csv')}><Download className="h-4 w-4" /> Download template</button></div>{csvData && <div className="mt-4 space-y-3">{csvData.errors.length > 0 && <div className="rounded-md border border-red-700/50 bg-red-950/30 p-3 text-sm text-red-200"><strong>Validation messages</strong><ul className="mt-1 list-disc pl-4">{csvData.errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}<p className="text-sm text-[var(--color-text-secondary)]">Previewing {Math.min(10, csvData.rows.length)} of {csvData.rows.length} rows. {csvData.tracks.length} valid tracks ready.</p><div className="overflow-x-auto rounded border border-[var(--color-border-subtle)]"><table className="w-full text-xs"><tbody>{csvData.rows.slice(0, 10).map((row, index) => <tr key={index} className="border-b border-[var(--color-border-subtle)] last:border-0">{row.map((cell, cellIndex) => <td className="px-2 py-1.5" key={cellIndex}>{cell || '—'}</td>)}</tr>)}</tbody></table></div><button disabled={csvData.errors.length > 0 || csvData.tracks.length === 0} className={`${primaryButton} disabled:cursor-not-allowed disabled:opacity-40`} onClick={() => void importCsv()}>Import {csvData.tracks.length} tracks</button></div>}</div></div>}
    {modal === 'json' && <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--color-bg-overlay)] p-4"><div className="w-full max-w-lg rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-wide text-[var(--color-accent-text)]">JSON import</p><h3 className="mt-1 text-xl font-bold">Restore an export</h3></div><button className="text-[var(--color-text-secondary)]" onClick={() => setModal(null)}><X /></button></div><p className="mt-3 text-sm text-[var(--color-text-secondary)]">The whole file is validated before anything in local storage is replaced.</p><label className={`${primaryButton} mt-5`}><FileJson className="h-4 w-4" /> Choose JSON file<input className="hidden" type="file" accept=".json,application/json" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importJson(file); }} /></label></div></div>}
    <ConfirmDialog isOpen={confirm !== null} title={confirm?.kind === 'reset' ? 'Restore starter data?' : 'Delete this track?'} description={confirm?.kind === 'reset' ? 'This replaces all local tracks, sets, transitions and preferences.' : `“${confirm?.track?.title ?? ''}” will be removed from every set too.`} confirmLabel={confirm?.kind === 'reset' ? 'Restore seed' : 'Delete track'} variant="danger" onConfirm={() => void confirmAction()} onCancel={() => setConfirm(null)} />
  </div>;
};
