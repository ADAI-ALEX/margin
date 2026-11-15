<p align="center"><img src="docs/assets/branding/margin-banner.svg" alt="MARGIN: How close is the evidence? An evidence-coverage atlas of NASA PSI combustion tests" width="100%"></p>

<p align="center">
  <a href="https://github.com/ADAI-ALEX/margin/actions/workflows/ci.yml"><img src="https://github.com/ADAI-ALEX/margin/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/Next.js-16.4.6-000000?logo=nextdotjs" alt="Next.js 16.4.6">
  <img src="https://img.shields.io/badge/React-19.3.0-149eca?logo=react" alt="React 19.3.0">
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/Playwright-1.65-2ead33?logo=playwright" alt="Playwright 1.65">
  <img src="https://img.shields.io/badge/Vitest-5.1-6e9f18?logo=vitest" alt="Vitest 5.1">
  <img src="https://img.shields.io/badge/data-NASA%20PSI-56c6dc" alt="Data: NASA PSI">
  <a href="https://margin.adai.systems"><img src="https://img.shields.io/badge/deployed-Vercel-000000?logo=vercel" alt="Deployed on Vercel"></a>
  <img src="https://img.shields.io/badge/licence-Apache--2.0-blue" alt="Licence: Apache-2.0">
</p>

**MARGIN** maps every test run in NASA's Physical Sciences Informatics (PSI) combustion archive against the atmospheres that crewed vehicles and habitats will actually fly. Pick a cabin atmosphere, a fire-safety question and a gravity regime, and MARGIN finds the nearest comparable NASA test, reports how far away it is as a documented evidence distance **D**, and links every number to the PSI table row or paper it came from.

