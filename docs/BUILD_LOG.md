# MARGIN build log

| Time (GMT) | Event |
|---|---|
| 2026-11-14 ~11:10 | Earlier session scaffolded Next.js 16.4.6 into `App/margin/` (create-next-app refused the capitalised folder name); interrupted. |
| 11:17 | Scaffold moved to `App/` root (Kickoff §E layout). Repaired a truncated `@next/swc-darwin-arm64` binary (reinstall). |
| 11:18–11:21 | Live fetch from PSI: 24 combustion investigation records + all 22 "Experimental table" CSVs (`design-exploration/data/fetch-psi-snapshot.mjs`). |
| 11:22 | Prototype normalizer → `snapshot.json`. |
| 11:26 | Engine unit tests (golden distances, Kickoff §H.4) pass; real-data anchors computed (below). |
| 11:33 | Three concept agents + science reviewer + UX evaluator launched. |

## Computed on real data (prototype normalization; defaults SCALES 2 pts / ×1.25 / 5 cm/s)

| Scenario | Verdict | D | Nearest | Robustness |
|---|---|---|---|---|
| ISS 20.9% / 101.4 kPa / 10 cm/s, µg, materials, PSI only | DIRECT | 0.003 | PSI-25 (BASS-II) r0100, O₂+P (P nominal) | robust |
| Exploration Atm. 34% / 56.5 kPa / 10 cm/s, PSI only | DISTANT | 6.455 | PSI-25 r0001 (22.2%, nominal 101.325 kPa) | robust |
| EA, with published, 10 cm/s | DISTANT | 2.508 | Saffire VI-2 SIBAL (31%, 54.1 kPa, 20 cm/s) | sensitive NEAR–DISTANT |
| EA, with published, 20 cm/s | NEAR | 1.513 | Saffire VI-2 | sensitive DIRECT–DISTANT |
| Artemis 26.5% / 70.3 kPa / 10 cm/s, with published | NEAR | 2.032 | Saffire V-3 PMMA (26%, 74.5 kPa) | sensitive NEAR–DISTANT |
| EA at Moon g, PSI only | NONE | — | — | robust |
| EA at Moon g, with published | DISTANT | 6.574 | Olson & Ferkul Ultem lunar ULOI* (limit value) | robust |

Coverage headline (computed): max O₂ among solid runs with recorded O₂ = 22.2% (140 runs with O₂; 0 above). Total PSI run rows 1,871 (+130 summary rows); plottable (O₂ and P) 1,129.

## 11:47 — science-review fixes applied (engine/data), anchors recomputed
Changes: smoke gate restricted to smoke-source + T3 solids with alarm data (F-02); gas-burner removed from materials context (F-06); reported limit values separated from evidence (`evaluation.limits`, F-04); `nearestComplete` added (F-03); no-comparable investigations rank below comparable ones (F-08); inverse-flame XO₂ no longer treated as ambient O₂ (F-05); nominal-stated pressure kept only for BASS-II and Saffire-I, with paraphrase labelled (F-07); range cells use first value (F-17); Saffire burn time moved to measures (F-16); classify() tolerance 1e-9 and scenario clamping (F-23); natural convection vs forced flow = flow-regime mismatch.

| Scenario (10 cm/s unless noted) | Verdict | D | Nearest |
|---|---|---|---|
| ISS, PSI only | DIRECT | 0.003 | BASS-II r0100 (O₂+P; flow not recorded — partial) |
| EA, PSI only | DISTANT | 6.277 | Saffire-II r0002 (O₂+flow; pressure not recorded — partial) |
| EA + published | DISTANT (sensitive NEAR–DISTANT) | 2.508 | Saffire VI-2 |
| EA + published, 20 cm/s | NEAR | 1.513 | Saffire VI-2 |
| Artemis + published | NEAR | 2.032 | Saffire V-3 |
| EA, Moon, PSI only | NONE | — | — |
| EA, Moon, + published | DISTANT | 7.473 | LUCI PMMA rod (flow-regime mismatch: natural convection) |
| ISS, smoke & detection, PSI only | NONE | — | SAME/SAME-R record no O₂ (not placeable) |
| ISS, liquid fuel | DIRECT | 0.050 | FLEX r0202 |

Placeable PSI runs (O₂ and pressure): 857 (was 1,129 before inverse-flame O₂ was removed from the ambient axis).
Open for my decision: hero flow verdict depends on preset flow (10 cm/s locked → DISTANT 2.51; 20 cm/s → NEAR 1.51).

