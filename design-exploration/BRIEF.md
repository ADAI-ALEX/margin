# MARGIN design exploration: brief for the concept builders

Read this file in full before you write code. The lead (master agent) owns everything not listed under your concept.

## Product, in one paragraph
MARGIN is an evidence-coverage explorer for NASA's Physical Sciences Informatics (PSI) combustion archive. A user defines a crewed environment: O₂ %, total pressure (kPa or psia), ventilation flow (cm/s or quiescent), gravity regime (micro / Moon / Mars / Earth, **categorical**), a fire-safety question, and a material class. MARGIN then shows how close NASA's actual tests come to that environment, on which axes they differ, and what cannot be concluded.
- **MARGIN measures evidence coverage. It never predicts fire or rates safety.**
- Every verdict carries the line "Evidence proximity, not a safety rating."

## Shared layer (lead-owned, READ-ONLY for you)
- `lib/schema/index.ts`: types (`Run`, `Investigation`, `Scenario`, `Atmosphere`).
- `lib/engine/*`: deterministic engine.
  - `evaluate(runs, scenario)` → `{ verdict, nearest, comparable[], context[], otherGravity[], excludedCount }`
  - `distance()` → D plus signed per-axis gaps (`gaps.o2/pressure/flow` in scale units, and `raw.o2Pts`, `raw.pressurePct`, `raw.flowCmS`), `axesUsed` and `partialMatch`
  - `robustness()` → 27-combination check
  - `rank()` → investigation ranking with components P/H/S/C/M
  - `distanceField()` → the nearest-evidence D over an O₂ × pressure grid
  - `SCALES`, `VERDICT_THRESHOLDS`, `RANK_WEIGHTS`, `kPaToPsia`
- `design-exploration/shared/useMargin.ts`: **use this hook** for state. It provides `scenario`, `update(patch)`, `preset`, `applyPreset(id)`, `evaluation`, `psiOnly` (the evaluation without published evidence), `ranking`, `robust`, `weights` and `setWeights`. It syncs the scenario to the URL query.
- `design-exploration/shared/data.ts`:
  - `PSI_RUNS`: 1,871 real PSI run rows fetched after kickoff
  - `ALL_RUNS`: PSI plus T3 published plus T4 planned
  - `PSI_INVESTIGATIONS`: the 24 real PSI records
  - `ALL_INVESTIGATIONS`, `invById` and `runsByInv(id)`
  - `COUNTS`: the computed headline numbers, including `maxSolidO2`, `solidRunsWithO2`, `solidRunsAboveMax`, `totalRuns` and `plottable`
  - `SNAP.fetchedAt` and `SNAP.tableStats`
- `design-exploration/shared/content.ts`:
  - `ATMOSPHERES` and `PRESETS` (reference crosshairs)
  - `HAZARDS`
  - `OLSON_FERKUL_2012` (the partial-gravity table plus caveats)
  - `INSIGHTS`: all **unverified drafts** (`verifiedBy: null`)
  - `LIMITATIONS`
  - `PUBLISHED_GROUPS`
- `design-exploration/shared/format.ts`: formatting helpers, labels, `VERDICT_COPY` and `DISCLAIMER`.

If you need an engine or data change, **do not edit shared files**. Put the request in your final report.

## Hard scientific rules (a violation fails review)
1. **Gravity is never a slider.** Use a segmented radiogroup with 4 options and arrow-key support. Never draw a line, curve or gradient between gravity levels. Partial-gravity points are drawn as points only, with no connecting `<path>`.
2. **No numbers hard-coded in components.**
   - Every scientific number comes from `COUNTS`, `content.ts`, run data or the engine.
   - The hero sentence uses `COUNTS.maxSolidO2`, `COUNTS.solidRunsWithO2` and `COUNTS.solidRunsAboveMax`, and the EA preset value from `PRESETS`.
   - Say "solid-material tests **with a recorded O₂ value**". Never say "2,700".
3. **Banned words in UI copy:** safe, unsafe, risk, risk score, fire index, conservative (as a verdict), predict, "bounds lunar". You may write "we do not interpolate between gravity levels" (Method context only).
4. **Tiers must be visually distinct everywhere:** T1 PSI run is a filled marker, T3 Published is a ring, and T4 Planned is a dashed ring labelled "planned — not evidence". T4 is never counted.
5. **Missing values are shown as "not recorded"**, never 0 or blank. Show `nominal-stated` pressures as "nominal (stated), not measured". Show flags.
6. **Provenance on demand.** Any run the user can see must be inspectable:
   - source file and row (or document and page)
   - a link (`run.source.url`)
   - original cells (`run.original`)
   - conversions (`run.conversions`)
   - flags and note
