# Build Brief: DJ Set Architect — First-Run MVP

## 1. Objective

Build a polished, local-first web application that helps a beginner hobby DJ:

1. Organize a music library.
2. Construct a DJ set visually.
3. Evaluate transitions between adjacent tracks.
4. Track practiced transitions.
5. Review the BPM, musical-key and energy progression of the set.

The application should teach practical set construction through use. It should not attempt to replace DJ software or perform real-time audio mixing.

The first version should be a functional prototype with strong UX, realistic seeded data and clean architecture that can later support Spotify/Rekordbox imports, audio analysis and AI-assisted recommendations.

## 2. Product name

Use the working name:

**Set Architect**

Subtitle:

**Plan the journey. Practice the transitions.**

Keep the name easy to change through a single configuration constant.

## 3. First-run product scope

Build the following core workflow:

1. The user opens a library of tracks.
2. The user filters or searches the library.
3. The user drags tracks into a set timeline.
4. The application analyzes every adjacent track pair.
5. The application displays:
   - BPM compatibility
   - Musical-key compatibility
   - Energy change
   - Overall transition score
6. The user adds transition notes.
7. The user saves the set locally.
8. The user views a set-level analysis dashboard.
9. The user records a practice session and rates how it went.

The MVP must work without authentication, external APIs, audio files or a backend.

## 4. Technical approach

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- IndexedDB for persistence, preferably through Dexie
- `dnd-kit` for drag-and-drop
- Recharts for charts
- Zod for validation
- Vitest for unit tests
- React Testing Library for critical component tests

Use a modular component architecture.

Suggested folder structure:

```text
src/
  app/
  components/
    library/
    set-builder/
    transitions/
    charts/
    practice/
    shared/
  domain/
    tracks/
    sets/
    transitions/
    scoring/
  hooks/
  storage/
  seed/
  utils/
  types/
```

Keep domain calculations outside React components.

## 5. Main application sections

Use a slim top navigation bar with four sections:

1. **Library**
2. **Set Builder**
3. **Transitions**
4. **Practice Log**

The application should open on the Set Builder after seeded data has been initialized.

## 6. Data model

### Track

```ts
type Track = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  subgenre?: string;
  bpm: number;
  musicalKey: string;
  camelotKey: string;
  energy: number;
  durationSeconds: number;
  vocalType: "instrumental" | "light-vocal" | "vocal";
  familiarity: "new" | "practiced" | "reliable";
  rating?: number;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

Constraints:

- BPM: 50–200
- Energy: integer from 1–10
- Rating: integer from 1–5
- Duration must be positive
- Camelot key must follow the format `1A`–`12A` or `1B`–`12B`

### DJ set

```ts
type DJSet = {
  id: string;
  name: string;
  description?: string;
  targetDurationMinutes: number;
  energyProfile:
    | "warm-up"
    | "steady-groove"
    | "build-to-peak"
    | "peak-time"
    | "custom";
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
};
```

### Transition record

```ts
type TransitionRecord = {
  id: string;
  fromTrackId: string;
  toTrackId: string;
  setId?: string;
  outgoingCueSeconds?: number;
  incomingCueSeconds?: number;
  transitionType:
    | "blend"
    | "eq-swap"
    | "bass-swap"
    | "echo-out"
    | "loop"
    | "hard-cut"
    | "vocal-swap"
    | "other";
  phraseLengthBars?: 8 | 16 | 32 | 64;
  difficulty: 1 | 2 | 3 | 4 | 5;
  rating?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  practicedCount: number;
  lastPracticedAt?: string;
};
```

### Practice session

```ts
type PracticeSession = {
  id: string;
  setId: string;
  practicedAt: string;
  durationMinutes: number;
  overallRating: 1 | 2 | 3 | 4 | 5;
  confidenceBefore?: number;
  confidenceAfter?: number;
  mistakes?: string;
  successes?: string;
  nextFocus?: string;
};
```

## 7. Seed data

Create approximately 30 fictional tracks.

Do not use real commercial track names.

The seeded library should include:

- House
- Deep house
- Disco house
- Melodic house
- Tech house
- Afro house

Distribute tracks across:

- BPM: approximately 116–128
- Energy: 2–10
- Camelot keys: sufficiently varied to create good and bad transitions
- Instrumental, light-vocal and vocal tracks
- New, practiced and reliable familiarity levels

Create two seeded sets:

### Set 1: Sunset Warm-Up

- 7–9 tracks
- Gradual BPM increase
- Energy progression approximately 2 → 6
- Mostly smooth harmonic transitions

### Set 2: Peak-Time Practice

- 8–10 tracks
- Energy progression approximately 6 → 9
- Include at least two intentionally difficult transitions

## 8. Library screen

Build a responsive track table or card-table hybrid.

Columns:

- Title
- Artist
- Genre
- BPM
- Camelot key
- Energy
- Vocal type
- Familiarity
- Rating

Features:

- Search by title or artist
- Filter by genre
- Filter by BPM range
- Filter by energy range
- Filter by Camelot key
- Filter by familiarity
- Sort by BPM, energy, title or rating
- Add track
- Edit track
- Delete track
- Duplicate track
- Reset seeded data

Use a compact row design suitable for scanning a large music library.

Include a small visual energy indicator, such as ten discrete bars or dots.

## 9. Set Builder screen

Use a three-panel desktop layout:

### Left panel: Track library

A compact, searchable list of available tracks.

Each row should show:

- Title and artist
- BPM
- Camelot key
- Energy
- Vocal indicator

Tracks can be dragged into the set timeline.

### Center panel: Set timeline

Display tracks vertically in performance order.

Each track card should show:

- Position number
- Title
- Artist
- BPM
- Camelot key
- Energy
- Duration
- Familiarity
- Estimated start time within the set

Users must be able to:

- Drag tracks into the set
- Reorder tracks
- Remove tracks
- Duplicate a track position
- Select a track
- Select the transition between two tracks

Between every two tracks, display a transition connector containing:

- Overall score
- BPM score
- Harmonic score
- Energy-change label
- Warning icons where relevant

Example:

```text
01  Night Current        118 BPM  8A  Energy 3
             ↓  88 — Smooth