## 2026-11-14 ~12:40 — My decision: B+C hybrid, full build approved
I decided (final): Atlas (B) is the primary experience on warm paper; Casefile (C) supplies investigations, compare tray and claim ledger; A's per-axis gaps and sensitivity move into the Atlas field notes. **Hero flow stays at 10 cm/s** (DISTANT, D 2.51) with the flow sensitivity shown honestly; NEAR at 20 cm/s is presented as a different scenario, not a correction. Public GitHub repo (Apache-2.0) and Vercel project approved. Supabase not used (no persistent-storage requirement).

| Time (GMT) | Event |
|---|---|
| 12:44 | M1: prototype promoted into production layout. `design-exploration/` removed (history keeps it); concept A dropped. Routes: `/` Atlas, `/investigations`, `/investigations/[id]`, `/method`, `/sources`. Shared tokens in `app/globals.css`; fonts (Newsreader, Public Sans, JetBrains Mono, OFL) in `lib/fonts.ts`; site header/footer in `components/site`. Pipeline → `pipeline/`, snapshot → `data/generated/snapshot.json`, curated content → `content/curated.ts`, state → `lib/state/`. |
| 12:47 | URL encoding split into pure `lib/state/scenarioQuery.ts` (clamping, unknown params preserved, preset + overrides precedence). Header carries the scenario across Atlas ⇄ Investigations. |
| 12:50 | Four workstreams launched with disjoint ownership: source verification (`content/`, `docs/verification/`); methodology review + pipeline (`pipeline/`, `data/generated/`, `tests/science`, `tests/data`); investigations UI (`components/casefile`, `components/dossier`, `app/investigations`); QA/compliance (`tests/e2e`, `tests/unit/state`, `scripts/`, `.github/`, LICENSE/NOTICE/README, `docs/submission`, `docs/compliance`). The integrating agent keeps `lib/engine`, `lib/schema`, `lib/state`, `lib/data`, Atlas, Method, Sources, configs. |
| 12:52 | Engine: `flowSensitivity()` + `boundaryMargin()` (lib/engine/sensitivity.ts). EA + published: quiescent 1.513 NEAR (partial: flow regime differs), 5 → 3.360, 10 → **2.508 DISTANT**, 15 → 1.813, 20 → 1.513 NEAR, 30 → 2.508; class changes at **10.05** and **29.95** cm/s. EA PSI-only: 6.28 at 10 cm/s, DISTANT at every flow. |
| 12:55 | Engine: `distanceField()` now draws only runs placeable on the O₂ × P plane (both recorded) and reports `omitted`; runs without pressure had painted full-height bands (false coverage). They still count for the verdict as partial matches, disclosed under the map. Accepts a `scales` argument; the Atlas ½×/2× envelope now calls the engine instead of a mirrored copy. |
| 13:05 | Atlas: numeric O₂ / pressure entry with kPa ⇄ psia; per-axis signed gap bars (nearest, and best fully-compared when the nearest is partial); boundary-proximity note ("D is 0.01 above the NEAR/DISTANT boundary"); flow-sensitivity chart; method note that classes are MARGIN's, not scientific categories; insights render only when `verification.status === "primary-checked"`; published-value wording depends on the actual `unverified-transcription` flag, not a blanket banner; on-map caption "Evidence proximity, not a safety rating … not a hazard map". Gravity/flow changes keep the selected landmark. |
| 13:15 | Method page (server-rendered; every number from engine/data). Default Next assets removed; `app/icon.svg`. Git author switched to the GitHub no-reply address and the three unpublished local commits rebuilt with `commit-tree` (no personal email in public history). |
| 13:10 | Methodology review + pipeline workstream merged (`docs/reviews/methodology-review.md`). **PSI run rows now 1,870** (BASS "SOOT Cleaning" maintenance row removed; it was not a burn); 1,828 distinct (42 exact duplicates flagged, kept: SPICE 34, CFI 8); 887 with ambient O₂; 857 with O₂ and pressure; 274 inverse-flame runs carry `burner-fed-oxidizer`. Saffire-II/III pressure now null (no source statement); nominal pressure kept only for BASS-II and Saffire-I. Thin/thick cut moved to the cited 5.2 mm transition (PMMA 0.2–5.2 mm → solid-unknown). Droplet/burner flow: null + regime quiescent + `assumed-value` (no PSI text says "quiescent"). |
| 13:11 | Engine diffs from review applied: D-1 `verdictComplete` + `qualifier` (partial-missing-axis / flow-regime-mismatch), D-2 robustness `partialCells`, D-3 ranking skips duplicate rows. Atlas verdict now shows "partial match — compared on … only; on all three axes: X" and robustness says when every combination rests on a partial match. |
| 13:11 | **Decision (Kickoff §C.8 sanity check):** BASS-II ranks #4, not top 3, for EA + published, because every PSI investigation is ≥ 6 units away (P ≈ 0) and the scale component decides. Weights not tuned; assertion amended to "Saffire IV–VI #1, BASS-II top 4 behind only large-scale tests with P < 0.01" and that reason is tested. |

