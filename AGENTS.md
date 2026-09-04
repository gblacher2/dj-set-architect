# DJ Set Architect agent instructions

## Project overview

Local-first React application for building DJ sets, evaluating adjacent-track
compatibility, and recording practice sessions. User library and set data stay in
browser IndexedDB; no backend owns application state.

## Architecture

- `src/` contains the React/TypeScript application and tests.
- Dexie is the sole persistent store. Zustand owns transient UI state and undo/redo
  snapshots; do not introduce a second persistent source of truth.
- Compatibility scoring is domain logic and must remain transparent and testable.
- `public/` contains PWA and application assets. `dist/`, `.openai/`, and `.agents/`
  are generated or tool-local and are not source.

## Development

```bash
npm ci
npm run dev
```

## Validation

Run the complete gate after changes:

```bash
npm run lint
npm test
npm run build
git diff --check
```

## Coding conventions

- Preserve local-first and offline behavior.
- Keep storage migrations backward-compatible with existing browser data.
- Preserve keyboard-accessible drag and drop and schema validation at import edges.
- Do not add a server, analytics, or network synchronization without explicit scope.

## GitHub workflow and agent guardrails

- GitHub is the canonical system of record. Record durable decisions, acceptance
  criteria, implementation state, review findings, and validation in the repository,
  Issues, or pull requests rather than only in an AI conversation.
- Meaningful work uses an Issue or equivalent complete PR context, a scoped branch,
  an early draft PR, review comments, verification, and a final `READY FOR HUMAN` state.
- Use `feat/`, `fix/`, `refactor/`, or `chore/` branch prefixes. Do not implement normal
  feature work directly on `main` and do not merge without human authorization.
- Inspect the existing architecture and `git status` before changing files. Preserve
  unrelated local work and prefer minimal, scoped modifications.
- Do not suppress type or lint failures, replace working implementations unnecessarily,
  introduce dependencies without justification, or alter unrelated code.
- Never commit secrets, credentials, `.env` values, personal data, local databases,
  logs, or machine-specific state. Commit reconstruction-safe examples and setup docs.
- Push meaningful checkpoints and keep the PR accurate so a fresh agent can continue
  from GitHub alone.