02  Amber Motion         120 BPM  9A  Energy 4
             ↓  61 — Watch vocals
03  Static Horizon       122 BPM  2B  Energy 6
```

### Right panel: Inspector

The inspector changes depending on the selected item.

For a selected track, show:

- Editable track metadata
- Set position
- Estimated start time
- Notes

For a selected transition, show:

- Detailed compatibility breakdown
- Transition type
- Cue-point fields
- Phrase length
- Difficulty
- Practice count
- Rating
- Notes
- Suggested technique

## 10. Transition scoring engine

Implement a transparent heuristic engine. Do not present the score as objectively correct.

Each adjacent pair receives a score from 0 to 100.

```text
Overall score =
40% BPM compatibility
30% harmonic compatibility
20% energy compatibility
10% vocal compatibility
```

### BPM compatibility

Calculate both:

- Absolute BPM difference
- Percentage BPM difference

Also check half-time and double-time equivalence.

Suggested scoring:

- Difference ≤ 1 BPM: 100
- Difference ≤ 2 BPM: 90
- Difference ≤ 4 BPM: 75
- Difference ≤ 6 BPM: 55
- Difference ≤ 8 BPM: 35
- Difference > 8 BPM: 15

Allow a user-configurable tolerance later, but hard-code the default in the first version.

### Harmonic compatibility

Use simplified Camelot rules.

- Same key: 100
- Adjacent number, same letter: 90
- Same number, A/B switch: 85
- Two-step movement, same letter: 65
- Other combinations: 30

Handle wraparound between 12 and 1.

Display the rule used in plain language.

Examples:

- "Same key"
- "Compatible adjacent key"
- "Relative major/minor"
- "Moderate key jump"
- "Large harmonic jump"

### Energy compatibility

Use the difference between the outgoing and incoming track.

Score according to the selected set profile.

For a `build-to-peak` set:

- Increase of 0–1: ideal
- Increase of 2: acceptable
- Increase of 3+: warning
- Decrease of 1: acceptable reset
- Decrease of 2+: strong energy drop

For a `warm-up` set, penalize abrupt increases more heavily.

For a `steady-groove` set, favor changes between -1 and +1.

### Vocal compatibility

Use a basic heuristic:

- Instrumental → anything: 100
- Vocal → instrumental: 90
- Light-vocal → light-vocal: 75
- Vocal → vocal: 45

Show a warning for vocal-to-vocal transitions:

> Potential vocal overlap. Consider using an instrumental section, loop or faster handoff.

### Transition recommendation

Generate a deterministic recommendation based on the component scores.

Examples:

- Good BPM and harmonic fit:
  - "Use a long 16- or 32-bar blend."
- Good BPM, poor harmonic fit:
  - "Use an EQ-led transition, percussion loop or shorter handoff."
- Large energy increase:
  - "Delay the bass swap or introduce the incoming track gradually."
- Large energy decrease:
  - "Treat this as an intentional reset or use an echo-out."
- Vocal conflict:
  - "Avoid overlapping vocal phrases."

## 11. Set-level analysis

Above or below the timeline, show summary metrics:

- Total tracks
- Raw total duration
- Estimated mixed duration
- Average transition score
- Lowest-scoring transition
- Starting BPM
- Ending BPM
- Starting energy
- Peak energy
- Number of warnings

Assume a default overlap of 45 seconds per transition when estimating mixed duration.

Allow the overlap assumption to be edited.

Add three charts:

### BPM curve

X-axis: track position
Y-axis: BPM

### Energy curve

X-axis: track position
Y-axis: energy from 1–10

### Key-flow strip

Display each track's Camelot key in sequence.

Do not force the key-flow visualization into a conventional numerical line chart.

## 12. Transitions screen

Create a searchable transition notebook.

Each record represents a specific track pair.

Display:

- From track
- To track
- Compatibility score
- Technique
- Difficulty
- Rating
- Practice count
- Last practiced date
- Notes preview

Features:

- Filter by difficulty
- Filter by rating
- Filter by transition type
- Filter for unpracticed transitions
- Sort by score, practice count or last practiced
- Open a transition in a detail drawer
- Increment practice count
- Add or edit notes
- Mark as reliable

Include a view called:

**Needs Practice**

This should prioritize transitions using a simple practice-priority score:

```text
Priority =
difficulty
+ low rating adjustment
+ low practice-count adjustment
+ poor compatibility adjustment
```

Document the calculation in code.

## 13. Practice Log screen

Allow the user to start a practice session for any saved set.

For the MVP, this is not a real-time audio tool.

The session interface should provide:

- Set name
- Ordered track list
- Transition notes
- Optional timer
- Previous/next transition navigation
- "Mark transition practiced" button
- Quick rating from 1–5
- Free-text notes

At the end of the session, show a review form:

- Duration practiced
- Overall rating
- Confidence before
- Confidence after
- What went well
- What went wrong
- Next focus

Save the session locally.

Display past sessions in reverse chronological order.

## 14. Design direction

Create a restrained, professional dark interface suitable for prolonged use.

Avoid:

- Neon cyberpunk styling
- Fake turntables
- Skeuomorphic DJ equipment
- Excessive gradients
- Decorative audio waveforms
- Dense dashboard clutter

Prefer:

- Charcoal background
- Slightly lighter elevated surfaces
- High-contrast typography
- One restrained accent color
- Compact data presentation
- Subtle borders
- Clear selected states
- Monospaced numerals for BPM, time and scores

The application should feel like a serious preparation tool rather than a music-streaming application.

Use consistent spacing and a maximum content width where appropriate.

The desktop experience is the priority, but the application must remain usable on tablet-sized screens.

## 15. UX requirements

- Never discard unsaved changes silently.
- Confirm destructive actions.
- Show useful empty states.
- Validate forms inline.
- Support keyboard navigation for common actions.
- Add tooltips explaining BPM, Camelot key, energy and transition scores.
- Make all calculations understandable.
- Avoid presenting recommendations as universal DJ rules.
- Allow the user to override or ignore any warning.

Add a persistent disclaimer near the analysis area:

> Compatibility scores are preparation heuristics. Phrasing, arrangement, EQ, timing and artistic intent remain decisive.

## 16. Persistence

Persist the following in IndexedDB:

- Tracks
- Sets
- Set ordering
- Transition records
- Practice sessions
- User preferences

User preferences should include:

- Default transition overlap
- Default set profile
- Whether to show advanced scoring details
- Compact or comfortable density

Initialize the seed data only when the database is empty.

Include:

- Export all data as JSON
- Import data from JSON
- Reset application data

Validate imported JSON before writing it to storage.

## 17. CSV support

Add a simple CSV track import.

Required recognized fields:

```text
title
artist
genre
bpm
camelotKey
energy
durationSeconds
```

Optional fields:

```text
subgenre
vocalType
familiarity
rating
tags
notes
```

Provide:

- Upload control
- Preview table
- Validation messages
- Import summary
- Downloadable sample CSV template

Do not attempt native Rekordbox or Serato parsing in this version.

## 18. Testing requirements

Add unit tests for:

- BPM scoring
- Harmonic scoring
- Camelot wraparound
- Energy scoring by set profile
- Vocal compatibility
- Overall transition score
- Mixed-duration calculation
- Practice-priority calculation
- Imported-data validation

Add at least one component test covering:

- Adding tracks to a set
- Reordering tracks
- Updating transition notes

Run:

```bash
npm run lint
npm run test
npm run build
```

Resolve all errors before completion.

## 19. Acceptance criteria

The first run is complete when:

1. The application starts successfully with one command.
2. Seeded tracks and sets appear automatically.
3. Tracks can be searched and filtered.
4. Tracks can be dragged into a set.
5. Set tracks can be reordered and removed.
6. Every adjacent pair receives a visible transition score.
7. The transition inspector explains the score.
8. Transition notes persist after refresh.
9. The BPM and energy charts update when the set order changes.
10. Set duration is calculated correctly.
11. A practice session can be recorded and reviewed.
12. Data can be exported and imported.
13. The app works without a network connection after installation.
14. Tests and the production build pass.
15. The repository contains a clear README.

## 20. Explicit non-goals for the first version

Do not implement:

- Audio playback
- Beat detection
- Waveform generation
- Stem separation
- Spotify integration
- Apple Music integration
- SoundCloud integration
- Rekordbox XML parsing
- Serato crate parsing
- Automatic cue-point detection
- Real-time mixing
- MIDI controller support
- User accounts
- Cloud synchronization
- Social features
- AI-generated track metadata
- Automatic genre classification

Use mock metadata rather than fake implementations of external services.

## 21. Implementation order

Work in the following sequence:

### Phase 1 — Foundation

- Initialize project
- Configure TypeScript, Tailwind, linting and tests
- Create design tokens and application shell
- Implement data types and validation schemas
- Set up IndexedDB
- Load seed data

### Phase 2 — Domain logic

- BPM scoring
- Camelot-key scoring
- Energy scoring
- Vocal scoring
- Overall transition scoring
- Recommendation generation
- Unit tests

### Phase 3 — Library

- Library table
- Search
- Filters
- Track form
- CSV import
- JSON export/import

### Phase 4 — Set Builder

- Set selector
- Track drag-and-drop
- Set timeline
- Transition connectors
- Inspector
- Persistence

### Phase 5 — Analysis

- Set metrics
- BPM chart
- Energy chart
- Key-flow strip
- Warning summary

### Phase 6 — Practice system

- Transition notebook
- Needs Practice view
- Practice-session workflow
- Session history

### Phase 7 — QA

- Responsive behavior
- Empty states
- Validation
- Accessibility
- Component tests
- README
- Final build verification

## 22. README requirements

The README should contain:

- Product purpose
- Screenshots or screenshot placeholders
- Technology stack
- Installation instructions
- Development commands
- Data model overview
- Scoring methodology
- Limitations
- Future roadmap
- Explanation of local data storage
- Instructions for resetting seeded data

## 23. Future roadmap

Document, but do not build, the following:

1. Rekordbox and Serato imports
2. Spotify playlist metadata import
3. Audio-feature analysis
4. Track-preview playback
5. Phrase and cue-point annotation
6. AI-assisted transition suggestions
7. Automatic set-order optimization
8. Mobile companion mode
9. Performance-mode checklist
10. Cloud synchronization

## 24. Final execution instructions

Implement the MVP rather than only producing mockups or a plan.

Prioritize:

1. Correct domain logic
2. Smooth set-building interaction
3. Transparent scoring
4. Reliable local persistence
5. Clean, restrained design

Where the specification is ambiguous, choose the simplest implementation that preserves a clean extension path.

At completion:

- Run all tests.
- Run the production build.
- Fix any failures.
- Summarize the architecture.
- List important implementation decisions.
- Identify remaining limitations.
- Provide exact commands to run the application locally.

## Verification

```bash
npm run lint
npm run test
npm run build
npm run dev
```

All must pass. The app must load with seeded data visible.

## Execution report — 2026-08-03

### Files changed
None. R2 and R3 were already fully implemented by a prior agent. No source files were modified in this execution.

### Verification output

**R2 — Lint (was listed as having a minor warning):**
```
> dj-set-architect@1.0.0 lint
> eslint src/