### Anchors after pipeline fixes (10 cm/s unless noted)
| Scenario | Verdict | D | Nearest |
|---|---|---|---|
| ISS, PSI only | DIRECT (partial: O₂ + P) | 0.003 | BASS-II r0100; best fully-compared 2.022 NEAR |
| Artemis, PSI only | DISTANT | 2.703 | BASS-II |
| Artemis + published | NEAR | 2.032 | Saffire V-3 (DIRECT 0.361 at 20 cm/s) |
| EA, PSI only | DISTANT (partial: O₂ + flow) | **6.277** (supersedes 6.455) | Saffire-II, pressure not recorded; best fully-compared 7.065 |
| **EA + published** | **DISTANT** (9 NEAR / 18 DISTANT of 27) | **2.508** | Saffire VI-2; NEAR from 10.05 cm/s; 1.513 at 20 cm/s; flow is 64 % of D² |
| EA, Moon, PSI only | NONE | — | — |
| EA, Moon + published | DISTANT (flow regime differs) | 7.473 | LUCI PMMA rod |
| Smoke, ISS, PSI only | NONE | — | SAME/SAME-R record no O₂ |
| Liquid, ISS | DIRECT (flow regime differs) | 0.050 | FLEX r0202 |
| 17:35 | Source verification merged (`docs/verification/source-verification.md`). All 29 published/planned records checked against primary NASA documents (AI-assisted, with the page or table and quote recorded; `verifiedBy` null); each now has page/table locator and a ≤25-word verbatim quote. 17 of 19 findings `primary-checked`; only those render as findings. 9 corrections (e.g. BASS-II 1-g 15.4 % point: pressure → not stated; FM2 2024 rod material; Saffire V alternatives; i-loi heptane 0.15 removed as unverifiable). **Decisions:** Saffire flow direction kept "unknown" (ICES-2026 says opposed, ICES-2021/2024 say concurrent); BASS-II 13.5 % keeps nominal 1 atm on the TM's "P = 1 atm", labelled nominal. Spec errors recorded: "CO exceeded limits in 4 of 7 tests before alarm" is wrong (2 of 7); heptane LOI 0.15 unverifiable; Artemis D 0.15 used ICES-2021 values for V-2. Session paused 13:20–17:30 by a usage limit; two agents resumed. |
| 17:38 | Investigations workspace (ladder, compare tray `cmp=`, claim ledger with flow table, provenance drawer) and 29 static dossiers merged. QA merged: 41 URL-state unit tests, Playwright desktop + mobile (hero flow, URL state, all routes incl. every dossier, content rules, axe), banned-claims lint, CI, LICENSE (Apache-2.0), NOTICE (deps, OFL fonts, separate NASA data section), README, submission and compliance drafts. A11y fixes: `--ink-3` #5f6267 (AA), draft badge colour, map `role="group"`, keyboard-focusable scroll regions. |
| 17:40 | All commits carry the GitHub no-reply author and the Co-Authored-By trailer. Secret/personal-data scan of tree and history clean. **Public repo:** https://github.com/ADAI-ALEX/margin (Apache-2.0 detected). |
| 17:41 | **Vercel project `margin`** linked to the repo; Vercel Authentication narrowed to previews only so production is public; Node 24.x. **Production: https://margin-two-rho.vercel.app** — all routes 200 without login; 202/202 Playwright tests pass against production (desktop + mobile, incl. axe). |
| 17:50 | CI fixes: `typecheck` runs `next typegen` first (PageProps); raw-CSV re-parse tests skip when the uncommitted PSI cache is absent. CI green (checks + build + e2e). OG image is a screenshot of the live Atlas; `metadataBase` from `VERCEL_PROJECT_PRODUCTION_URL`. |

## 2026-11-14 ~19:00–22:30 — Redesign "observatory" (NASA Eyes-inspired), branch `redesign/eyes`

Brief: the NASA Eyes rebuild brief (a working document kept outside the repository). Engine, data, curated content, thresholds, ranking and the scenario URL contract unchanged.

