# Before and after: the "observatory" redesign

Before: the committed "warm paper" editorial design (`main` at `8545952`), captured in `before/` at 1440 × 900, 1280 × 800, 768 × 1024 and 390 × 844. After: `redesign/eyes`, captured from a production build (`next start`) with `node scripts/capture-routes.mjs <base> <dir>` on 2026-11-14; the 1440 and 390 views are committed in `after/` (the other widths were reviewed but not committed, to keep the repository light). Both sets show the first screen of each route; no captured view has horizontal overflow or console errors.

## Atlas `/` (ISS cabin, microgravity)

| Before | After |
|---|---|
| ![before](before/atlas-1440.jpg) | ![after](after/atlas-1440.jpg) |
| ![before](before/atlas-390.jpg) | ![after](after/atlas-390.jpg) |

## Atlas, lunar regime `/?preset=ea&g=moon&pub=1`

| Before | After |
|---|---|
| ![before](before/atlas-moon-1440.jpg) | ![after](after/atlas-moon-1440.jpg) |
| ![before](before/atlas-moon-390.jpg) | ![after](after/atlas-moon-390.jpg) |

## Investigations `/investigations`

| Before | After |
|---|---|
| ![before](before/investigations-1440.jpg) | ![after](after/investigations-1440.jpg) |
| ![before](before/investigations-390.jpg) | ![after](after/investigations-390.jpg) |

## Dossier `/investigations/PSI-25`

| Before | After |
|---|---|
| ![before](before/dossier-1440.jpg) | ![after](after/dossier-1440.jpg) |
| ![before](before/dossier-390.jpg) | ![after](after/dossier-390.jpg) |

## Method `/method`

| Before | After |
|---|---|
| ![before](before/method-1440.jpg) | ![after](after/method-1440.jpg) |
| ![before](before/method-390.jpg) | ![after](after/method-390.jpg) |

## Sources `/sources`

| Before | After |
|---|---|
| ![before](before/sources-1440.jpg) | ![after](after/sources-1440.jpg) |
| ![before](before/sources-390.jpg) | ![after](after/sources-390.jpg) |

## What changed

| Area | Before | After |
|---|---|---|
| Identity | Off-white paper, serif-heavy reading text, a printed-atlas look | Near-black "observatory" (`#05070a`), opaque floating panels, Albert Sans (light display, 600 tracked caps) with IBM Plex Mono for ids only; one semantic hue per meaning |
| Atlas layout | Intro block and stats above a three-column page; the map one region among many; four gravity sheets below the fold | The evidence field fills the viewport; Expeditions and the scenario console float left, the inspector right, the tool rail on the edge, the regime detents and verdict readout in a bottom instrument strip; panels collapse and the field eases into the freed space |
| Coverage gap | Three stat tiles above the map | The first Expedition card, and drawn on the field itself (the 22.2 % line and the 26.5–34 % planned bracket) |
| Gravity regimes | Four always-visible sheets | Four discrete detents with per-regime occupancy thumbnails, plus a regimes overview of four separate plates (`view=overview`); empty regimes are shown empty with a plain statement |
| Annotation | Labels above landmarks, probe label hidden when a preset was active | Collision-free placement (`lib/view/labels.ts`): probe, selected run, then landmarks; data marks avoided |
| Run inspection | Specimen card (Atlas) and a separate provenance panel (Investigations) | One run inspector (`components/run/RunInspector.tsx`) everywhere, with the distance decomposition to the scenario; `run=` in the URL; Esc returns focus |
| Search | None | ⌘K / Ctrl K command search over local data |
| Investigations | Wide table with strips | Ranked catalogue cards with reweightable rank, a footprint field, a compare dock, a claim ledger opening the provenance drawer |
| Dossier | Metadata page | A hero band whose stage is the investigation's footprint in condition space |
| Method / Sources | Editorial reading pages | The same identity: numbered sections, typeset formulas with defined symbols, an engine-driven illustration of the distance; tables in focusable regions |
| Phones | Long stacked page with the map mid-page | The field first (≥ 60 svh), regime detents as a 4-segment control, a sticky section bar, the key in a disclosure, expeditions as a horizontal scroller |
| Shared links | Default scenario rendered, then replaced | Scenario-dependent views stay hidden until the URL scenario is applied, so a default verdict is never shown |

Independent QA of the redesign: [`review/QA_REPORT.md`](review/QA_REPORT.md) (its P1 items and most P2 items were fixed; see `docs/BUILD_LOG.md`).