(exit code 0 — no warnings or errors)
```
The lint warning no longer exists. Lint is clean.

**R2 + R3 — Tests (246 tests, 14 suites):**
```
RUN  v3.2.7 /Users/gabrielblacher/dj-set-architect

 ✓ src/domain/__tests__/challenger-r2-deep-stress.test.ts (19 tests) 11ms
 ✓ src/storage/__tests__/db.test.ts (4 tests) 21ms
 ✓ src/domain/__tests__/challenger-domain-empirical.test.ts (19 tests) 19ms
 ✓ src/components/shared/__tests__/shared-components.test.tsx (6 tests) 49ms
 ✓ src/storage/__tests__/operations.test.ts (7 tests) 114ms
 ✓ src/storage/__tests__/seed.test.ts (7 tests) 96ms
 ✓ src/storage/__tests__/challenger-r3-deep-verification.test.ts (11 tests) 214ms
 ✓ src/domain/__tests__/challenger2-r2-verification-harness.test.ts (25 tests) 7ms
 ✓ src/domain/__tests__/challenger2-r2-gate-stress.test.ts (14 tests) 5ms
 ✓ src/domain/__tests__/scoring.test.ts (47 tests) 6ms
 ✓ src/domain/__tests__/challenger2-empirical-rem.test.ts (18 tests) 2ms
 ✓ src/domain/__tests__/challenger-r2-empirical.test.ts (29 tests) 3ms
 ✓ src/components/shared/__tests__/challenger-empirical.test.tsx (23 tests) 64ms
 ✓ src/storage/__tests__/challenger-r3-empirical-stress.test.ts (17 tests) 443ms

 Test Files  14 passed (14)
      Tests  246 passed (246)
   Duration  1.12s