7. **Prototype honesty banner** (compact, always visible somewhere): "Prototype · PSI run data fetched live <date from SNAP.fetchedAt> · published values transcribed, awaiting human verification".
8. **Insight cards** are drafts. Render them with a visible "DRAFT — unverified" mark, a validity label (MEASURED / MODEL / EXTRAPOLATED), scope, a "Not valid for" line and the source.
9. **Show the disclaimer** "Evidence proximity, not a safety rating." next to every verdict.
10. **Gravity ≠ micro.** Show that PSI contains no partial-gravity combustion tests, then show the Olson & Ferkul 2012 Table I points (ULOI*, per material, per g-level) with caveats. Use the approved line: "For Mylar at 10.2 psia, NASA drop-tower tests found a lower flammability limit at lunar gravity than at either 0 g or 1 g. Microgravity and Earth results did not bound lunar behaviour for this material." Take the numbers from the data. FM2 is "planned — first lunar-surface test".
11. **Distinguish visually:**
    - measured experimental values
    - deterministic computations (D, gaps, R), labelled "computed"
    - nominal or limit values

## Data facts you will hit (real, verified in the snapshot)
- PSI runs are all microgravity.
- Only runs with recorded O₂ are placeable. SPICE, SAME, SAME-R, BASS and Saffire-III lack O₂, so they are "not placeable" (they still have counts).
- `pressureKPa` for BASS-II and Saffire I/II/III is `nominal-stated` (101.325) and carries a note.
- BASS-II flow is null (uncalibrated fan display).
- The gas-burner (CFI-G, Flame Design) and liquid-droplet (FLEX, CFI) runs span about 12–85% O₂ and 43–507 kPa.
- Verdicts at the default 10 cm/s flow:
  - ISS: DIRECT
  - EA (34% / 56.5 kPa): DISTANT, D ≈ 6.46 with PSI only
  - EA with published: DISTANT, D ≈ 2.51, and the robustness check says *Sensitive* (at 20 cm/s it is NEAR, D ≈ 1.51)
  - Moon: NONE with PSI only
  - Treat these as outputs. Do not hard-code them.
- The Condition Map domain: O₂ 10–45% linear (show off-chart indicators for >45%: gas-burner runs up to 85% and the spacesuit at 100%). Pressure 20–520 kPa on a **log** scale is recommended. Fuel-class colour encoding is up to you, but it must be consistent and colour-blind distinguishable, using shape or label redundancy.

## Engineering rules
- Next.js 16 App Router, React 19, TypeScript strict, and Tailwind v4 (available, optional). Dependencies available to you: `d3-scale`, `d3-array`, `d3-shape`, `d3-contour`, `zod`. **Do not install anything.** Write SVG by hand in React.
- Your root component is `design-exploration/concept-X/ConceptApp.tsx` (`"use client"`), rendered at `/concepts/X`. Put all concept code under `design-exploration/concept-X/`. Use CSS Modules (`*.module.css`) or a concept-scoped CSS file, with all tokens under your own root class. Do not touch `app/globals.css`.
- Load fonts with `next/font/google` inside your concept folder, for example `fonts.ts`.
- Body background: your root element must cover the viewport (`min-height: 100dvh`) with its own background.
- Responsive:
  - 1440 px and 1280 px desktop are primary.
  - 390 px mobile must work: no horizontal page scroll, controls reachable, the chart scaled.
- Accessibility:
  - keyboard focus visible
  - SVG charts carry `role="img"` and an `aria-label` summary
  - the radiogroup works with the arrow keys
  - honour `prefers-reduced-motion`
- Performance: about 1,900 points in SVG is fine. Memoize scales and filtered arrays.
- The dev server runs at http://localhost:3000 (the lead runs it; **do not run `next dev` or `next build`**). You may `curl -s localhost:3000/concepts/X` to check that it renders (no 500). You may run `npx tsc --noEmit` and `npx eslint design-exploration/concept-X`. **Do not use the Playwright or browser tools.** The lead does visual QA and may send you fixes.
- Quality bar: this must read as a credible aerospace research instrument.
  - Deliberate typography, alignment and density.
  - No default component-library look, no gradients for decoration, no glassmorphism, no glow, no oversized marketing headings, no stock imagery.
  - Use motion only where it explains: 200–300 ms ease-out for the scenario marker moving and layers dimming.