**Baselines (M0).** `main` @ `8545952` (clean worktree, `next start`): typecheck, ESLint, `lint:claims` clean; Vitest 190 passed + 3 skipped (193; the 3 skip when the uncommitted PSI cache is absent); `next build` 38 pages; Playwright 202 passed (desktop + mobile). Interim "instrument graphite" working tree (committed as-is on `wip/instrument-graphite` @ `1e06563`): Vitest 193 passed; Playwright 190 passed, 12 failed (all axe: `link-in-text-block`, one `definition-list`).

| Time (GMT) | Event |
|---|---|
| 19:10 | M1: NASA Eyes interaction research (live app, real GPU via `--use-angle=metal`), 37 desktop + 11 mobile captures and DOM measurements in `docs/design/research/eyes-deep/`; merged as `DESIGN_RESEARCH.md` §8; mapping as built and the 2D-only decision in §9. One revision to the suggested mapping: the run inspector opens under the verdict card (the verdict must stay visible), not in the Expeditions slot. |
| 19:40 | M2: new tokens (`app/globals.css`), Albert Sans + IBM Plex Mono, shared components (`components/ui/*`), app shell, rescaled brand mark, `DESIGN_SYSTEM.md` rewritten. View-only URL params `run`, `view` (`lib/state/viewQuery.ts`, unit-tested). Presentation view-models in `lib/view/` (expeditions, regimes, label placement, search index). |
| 20:10 | M3 Atlas: full-bleed evidence field, Expeditions, scenario console, inspector, regime detents, tool rail, regimes overview, shared run inspector, command search, coverage-gap annotation on the field, eased zoom and panel re-fit. |
| 20:15 | Workstreams I (Investigations, dossiers) and D (Method, Sources) launched with disjoint ownership. D finished (all checks green). Workstream I stopped on a usage limit while starting the dossier; its work was complete enough to integrate, and it was finished and reviewed (60/60 Investigations tests passing). |
| 21:20 | Gates on a production build: Vitest 202; Playwright 221 passed, 1 skipped. Transitional token aliases removed; no colour literals in feature CSS. |
| 21:40 | Independent QA (workstream Q, `docs/design/qa/review/QA_REPORT.md`): 4 P1, 12 P2, 18 P3. Fixed all P1 (shared links showed the default verdict for 1–2 s → scenario views hidden until the URL scenario is applied; empty-regime statement covered the probe; phone field head overprinted the plot; phone section bar hidden under the header) and P2 1–12 except P2-2 (the SSR markup is still the desktop geometry until hydration; layout chrome now switches by CSS, only the SVG geometry waits for JS). |
| 22:10 | README rebuilt (banner and mark generated from engine output with text as outlines; real 2× screenshots in `docs/assets/screenshots/`), OG image from the new Atlas, before/after in `docs/design/qa/BEFORE_AFTER.md`, NOTICE fonts updated. |

**Test changes (before → after).**
- `tests/e2e/hero-flow.spec.ts`, Moon step. Before: asserted the `gravity-sheets` radio "Lunar (0.165 g): …" was checked and contained "No PSI tests" in the always-visible sheet strip. After: the four regime plates live in the regimes overview, so the test clicks "Regimes overview", asserts `view=overview` in the URL, exactly four radios in `gravity-sheets`, the Lunar plate checked and containing "No PSI tests", then presses Esc and asserts the overview closed with `g=moon` unchanged before continuing. Same assertions, plus three new ones.
- New `tests/e2e/atlas-eyes.spec.ts` (10 tests × 2 projects): run selection opens the inspector on the engine's nearest run and writes `run=`, Esc closes it and returns focus; `run=` links open the inspector and unknown ids are ignored; the overview has four separate plates and four radios, arrows select, Enter opens, `view=` survives reload; old links without view params open the single field; expedition cards set a complete URL state and are keyboard-operable; Esc closes rail popovers and command search with focus returned; no horizontal overflow in the overview, selected-run and empty-regime views.
- New unit tests: `tests/unit/state/viewQuery.test.ts` (5), `tests/unit/view/labels.test.ts` (4).
- No test deleted or weakened.

**Final gates (2026-11-14, production build).** typecheck, ESLint, `lint:claims` clean; Vitest 202 passed; `next build` 38 pages; Playwright 221 passed, 1 skipped (the rail Esc test is skipped by design on mobile, where there is no rail). Note: `content-rules` "partial-gravity plot is points only" counts SVGs immediately after `networkidle` without waiting for hydration; on a heavily loaded machine it can lose that race (seen once, 4 failures, then 12/12 and 221/221 on re-runs). The test itself was not changed.

### 2026-11-14 23:40 — production served a stale stylesheet

