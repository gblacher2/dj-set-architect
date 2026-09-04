# Set Architect

> **Plan the journey. Practice the transitions.**

Set Architect is a local-first web application designed to help hobbyist and beginner DJs curate music libraries, visually structure sets, evaluate transition compatibility, and record practice sessions.

---

## 📸 Interface Screenshot & Sitemap

![Set Architect Desktop Interface Mockup](./public/set-architect-preview.png)

```text
+-----------------------------------------------------------------------------------+
|  SET ARCHITECT                                [Library] [Set Builder] [Practice]  |
+-------------------+-------------------------------------------+-------------------+
| TRACK LIBRARY     | SET TIMELINE                              | INSPECTOR         |
| 🔍 Search tracks  | 01  Sunset Groove    120 BPM  8A  E3      | Position #01      |
| • Deep House      |      ↓ 88/100 (BPM: 100, Key: 90)         | Track: Sunset Grv |
| • Tech House      | 02  Amber Motion     122 BPM  9A  E4      | BPM: 120  Key: 8A |
| • Disco House     |      ↓ 61/100 (⚠ Vocal overlap warning)  | Energy: 3         |
|                   | 03  Deep Horizon     124 BPM  2B  E6      | Set Notes: ...    |
+-------------------+-------------------------------------------+-------------------+
| CHARTS: [BPM Curve: 📈 120->124]    [Energy Curve: 📊 3->6 (Area Chart)]           |
+-----------------------------------------------------------------------------------+
```

---

## 🚀 Technology Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Vanilla CSS + Tailwind CSS utilities (Restrained dark mode theme)
- **Local Persistence**: Dexie.js (IndexedDB wrapper) — *Sole persistent source of truth*
- **State Management**: Zustand — *Transient app state, toasts & undo/redo snapshots*
- **Drag and Drop**: `@dnd-kit/core` & `@dnd-kit/sortable` (Keyboard accessible with `KeyboardSensor`)
- **Visualization**: Recharts (`LineChart`, `AreaChart`)
- **Validation**: Zod (Schema validation for tracks, sets, transitions, practice sessions, and imports)
- **Testing**: Vitest + React Testing Library

---

## 🛠️ Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Launch local development server with hot reloading |
| `npm run build` | Compile TypeScript and produce production build bundle |
| `npm run lint` | Run ESLint across all source files |
| `npm run test` | Run full Vitest unit, component, and storage test suite |
| `npm run preview` | Serve production build locally for verification |

---

## 🔄 Resetting Application Data

To reset application state back to the original 30 seeded House tracks and default set configurations:

1. Open the application and navigate to the **Library** section.
2. Click **Reset Seed Data** in the top action toolbar.
3. Confirm the prompt. The IndexedDB database (`SetArchitectDB`) will be re-initialized with fresh seed data.

*Alternatively, click **Export JSON** to backup your custom library/sets before resetting.*

---

## 📊 Scoring Methodology

Compatibility scores are calculated transparently using standard DJ preparation heuristics:
- **40% BPM Compatibility**: Checks absolute BPM difference and half-time/double-time tempo equivalence.
- **30% Harmonic Fit**: Evaluates Camelot wheel key transitions (same key, adjacent keys, A/B mode switches).
- **20% Energy Profile**: Assesses energy changes against chosen set profiles (`warm-up`, `steady-groove`, `build-to-peak`, `peak-time`).
- **10% Vocal Overlap**: Detects potential vocal collision between adjacent tracks.

---

## 🔒 Privacy & Offline Capability

Set Architect runs completely client-side as a progressive, local-first web app. No user data, track metadata, or practice notes ever leave your machine.