## Common demo scenario (all three concepts must support this path)
1. Land and read the computed coverage headline.
2. Select the **Exploration Atmosphere** preset: verdict DISTANT (PSI only).
3. Toggle **Include published evidence**: Saffire IV–VI rings appear, and D and the robustness state update.
4. Change flow to 20 cm/s: the verdict changes. This shows the sensitivity honestly.
5. Switch gravity to **Moon**: PSI shows NONE, the partial-gravity evidence appears, and there is no interpolation.
6. Inspect a source run: provenance (file, row, original cells, conversions, flags, link).

---

## Concept A: "CONSOLE", an environment workbench (flight-test instrumentation)
**Identity.** An engineering instrument.
- Graphite surfaces (`#0B0D10` / `#12161B`), hairline 1 px grids (`#1F262E`), ink `#E9EDF1`, muted `#8B97A4`.
- Data-meaning colours only: flame-blue `#5CC8FF` (brand / liquid), ember `#FF7A45` (solid), mint `#6FDDB0` (gas), smoke `#A7B0BA`, amber `#F5C451` (reference atmospheres), alert `#FF5A5F` (data-quality flags only).
- IBM Plex Sans Condensed (labels, panel titles, uppercase micro-labels with tracking), IBM Plex Sans (body) and IBM Plex Mono (all numbers, units and IDs, with tabular figures).

**IA.** One dense workspace, like a cockpit or test console.
- Top status strip: wordmark, the computed coverage headline as an instrument readout, and the prototype banner.
- Left rail (≈300 px): scenario controls.
- Centre: the Condition Map, fluid.
- Right rail (≈380 px): the evidence stack.
- Bottom drawer: the nearest comparable runs table, which opens a provenance panel.

**Central interaction.** Presets plus precise numeric controls (stepper inputs with units, a kPa/psia toggle, flow chips quiescent/5/10/20/30 plus custom). The crosshair glides on the Condition Map, with D = 1 and D = 2.5 iso-distance ellipses drawn around the crosshair. The verdict instrument updates:
- the large verdict word
- the D readout
- per-axis **deviation gauges** (signed bars for O₂ pts, pressure %, flow cm/s, centred at zero, with ±1 scale-unit ticks)
- a robustness readout as a **3×3×3 mini-matrix** of 27 cells coloured by verdict

The gravity switch dims the µg layer. A partial-gravity panel slides in as a dot plot of ULOI* by g-level per material, using points with no lines.

**Ranking.** The top 8 investigations, each with a stacked contribution bar (P/H/S/C/M) and its R value (labelled "computed"). Include a small "weights" disclosure with 5 sliders and a reset. Sliders are fine for weights, never for gravity.

**Mobile.** A sticky verdict bar on top, then the map, then the controls in a collapsible sheet, then the evidence stack.

## Concept B: "ATLAS", an evidence landscape (scientific cartography)
**Identity.** A printed scientific atlas or chart.
- Warm paper `#F3EFE6`, ink `#1B1E23`, hairline ink rules.
- One serif for headings and narrative: Newsreader (or Source Serif 4). A clean grotesque for labels (Public Sans). A distinct mono for figures (JetBrains Mono or Spline Sans Mono, not Plex).
- Restrained cartographic colour: a sequential single-hue ramp for evidence-distance bands (deep teal-ink = DIRECT, mid = NEAR), and paper with fine diagonal hatching = "uncharted" (no comparable evidence within D 2.5). Red-ochre for the scenario pin, ink triangles for habitat landmarks.

**IA.** Map-first and full-bleed.
- A slim top toolbar holds the question, the material class, the flow control (labelled stops) and the published toggle.
- The main canvas is a **coverage map**: the O₂ × pressure plane coloured by the nearest-comparable-evidence distance (use `distanceField` plus `d3-contour` to draw D = 1 and D = 2.5 contour bands). PSI runs are tiny dots and published runs are rings. Habitat atmospheres are landmark triangles with labels.
- The right margin is a **"Field notes"** column: a deterministic, template-generated narrative of the selected location (not an LLM). For example: "At 34.0% O₂ and 56.5 kPa the nearest comparable test is … 6.5 units away, mostly in oxygen (−11.8 pts) and pressure (+79%)." Use numbered footnote markers [1] that resolve to sources at the foot of the column.

