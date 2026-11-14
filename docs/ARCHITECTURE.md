# MARGIN architecture

Status: production build, NASA Space Apps 2026. Supersedes the design-phase `ARCHITECTURE_DECISION.md` (kept in git history).

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · statically generated · deployed on Vercel.
Runtime dependencies: `d3-scale`, `d3-array`, `d3-shape`, `d3-contour` (bespoke SVG charts), `zod` (data validation in tests). No component kit, chart kit, state library, database, authentication, analytics or runtime AI.

## Layers

| Layer | Location | Notes |
|---|---|---|
| Pipeline | `pipeline/` | `fetch-psi.mjs` downloads the 24 PSI combustion records and their experimental tables once; `build-data.mjs` normalises them (rules in `pipeline/README.md`, mappings in `pipeline/mappings/`). Re-runs are byte-identical apart from timestamps. |
| Generated data | `data/generated/snapshot.json` | Committed, so builds never call NASA. 1,870 run rows, 130 summary rows, investigation metadata, table stats, counts. |
| Curated content | `content/` | Published (T3) and planned (T4) values, partial-gravity table, atmospheres, hazard map, findings, references. Every value carries a primary-source locator and a ≤ 25-word quote; verification status recorded per item (`docs/verification/`). |
| Schema | `lib/schema` | Canonical `Run`, `Investigation`, `Scenario`, `Atmosphere` types and flags. |
| Engine | `lib/engine` | Pure, deterministic functions: gate → distance → verdict (+ qualifier, complete-axis verdict) → robustness (27 scale combinations) → ranking → distance field → flow sensitivity. No I/O. |
| Data access | `lib/data` | Joins the snapshot with curated content; computed headline numbers. |
| State | `lib/state` | `scenarioQuery.ts` (pure URL ⇄ scenario encoding, clamped, unknown params preserved) and `useMargin` (scenario + memoised evaluation, ranking, robustness). The header carries the scenario between Atlas and Investigations. |
| UI | `components/atlas` (Atlas, `/`: full-bleed evidence field, expeditions, scenario console, inspector, regime detents, tool rail, regimes overview), `components/casefile` (`/investigations`), `components/dossier` (`/investigations/[id]`), `components/docs` (`/method`, `/sources`), `components/run` (the single run inspector used everywhere), `components/ui` (shared components: panel, radio group, switch, select, number field, tabs, drawer, icon button, chart frame, breadcrumb, command search, toast), `components/site` (header, footer, brand mark) | Presentation view-models in `lib/view` (expeditions, regimes, label placement, search index; they call the engine, never re-implement it). View-only URL params in `lib/state/viewQuery.ts` (`run`, `view`). Tokens in `app/globals.css` (dark "observatory" identity, see `docs/design/DESIGN_SYSTEM.md`); fonts in `lib/fonts.ts` (Albert Sans and IBM Plex Mono, OFL, self-hosted by `next/font`). The search index is loaded by dynamic import so the PSI snapshot is not shipped with the header. |

## Rendering
Every route is prerendered as static HTML. The Atlas and Investigations pages hydrate and run the engine in the browser (≈ 2,000 runs, a few ms per evaluation). Method and Sources compute their numbers at build time from the same engine and data. Dossiers are generated for every investigation with `generateStaticParams`.

## Why no database (Supabase considered and rejected)
The data is read-only, small and changes only when PSI changes; versioned JSON gives reproducibility and reviewable diffs with no runtime dependency on NASA or a database. Sharing is solved by encoding the scenario in the URL. There are no user accounts and no user data is stored.

## Quality gates
`npm run typecheck`, `npm run lint`, `npm run lint:claims` (banned-claims lint), `npm test` (engine, science and data tests, URL-state tests), `npm run test:e2e` (Playwright, desktop and mobile, accessibility via axe), `next build`. CI runs these on every push (`.github/workflows/ci.yml`).