After the redesign merged (`a2dff28`), production rendered unstyled: serif text, black SVG fills, cream background. The deployed HTML and component CSS were new, but the compiled `app/globals.css` (the only file run through the `@tailwindcss/turbopack` loader rule) still held the previous design's tokens (`--paper`, Newsreader), which no longer exist anywhere in the commit. A clean local build of the same commit was correct, and two sequential local builds did not reproduce it, so the cause is attributed to the build cache restored on Vercel. Fixes: `experimental.turbopackFileSystemCacheForBuild: false` in `next.config.ts`, and `scripts/check-build-css.mjs` runs after every `npm run build` (Vercel and CI) and fails the build when the compiled CSS lacks the current `--canvas`, `--text`, `--ev` and `--scenario` values from `app/globals.css`. Run against the stylesheet production served, the guard fails as intended. AI disclosure in the README, Sources and the project-page draft rewritten in the project's own voice (same facts).

### 2026-11-15 00:30 — Guide, tour, demo video, final copy

- **Guide** (`/guide`, in the header): the problem in plain words, what MARGIN does, the verdict scale, a worked example computed live by the engine (Exploration Atmosphere: PSI only → published → 20 cm/s → Moon), an annotated screenshot of the Atlas, the demo video, the rest of the app, what MARGIN will not tell you, and a glossary. Four illustrations were generated with Higgsfield (Earth's limb from orbit, a spherical microgravity flame, a fabric sample burning in an experiment rack, a lunar habitat interior); each carries an on-screen "AI-generated illustration" label, as the competition rules require. No illustration appears in the Atlas or the charts. (Correction, 15 Nov: the demo video's final shot shows the Guide page, so one illustration appears there, with its label visible.)
- **Tour** on the Atlas (`components/guide/Tour.tsx`): eight steps with a spotlight on the live screen; opens from the first-visit welcome card, the tool rail, the phone section bar or `/?tour=1` (the parameter is removed on arrival, so the URL contract is unchanged). Modal, Esc closes it, arrow keys step, focus returns to the opener; keys inside it never reach the field.
- **Welcome card** at the top of Expeditions on first visit, dismissible, remembered on the device; an inline script hides it before paint on later visits.
- **Demo video** (`public/demo/margin-demo-30s.mp4`, 26.8 s) recorded from a production build by `scripts/record-demo.mjs`: Playwright drives the hero-flow path with a visible pointer and burned-in captions whose numbers are read from the page.
- **Copy**: TODOs removed and the documentation written in my own voice under my full name, Alexander de Gentile-Murnieks. Source checks are described as AI-assisted with page and quote recorded; no human sign-off is claimed.
- **Tests**: `tests/e2e/guide-tour.spec.ts` (Guide numbers agree with the engine, every illustration is labelled, demo assets are served, the tour opens, steps, closes and returns focus, the welcome stays dismissed); `/guide` added to the route, accessibility and rendered-text suites, and `/?tour=1` to the accessibility suite.

### 2026-11-15 00:55 — narrated demo, Guide link, margin.adai.systems

- The public URL is now https://margin.adai.systems (README, submission copy, demo, metadata base, GitHub homepage).
- The demo is re-recorded from the live site in a browser frame (MARGIN favicon in the tab, margin.adai.systems in the address bar, the MARGIN mark on the title and end cards) at 1920 × 1080, 25.2 s. Narration I wrote was voiced with Higgsfield Seed Audio and is placed phrase by phrase on its beats; the frame carries "AI voiceover (Higgsfield)" throughout. Music and interface sounds are synthesised in code (`scripts/demo/synth_audio.py`); the remaining Higgsfield credits did not cover generated music. Mix: voice ducks the music; one fixed gain to −16 LUFS plus a peak limiter.
- The Guide link in the header is boxed in the evidence blue, and the demo video is the first thing on the Guide.

### 2026-11-15 01:30 — demo re-cut

- No browser frame and no in-video labels: the page fills the 1920 × 1080 frame. Title card with the MARGIN mark beside the wordmark (as in the header); no end card. 29.5 s with nine beats, now including the source inspector, the ranked Investigations catalogue and the Guide.
- Narration re-voiced with Kokoro (open-weight text-to-speech, `af_heart`), one clip per beat (`scripts/demo/narrate.py`), because the Higgsfield voice was unclear and mispronounced "NASA" and no Higgsfield credits remained for a retake. "NASA" is passed as "Nasa" so it is spoken as a word. The Higgsfield narration file was removed.
- Edit: pacing driven by the narration (each line starts once the previous line and its action are done); smooth punch-in zooms in post; captions rendered in the site's typeface; swish per pointer glide (matched to distance), two-part click per click, low swoosh on page changes; music ducks under the voice; −16 LUFS with a peak limiter.