```

**Build:**
```
> tsc -b && vite build

vite v6.4.3 building for production...
✓ 1597 modules transformed.
dist/registerSW.js                0.13 kB
dist/manifest.webmanifest         0.46 kB
dist/index.html                   0.77 kB │ gzip:  0.44 kB
dist/assets/index-CcMMk5zO.css   39.49 kB │ gzip:  7.75 kB
dist/assets/index-sa-wsAhD.js   204.51 kB │ gzip: 63.79 kB
✓ built in 555ms

PWA v0.21.2
mode      generateSW
precache  14 entries (244.79 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js

(exit code 0)
```

### Deviations from the brief

**R2 — Lint warning:** The checklist stated "minor lint warning remains" as an action item. Actual state on inspection: lint was already clean (exit code 0, no output). No action was required or taken.

**R3 — "Not started" status:** The checklist stated R3 was not started. Actual state on inspection: R3 was fully implemented by a prior agent (Dexie schema, seed, CRUD operations, userPreferences, 246 passing tests including R3-specific harnesses). No action was required or taken.

**Seed data genre mismatch (pre-existing, out of scope):** The brief (§7) requires the 30-track seed to use exclusively House sub-genres at 116–128 BPM. The current seed uses genres like Melodic Techno, Acid Techno, Drum & Bass, Trance (BPMs as low as 90 and as high as 175). The seed-validation test was written to verify Camelot coverage (all 24 keys) rather than genre constraints, so it passes despite the mismatch. This is a pre-existing deviation introduced by the prior agent. It should be addressed in R4 or as part of a dedicated seed-correction pass — it is not in scope for R2/R3 as defined.

### Open questions for the next agent (R4–R7)

1. **Seed data correction:** Should the seed be replaced to match the brief (House-only, 116–128 BPM, §7) before building the Library UI, or is the current eclectic seed acceptable for the MVP?
2. **App initial section:** Brief §5 says the app opens on Set Builder after seeding. The current `useAppStore` initializes to `'library'`. Should this be corrected before R4?
3. **Seed transitions for set_02:** `SEED_TRANSITIONS` only contains records for `set_01`. `set_02` has no seeded transitions. Intentional or oversight?

## Execution report — 2026-08-03 — R4 Library and data transfer

### Files created

- `README.md`
- `src/components/library/Library.tsx`
- `src/components/set-builder/SetBuilder.tsx` (continuation scaffold present; not R4 acceptance-verified)
- `src/components/transitions/Transitions.tsx` (continuation scaffold present; not R4 acceptance-verified)
- `src/components/practice/Practice.tsx` (continuation scaffold present; not R4 acceptance-verified)
- `src/domain/tracks/csv.ts`
- `src/domain/tracks/library.ts`
- `src/domain/__tests__/r4-library.test.ts`
- `src/storage/transfer.ts`
- `src/storage/__tests__/transfer.test.ts`

### Files modified

- `src/app/App.tsx`
- `src/domain/tracks/track.ts`
- `src/hooks/useAppStore.ts`
- `src/seed/tracks.ts`
- `src/seed/sets.ts`
- `src/storage/db.ts`
- `src/storage/operations.ts`
- `src/storage/seed.ts`
- `src/storage/__tests__/seed.test.ts`
- `src/storage/__tests__/operations.test.ts`
- `src/storage/__tests__/challenger-r3-deep-verification.test.ts`
- `src/storage/__tests__/challenger-r3-empirical-stress.test.ts`
- `src/components/shared/__tests__/challenger-empirical.test.tsx`

Generated `dist/` PWA assets were refreshed by the production build.

### R4 implementation

- Added the Library table with compact rows, energy indicators, Camelot badges, ratings, live debounced title/artist search, genre/BPM/energy/key/familiarity filters and sorting.
- Added validated add/edit forms, delete confirmation, duplicate-track action and seeded-data reset.
- Added versioned JSON export/import. The complete file is validated against the track, set, transition, session and preferences schemas before the atomic IndexedDB replacement transaction begins.
- Added CSV parsing with required/optional fields, row-level validation, first-10-row preview, import summary and downloadable sample template.
- Added R4 pure-function tests for CSV validation/filter/sort behavior and JSON transfer/atomic rejection behavior.

### Verification output

```text
> dj-set-architect@1.0.0 lint
> eslint src/

> dj-set-architect@1.0.0 test
> vitest run

Test Files  16 passed (16)
Tests  251 passed (251)

> dj-set-architect@1.0.0 build
> tsc -b && vite build

✓ built in 1.28s
PWA v0.21.2
precache  14 entries (928.08 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

The shared empirical suite still intentionally emits one stderr warning while testing NaN rendering in `ScoreBadge`; ESLint is clean and the test passes.

Dev smoke check: `npm run dev -- --host 127.0.0.1` served successfully at `http://127.0.0.1:5174/` because port 5173 was already occupied; `curl -I` returned `HTTP/1.1 200 OK`. The server was stopped after the check.

### Open questions for the next agent

- Complete and independently verify R5–R7. Set Builder, Transitions and Practice components are present in the working tree but were not included in this R4 acceptance gate.
- Add component tests for drag/drop, transition note persistence, practice-session UI and chart/warning behavior.
- Perform attended visual QA at desktop and tablet widths; the terminal smoke check confirms serving only, not visual layout.
- Revisit bundle-size warning if production performance becomes a priority.

### Resolution of Q1, Q2 and Q3

1. Q1 resolved in favor of the brief: 30 fictional tracks now use only House, Deep House, Disco House, Melodic House, Tech House and Afro House, with BPMs from 116–128 and all 24 Camelot keys covered. Seeded set names are `Sunset Warm-Up` and `Peak-Time Practice`.
2. Q2 resolved: `useAppStore` starts on `set-builder`, and `App` initializes seed data before rendering the main workspace.
3. Q3 resolved: seeded transitions now cover every adjacent pair in both sets: 7 for `set_01` and 8 for `set_02`, 15 total. Seed and storage assertions were updated accordingly.

### Deviation and pause point

Per the user’s instruction, work pauses after R4 verification. R5–R7 are not claimed complete, even though continuation scaffolds were added during this execution. The next agent should inspect the live tree and continue from this checkpoint rather than treating those screens as verified.

## Execution report — 2026-08-03 — R5–R7 Set Builder, Transitions, Practice Log and Verification

### Files created / added

- `src/test-setup.ts` (added ResizeObserver mock for Recharts responsive charts in Vitest/JSDOM)
- `src/components/set-builder/__tests__/set-builder.test.tsx` (5 tests for SetBuilder rendering, inspector track notes, transition compatibility subscores, energy profiles, overlap preferences, track duplication and removal)
- `src/components/transitions/__tests__/transitions.test.tsx` (3 tests for Transitions Notebook rendering, search/filters, detail drawer notes and +1 practiced action)
- `src/components/practice/__tests__/practice.test.tsx` (3 tests for Practice Log shell, session timer controls, step navigation and end-of-session review form saving)

### Files modified

- `src/components/set-builder/SetBuilder.tsx` (enhanced DraggableLibraryTrack with vocal indicator; inspector with track position & estimated start time; transition connector with computed analysis, subscores, harmonic rule & recommendation text; summary grid to 8 metrics; fallbackTransition resolution for instant inspector reactivity)
- `src/components/transitions/Transitions.tsx` (added "+1 practiced" action button to drawer and imported `incrementTransitionPractice`)
- `src/components/practice/Practice.tsx` (verified full end-of-session review form and session persistence)

### R5–R7 implementation details

- **Set Builder**: Full drag/drop track insertion & reordering with @dnd-kit; stateful undo/redo history; auto-save with status indicator; selected track/transition Inspectors; transition scoring integration (BPM, Key, Energy, Vocal subscores, harmonic rule & recommendation); Recharts BPM & Energy curves + Key flow strip; 8 summary metrics + editable overlap assumption; warning summary.
- **Transitions Notebook**: Searchable transition table; difficulty, rating, technique & unpracticed filters; "Needs Practice" priority view; detail drawer with notes editing, "+1 practiced" action, and "Mark as reliable".
- **Practice Log**: Interactive session workflow with timer, next/prev transition step navigation, "+1 practiced" toggle, end-of-session review form (duration, rating, confidence before/after, successes, mistakes, next focus), and session history list.
- **Component Tests**: Added 11 new component unit tests across 3 test suites covering Set Builder interactions, Transitions notebook filters & drawer, and Practice Log session flow.

### Real Verification Command Output

**`npm run lint`**
```text
> dj-set-architect@1.0.0 lint
> eslint src/

(exit code 0 — no errors or warnings)
```

**`npm run test`**
```text
> dj-set-architect@1.0.0 test
> vitest run

 RUN  v3.2.7 /Users/gabrielblacher/dj-set-architect

 ✓ src/storage/__tests__/seed.test.ts (7 tests)
 ✓ src/storage/__tests__/transfer.test.ts (2 tests)
 ✓ src/storage/__tests__/operations.test.ts (7 tests)
 ✓ src/storage/__tests__/challenger-r3-deep-verification.test.ts (11 tests)
 ✓ src/storage/__tests__/challenger-r3-empirical-stress.test.ts (17 tests)
 ✓ src/components/shared/__tests__/challenger-empirical.test.tsx (23 tests)
 ✓ src/domain/__tests__/challenger2-r2-verification-harness.test.ts (25 tests)
 ✓ src/components/shared/__tests__/shared-components.test.tsx (6 tests)
 ✓ src/storage/__tests__/db.test.ts (4 tests)
 ✓ src/domain/__tests__/challenger-domain-empirical.test.ts (19 tests)
 ✓ src/domain/__tests__/challenger-r2-deep-stress.test.ts (19 tests)
 ✓ src/domain/__tests__/scoring.test.ts (47 tests)
 ✓ src/domain/__tests__/challenger2-r2-gate-stress.test.ts (14 tests)
 ✓ src/domain/__tests__/challenger-r2-empirical.test.ts (29 tests)
 ✓ src/domain/__tests__/challenger2-empirical-rem.test.ts (18 tests)
 ✓ src/domain/__tests__/r4-library.test.ts (3 tests)
 ✓ src/components/practice/__tests__/practice.test.tsx (3 tests)
 ✓ src/components/transitions/__tests__/transitions.test.tsx (3 tests)
 ✓ src/components/set-builder/__tests__/set-builder.test.tsx (5 tests)

 Test Files  19 passed (19)
      Tests  262 passed (262)
   Duration  4.21s
```

**`npm run build`**
```text
> dj-set-architect@1.0.0 build
> tsc -b && vite build

vite v6.4.3 building for production...
transforming...
✓ 2267 modules transformed.
rendering chunks...
computing gzip size...
dist/registerSW.js                0.13 kB
dist/manifest.webmanifest         0.46 kB
dist/index.html                   0.77 kB │ gzip:   0.44 kB
dist/assets/index-C3Q-MXuS.css   48.00 kB │ gzip:   9.14 kB
dist/assets/index-6_DGzgyR.js   898.10 kB │ gzip: 259.11 kB

PWA v0.21.2
mode      generateSW
precache  14 entries (930.44 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js

(exit code 0)
```

**`npm run dev`**
```text
> dj-set-architect@1.0.0 dev
> vite --host 127.0.0.1

  VITE v6.4.3  ready in 80 ms
  ➜  Local:   http://127.0.0.1:5174/
```

### Visual QA Gaps & macOS Restriction Note

Per Global Rules regarding macOS Browser Subagent Restriction (`http://127.0.0.1:5174/` local server mode is Linux-only for automated headless Chrome subagents):
- Automated browser screenshot verification could not be executed on macOS.
- Local dev server was verified active via terminal CLI (`http://127.0.0.1:5174/`).
- The user is instructed to perform visual QA inspection in their host browser at `http://127.0.0.1:5174/` for layout polish across desktop and tablet viewport widths.

## Execution report — 2026-08-03

### Remediation Items Summary & Evidence

1. **Practice Timer Accuracy & Background-Tab Immunity**:
   - Implemented in [`src/components/practice/usePracticeTimer.ts`](file:///Users/gabrielblacher/dj-set-architect/src/components/practice/usePracticeTimer.ts) using `accumulatedSeconds` plus `currentRunStartMs` timestamp calculations.
   - Tested in [`src/components/practice/__tests__/usePracticeTimer.test.ts`](file:///Users/gabrielblacher/dj-set-architect/src/components/practice/__tests__/usePracticeTimer.test.ts) covering pause/resume, multi-segment accumulation, and 60-second background-tab drift.

2. **PracticeSession Review Persistence & JSON Transfer Migration**:
   - Model updated in [`src/storage/db.ts`](file:///Users/gabrielblacher/dj-set-architect/src/storage/db.ts) and [`src/components/practice/Practice.tsx`](file:///Users/gabrielblacher/dj-set-architect/src/components/practice/Practice.tsx) to store `practicedAt`, `durationMinutes`, `overallRating`, `confidenceBefore`, `confidenceAfter`, `mistakes`, `successes`, and `nextFocus`.
   - `SessionHistory` renders saved `overallRating` stars directly without string-parsing notes text.
   - Transfer validation & legacy migration updated in [`src/storage/transfer.ts`](file:///Users/gabrielblacher/dj-set-architect/src/storage/transfer.ts) and verified in [`src/storage/__tests__/transfer.test.ts`](file:///Users/gabrielblacher/dj-set-architect/src/storage/__tests__/transfer.test.ts).

3. **Atomic Undo/Redo Set Snapshot Restore**:
   - Store per-set snapshots `{ setId, items, transitions }` in [`src/hooks/useAppStore.ts`](file:///Users/gabrielblacher/dj-set-architect/src/hooks/useAppStore.ts).
   - Implemented `restoreSetSnapshot` in [`src/storage/operations.ts`](file:///Users/gabrielblacher/dj-set-architect/src/storage/operations.ts) to atomically restore items and full transition payloads (notes, ratings, cue points, difficulty, phrase bars).
   - Verified in [`src/storage/__tests__/operations-remediation.test.ts`](file:///Users/gabrielblacher/dj-set-architect/src/storage/__tests__/operations-remediation.test.ts) and [`src/components/set-builder/__tests__/set-builder-remediation.test.tsx`](file:///Users/gabrielblacher/dj-set-architect/src/components/set-builder/__tests__/set-builder-remediation.test.tsx).

4. **Immediate Persistence & Navigation Protection**:
   - Structural changes (add, remove, duplicate, drag) save immediately to Dexie in [`src/components/set-builder/SetBuilder.tsx`](file:///Users/gabrielblacher/dj-set-architect/src/components/set-builder/SetBuilder.tsx).
   - Added ref-backed synchronous unmount flush and `beforeunload` listener for pending edits.
   - Tested in `set-builder-remediation.test.tsx`.

5. **Deterministic Deletion Cascade**:
   - Updated `deleteTrack` in [`src/storage/operations.ts`](file:///Users/gabrielblacher/dj-set-architect/src/storage/operations.ts): removes track occurrences, deletes attached transitions, purges affected step logs, recalculates session totals, and transactionally deletes 0-log practice sessions.
   - Tested in [`src/storage/__tests__/operations-remediation.test.ts`](file:///Users/gabrielblacher/dj-set-architect/src/storage/__tests__/operations-remediation.test.ts).

6. **UX Requirements & README Expansion**:
   - Added `KeyboardSensor` (`sortableKeyboardCoordinates`) for keyboard drag/reordering in `SetBuilder.tsx`.
   - Added `window.confirm` modal before removing items from the timeline.
   - Added user tooltips for BPM, Camelot Key, Energy, and Transition scores.
   - Rendered Energy curve using Recharts `AreaChart` with gradient fill.
   - Expanded [`README.md`](file:///Users/gabrielblacher/dj-set-architect/README.md) with technology stack, scripts, reset guide, and visual screenshot placeholders.

7. **Verification Evidence**:

```bash
npm run lint
```
Output:
```text
> dj-set-architect@1.0.0 lint
> eslint src/
```
(Exit code 0, 0 errors, 0 warnings)

```bash
npx vitest run
```
Output:
```text
 ✓ src/components/set-builder/__tests__/set-builder-remediation.test.tsx (4 tests)
 Test Files  22 passed (22)
      Tests  274 passed (274)
   Start at  18:36:04
   Duration  5.93s
```
(Exit code 0, 274 tests passed)

```bash
npm run build
```
Output:
```text
> dj-set-architect@1.0.0 build
> tsc -b && vite build

vite v6.4.3 building for production...
✓ 2268 modules transformed.
PWA v0.21.2
precache  14 entries (949.31 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```
(Exit code 0, clean build & PWA service worker generated)

### Files Modified / Created

- [`src/components/practice/usePracticeTimer.ts`](file:///Users/gabrielblacher/dj-set-architect/src/components/practice/usePracticeTimer.ts) [NEW]
- [`src/components/practice/__tests__/usePracticeTimer.test.ts`](file:///Users/gabrielblacher/dj-set-architect/src/components/practice/__tests__/usePracticeTimer.test.ts) [NEW]
- [`src/storage/__tests__/operations-remediation.test.ts`](file:///Users/gabrielblacher/dj-set-architect/src/storage/__tests__/operations-remediation.test.ts) [NEW]
- [`src/components/set-builder/__tests__/set-builder-remediation.test.tsx`](file:///Users/gabrielblacher/dj-set-architect/src/components/set-builder/__tests__/set-builder-remediation.test.tsx) [NEW]
- [`src/storage/db.ts`](file:///Users/gabrielblacher/dj-set-architect/src/storage/db.ts) [MODIFY]
- [`src/storage/operations.ts`](file:///Users/gabrielblacher/dj-set-architect/src/storage/operations.ts) [MODIFY]
- [`src/storage/transfer.ts`](file:///Users/gabrielblacher/dj-set-architect/src/storage/transfer.ts) [MODIFY]
- [`src/storage/__tests__/transfer.test.ts`](file:///Users/gabrielblacher/dj-set-architect/src/storage/__tests__/transfer.test.ts) [MODIFY]
- [`src/hooks/useAppStore.ts`](file:///Users/gabrielblacher/dj-set-architect/src/hooks/useAppStore.ts) [MODIFY]
- [`src/components/practice/Practice.tsx`](file:///Users/gabrielblacher/dj-set-architect/src/components/practice/Practice.tsx) [MODIFY]
- [`src/components/set-builder/SetBuilder.tsx`](file:///Users/gabrielblacher/dj-set-architect/src/components/set-builder/SetBuilder.tsx) [MODIFY]
- [`src/test-setup.ts`](file:///Users/gabrielblacher/dj-set-architect/src/test-setup.ts) [MODIFY]
- [`src/components/set-builder/__tests__/set-builder.test.tsx`](file:///Users/gabrielblacher/dj-set-architect/src/components/set-builder/__tests__/set-builder.test.tsx) [MODIFY]
- [`README.md`](file:///Users/gabrielblacher/dj-set-architect/README.md) [MODIFY]
- [`_briefs/2026-08-02-set-architect-mvp.md`](file:///Users/gabrielblacher/dj-set-architect/_briefs/2026-08-02-set-architect-mvp.md) [MODIFY]

### Release Blocker Remediation Addendum — 2026-08-03

1. **Uncaught Async Rejection & Component Lifecycle (`ReferenceError: window is not defined`)**:
   - Fixed in [`SetBuilder.tsx`](file:///Users/gabrielblacher/dj-set-architect/src/components/set-builder/SetBuilder.tsx): added `isMountedRef` to guard all post-persistence React state updates (`setSaveState`), and added safe `typeof window !== 'undefined'` guards.
   - Refined `savePendingRef` to accurately track in-flight persistence promises so `beforeunload` protects un-settled writes without setting `dirty: false` prematurely.

2. **Per-Set Undo/Redo Isolation & Cross-Set Regression Test**:
   - Updated [`useAppStore.ts`](file:///Users/gabrielblacher/dj-set-architect/src/hooks/useAppStore.ts): added `setId` to `TimelineSnapshot` and split history into `timelineHistoryBySet` and `timelineRedoBySet` maps.
   - Added validation check to reject cross-set snapshot restoration.
   - Created regression test in [`set-builder-cross-set-undo.test.tsx`](file:///Users/gabrielblacher/dj-set-architect/src/components/set-builder/__tests__/set-builder-cross-set-undo.test.tsx) proving editing Set A, switching to Set B, triggering Undo, and switching back corrupts neither set and properly restores Set A.

3. **Final Terminal Command Execution Evidence**:

```bash
npm run lint
```
Output:
```text
> dj-set-architect@1.0.0 lint
> eslint src/
```
(Exit code 0, 0 errors, 0 warnings)

```bash
npm run test
```
Output:
```text
 ✓ src/components/set-builder/__tests__/set-builder-cross-set-undo.test.tsx (1 test)
 ✓ src/components/set-builder/__tests__/set-builder-remediation.test.tsx (4 tests)

 Test Files  23 passed (23)
      Tests  275 passed (275)
   Start at  18:40:08
   Duration  6.10s
```
(Exit code 0, 275/275 tests passed across 23 test files with zero unhandled rejections)

```bash
npm run build
```
Output:
```text
> dj-set-architect@1.0.0 build
> tsc -b && vite build

vite v6.4.3 building for production...
✓ 2268 modules transformed.
PWA v0.21.2
precache  14 entries (950.30 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```
(Exit code 0, clean build & PWA service worker generated)

```bash
npm run dev
```
Output:
```text
> dj-set-architect@1.0.0 dev
> vite

  VITE v6.4.3  ready in 104 ms

  ➜  Local:   http://localhost:5173/
```
(Exit code 0, dev server launched cleanly on port 5173)

### Save Queue & Multi-Edit Race Condition Addendum — 2026-08-03

1. **Serialized Pending Save Counter & Revision Token**:
   - Replaced boolean `savePendingRef` in [`SetBuilder.tsx`](file:///Users/gabrielblacher/dj-set-architect/src/components/set-builder/SetBuilder.tsx) with `pendingSaveCountRef` (counter) and `latestSaveRevisionRef` (revision token).
   - Rapid consecutive edits increment `pendingSaveCountRef.current`. Decrements occur in `finally` blocks when each save settles.
   - `beforeunload` and unmount protections check `pendingSaveCountRef.current > 0`, keeping navigation protection active until every in-flight save settles.
   - Older out-of-order completions are ignored for state updates, preserving UI save state for the newest write (`currentRevision === latestSaveRevisionRef.current`).

2. **Multi-Edit Race Condition Regression Test**:
   - Created [`set-builder-save-queue.test.tsx`](file:///Users/gabrielblacher/dj-set-architect/src/components/set-builder/__tests__/set-builder-save-queue.test.tsx).
   - Proves triggering edit #1 and edit #2 rapidly, resolving save #1 while save #2 is still pending, maintains active navigation protection (`beforeunload` default prevented), transitions to `Saved` once save #2 settles, and persists 10 items total reflecting the second edit.

3. **Final Terminal Command Verification Evidence**:

```bash
npm run lint
```
Output:
```text
> dj-set-architect@1.0.0 lint
> eslint src/
```
(Exit code 0, 0 errors, 0 warnings)

```bash
npm run test
```
Output:
```text
 ✓ src/components/set-builder/__tests__/set-builder-save-queue.test.tsx (1 test)

 Test Files  24 passed (24)
      Tests  276 passed (276)
   Start at  21:26:55
   Duration  6.01s
```
(Exit code 0, 276/276 tests passed across 24 test files with zero unhandled rejections)

```bash
npm run build
```
Output:
```text
> dj-set-architect@1.0.0 build
> tsc -b && vite build

vite v6.4.3 building for production...
✓ 2268 modules transformed.
PWA v0.21.2
precache  14 entries (950.56 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```
(Exit code 0, clean build & PWA service worker generated)

```bash
npm run dev
```
Output:
```text
> dj-set-architect@1.0.0 dev
> vite

  VITE v6.4.3  ready in 94 ms

  ➜  Local:   http://localhost:5173/
```
(Exit code 0, dev server launched cleanly on port 5173)