**Central interaction.** **Drag the pin anywhere on the map** (direct manipulation; also arrow keys, plus presets as landmark clicks). The notes and bands update live.
- **Uncertainty is drawn on the map:** draw the NEAR boundary (D = 2.5) under the ½× and 2× scale alternatives as thin dashed contours around the default band, a visible "boundary uncertainty envelope". Add a short legend explaining it.

**Gravity.** Not a mode toggle. Show **four separate small-multiple sheets** (µg · Moon · Mars · 1 g) in a row above or below the main map, each its own little field.
- Clicking a sheet makes it the main map. You may also use a radiogroup.
- The Moon and Mars sheets are visibly almost empty: no PSI, only the published Olson & Ferkul/LUCI points when published evidence is on, and FM2 as dashed planned rings.
- The physical separation communicates "regimes, not a continuum". Give the partial-g Olson & Ferkul comparison its own small, editorial dot plot in the notes when Moon or Mars is selected.

**Evidence inspection.** Clicking a dot or ring opens a "specimen card" popover in the margin with full provenance.

**Mobile.** Toolbar, then the map (pinch not required; tap to place the pin), then the sheets as a horizontal scroll strip inside its own container, then the notes.

## Concept C: "CASEFILE", an investigation comparison workspace (research dossier)
**Identity.** A research casefile or technical report: investigations are first-class objects.
- Cool light grey `#EEF0F2` page, white sheets, ink `#111418`, hairlines `#D5D9DE`.
- Ink-blue `#1F4E8C` accent for PSI. Signal orange `#D9480F` exclusively for "your scenario" markers. Muted violet `#6B5CA5` for published, grey dashed for planned.
- Typography: Archivo (headings, tight), Archivo Narrow (dense table labels), JetBrains Mono (figures).
- Dense, tabular, precise. Use rules and labels, not cards with shadows.

**IA.**
- Top: a **sentence-form scenario editor** ("Material flammability at [34.0] % O₂ · [56.5] kPa · [10] cm/s · [Microgravity] — [any material]"), where each bracket is an inline editable control. Presets appear as small tabs beneath it.
- Main: the **Envelope Ladder**, a matrix. Rows are investigations: the 24 PSI records grouped by family (Solids & large-scale, Smoke, Droplets, Gas flames, Ground/modelling), plus published groups and planned FM2. Columns are axes: O₂ | Pressure | Flow | Gravity | Fuel class | Runs | D_min | R.
  - In each axis cell, draw that investigation's **tested values as a strip of tick marks** (one tick per run) on a shared axis per column.
  - Draw the scenario value as one orange vertical rule running through the whole column.
  - Investigations whose envelope spans the scenario are visible at a glance, and the empty gap in the O₂ column above 22.2% for solids is the visual punchline.
  - Rows without placeable data show "not recorded" hatching.
  - Rows are sortable by R (relevance, computed) or D_min.
- The Gravity column shows four tiny cells (µg/Moon/Mars/1g), filled only where a regime has tests.

**Central interaction.** Pin up to 3 investigations into a **Compare tray** (a bottom or right panel). The pinned investigations show side by side:
- a computed **fingerprint**: what varied (with ranges), what was held constant, run count, outcome distribution, data-quality flags
- a nearest-run excerpt
- the PSI record metadata (PI, platform, hardware, DOI, licence, and an "Open in PSI" link)
- a run table with normalized and original values side by side, conversions and flags

**Uncertainty and evidence.** A **Claim ledger** panel for the current scenario lists every statement MARGIN makes (the verdict, the nearest run, coverage facts, partial-g facts). Each row has a type badge (MEASURED · COMPUTED · NOMINAL · REPORTED LIMIT · MODEL · EXTRAPOLATED) and a source link. Draft insights appear in the ledger with a DRAFT stamp. Robustness is shown as one ledger row with the 27-combination verdict counts.

**Gravity.** When Moon or Mars is selected, the ladder's PSI rows grey out with "different regime", and a partial-g block appears at the top with the Olson & Ferkul points (dot plot, points only).

**Mobile.** The scenario sentence wraps. The ladder shows the O₂ column plus D_min only, with a column switcher. The compare tray becomes a full-screen sheet.