Created by **Alexander de Gentile-Murnieks** for [NASA Space Apps 2026](https://www.spaceappschallenge.org/), challenge "Flame in Freefall".

**Evidence proximity, not a safety rating.** MARGIN measures how close tested conditions come to a scenario. It does not predict fire behaviour, score how dangerous an environment is, certify anything, or claim that two conditions behave the same way.

<p align="center"><img src="docs/assets/screenshots/atlas-hero.png" alt="The MARGIN Atlas: the Exploration Atmosphere in microgravity with published evidence included, on a full-screen evidence field. Evidence: DISTANT, D 2.51." width="100%"></p>
<p align="center"><sub>The Atlas: the Exploration Atmosphere (34% O₂, 56.5 kPa) in microgravity with published evidence on. The amber probe sits outside the coverage bands; the nearest comparable test is Saffire VI-2, D 2.51 (DISTANT). The dashed line marks the highest O₂ in any PSI solid-material test.</sub></p>

- **Live site:** https://margin.adai.systems
- **New here? Start with the Guide:** https://margin.adai.systems/guide
- **30-second demo:** https://margin.adai.systems/guide#demo (video file: https://margin.adai.systems/demo/margin-demo-30s.mp4)
- **Repository:** https://github.com/ADAI-ALEX/margin

## Contents

[New here?](#new-here-the-guide-and-the-tour) · [What MARGIN does](#what-margin-does) · [The scientific problem](#the-scientific-problem-the-coverage-gap) · [Features](#features) · [The Atlas](#the-atlas) · [Investigations](#investigations-and-comparison) · [Dossiers](#dossiers-and-run-inspection) · [Methodology](#methodology) · [Data and sources](#nasa-datasets-and-sources) · [Architecture](#architecture) · [Tech stack](#tech-stack) · [Install](#install-and-development) · [Testing](#testing) · [Attribution and licensing](#attribution-ai-use-disclosure-and-licensing)

## New here? The Guide and the tour

MARGIN answers one question: **has NASA ever tested fire in conditions like the cabin I am planning, and how close did those tests come?** Two ways in, both in the app:

- **[The Guide](https://margin.adai.systems/guide)** explains the problem, the evidence distance D and how to read the screen in plain words, with a worked example computed live by the engine and the 30-second demo.
- **The tour** (the "Take the tour" button on the Atlas, or [`/?tour=1`](https://margin.adai.systems/?tour=1)) puts a spotlight on each part of the live Atlas in turn: the evidence field, your scenario, the scenario panel, the verdict, the gravity regimes, Expeditions and the tools. It works with the mouse, the arrow keys and Esc, and on phones.

<p align="center"><img src="docs/assets/screenshots/guide.png" alt="The MARGIN Guide: 'Has anyone ever tested fire in air like this?' over an AI-generated illustration of Earth's limb from orbit, labelled as AI-generated" width="100%"></p>

## What MARGIN does

```text
 1. choose a scenario     a reference cabin atmosphere (or any O₂ / pressure), a fire question, a flow, a gravity regime
 2. gate                  keep only NASA tests relevant to that question, in that gravity regime
 3. measure               the evidence distance D from the scenario to every comparable test
 4. classify              DIRECT (D ≤ 1) · NEAR (D ≤ 2.5) · DISTANT · NONE (no comparable test in that regime)
 5. trace                 every value back to its PSI table row or the page of the NASA paper it came from
```

The whole scenario lives in the URL (`?preset=ea&o2=34&p=56.5&u=10&g=moon&h=materials&pub=1`), so any view can be shared exactly.

## The scientific problem: the coverage gap

Computed at build time from the snapshot (`HEADLINE` in `lib/data`):

> The highest O₂ in any of PSI's **140** solid-material tests with a recorded O₂ value is **22.2%**. Artemis surface habitats plan **26.5%** and the Exploration Atmosphere **34%**; **0** of those tests reach either level.

And every PSI run in the snapshot was flown in microgravity: PSI holds **no** partial-gravity combustion runs. Lunar, Martian and Earth gravity contain only a handful of published or planned points. MARGIN shows that emptiness instead of filling it.

## Features

- **A full-screen evidence field.** The O₂ × pressure plane of one gravity regime fills the screen: coverage bands (D ≤ 1, D ≤ 2.5) in a single cool hue, the ½× / 2× scale envelopes, NASA PSI runs, published results, reported limits, planned experiments and reference cabin atmospheres, with labels placed without collisions.
- **Expeditions.** Curated entry points (the coverage gap, five reference atmospheres, six findings checked against their primary sources), each a complete, shareable state.
- **Four separate gravity regimes.** A four-detent regime selector and a regimes overview of four flat plates. No distance is ever computed across regimes and nothing is drawn between them.
- **A verdict you can audit.** Class word and D, the per-axis gaps, partial-match qualifiers, boundary proximity, 27-combination robustness and flow sensitivity.
- **One run inspector everywhere.** Conditions with units and basis, the distance decomposition to your scenario, flags in plain words, the source row or paper locator with a verbatim quote, and the original cells.
- **Investigations, ranked and compared.** All 24 PSI combustion investigations plus published groups, ranked by a transparent, reweightable score, with footprints, a compare tray and a claim ledger.
- **A plain-language Guide and a guided tour** for first-time visitors and judges, plus a dismissible welcome on the Atlas.
- **Command search (⌘K / Ctrl K)** over atmospheres, investigations, findings and runs, entirely on the device.
- **Static, deterministic, auditable.** No backend, no database, no runtime AI. The deployed app makes no calls to NASA.

## The Atlas

The Atlas is a full-screen instrument. The field fills the viewport; Expeditions and the scenario console float on the left, the inspector (verdict first, details in tabs) on the right, the field tools on the right edge, and the regime selector with the snapshot status and verdict readout in an instrument strip at the bottom. When a panel collapses, the field eases into the freed space. Drag or tap to place the probe, or move it with the arrow keys.

<table>
<tr>
<td width="50%"><img src="docs/assets/screenshots/atlas-regimes-overview.png" alt="Regimes overview: four separate plates for microgravity, lunar, Martian and Earth gravity, each with its own evidence and verdict at the probe"></td>
<td width="50%"><img src="docs/assets/screenshots/atlas-moon-partial-gravity.png" alt="The lunar regime: no PSI tests, a few published points, and the partial-gravity panel from Olson and Ferkul 2012 drawn as points only"></td>
</tr>
<tr>
<td><b>Regimes overview.</b> Four flat plates on shared axes. Only microgravity holds PSI tests.</td>
<td><b>Lunar gravity.</b> No PSI tests; the partial-gravity limits (Olson &amp; Ferkul 2012) are drawn as points, never lines.</td>
</tr>
<tr>
<td><img src="docs/assets/screenshots/atlas-run-inspector.png" alt="The run inspector open on Saffire VI-2: conditions, distance decomposition to the scenario, and the source"></td>
<td><img src="docs/assets/screenshots/atlas-mobile.png" alt="The Atlas on a phone: the field first, then the regime control and sections" width="60%"></td>
</tr>
<tr>
<td><b>Run inspection.</b> The nearest test, its gaps to the scenario and its source.</td>
<td><b>Mobile.</b> The field first; tap to place the probe.</td>
</tr>
</table>

## Investigations and comparison

`/investigations` ranks every investigation for the current scenario, shows where each one's runs sit on each axis and in condition space, and lets you pin up to three into a compare tray (kept in the link as `cmp=`). The claim ledger lists every statement made for the scenario, typed (MEASURED, COMPUTED, NOMINAL, REPORTED LIMIT, PUBLISHED, DRAFT, PLANNED), and each run id opens its provenance.

<table>
<tr>
<td width="50%"><img src="docs/assets/screenshots/investigations-compare.png" alt="Investigations: the scenario sentence, the finding, the ranked catalogue and the compare tray with two investigations pinned"></td>
<td width="50%"><img src="docs/assets/screenshots/investigations-provenance.png" alt="The claim ledger with the provenance drawer open on a run"></td>
</tr>
<tr>
<td><b>Ranked catalogue and compare tray.</b></td>
<td><b>Claim ledger and provenance.</b></td>
</tr>
</table>

## Dossiers and run inspection

Each investigation has a statically generated dossier (`/investigations/<id>`): its footprint in condition space, PI, platform, dates, PSI and DOI links, a computed fingerprint (what varied, what was held constant, what was never recorded), native charts and the normalised and original run table. Investigations with summary rows only say so.

<table>
<tr>
<td width="50%"><img src="docs/assets/screenshots/dossier-bass-ii.png" alt="The BASS-II dossier: metadata and its footprint in condition space"></td>
<td width="50%"><img src="docs/assets/screenshots/method.png" alt="The Method page: formulas typeset with every symbol defined"></td>
</tr>
<tr>
<td><b>Dossier.</b> BASS-II (PSI-25).</td>
<td><b>Method.</b> Every constant rendered from the engine.</td>
</tr>
</table>

## Methodology

Full detail is on the [Method page](https://margin.adai.systems/method); the constants live in `lib/engine/constants.ts` and the page reads them from there.

1. **Comparability gate.** A run must match the scenario's gravity regime and be relevant to the hazard question (a gas-burner flame is never evidence for cabin fabrics). Planned experiments are never evidence; reported limits are shown but never set the verdict.
2. **Distance.** For each comparable run *r* and scenario *s*:

   ```
   dO2 = (O2_r − O2_s) / 2.0            percentage points
   dP  = ln(P_r / P_s) / ln(1.25)        one unit = a 25% pressure change
   dU  = (U_r − U_s) / 5.0               cm/s (only when both have a numeric flow)
   D   = sqrt(dO2² + dP² + dU²)
   ```

   An axis missing on either side is left out and the match is flagged as partial. Quiescent versus ventilated flow is a regime mismatch, not a number.
3. **Verdict** on the nearest comparable run: **DIRECT** D ≤ 1.0 · **NEAR** D ≤ 2.5 · **DISTANT** D > 2.5 · **NONE** no comparable run in that regime.
4. **Robustness.** The verdict is recomputed with each scale at ½×, 1× and 2× (27 combinations) and reported as Robust or Sensitive.
5. **Gravity rule.** Gravity is categorical: no gravity slider, no interpolation and no curve between gravity levels.
6. **Ranking.** `R = 100 × (0.40·Proximity + 0.20·Hazard match + 0.15·Scale + 0.15·Coverage + 0.10·Measurements)`, weights editable.

**What MARGIN is not:** it is not a fire model, not a flammability prediction for any material, not a hazard or risk rating, not a certification aid, and not evidence that a scenario near a test would behave like that test. The scales are expert judgement (rationale and robustness shown), and the tested configurations are narrow.

### Worked example (computed by the engine on the current snapshot)

| Scenario | Evidence | Verdict | D | Nearest comparable test |
|---|---|---|---|---|
| Exploration Atmosphere, 34% O₂ / 56.5 kPa, 10 cm/s, µg, materials | PSI only | DISTANT | 6.28 | Saffire-II, PSI-99 row 2 (partial: no pressure recorded) |
| same | PSI + published | DISTANT (sensitive NEAR–DISTANT) | 2.51 | Saffire VI-2, SIBAL fabric (published, not in PSI) |
| same at 20 cm/s (a different scenario) | PSI + published | NEAR | 1.51 | Saffire VI-2 |
| same, lunar gravity | PSI only | NONE | — | no PSI test in that regime |
| same, lunar gravity | PSI + published | DISTANT | 7.47 | LUCI PMMA rod (published; partial: the flow regimes differ) |

Source of these values: `evaluate()` in `lib/engine` on `data/generated/snapshot.json` (fetched 2026-11-14) and `content/`; re-checked for this README and reproduced by `tests/e2e/hero-flow.spec.ts`, whose oracle test fails if the demo narrative no longer holds.

## NASA datasets and sources

| Source | What MARGIN uses | Licence / terms |
|---|---|---|
| [NASA Physical Sciences Informatics (PSI)](https://psi.nasa.gov/) | 24 combustion-science investigation records and their experimental tables: **1,870 run rows** (1,828 distinct; the rest are duplicate rows in the source tables) and 130 summary rows (`counts` in `data/generated/snapshot.json`). 887 runs record ambient O₂; 857 record both O₂ and pressure and can be placed on the field. | As stated per record by PSI: 23 records state CC0-1.0; PSI-10 (ACME / Flame Design) states no licence. Each investigation is cited by its DOI (10.60555/…). |
| [NASA Technical Reports Server (NTRS)](https://ntrs.nasa.gov/) and peer-reviewed papers | Individual values not in PSI (Saffire IV–VI, BASS-II limit points, Olson & Ferkul 2012 Table I, LUCI, FM2 plans, FLEX limiting O₂), each with document, page or table. | Cited and linked, not redistributed. Full list: [`docs/submission/references.md`](docs/submission/references.md) and the Sources page. |

Data: NASA Physical Sciences Informatics (PSI); NASA Technical Reports Server (NTRS). Use of NASA data does not imply NASA endorsement. This project uses no NASA logos, insignia or mission patches.

**The data licence is separate from the code licence.** The Apache-2.0 licence covers this repository's code only. See [`NOTICE`](NOTICE).

## Architecture

```text
pipeline/          fetch-psi.mjs → build-data.mjs        (run once; not at request time)
data/generated/    snapshot.json                         (versioned PSI snapshot)
content/           curated published and planned values with citations and verification status
lib/engine/        gate · distance · verdict · robustness · ranking · field · sensitivity   (pure, deterministic)
lib/data/          snapshot + curated content, computed headline numbers
lib/state/         scenario ⇄ URL (scenarioQuery.ts), view-only params (viewQuery.ts), useMargin
lib/view/          presentation view-models: expeditions, regimes, label placement, search index
components/        atlas · casefile (investigations) · dossier · docs · run (run inspector) · ui (shared) · site
app/               routes, all statically prerendered
```

Every route is prerendered as static HTML. The Atlas and Investigations pages hydrate and run the engine in the browser (about 2,000 runs, a few milliseconds per evaluation); Method and Sources compute their numbers at build time from the same engine and data. **No backend, no database, no runtime AI**: the data is static and versioned, and the deployed app makes no calls to NASA. Details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Design system and research: [`docs/design/`](docs/design/).

## Tech stack

Next.js 16 (App Router, Turbopack, Cache Components) · React 19 · TypeScript (strict) · bespoke SVG charts on `d3-scale`, `d3-contour`, `d3-shape`, `d3-array` · `zod` · Albert Sans and IBM Plex Mono (SIL OFL 1.1, self-hosted via `next/font`) · Vitest · Playwright with axe-core · Vercel.

## Install and development

Requires Node.js 20 or later (CI uses Node 24).

```bash
npm ci
npm run dev            # http://localhost:3000

# regenerate the data snapshot from PSI (optional; the snapshot is committed)
npm run data:fetch     # downloads PSI records and tables into pipeline/.cache/
npm run data:build     # writes data/generated/snapshot.json

# checks
npm run typecheck
npm run lint
npm run lint:claims    # banned-claims lint (no safety scores, no gravity interpolation, …)
npm test               # vitest: engine, science, state and view unit tests
npm run test:e2e       # Playwright against PLAYWRIGHT_BASE_URL (default http://localhost:3000)
npm run build
```

The first Playwright run may need `npx playwright install chromium`. To run the e2e suite against a deployed site: `PLAYWRIGHT_BASE_URL=https://… npx playwright test --project=desktop`. README screenshots: `node scripts/capture-readme.mjs <baseUrl>`.

## Testing

- **Unit and science tests (Vitest):** golden distances (identical → 0; one unit on each axis → 1; √2), verdict thresholds at their boundaries, cross-gravity refusal, real-data anchors, URL-state parsing and clamping of hostile parameters, view-only URL params, and collision-free label placement.
- **End-to-end (Playwright, `tests/e2e`, desktop 1440×900 and mobile 390×844):** the 30-second demo path with expectations computed by the engine itself; URL state and hostile parameters; run inspection, the regimes overview, view params, Esc and focus return, expeditions and command search; the Guide (its worked example must match the engine, every illustration must carry its AI label) and the guided tour (opens, steps by keyboard, closes, returns focus); every route returns 200 with no console errors and no horizontal scroll at 390 px; axe-core WCAG 2 A/AA checks; rendered-text rules (no banned claims, gravity is a four-option radiogroup, the partial-gravity plot draws points only, no NASA insignia).
- **Banned-claims lint (`npm run lint:claims`):** scans `app/`, `components/`, `content/`, `lib/`, this README and the submission drafts for wording that would turn evidence proximity into a hazard judgement, a prediction or a certification. Negated disclaimers are allowed; reviewed exceptions live in `scripts/claims-allowlist.json`.
- **CI (`.github/workflows/ci.yml`):** typecheck, ESLint, claims lint, Vitest and `next build` on every push and pull request to `main`, then Playwright (desktop) against `next start`.

Last full local run, 2026-11-15, against a production build: Vitest **202 passed**; Playwright **240 passed, 2 skipped** (desktop and mobile; the two skipped tests use the desktop tool rail, which phones do not have).

## Attribution, AI-use disclosure and licensing

Created by **Alexander de Gentile-Murnieks** for NASA Space Apps 2026.

### Use of SI (AI)

The Space Apps rules ask every participant to say how they used AI, so here it is plainly.

I built MARGIN for NASA Space Apps 2026. I chose the challenge and the concept, decided what the tool may and may not claim (evidence proximity, never a safety rating; no borrowing evidence across gravity levels), approved the distance method and its thresholds, picked the design direction and reviewed every change before it shipped. I used Anthropic's Claude, through Claude Code, as a pair programmer and research assistant:

- **Research.** Before the event it helped me read through the competition rules, combustion papers and the NASA PSI archive.
- **Building.** It wrote a large share of the code, tests and documentation to my specification. I steered it over many rounds, rejected what did not fit, and changed direction when something looked or read wrong.
- **Checking.** It helped transcribe and cross-check every published value against its NASA source, and AI review agents checked the code and the science. Each value was checked against its primary source (AI-assisted; the page or table and a short verbatim quote are recorded in `docs/verification/source-verification.md` so anyone can re-check it). Findings not yet checked stay hidden (currently 1 of 19).

What it does not do: the running app makes no AI calls. Every number on screen comes from the deterministic engine and the cited data. The illustrations on the Guide page are AI-generated (made with Higgsfield) and are labelled as such on screen; everything else, including every chart and screenshot, is drawn from the data or captured from the app.

The phase-by-phase record is in [`docs/compliance/si-usage-log.md`](docs/compliance/si-usage-log.md).

### Licence

Code: [Apache License 2.0](LICENSE), Copyright 2026 Alexander de Gentile-Murnieks.
NASA data, cited publications, fonts and third-party packages keep their own terms; see [`NOTICE`](NOTICE).
