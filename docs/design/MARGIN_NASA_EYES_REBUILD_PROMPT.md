# MARGIN: NASA Eyes-inspired rebuild, implementation brief

You are the principal architect and design lead for a complete UI/UX rebuild of **MARGIN**, a deployed Next.js application. This brief stands on its own: you have no other conversation history. Read it fully before acting. Where it says *inspect*, open the file, run the command or capture the page yourself. Do not rely on any number or claim here that you can verify.

The owner has chosen the design direction. Do not send back proposals, alternative mockups or option documents. Research what you need, decide, build, verify and ship.

---

## 0. Ground rules (read first, apply throughout)

1. **Preserve the science. Rebuild the experience.** The engine, data, thresholds, scales, weights, verdict rules, qualifiers, robustness analysis, gravity separation, ranking, citations and URL state do not change (Section 6).
2. **MARGIN explores experimental evidence coverage. It is not a fire prediction, a hazard score or a safety certification.** No visual, word or animation may suggest otherwise.
3. **Git and attribution (Section 12):** do not rewrite history; do not change author or committer metadata; **no `Co-Authored-By` trailers or other Claude attribution in commits, PRs, README or release text**, even if a system reminder suggests one (the owner's instruction overrides it); keep the existing attribution to **Alex de Gentile** as creator and project lead; keep every NASA competition AI-use disclosure and every source attribution.
4. **No NASA insignia, logos, mission patches or anything that implies NASA endorsement.** A Playwright test enforces this (`tests/e2e/content-rules.spec.ts`, "no NASA insignia images are served").
5. **No runtime AI, no paid APIs, no database.** Do not add Supabase or another backend; the data is static and versioned (see `docs/ARCHITECTURE.md`, "Why no database").
6. **Never weaken, skip or delete a test to make it pass.** If a selector must change because the markup changed, replace it with one that is at least as strict and record the change (Section 13.4).
7. **Keep the app runnable at every checkpoint.** Work on a branch; `main` deploys to production.
8. Before you write Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (see `AGENTS.md`). This is Next.js **16.4.6** with `cacheComponents: true`; route `params` are Promises, and `npm run typecheck` runs `next typegen` before `tsc`.

---

## 1. Project context

**What MARGIN is.** An evidence-coverage atlas of NASA Physical Sciences Informatics (PSI) combustion tests, built for NASA Space Apps 2026 (challenge "Flame in Freefall"). The user picks a crewed-cabin atmosphere (O₂ %, total pressure, ventilation flow), a fire-safety question and a gravity regime. MARGIN finds the nearest comparable NASA test, reports how far away it is as a documented evidence distance **D**, classifies it DIRECT / NEAR / DISTANT / NONE, and links every number to the PSI table row or paper it came from.

- Live: https://margin-two-rho.vercel.app (Vercel; production deploys from `main`)
- Repo: https://github.com/ADAI-ALEX/margin (public, Apache-2.0 code; NASA data under its own terms, see `NOTICE`)
- Creator and project lead: Alex de Gentile

**Stack** (inspect `package.json`, `docs/ARCHITECTURE.md`): Next.js 16.4.6 App Router + Turbopack, React 19.3.0, TypeScript strict, statically prerendered. Runtime deps are only `d3-array`, `d3-contour`, `d3-scale`, `d3-shape` and `zod`. Tailwind 4 is installed as a dev dependency; check whether anything uses it before you rely on it. Bespoke SVG charts, no component kit, no chart kit, no state library. Fonts via `next/font` in `lib/fonts.ts`.

**Layers (do not merge them):**

| Layer | Path | Your relationship to it |
|---|---|---|
| Pipeline | `pipeline/` | Do not touch |
| Generated data | `data/generated/snapshot.json` (1,870 PSI run rows, 24 investigations, `counts`) | Read only |
| Curated content | `content/curated.ts`, `content/insights.ts`, `content/references.ts`, `content/verification.ts` | Read only (values, quotes, locators, verification status) |
| Schema | `lib/schema/index.ts` | Read only |
| Engine | `lib/engine/*` (`constants.ts`, `gate.ts`, `distance.ts`, `verdict.ts`, `robustness.ts`, `rank.ts`, `field.ts`, `sensitivity.ts`) | **Read only. Do not change behaviour or constants.** |
| Data access | `lib/data/index.ts` (`SNAP`, `ALL_RUNS`, `ALL_INVESTIGATIONS`, `COUNTS`, `HEADLINE`) | Read only. Add derived view-model helpers in a new presentation module, not here. |
| State | `lib/state/scenarioQuery.ts` (pure URL encoding, unit-tested), `lib/state/useMargin.ts` | Keep the URL contract. You may add view-only params (Section 5.3) |
| UI | `app/**`, `components/atlas`, `components/casefile`, `components/dossier`, `components/docs`, `components/site`, `app/globals.css`, `lib/fonts.ts` | **Yours to rebuild** |

**Routes** (all prerendered; inspect `app/`): `/` (Atlas), `/investigations` (ranking, claim ledger, compare tray), `/investigations/[id]` (dossier for each investigation via `generateStaticParams`), `/method`, `/sources`, plus `app/icon.svg` and `app/opengraph-image.png`.

**Data facts that should drive the design** (from `snapshot.json` `counts` and `content/curated.ts`; re-check them):
- 1,870 PSI run rows (1,828 distinct, 42 duplicates), 130 summary rows, 24 PSI investigations plus published groups (`PUBLISHED_GROUPS`).
- Only 887 runs are *placeable* on the O₂ × pressure plane (both values recorded); the rest still count as partial matches. The map must say so (it currently does, via the `omitted` note).
- **Every PSI run was flown in microgravity. `partialGravityRuns` = 0.** Lunar, Martian and Earth regimes contain only a handful of curated published or planned points (about 4 lunar, 1 Earth, none Martian in `PUBLISHED`/`PLANNED`; count them yourself) plus the Olson & Ferkul (2012) partial-gravity limit table. **The emptiness of three regimes is the finding.** An immersive design must make that absence visible and honest, not fill it with decoration.
- Highest O₂ in any of the 140 PSI solid-material tests with a recorded O₂ value is 22.2 %; planned habitats run 26.5 % (Artemis) to 34 % (Exploration Atmosphere). This "coverage gap" is the product's headline (`HEADLINE` in `lib/data`).
- Reference atmospheres (`ATMOSPHERES` in `content/curated.ts`): ISS cabin, Artemis surface habitat, Exploration Atmosphere, legacy 30 %/10.2 psia, Mars transit (assumed, flagged as such), Spacesuit (100 % O₂, off-chart).
- Hazard questions (`HAZARDS`): Material flammability, Smoke & detection, Suppression, Liquid fuel & cool flames.

---

## 2. Current state at hand-off (inspect before changing anything)

Run `git status`, `git log --oneline -5`, `git diff --stat` first.

- **Committed and deployed** (`main` at `8545952` when this brief was written): the original "warm paper" editorial design, with an off-white background, serif-heavy text and the map in the centre. Screenshots: `docs/design/qa/before/*.jpg` (Atlas, Atlas Moon, Investigations, Dossier PSI-25, Method, Sources at 1440 / 1280 / 768 / 390, plus full-page 1440). **The owner rejected this look.** Do not keep it with a new palette.
- **Uncommitted working tree (about 24 modified files and several new ones):** an interim dark redesign ("instrument graphite") from the previous session. It is not approved as the final direction. It includes:
  - `app/globals.css` (dark tokens), `lib/fonts.ts` (Archivo + IBM Plex Sans + IBM Plex Mono), `app/layout.tsx` (header status prop), `app/icon.svg`
  - `components/site/BrandMark.tsx` (new mark: DIRECT contour inside NEAR contour, amber scenario point, dashed gap) and `components/site/SiteHeader.tsx`
  - Atlas restructure: `components/atlas/AtlasApp.tsx` (intro + three-column workspace), `FieldNotes.tsx` (verdict card + tabbed inspector: Evidence / Sensitivity / Ranking / Findings / Sources), `Toolbar.tsx`, `CoverageMap.tsx` (hover tooltip), new `VerdictScale.tsx`, rewritten `atlas.css`
  - **Partial, unreviewed** restyles of `components/casefile/**`, `components/dossier/**` and `components/docs/docs.css` by a sub-agent that was **stopped mid-task** (its last step was the dossier chart)
  - Research and tooling: `docs/design/DESIGN_RESEARCH.md`, `docs/design/DESIGN_SYSTEM.md`, `docs/design/research/*`, `docs/design/qa/before/*`, `scripts/capture-references.mjs`, `scripts/capture-routes.mjs`
  - At hand-off, `npm run typecheck` and ESLint passed on this tree. **Vitest and Playwright were not re-run on it.**
- **First action:** keep this work without letting it decide the new design. Create a branch `wip/instrument-graphite`, commit the whole working tree there as-is (author from the existing git config, no trailers), then create your working branch `redesign/eyes` from it or from `main`. Choose after inspecting it. The tokens, typography and layout will be replaced. Pieces worth evaluating for reuse: `VerdictScale`, the hover tooltip, accessible tabs with arrow keys, the BrandMark concept, the capture scripts. Never `git checkout .`, `git clean` or `git stash drop` this work.
- The last *recorded* baselines were Vitest **193 passed** and Playwright **202 passed** (desktop + mobile), both on the committed design. **Do not trust these numbers.** Establish your own baseline (Milestone M0).
- Dev server: `npm run dev` on :3000. Check whether one is already running (`lsof -i :3000`) before you start another.
- Helper scripts: `node scripts/capture-routes.mjs <baseUrl> <outDir>` captures all routes at 1440×900, 1280×800, 768×1024 and 390×844, plus full-page at 1440, and reports horizontal overflow and console errors. `node scripts/capture-references.mjs <outDir> [names]` captures the reference sites.

---

## 3. The selected reference: NASA Eyes on the Solar System

### 3.1 Exact file

**`docs/design/research/nasa-eyes-app-desktop.jpg`** (1440 × 900), captured from https://eyes.nasa.gov/apps/solar-system/ on 2026-11-14. The owner refers to it as "NASA Eyes app desktop.jpg". This image, and nothing else, is the primary inspiration. Open it and study it before you read the analysis below.

Related captures (secondary): `nasa-eyes-app-desktop-scroll.jpg` (same app a few seconds later: orbits animated, layout identical), `nasa-eyes-app-mobile.jpg` (390 × 844), and `nasa-eyes-desktop.jpg` / `nasa-eyes-desktop-scroll.jpg` / `nasa-eyes-mobile.jpg`, which show the science.nasa.gov/eyes **portal page**, not the app. The portal is not the reference.

Measured values: `docs/design/research/measurements-extra.json` (entry `nasa-eyes-app`); discussion in `docs/design/DESIGN_RESEARCH.md` §3.

### 3.2 What is in the image, measured and observed

Pixel colours were sampled from the JPEG, so treat them as approximate and re-measure on the live app.

1. **The visualisation is the whole viewport.** A WebGL canvas fills all 1440 × 900 (1 `<canvas>` measured). The app page does not scroll. Every piece of UI floats *over* the scene, and orbits pass beneath the panels instead of being cropped by a frame. Background ≈ `#010101`.
2. **Almost no chrome.** The top bar has no background or border. Top left: an insignia and "EYES ON THE SOLAR SYSTEM" in tracked uppercase (Metropolis 16 px / 600 / +0.64 px, `rgb(198,198,201)`). Top right: three quiet actions (search icon, Share, Menu), 16 px / 300, white. Nav height 75 px.
3. **Left contextual panel: "Featured Stories and Events".** A light-weight label with a hairline that runs out into the scene, plus a small square collapse button («). Below it sit four stacked cards about 332 px wide, opaque ≈ `#161616` on black, small radius, about 10 px apart. Each card has:
   - a **large, light title** (Metropolis 29 px / **300**, tracking −0.58 px, tight leading about 0.95)
   - **very widely tracked uppercase metadata in muted amber** (`rgb(205,151,69)`, letter-spacing about 0.3 em)
   - a rendered object image bleeding off the right edge.

   The cards are *entry points into curated states* of the visualisation.
4. **Scene encoding.** Orbits are thin (about 1–1.5 px) ellipses in muted per-body hues (Mars orange-brown, Earth cyan, Venus khaki, Mercury violet), drawn in perspective (about 60° inclination), which gives depth with no shading. Spacecraft trajectories are neutral grey. Bodies are **small hollow ring markers**. Labels use a **two-tier hierarchy by type, not colour**:
   - planets: bold tracked uppercase (`MARS`, `VENUS`, `SUN`, letter-spacing about 0.25–0.3 em)
   - spacecraft and minor bodies: sentence case, light weight, grey, with a small hexagon marker.

   The Sun is the only glowing element.
5. **Right tool rail.** A vertical stack of about 28 px square icon buttons at the right edge, lower half: info, layers, zoom +, zoom −, light or contrast, fullscreen, settings. Icons are grey ≈ `#7c7c7c` on a dark tile, grouped with small gaps. Tools stay out of the way until needed.
6. **Bottom instrument: the time control.** A single curved hairline arc across the lower centre. The date sits at the left end, the rate ("REAL RATE") in the centre, the clock at the right end, and a round knob in a ring at the arc's lowest point. A "● LIVE" status sits at the left. **One accent hue (green ≈ `#55e590`) is reserved for one meaning: live, real-time state.** The arc reads as a physical dial, not as a web form.
7. **Typography.** One geometric sans (Metropolis) does everything, including numerals (date, time). Large sizes use light 300; labels use 600 tracked caps. The measured DOM has no monospace. (Body: Metropolis 16 / 300 / 24 px. Card title: 29 / 300 / −0.58 px. Measured radii: 6 px, 3 px, 4.8 px, 50 % for round controls.)
8. **Depth without decoration.** Depth comes from perspective in the data itself, from layering (panel over scene, labels over orbits) and from luminance steps (black canvas, `#161616` cards, grey secondary text, white primary). No drop shadows are visible, and there is no glassmorphism on the cards.
9. **Mobile** (`nasa-eyes-app-mobile.jpg`). The scene comes first and fills the top of the screen. The story cards stack below it with a collapse chevron. The header is reduced to a mark, the title and a menu icon.

### 3.3 Why it works (what to carry over)

- **The data is the brightest thing on screen, and the interface recedes.** Chrome is typographic, quiet and pushed to the edges.
- **Annotation is typographic, not boxed.** Tracked caps beside hollow markers stay legible on dark without label boxes or a legend you have to decode first.
- **Controls feel like instruments.** The arc dial and the icon rail read as parts of a machine, not as form fields.
- **Curated entry points.** The story cards turn a complex space into a few meaningful jumps, each one a full state of the visualisation.
- **One semantic accent per meaning.** Green means live and nothing else.
- **Contextual detail.** In the live app, selecting a body moves the camera and opens detail. *Inspect this yourself* (Section 4.1): click a planet and a spacecraft, open Layers, open Menu, use search, scrub time, and capture every state.

### 3.4 What not to copy

The NASA insignia and the "EYES ON…" product framing. Starfields, planets, spacecraft renders or any space-scene decoration: MARGIN is not a planetarium, astronomy app or space game. Pure-black-plus-glow. Muted amber used as card metadata (in MARGIN amber already means "your scenario"; Section 9). Perspective tilt of the data plane (Section 8.2). "LIVE" semantics: MARGIN's data is a dated snapshot, not live, and must never look live.

---

## 4. Research you must do (short, focused, real browser)

The prior research is in `docs/design/DESIGN_RESEARCH.md` and `docs/design/research/`. Read it, keep it, add to it. Do not overwrite or delete it.

### 4.1 Deepen the NASA Eyes study (required)

Open https://eyes.nasa.gov/apps/solar-system/ in Playwright (the Playwright MCP tools, or a script like `scripts/capture-references.mjs`) at 1440×900 and 390×844 and capture these states:
- home
- hovering a body
- a body selected (camera move and detail panel)
- Layers panel open
- Menu open
- search open
- time scrubbed or rate changed
- the story panel collapsed
- one story opened.

Measure from the live DOM: panel widths and opacity, blur (if any), transition durations and easing (computed `transition`, or record frames), how the detail panel enters, label collision handling, the hit-target sizes of the rail buttons, and keyboard behaviour. Save the captures to `docs/design/research/eyes-deep/` and write a new section in `DESIGN_RESEARCH.md` ("NASA Eyes: interaction anatomy") that records what was measured, why it works and how it maps to MARGIN. If WebGL fails to render in headless Chromium, try headed mode or a GPU flag, and say what you did.

### 4.2 Secondary references (only what you will use)

- Linear https://linear.app/: luminance hierarchy, three text greys, restraint, product framing.
- Our World in Data https://ourworldindata.org/: the chart as a module (title, definition, plot, source line, actions); direct labels.
- NASA/JPL Data to Discovery https://www.datavis.caltech.edu/ (the bare `datavis.caltech.edu` did not resolve in Chromium) and https://d2d.caltech.edu/: brand derived from the data, exploratory scientific visualisation.
- NASA Scientific Visualization Studio https://science.nasa.gov/sciact-team/scientific-visualization-studio/: purpose, then visual, then explanation.

Existing captures and measurements for all of them are in `docs/design/research/`. Re-capture only where you need an interaction state that was not captured. The aim is to understand *why* these feel professional and apply that to MARGIN, never to copy them. Avoid generic AI-template conventions: Inter-everywhere, purple or blue gradients, neon glow, glass cards, pill buttons everywhere, emoji icons, giant marketing heroes, dashboards made of identical cards.

---

## 5. Design philosophy and product experience

### 5.1 Philosophy: "an observatory for evidence"

MARGIN becomes a **full-screen scientific exploration environment for condition space**. The "universe" is the plane of oxygen concentration × total pressure in each gravity regime. Its "bodies" are NASA tests, published results, planned experiments and reference cabin atmospheres. Its "orbits" are iso-distance contours of evidence coverage. The user's scenario is a probe placed in that space. Everything else (verdict, provenance, investigations, method) is context that appears when the probe or a test is selected.

Principles:
1. **The field is the hero.** On desktop the coverage field fills the viewport (100dvh under a transparent header). Panels float over it and can be collapsed. The first screen is the instrument, not a marketing page.
2. **Instruments, not forms.** Scenario controls, the regime selector and the layer rail should feel like parts of one instrument: tactile, precise, quiet.
3. **Typographic annotation.** Landmarks, the scenario and selected tests are labelled directly in the field (tracked caps for landmark atmospheres, sentence case for tests). The key explains; it is never required to read the field.
4. **Context on demand.** Verdict first, always visible. Distance breakdown, sensitivity, ranking, findings and sources open as the user asks. Run and investigation details open in a contextual inspector or drawer.
5. **Honest emptiness.** When a regime has no comparable evidence, the field shows an empty, finely gridded space with the scenario probe and a clear statement. Absence must be striking, never decorated away.
6. **Motion explains state change.** It never decorates and is never continuous (Section 8.5).
7. **One identity across every route.** Atlas, Investigations, dossiers, Method and Sources share one shell, one type system, one token set and one set of components.

### 5.2 Interaction model (starting recommendation; validate it, then build)

This mapping translates the reference into MARGIN. Implement it unless your research gives you a better-reasoned version. If it does, record the reasoning in `docs/design/DESIGN_RESEARCH.md`.

| NASA Eyes element | MARGIN equivalent |
|---|---|
| Full-bleed 3D scene | Full-bleed **evidence field**: the O₂ (linear, %) × total pressure (log, kPa with psia secondary axis) plane for the active gravity regime. It shows the coverage field (D ≤ 1 and D ≤ 2.5 regions with thin iso-distance contour lines, ½×/2× scale envelopes as dashed contours), PSI runs, other-fuel-class runs, published results, reported limits, planned experiments, landmark atmospheres and the scenario probe |
| Featured Stories cards (left, collapsible) | **Expeditions**: curated entry points that set a complete, shareable URL state and move the view. (a) Reference atmospheres from `ATMOSPHERES` (ISS cabin, Artemis habitat, Exploration Atmosphere, legacy 30 %/10.2 psia, Mars transit *(assumed)*). (b) Findings from `content/insights.ts` that are *checked against a primary source* (unchecked findings stay hidden, as now). Each card: a large light title, the O₂ / pressure / regime in the value type, and its source |
| Scenario configuration | A **scenario console**, a collapsible panel or popover anchored to the probe: landmark, question (hazard), O₂ %, pressure kPa/psia, material class, flow (quiescent, 5, 10, 20, 30 cm/s), include-published switch. Dragging the probe in the field stays available, keyboard-operable |
| Time arc control (bottom centre) | **Regime selector**: four **discrete detents** (Microgravity · Lunar 0.165 g · Martian 0.38 g · Earth 1 g) on a bottom instrument strip. It is a `radiogroup` of exactly four radios with arrow-key support. No track fill, no knob travel between detents, no slider semantics. Beside it: the snapshot status ("PSI snapshot 2026-11-14 · 1,870 runs", taken from the data, never "live") and the **verdict readout** (class word + D) |
| Right icon rail | **Field tools**: Key / Info, **Layers** (toggle each mark tier, landmarks, envelopes, coverage bands), zoom in / out / reset, fullscreen, Share (copy URL). Tooltips and accessible names on every button |
| Click a body → camera move + detail | **Select a run** → the view eases to it, the investigation's other runs highlight while the rest dim, and a **run inspector** opens: conditions, distance decomposition to the scenario (ΔO₂, Δln P, ΔU with units), match quality (partial or full), flags, source link (PSI row or paper locator), "Open dossier" |
| Zoom out to the system | **Regimes overview**: the four gravity regimes as four *separate* flat plates (small multiples sharing axes), each with its count of comparable evidence and its verdict for the current scenario. Choosing one zooms into it. Plates are visibly separated, never stacked in a continuous space, never connected |
| Search | **Command search** (Ctrl/⌘ K) over investigations, runs, atmospheres and findings, all from local data |

Preserve this progressive structure in the inspector: verdict card (class word, D, verdict scale, partial-match qualifier, boundary-proximity note, the disclaimer, method link) → tabs for Evidence (with the "Partial gravity: a separate regime" section first on Moon and Mars), Sensitivity, Ranking, Findings and Sources.

### 5.3 URL and navigation

- The scenario URL contract in `lib/state/scenarioQuery.ts` is fixed: `preset, o2, p, u (number | "q"), g (micro|moon|mars|earth), h, m, pub`. Unknown params are preserved. `cmp` (compare tray) and `run` belong to pages.
- You **may add** view-only params (for example a selected run, overview mode or panel state) if they are optional, validated and clamped like the others, preserved by `scenarioToQuery`, and covered by new unit tests in `tests/unit/state/`. Old shared links must keep working exactly.
- The header carries the scenario between Atlas and Investigations (tests check this). Keep the nav landmark `aria-label="Primary"` with links named "Atlas", "Investigations", "Method", "Sources".
- Give every view a breadcrumb or context line (for example: *Atlas › Microgravity › Saffire IV–VI › run VI-2*).

---

## 6. Science preservation (non-negotiable)

Must not change:
- the PSI snapshot and its records
- curated published and planned values, quotes and locators, and their verification status
- the deterministic engine and all constants in `lib/engine/constants.ts`: scales O₂ 2.0 pts, pressure ratio 1.25, flow 5.0 cm/s; thresholds DIRECT ≤ 1.0 and NEAR ≤ 2.5; rank weights P 0.40, H 0.20, S 0.15, C 0.15, M 0.10; robustness factors ½×/1×/2× (27 combinations)
- the comparability gate and hazard relevance
- three-axis distance with partial-match qualifiers (a missing axis is left out and flagged; quiescent vs ventilated is a regime mismatch, not a number)
- verdicts and `verdictComplete`
- flow sensitivity and boundary margin
- investigation ranking (with the editable weights)
- the distance field (placeable runs only, with the `omitted` count stated)
- provenance, citations and footnotes
- URL sharing.

Presentation rules:
- **Gravity is categorical.** No gravity slider, no interpolation, no curves or lines between gravity levels, no morphing animation that moves points from one regime to another, no continuous gravity axis, and no 3D stack that reads as a continuum. Regime changes are cuts or crossfades. Tests enforce part of this (the gravity control is a 4-option radiogroup; no range input controls gravity).
- **The partial-gravity plot (Olson & Ferkul 2012 Table I) is points only.** No `path` or `polyline` inside any `svg[role=img]` whose `aria-label` contains "ULOI", and no `[data-connector]` anywhere (tested).
- **The coverage field must not read as a hazard or risk map.** Use a single cool hue whose lightness encodes closeness. Never red/amber/green ramps or heat-map palettes, never warm colours on coverage. State "Evidence proximity, not a safety rating" in the main content of `/` and `/investigations`, outside the footer (tested). Every field carries a source line and "not a hazard map".
- Verdict classes are always written as words; colour never carries a class alone.
- No "safe", "unsafe", "risk score", "fire risk", "safety score", "certify/certified", "predicts fire/flammability" except in negated disclaimers or reviewed allow-list quotations (`scripts/lint-claims.mjs`, `scripts/claims-allowlist.json`, `tests/e2e/content-rules.spec.ts`). Never write the wrong run count "2,700"; use `COUNTS.totalRuns`.
- Numbers shown on screen come from the engine and data at runtime or build time, never hand-typed into components.
- "Mars transit (assumed)" stays marked as assumed. Planned experiments are never shown as evidence. Published values keep their "published, not a PSI table row" provenance.
- Keep the engine separate from presentation: new view models (for example label placement, the regime overview, expedition definitions) go in new presentation modules (for example `lib/view/` or inside `components/`), and they *call* the engine; they never re-implement it.

---

## 7. Route-by-route requirements

Each route below must be rebuilt to the new identity. Keep every `data-testid` listed in Section 13.3 on an element with the same meaning.

**7.1 Application shell (all routes).** A transparent or near-transparent header over full-bleed views (solid on document routes): brand mark + wordmark (top left), primary nav, snapshot status, Share, Search, GitHub link (top right). Dimmed until hover or focus. A footer with attribution only on scrolling routes; on the Atlas the attribution sits in a compact "About / Sources" menu entry and a small persistent credit line. *Inspect* `components/site/SiteFooter.tsx` for the required wording: creator, competition, Apache-2.0, the AI-assistance pointer to Sources, NASA data attribution. Skip link, focus management, `<main>` landmark, an `h1` on every route (tested).

**7.2 Atlas `/`.**
- **Desktop ≥ 1180 px.** A full-viewport field. Expeditions panel on the left (collapsible). Scenario console (collapsible, or anchored to the probe). Inspector on the right (verdict card plus tabs; collapsible to a slim verdict pill). Tool rail on the right edge. Regime selector and verdict readout in the bottom instrument strip. The headline coverage gap (22.2 % max tested vs 26.5–34 % planned) is told on first load as an overlay that the user can dismiss into the field, or as the first expedition card, not as a separate marketing hero above the fold.
- **Field.** As described in Section 8. Hover tooltip (tier, run title, O₂/P/flow, material, "Click to inspect source"). Click to select. Drag or tap the probe; arrow keys move it.
- **Regimes overview.** Four plates, counts per regime, scenario verdict per regime, "no comparable evidence" stated plainly. This replaces or absorbs the current `GravitySheets` (keep `data-testid="gravity-sheets"` and its radios named like "Lunar (0.165 g): …").
- **Field notes and inspector.** Verdict card (`data-testid="verdict"` with `data-verdict` and `data-d`; `verdict-qualifier` for partial matches); the run link buttons that open the specimen or run card (`specimen-card`); Evidence, Sensitivity (`flow-sensitivity`), Ranking, Findings, Sources (footnotes) panels.
- **Mobile.** Section 10.

**7.3 Investigations `/investigations`.** Same shell. A ranked catalogue (the ladder, `ladder` / `ladder-row` with `data-inv`, `pin-toggle`) styled like the Expeditions cards, compact rows with inline score bars (one row per investigation, rank components visible on demand, reweightable). Beside or under it, a field showing the selected investigation's footprint in condition space against the scenario, in the current regime. The **compare tray** (`compare-tray`, `cmp=` URL param, survives reload) as a bottom drawer comparing two or more investigations on shared axes. The **claim ledger** (`claim-ledger`) as a dense, sortable table whose claim badges (MEASURED / COMPUTED / STATED / ASSUMED / PLANNED / DRAFT…; inspect `ClaimLedger.tsx` and the `.claim` styles) open the **provenance** drawer (`provenance`, external source link). Scenario sentence, partial-g panel, flow sensitivity and the disclaimer stay.

**7.4 Dossier `/investigations/[id]`.** A hero band whose stage is the investigation's footprint in condition space (all its placeable runs, the rest counted), with title, acronym, PI, platform and DOI or PSI links. Then the fingerprint (`fingerprint`: what varied, what was held constant), native charts (`dossier-chart`, drawn as SVG marks), the run table (`run-table`, normalised and original values, flags; wide tables scroll inside a focusable region) or, for summary-only investigations, the explicit "summary rows only" statement (`summary-rows`). "Add to compare" (`add-to-compare`) and "View on Atlas with this scenario" links. Unknown ids → `notFound()` with `noindex` (tested).

**7.5 Run inspection.** A single run inspector component used everywhere (Atlas selection, dossier table rows, claim ledger): conditions with units and flags, distance decomposition to the current scenario, match completeness, investigation link, source link (PSI table row or document locator + verbatim quote where curated).

**7.6 Method `/method`.** A long-form reading page in the same identity (reading measure about 68–72 characters, the same type system, not a separate editorial style). Formulas typeset clearly with symbols defined. Constants rendered from `lib/engine/constants.ts`. A small *illustrative* interactive diagram of the distance (for example a probe and the D ≤ 1 / ≤ 2.5 contours at ½×/1×/2× scale) is welcome **if** it calls the engine and is labelled as an illustration of the method. Gravity rule, limitations, robustness explanation and the "What MARGIN is not" list stay.

**7.7 Sources `/sources`.** Every reference with its link, locator and licence; the PSI attribution (`PSI_ATTRIBUTION` in `content/references.ts`); per-record licence notes (23 records CC0-1.0, PSI-10 states none); verification status; fonts and package licences; and the **AI-use disclosure** in its current required form (inspect the page; do not shorten the competition disclosure).

**7.8 Not-found, loading and empty states.** These are designed too: empty regimes, no comparable runs, no published evidence, and summary-only investigations.

---

## 8. Scientific visualisation requirements

**8.1 Rendering technology.** **Recommendation: 2D SVG for all marks, labels and contours, with an optional Canvas 2D layer for the continuous coverage raster if profiling shows a need. No WebGL or three.js.** Reasons: D is defined on the 2D plane with specific axis scalings, so perspective would distort the distances users read. The tests and accessibility rely on SVG marks. About 900 placeable points are well within SVG limits. Immersion comes from full-bleed layout, layering, luminance and motion, not from 3D.

You may *evaluate* a 2.5D presentation for the **regimes overview only**, if it keeps the four plates separate and readable and implies no continuum. Record the decision and reasons in `DESIGN_RESEARCH.md`. If you add any dependency (for example `d3-zoom`, `d3-transition`), justify it there. Keep the client bundle lean, and do not ship `snapshot.json` to routes that do not need it. Check what the header currently imports.

**8.2 Frame.** The O₂ % axis is linear and the pressure axis is logarithmic (kPa ticks, psia secondary). *Inspect* `components/atlas/geo.ts` and `CoverageMap.tsx` for the current domains and keep them unless you have a documented reason. Ticks in the value face with units, faint gridlines, axis titles in the UI face. Never tilt the plane.

**8.3 Coverage encoding.** Single cool hue: D ≤ 1 filled more strongly than D ≤ 2.5, each with a thin edge line (the "orbits"). ½×/2× scale envelopes as dashed thin contours. The no-evidence region stays the plain canvas, optionally with a fine hatch, plus a direct label "no comparable evidence for this question and flow (D > 2.5)".

**8.4 Marks** (shape plus colour, never colour alone):
- comparable PSI run: small dot
- PSI run of another fuel class: smaller, dimmer dot
- published (not in PSI): ring
- reported limit: ring with a tick
- planned: dashed ring
- landmark atmosphere: hollow triangle with a tracked-caps label
- the scenario probe: the one amber element, with crosshairs to both axes and a value readout.

Label collision handling is required. The current code hides the probe label when a preset label is active; do better, and verify at all four widths.

**8.5 Motion.** Use 120–250 ms for UI state, and up to about 400 ms for view transitions (zoom to a selection, overview ↔ plate) with eased curves. The probe glides on preset jumps. A regime change is a crossfade or cut: **points never travel between regimes.** No idle or ambient animation, no particle effects, no continuous loops. With `prefers-reduced-motion` (Playwright runs with `reducedMotion: "reduce"`) every transition is instant.

**8.6 Every chart is a module.** Title, one-line definition, plot, direct labels, a **source line** ("Source: NASA PSI run tables (snapshot 2026-11-14) and the published papers listed under Sources"), and actions. An accessible text summary (`role="img"` + `aria-label`, or a visually hidden description) and a tabular alternative (run tables, ranking).

**8.7 Other charts.** VerdictScale (0–5+ with DIRECT/NEAR/DISTANT zones, the D marker, clipped beyond 5), axis-gap bars, flow sensitivity, the partial-gravity points plot, ranking bars and dossier charts all follow the same chart language.

---

## 9. Design system requirements

Replace `docs/design/DESIGN_SYSTEM.md` with the new system (keep the old version in git history; it is on `wip/instrument-graphite`). Centralise all tokens in `app/globals.css` (CSS custom properties). Feature CSS must consume tokens and never hard-code colours, fonts, radii or spacing (grep for hex and rgb literals in `components/**` and fix them).

Decide and document:
- **Colour.** A deep near-black canvas (choose the value; the reference is ≈ `#010101`; justify your choice), 3–4 surface levels for floating panels (the reference cards are ≈ `#161616`, opaque), hairlines, and exactly three text levels, each ≥ 4.5:1 on every surface it appears on (≥ 3:1 for non-text marks). Semantic hues, one meaning each:
  - evidence coverage: one cool hue
  - the user's scenario and cautions: amber (so amber is **not** used for metadata, unlike the reference)
  - published tier: a secondary hue plus a ring shape
  - planned: neutral and dashed
  - reported limits: a distinct hue plus ring and tick
  - snapshot or status: no "live" green
  - claim-ledger badges.

  No gradients in chrome, no neon, no glow (except, if justified, one subtle emphasis on the probe), no glassmorphism. A single backdrop blur on floating panels is allowed only if it measurably helps legibility over the field; otherwise use opaque panels like the reference.
- **Typography.** The reference relies on one geometric sans used light at large sizes and 600 with wide tracking for caps labels. Choose a *contemporary* family that achieves this, from fonts that are free and licensed for self-hosting via `next/font` (verify the licence; Metropolis itself is OFL but not on Google Fonts, so `next/font/local` would be needed). Not Inter, and not a serif for UI. Keep a monospace only for measured values, ids and file names (IBM Plex Mono is already wired), or justify dropping it. Define the type scale, weights, tracking for caps labels, and tabular figures for numbers.
- **Space and shape.** 4 px base scale, panel radius, control radius, hit targets ≥ 24 px (44 px on touch for primary controls).
- **Components** (one implementation each, shared by all routes): app shell, floating panel, collapsible panel, card (expedition and investigation), icon rail button with tooltip, regime selector (radiogroup), segmented control, select, number input with unit toggle, switch, tabs, drawer or inspector, tooltip, table, claim badge, chart frame, legend or key, breadcrumb, command search, toast (for "link copied").
- **Brand.**
  - **Mark:** derived from the data, not from space imagery. The current concept is in `components/site/BrandMark.tsx` and `app/icon.svg`: an iso-distance contour pair with an outlying scenario point and a dashed "margin" gap. Refine it or replace it, then use one source for the favicon, header, README banner and OG image.
  - **Wordmark:** MARGIN in uppercase.
  - Clear-space and minimum-size rules.
  - No NASA marks.

---

## 10. Responsive and accessibility

- Verify at **1440×900, 1280×800, 768×1024 and 390×844.** Desktop is the priority, but mobile must be genuinely usable.
- **Tablet (768).** The field stays full width. Panels become drawers. The bottom strip stays.
- **Mobile (390).** The field comes first, at least 55 % of the viewport height. Tap to place the probe (no drag needed). The regime selector is a 4-segment control. A bottom sheet with tabs (Scenario · Verdict · Evidence · Sources) holds the inspector. Expeditions sit in a horizontal scroller or a sheet. No page-level horizontal scroll (tested). Nav reachable.
- **WCAG 2.1 AA.** The axe (wcag2a and wcag2aa) suite must have **no serious or critical violations** on `/`, `/?preset=ea&g=moon&pub=1`, `/investigations`, `/method`, `/sources` and `/investigations/PSI-25`, on desktop and mobile.
- Keyboard: all controls operable (radiogroups with arrow keys, the probe with arrow keys, panels and drawers close with Esc and return focus, rail buttons labelled). Focus rings are visible. Scroll regions are focusable. The verdict is announced with `aria-live="polite"`.

---

## 11. Subagent and orchestration strategy

You own the architecture, the design system, shared components, integration, tests and git. Use the **Agent** tool for parallel work where it clearly helps. Do not use the Workflow tool unless the owner explicitly opts in. Brief each agent fully: it knows only what you tell it. Run **at most three implementation agents at once**. Review every agent's diff yourself before integrating it.

**File ownership (strict).** Agents never edit files outside their ownership. Shared tokens and components belong to the lead; agents ask you for token or component additions instead of adding their own. Agents do not run `npm install`, edit `package.json`, commit, push or deploy. Use one dev server on :3000, started by you. If agents need isolation, use `isolation: "worktree"` and merge their branches yourself.

| Workstream | Owner | Files | When |
|---|---|---|---|
| R. Eyes interaction research | agent (read-only, plus writes captures and a draft section) | `docs/design/research/eyes-deep/**`, a draft file for you to merge into `DESIGN_RESEARCH.md` | M1, alone |
| L. Design system, shell, shared components, field engine-to-view adapters | **lead** | `app/globals.css`, `lib/fonts.ts`, `app/layout.tsx`, `components/site/**`, new `components/ui/**`, new `lib/view/**`, `docs/design/DESIGN_SYSTEM.md` | M2, before any fan-out |
| A. Atlas experience | agent | `components/atlas/**`, `app/page.tsx` | M3 |
| I. Investigations, dossiers, run inspector integration | agent | `components/casefile/**`, `components/dossier/**`, `app/investigations/**` | M3, in parallel with A |
| D. Method and Sources | lead or a small agent | `components/docs/**`, `app/method/**`, `app/sources/**` | M3/M4 |
| B. Branding and README | agent, after screenshots exist | `docs/assets/**`, `README.md`, `app/icon.svg`, `app/opengraph-image.png` (+ `.alt.txt`) | M5 |
| Q. Independent QA | agent (read-only: runs tests and screenshots, reports, edits nothing) | writes only to `docs/design/qa/**` | end of M3, M4 and M6 |

**Integration checkpoints** (lead runs these; the app must build and run at each):
1. after M2 (shell plus tokens on every route, old content inside)
2. after A and I land
3. after polish
4. before merge.

At each checkpoint run typecheck, lint, `lint:claims`, Vitest and the affected Playwright specs, and capture the routes.

---

## 12. GitHub branding, README and attribution

### 12.1 GLIMMER reference

Inspect https://github.com/ADAI-ALEX/glimmer-rs: the rendered README and its raw source, and its assets `assets/branding/banner.svg` and `assets/branding/*-mark.svg`. Use `gh api repos/ADAI-ALEX/glimmer-rs/contents/README.md` and fetch the raw files. Follow its **structure and presentation**, not its branding or content:
- a full-width SVG banner (1280 × 320, rounded, dark, subtle grid, a data motif, mark plus wordmark plus tagline plus a monospace subline)
- a centred badge row, starting with the CI workflow badge
- a bold-name intro paragraph
- a full-width real screenshot with a `<sub>` caption
- a "Contents" line of dot-separated links
- structured sections
- a two-column screenshot gallery table with bold captions
- a Licence section.

### 12.2 MARGIN README requirements

- **Banner:** `docs/assets/branding/margin-banner.svg`, 1280 × 320, in the new identity, with the MARGIN mark, the wordmark, the tagline "How close is the evidence?", a monospace subline (for example "Evidence-coverage atlas · NASA PSI combustion tests · Space Apps 2026"), and a motif drawn from MARGIN's own visual language (contours, the probe, the regime detents). GitHub renders SVG through `<img>` without web fonts, so **convert the wordmark and any display text to paths** or use a robust system font stack, and check the rendering on github.com. Also produce `docs/assets/branding/margin-mark.svg`.
- **Badges** (centred, accurate only; read versions from `package.json` / `package-lock.json`): CI (`https://github.com/ADAI-ALEX/margin/actions/workflows/ci.yml/badge.svg` linked to the workflow), Next.js 16.4.6, React 19.3.0, TypeScript (installed major), Playwright (installed version), Vitest if you like, data: NASA PSI, Vercel (deployed), licence Apache-2.0. **Do not invent** coverage, performance, uptime, download or test-count badges or any endorsement.
- **Sections:**
  1. What MARGIN does
  2. The scientific problem (the coverage gap, computed)
  3. Features
  4. The Atlas
  5. Investigations and comparison
  6. Dossiers and run inspection
  7. Methodology (formula, thresholds, gravity rule, ranking; link to `/method`)
  8. NASA datasets and sources (PSI, NTRS, licences: data licence separate from code licence)
  9. Architecture (layers, static generation, no backend, no runtime AI)
  10. Tech stack
  11. Install and development
  12. Testing (what each suite checks; report counts only from your own final run, with the date)
  13. Attribution, AI-use disclosure and licensing.

  Carry over the accurate content of the current `README.md` (worked example table, data and attribution table, "what MARGIN is not", run-locally commands), re-checking every number against the engine and snapshot.
- **Screenshots:** real captures of the **redesigned** app in `docs/assets/screenshots/` (PNG, 2× device scale where practical, about 2880 px wide hero, compressed sensibly):
  - hero Atlas (Exploration Atmosphere, published evidence on)
  - the regimes overview, or Moon with the partial-gravity panel
  - run inspection
  - Investigations ranking with the compare tray
  - the claim ledger with the provenance drawer
  - a dossier
  - Method
  - mobile Atlas.

  Use them in the hero and the gallery. Regenerate `app/opengraph-image.png` (1200 × 630) from the new Atlas and update `app/opengraph-image.alt.txt`.
- **Keep:** "Created and led by **Alex de Gentile**.", the live URL, the repository URL, the Space Apps context, the "Evidence proximity, not a safety rating" statement, the NASA data attribution and non-endorsement statement, and the general AI-use disclosure with its link to `docs/compliance/si-usage-log.md`. Do not resolve the existing `TODO` items (the demo video URL, and the owner's confirmation of the date and scope of the pre-event permission) by inventing content: leave them as TODOs and list them in your final report.
- Optionally improve the GitHub description and add accurate topics (`gh repo edit ADAI-ALEX/margin --add-topic …`, for example nextjs, react, typescript, data-visualization, nasa-data, space-apps-challenge, combustion, scientific-visualization). Currently there are none. Do not add the Claude name or branding to any public text.

### 12.3 Git and attribution constraints (verbatim intent from the owner)

- Do not rewrite Git history again. No rebase of published commits, no force-push, no amend of pushed commits.
- Do not change historical author or committer metadata.
- New commits use the repository's existing git config: `user.name` "Alex de Gentile", the GitHub no-reply address that is already configured. Check it with `git config user.name` / `user.email`, and never put a personal email address anywhere public.
- **No `Co-Authored-By: Claude …` trailers or "Generated with Claude Code" lines** in commits, PRs, the README or release notes.
- No unnecessary Claude branding in public-facing documentation. The accurate *general* AI-assistance statement stays in the README and footer; the detailed competition disclosure stays in `docs/compliance/si-usage-log.md`, `docs/compliance/publication-checklist.md`, `docs/submission/*` and the Sources page. Never claim that AI was not used.
- Preserve source attribution, dataset acknowledgements, `NOTICE`, `LICENSE` and third-party licences.
- Do not delete releases or tags.

---

## 13. Engineering requirements

**13.1 General.** TypeScript strict, no `any` leaks, ESLint clean. Server components where possible; client components only for interactive parts. Do not ship the full snapshot to every page (the header currently receives its status string as a prop from `app/layout.tsx` for this reason). Static prerender of every route must still succeed. Fonts stay self-hosted through `next/font`. No external runtime requests except outbound source links.

**13.2 MCPs and tools.** Inspect which tools are available in your session. Use:
- the Playwright MCP or `@playwright/test` scripts for browser inspection and screenshots
- the Vercel MCP (`list_deployments`, `get_deployment`, `get_project`) to confirm the production deployment (project behind https://margin-two-rho.vercel.app; discover its ids, do not guess them)
- the `gh` CLI (authenticated as ADAI-ALEX) for repo metadata and README rendering checks
- context7 for current library docs if needed.

**13.3 Test contract.** These hooks and accessible names are what the suites rely on. Keep their meaning; *inspect* `tests/e2e/*.spec.ts` and `tests/e2e/helpers/*` for the full list:
- `data-testid`: `verdict` (with `data-verdict`, `data-d`), `verdict-qualifier`, `field-notes`, `specimen-card`, `gravity-sheets`, `flow-sensitivity`, `coverage-map`, `scenario-toolbar`, `ladder`, `ladder-row` (`data-inv`), `pin-toggle`, `compare-tray`, `claim-ledger`, `provenance`, `dossier`, `fingerprint`, `run-table`, `summary-rows`, `dossier-chart`, `finding`, `add-to-compare`.
- Roles and names:
  - radios "Microgravity", "Lunar (0.165 g)" (and the Martian and Earth equivalents)
  - flow radios such as "20 centimetres per second"
  - switch "Include published evidence"
  - `select#atlas-preset`, `select#atlas-q`
  - heading /Partial gravity/
  - run-link buttons `button.atlas-runlink` inside field notes
  - claim-ledger buttons named /^(PSI-\d+:|PUB-|PLAN-)/
  - nav "Primary" with links "Atlas" and "Investigations"
  - text "Evidence proximity, not a safety rating." visible in main content.

**13.4 If the design changes a control** (for example, expedition cards replace the native preset `<select>`): update the test to drive the new control with an equally strict assertion (same expected URL state and verdict), keep a test that the control is keyboard-operable, and list every such test change, with before and after, in the final report and in `docs/BUILD_LOG.md`. Add new tests for new behaviour: run selection opens the inspector with the right run; the regimes overview shows four separate plates and the four-radio contract; view-only URL params round-trip; Esc closes drawers and restores focus; no horizontal overflow at 390 px for new views.

---

## 14. Testing, QA and deployment

1. **Baseline (M0), before any change.**
   - Record the working-tree state.
   - On a clean checkout of `main`, run `npm ci` (if needed), `npm run typecheck`, `npm run lint`, `npm run lint:claims`, `npm test`, `npx next build`, and `npx playwright test` against the dev server (both projects; `npx playwright install chromium` if needed). Record the exact counts.
   - Repeat on the `wip/instrument-graphite` state and record which tests fail there, if any.
   - These are your reference numbers.
2. **During the work.** Run the affected specs at every checkpoint. Check the browser console for errors on every route. Use `scripts/capture-routes.mjs` for the four widths.
3. **Visual QA: at least three refinement passes.** For each pass, capture every route at 1440 / 1280 / 768 / 390 plus the key interaction states (hover tooltip, selected run, overview, drawers, mobile sheet). Review each image critically against the NASA Eyes reference and Section 5 (hierarchy, alignment, spacing, label collisions, contrast, empty states, truncation, overflow). Fix, and recapture. "It builds" is not acceptance. The independent QA agent reviews pass 2 and the final pass without seeing your own conclusions.
4. **Final gates.** Typecheck, ESLint, `lint:claims`, Vitest, production build, and the full Playwright suite (desktop and mobile, axe included). All green, and counts ≥ baseline unless a test was replaced one-for-one (documented).
5. **Before/after.** `node scripts/capture-routes.mjs http://localhost:3000 docs/design/qa/after`, next to the existing `docs/design/qa/before`. Keep the committed image weight reasonable: commit the 1440 and 390 views and drop the full-page JPEGs if they are large. Write `docs/design/qa/BEFORE_AFTER.md` with paired images and a summary of changes.
6. **Deploy.**
   - Merge `redesign/eyes` into `main` (fast-forward or merge commit; no history rewrite) and push.
   - Confirm the production deployment reaches READY with the Vercel MCP.
   - Verify the **live site**: every route returns 200, no console errors, and screenshots of the live Atlas and Investigations match local.
   - Run `PLAYWRIGHT_BASE_URL=https://margin-two-rho.vercel.app npx playwright test --project=desktop`.
   - Confirm GitHub CI passes on the merge commit (`gh run list`).
7. **README check.** View the rendered README on github.com (Playwright screenshot of https://github.com/ADAI-ALEX/margin) at desktop and mobile widths. Confirm the banner renders with correct text, the badges resolve, and the images load.
8. **Docs.** Update `docs/ARCHITECTURE.md` (the UI layer description, which still says "warm-paper Atlas identity"), `docs/design/DESIGN_SYSTEM.md`, `docs/design/DESIGN_RESEARCH.md`, and add a `docs/BUILD_LOG.md` entry.

---

## 15. Milestones and acceptance criteria

| # | Milestone | Done when |
|---|---|---|
| M0 | Safeguard and baseline | WIP committed on `wip/instrument-graphite`; `redesign/eyes` created; baseline counts recorded for `main` and WIP |
| M1 | Eyes interaction research | `docs/design/research/eyes-deep/` captures (desktop and mobile, all states in 4.1); new `DESIGN_RESEARCH.md` section; the interaction mapping (5.2) confirmed or revised, with reasons; 2D vs 2.5D decision recorded |
| M2 | Design system and shell | New tokens, fonts, brand mark, app shell, floating panel, rail, regime selector, inspector, drawer, tooltip, tabs, table, badge, chart frame. Every route renders in the new shell with no regressions. `DESIGN_SYSTEM.md` rewritten. Checkpoint 1 green |
| M3 | Atlas, Investigations, dossier, run inspector | Full-bleed field with expeditions, console, inspector, rail, regime strip, overview, selection and hover. Investigations catalogue, compare drawer, claim ledger and provenance. Dossier hero footprint. Shared run inspector. Checkpoint 2 green |
| M4 | Method, Sources, states, mobile | Document routes in the same identity; empty, loading and not-found states; mobile sheet; all widths overflow-free; axe clean |
| M5 | Polish, branding and README | Three or more visual passes done; banner, mark, OG image, screenshots, README and repo topics complete |
| M6 | Ship | All gates green (counts reported); merged to `main`; production READY; live site and live e2e verified; README verified on GitHub; before/after doc; build log |

**Global acceptance criteria.**
- A first-time viewer on desktop sees a full-screen, immersive, clearly scientific instrument within one second of load. The coverage gap and the scenario's verdict can be read without scrolling.
- Gravity regimes are unmistakably separate. The coverage field cannot be mistaken for a hazard map.
- Every number on screen traces to the engine or data, and every source link works.
- All existing scientific behaviour is identical. The engine golden, anchor and rule tests pass unchanged.
- The UI is cohesive across all routes and polished at all four widths.
- No NASA insignia, no Claude attribution in public text or commits, and attribution to Alex de Gentile intact.

---

## 16. Final deliverables (report these in your last message)

1. The live URL, with confirmation of the production deployment (id and state) and the result of the live e2e run.
2. The design direction in one paragraph, and how the NASA Eyes reference was translated (the mapping table as built).
3. Research added (files and key measured findings).
4. Logo, wordmark, banner and OG image (paths).
5. Route-by-route summary of the redesign.
6. Test results: baseline vs final counts for Vitest, Playwright (desktop and mobile), axe, typecheck, ESLint, `lint:claims` and build, plus any test changes, each with before and after.
7. The before/after document path, and the key screenshots (paths).
8. README: rendered-on-GitHub confirmation and screenshot path; badges used and their source of truth.
9. Commits pushed (hashes and messages), confirmation that no history was rewritten and no trailers were added, and the author identity used.
10. Remaining issues, owner TODOs (demo video URL, pre-event permission confirmation, human sign-off on source verification) and suggested next steps.
