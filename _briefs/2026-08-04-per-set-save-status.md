# Brief: per-set-save-status (2026-08-04)

**Author:** Antigravity (approved with user refinement) · **Executor:** Antigravity · **Repo:** /Users/gabrielblacher/dj-set-architect

## Objective
Make SaveStatus pending tracking and status outcome per active set rather than relying on global `pendingSaveCountRef` and single `saveState`, retaining global count for `beforeunload` protection, and add a comprehensive regression test for concurrent per-set save status.

## Context
Currently in `SetBuilder.tsx`, `pendingSaveCountRef` is a global count of pending saves across all sets. If Set A finishes saving while Set B still has a queued save, and the user is viewing Set A, Set A remains in "saving" state (`pendingSaveCountRef.current > 0`); when B finishes it does not update A's status.
Furthermore, zero pending count does not guarantee "Saved" if a set's save failed. We need to track per-set status (`saveStatusBySetRef` / `saveStateBySetRef`) alongside per-set pending counts (`pendingSaveCountsBySetRef`), so that when the active set changes or saves finish, the status is derived per set:
- pending count > 0 → `saving`
- no pending + latest result failed → `error`
- no pending + latest result succeeded/idle → `saved`

The global count `pendingSaveCountRef` is kept solely for unload/unmount protection.

## In scope
- `src/components/set-builder/SetBuilder.tsx`
- `src/components/set-builder/__tests__/set-builder-save-queue.test.tsx`
- `_briefs/2026-08-04-per-set-save-status.md`

## Out of scope
- Refactoring the Dexie DB persistence layer or `reorderSetItems`.
- Modifying save queue execution logic beyond per-set status tracking and UI status updates.
- Modifying any files outside `SetBuilder.tsx`, `set-builder-save-queue.test.tsx`, and `_briefs/2026-08-04-per-set-save-status.md`.

## Acceptance criteria
1. `pendingSaveCountRef` continues to track global pending saves across all sets to preserve unmount/beforeunload protection.
2. Per-set pending count tracking (`pendingSaveCountsBySetRef`) tracks pending operations per `setId`.
3. Per-set status state tracking (`saveStatusBySetRef` / `saveStateBySetRef`) tracks latest save result per `setId` ('saved' | 'error' | 'saving' | 'idle').
4. When active set changes or saves progress, displayed status is derived per active set:
   - pending count > 0 → `saving`
   - no pending + latest result failed → `error`
   - no pending + latest result succeeded/idle → `saved`
5. Regression test in `set-builder-save-queue.test.tsx` verifies exact scenario:
   - Start delayed saves for A and B.
   - Switch back to A while both are pending.
   - Resolve A only: UI becomes `Saved`.
   - Keep B pending: A must remain `Saved`.
   - Resolve B and confirm global unload protection clears only then.
6. `npm run test`, `npm run lint`, and `npm run build` all pass with zero errors.

## Verification
- `npm run test`
- `npm run lint`
- `npm run build`

## Execution report — 2026-08-04

### Files changed
- `src/components/set-builder/SetBuilder.tsx`: Added `pendingSaveCountsBySetRef`, `saveStatusBySetRef`, `deriveSetSaveStatus`, updated `enqueueSave` task completion logic to derive status per active set, and updated `useEffect` on `currentSet?.id` change to derive status for the new active set.
- `src/components/set-builder/__tests__/set-builder-save-queue.test.tsx`: Added regression test `tracks save status per active set independently, returning set A to Saved when A settles even while set B remains pending`.
- `_briefs/2026-08-04-per-set-save-status.md`: Brief created and execution report recorded.

### Real verification output

#### 1. `npm run test`
```text
✓ src/components/set-builder/__tests__/set-builder-save-queue.test.tsx (4 tests) 1152ms
  ✓ SetBuilder Serialized Save Queue Ordering & Persistence Verification Suite > serializes rapid edits
  ✓ SetBuilder Serialized Save Queue Ordering & Persistence Verification Suite > ensures an earlier failed save does not poison the queue
  ✓ SetBuilder Serialized Save Queue Ordering & Persistence Verification Suite > preserves unload protection until all queued saves settle
  ✓ SetBuilder Serialized Save Queue Ordering & Persistence Verification Suite > tracks save status per active set independently, returning set A to Saved when A settles even while set B remains pending

Test Files  24 passed (24)
     Tests  279 passed (279)
  Start at  12:31:33
  Duration  5.70s
```

#### 2. `npm run lint`
```text
> dj-set-architect@1.0.0 lint
> eslint src/
(exit code 0, no output)
```

#### 3. `npm run build`
```text
> dj-set-architect@1.0.0 build
> tsc -b && vite build

vite v6.4.3 building for production...
transforming...
✓ 2268 modules transformed.
rendering chunks...
computing gzip size...
dist/registerSW.js                0.13 kB
dist/manifest.webmanifest         0.46 kB
dist/index.html                   0.77 kB │ gzip:   0.44 kB
dist/assets/index-DbiboeJT.css   48.17 kB │ gzip:   9.15 kB
dist/assets/index-CmtJXip2.js   918.81 kB │ gzip: 263.73 kB
✓ built in 1.26s
```

### Deviations from brief
None.

### Open questions
None.
