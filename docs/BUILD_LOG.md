# MARGIN build log

| Time (GMT) | Event |
|---|---|
| 2026-11-14 ~11:10 | Earlier session scaffolded Next.js 16.4.6 into `App/margin/` (create-next-app refused the capitalised folder name); interrupted. |
| 11:17 | Lead moved scaffold to `App/` root (Kickoff §E layout). Repaired a truncated `@next/swc-darwin-arm64` binary (reinstall). |
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

## 11:47 — science-review fixes applied by lead (engine/data), anchors recomputed
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
OPEN for product owner: hero flow verdict depends on preset flow (10 cm/s locked → DISTANT 2.51; 20 cm/s → NEAR 1.51).

## 2026-11-14 ~12:40 — Product owner decision: B+C hybrid, full build approved
Decisions (owner, final): Atlas (B) is the primary experience on warm paper; Casefile (C) supplies investigations, compare tray and claim ledger; A's per-axis gaps and sensitivity move into the Atlas field notes. **Hero flow stays at 10 cm/s** (DISTANT, D 2.51) with the flow sensitivity shown honestly; NEAR at 20 cm/s is presented as a different scenario, not a correction. Public GitHub repo (Apache-2.0) and Vercel project approved. Supabase not used (no persistent-storage requirement).

| Time (GMT) | Event |
|---|---|
| 12:44 | M1: prototype promoted into production layout. `design-exploration/` removed (history keeps it); concept A dropped. Routes: `/` Atlas, `/investigations`, `/investigations/[id]`, `/method`, `/sources`. Shared tokens in `app/globals.css`; fonts (Newsreader, Public Sans, JetBrains Mono, OFL) in `lib/fonts.ts`; site header/footer in `components/site`. Pipeline → `pipeline/`, snapshot → `data/generated/snapshot.json`, curated content → `content/curated.ts`, state → `lib/state/`. |
| 12:47 | URL encoding split into pure `lib/state/scenarioQuery.ts` (clamping, unknown params preserved, preset + overrides precedence). Header carries the scenario across Atlas ⇄ Investigations. |
| 12:50 | Four workstreams launched with disjoint ownership: source verification (`content/`, `docs/verification/`); methodology review + pipeline (`pipeline/`, `data/generated/`, `tests/science`, `tests/data`); investigations UI (`components/casefile`, `components/dossier`, `app/investigations`); QA/compliance (`tests/e2e`, `tests/unit/state`, `scripts/`, `.github/`, LICENSE/NOTICE/README, `docs/submission`, `docs/compliance`). Lead keeps `lib/engine`, `lib/schema`, `lib/state`, `lib/data`, Atlas, Method, Sources, configs. |
| 12:52 | Engine: `flowSensitivity()` + `boundaryMargin()` (lib/engine/sensitivity.ts). EA + published: quiescent 1.513 NEAR (partial: flow regime differs), 5 → 3.360, 10 → **2.508 DISTANT**, 15 → 1.813, 20 → 1.513 NEAR, 30 → 2.508; class changes at **10.05** and **29.95** cm/s. EA PSI-only: 6.28 at 10 cm/s, DISTANT at every flow. |
| 12:55 | Engine: `distanceField()` now draws only runs placeable on the O₂ × P plane (both recorded) and reports `omitted`; runs without pressure had painted full-height bands (false coverage). They still count for the verdict as partial matches, disclosed under the map. Accepts a `scales` argument; the Atlas ½×/2× envelope now calls the engine instead of a mirrored copy. |
| 13:05 | Atlas: numeric O₂ / pressure entry with kPa ⇄ psia; per-axis signed gap bars (nearest, and best fully-compared when the nearest is partial); boundary-proximity note ("D is 0.01 above the NEAR/DISTANT boundary"); flow-sensitivity chart; method note that classes are MARGIN's, not scientific categories; insights render only when `verification.status === "primary-checked"`; published-value wording depends on the actual `unverified-transcription` flag, not a blanket banner; on-map caption "Evidence proximity, not a safety rating … not a hazard map". Gravity/flow changes keep the selected landmark. |
| 13:15 | Method page (server-rendered; every number from engine/data). Default Next assets removed; `app/icon.svg`. Git author switched to the GitHub no-reply address and the three unpublished local commits rebuilt with `commit-tree` (no personal email in public history). |
| 13:10 | Methodology review + pipeline workstream merged (`docs/reviews/methodology-review.md`). **PSI run rows now 1,870** (BASS "SOOT Cleaning" maintenance row removed; it was not a burn); 1,828 distinct (42 exact duplicates flagged, kept: SPICE 34, CFI 8); 887 with ambient O₂; 857 with O₂ and pressure; 274 inverse-flame runs carry `burner-fed-oxidizer`. Saffire-II/III pressure now null (no source statement); nominal pressure kept only for BASS-II and Saffire-I. Thin/thick cut moved to the cited 5.2 mm transition (PMMA 0.2–5.2 mm → solid-unknown). Droplet/burner flow: null + regime quiescent + `assumed-value` (no PSI text says "quiescent"). |
| 13:11 | Engine diffs from review applied: D-1 `verdictComplete` + `qualifier` (partial-missing-axis / flow-regime-mismatch), D-2 robustness `partialCells`, D-3 ranking skips duplicate rows. Atlas verdict now shows "partial match — compared on … only; on all three axes: X" and robustness says when every combination rests on a partial match. |
| 13:11 | **Lead decision (Kickoff §C.8 sanity check):** BASS-II ranks #4, not top 3, for EA + published, because every PSI investigation is ≥ 6 units away (P ≈ 0) and the scale component decides. Weights not tuned; assertion amended to "Saffire IV–VI #1, BASS-II top 4 behind only large-scale tests with P < 0.01" and that reason is tested. |

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
| 17:35 | Source verification merged (`docs/verification/source-verification.md`). All 29 published/planned records checked against primary NASA documents (SI-assisted; human sign-off pending, `verifiedBy` null); each now has page/table locator and a ≤25-word verbatim quote. 17 of 19 findings `primary-checked`; only those render as findings. 9 corrections (e.g. BASS-II 1-g 15.4 % point: pressure → not stated; FM2 2024 rod material; Saffire V alternatives; i-loi heptane 0.15 removed as unverifiable). **Lead decisions:** Saffire flow direction kept "unknown" (ICES-2026 says opposed, ICES-2021/2024 say concurrent); BASS-II 13.5 % keeps nominal 1 atm on the TM's "P = 1 atm", labelled nominal. Spec errors recorded: "CO exceeded limits in 4 of 7 tests before alarm" is wrong (2 of 7); heptane LOI 0.15 unverifiable; Artemis D 0.15 used ICES-2021 values for V-2. Session paused 13:20–17:30 by a usage limit; two agents resumed. |
