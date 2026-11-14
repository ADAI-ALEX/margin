# Project page draft (Space Apps 2026 submission form)

Status: **DRAFT** by the QA/compliance workstream, 2026-11-14. The owner edits and approves; the
owner submits. Field names follow the Project Submission Guide (Kickoff §J.2, R1 §3).

**How to use this file**
- Text in the grey boxes is paste-ready once the `[S#]` source tags and `TODO` items are removed.
- Every number carries a `[S#]` tag pointing to the source table at the bottom. Re-check each
  number against the deployed site on the day of submission (Kickoff V10). If the data snapshot or
  curated values change, the engine values change too; `tests/e2e/hero-flow.spec.ts` fails if the
  demo narrative no longer holds.
- Wording rules: evidence proximity only. No hazard/safety judgements, no predictions, no
  certification language, no "bounds" claims for partial gravity (`npm run lint:claims` scans this file).

---

## 1. Project Name

> MARGIN: How close is NASA's fire evidence to the habitats we're about to fly?

## 2. High-Level Project Summary (≈140 words)

> MARGIN is a web atlas of NASA's combustion test evidence. It places all 1,870 run rows [S1] from the 24 combustion investigations in NASA's Physical Sciences Informatics archive [S2] in one condition space (oxygen, pressure, ventilation flow, gravity and fuel type) next to the atmospheres crewed habitats will fly. For any scenario it finds the nearest comparable test and reports a documented evidence distance, with every number traced to its PSI row or NASA paper. It shows the gap plainly: the highest O₂ in any of PSI's 140 solid-material tests with a recorded O₂ value is 22.2% [S3], while the Exploration Atmosphere is 34% [S4]. It treats gravity as separate regimes, because NASA drop-tower data show lunar results that 0 g and 1 g tests did not bound [S5]. MARGIN measures evidence proximity, not safety.

_(Word count ≈ 140. Check after edits; aim ≤ 150.)_

## 3. Link to Project Demo

> TODO (owner): public video URL (YouTube public or unlisted). Must be ≤ 30 s on the host page; target 0:26–0:28.

## 4. Link to Final Project

> https://margin-two-rho.vercel.app

## 5. Detailed Project Description (target 4,000–6,000 characters)

> **What it does.** NASA's combustion results are, in the challenge's words, hard to find, harder to compare and harder yet to interpret. The 24 PSI combustion investigations [S2] record their conditions in different ways: oxygen under several column names, pressure in atm, bar or mmHg (or not at all), flow as speeds or fan settings. MARGIN normalises every run row into one condition space and asks a single question for any crewed atmosphere: how close does the actual test evidence come?
>
> Pick an atmosphere (ISS cabin 20.9% O₂ at 14.7 psia; Artemis surface habitat 26.5% at 10.2 psia; the Exploration Atmosphere 34% at 8.2 psia [S4]), a fire question (material flammability, smoke and detection, suppression, liquid fuels) and a gravity regime. MARGIN shows the nearest comparable tests, how far away they are and on which axis, a verdict (DIRECT, NEAR, DISTANT or NONE), a ranked list of investigations, and the source of every number. The whole scenario lives in the URL, so a link reproduces the result.
>
> **How it works.** A pipeline downloads the 24 PSI records and their experimental tables once and writes a versioned snapshot: 1,870 run rows and 130 summary rows [S1][S8]. Original cell values are kept beside normalised ones, unit conversions are logged and anomalies are flagged. Published NASA results that are not in PSI (Saffire IV–VI, BASS-II limit points, Olson & Ferkul 2012, LUCI) are added as clearly marked published values with page or table citations; planned experiments (FM2) are drawn but never counted as evidence.
>
> Before any distance is computed, a comparability gate requires the same gravity regime and a fuel type relevant to the question, so a gas-burner flame never counts as evidence for cabin fabrics. The distance combines oxygen (one unit = 2 percentage points), pressure (one unit = a 25% change, on a log scale) and flow (one unit = 5 cm/s) [S11]. The nearest comparable run sets the verdict: DIRECT at D ≤ 1.0, NEAR at D ≤ 2.5, DISTANT above that, NONE when no comparable run exists in the regime [S11]. Because the scales are expert judgement, MARGIN recomputes the verdict for 27 combinations of halved, default and doubled scales [S12] and says whether it is robust or sensitive. Investigations are ranked by a transparent, reweightable score (proximity, hazard match, scale, coverage, measurements).
>
> **What it found.** The highest O₂ in any of PSI's 140 solid-material tests with a recorded O₂ value is 22.2% [S3]; none reaches the Artemis habitat's 26.5% or the Exploration Atmosphere's 34% [S4]. For the Exploration Atmosphere at 10 cm/s ventilation, the nearest PSI test is DISTANT (D 6.28) [S6]. Adding published results brings the Saffire VI SIBAL fabric test into range, but the verdict stays DISTANT (D 2.51), just above the NEAR boundary; at 20 cm/s, a different scenario, it is NEAR (D 1.51) [S6][S7]. MARGIN shows this flow sensitivity instead of choosing the flow that looks best. PSI holds no partial-gravity combustion runs [S13]. In NASA drop-tower tests of Mylar at 10.2 psia, the lunar limiting O₂ (15.6%) was below both the 0 g (17.0%) and 1 g (21.2%) values [S5]: microgravity and Earth results did not bound lunar behaviour for this material. MARGIN therefore treats gravity as four separate regimes with no slider and no interpolation.
>
> Three published findings the app surfaces, each checked against its primary source: BASS-II PMMA rods on the ISS kept burning at 13.5% O₂ in low-speed flow, below the 15.4% 1-g upward-spread limit (NASA/TM-20210011385, §6.1.4.4, p. 76). In Saffire VI, both PMMA fires reached a 2 mg/m³ aerosol alarm threshold only after CO had risen above the 24-hour crew limit (ICES-2026-577, Table 1, p. 6). In Saffire IV–V, turning the airflow off did not reliably put fires out (ICES-2021-266, §III.A, pp. 4–5).
>
> **Who it is for.** Spacecraft and habitat fire-safety and materials engineers, combustion researchers, students, and mission planners who need to see quickly where NASA's evidence is dense, where it is thin, and which investigation to read first.
>
> **What is live and what is not.** Live: the Atlas with coverage map, gravity sheets, verdict, robustness and field notes; the ranked Investigations view with claim ledger, provenance, flow sensitivity and compare tray; a dossier for each PSI investigation; the Method and Sources pages. Not built: an export/brief download and any runtime SI features.
>
> **Limitations.** D measures evidence coverage, not flammability. The scales are expert judgement (robustness shown). Tested configurations are narrow. Partial-gravity evidence is three materials in 5-second drops plus one preliminary rotating flight. Published values differ between papers and all are shown. Some pressures are nominal, not measured.
>
> **Tools.** TypeScript, Next.js 16 and React 19 (statically generated, deployed on Vercel), d3 (scales, contours), zod, Vitest, Playwright and axe-core, GitHub Actions. Code: https://github.com/ADAI-ALEX/margin, Apache-2.0.

_(Approx. 4,300 characters before the TODO items. Check the final count in the form.)_

## 6. Use of Super Intelligence (SI)

> We used Anthropic Claude through Claude Code. Before the event, SI assisted our research into the competition rules, combustion literature and NASA data access, and our analysis of the concept. TODO (owner): one sentence on how the team originated and chose the idea. During the event, SI agents wrote most of the source code, data-pipeline code, tests and documentation, transcribed published values with citations, and reviewed code and science; the team set the requirements, chose the design and checked scientific values against their sources. SI-assisted code is acknowledged in the README and in commit metadata (Co-Authored-By trailers). The deployed app makes no SI calls at run time: every number comes from a deterministic engine and cited data. We used no SI-generated images, video or audio, and no NASA branding.

## 7. NASA Data

> - NASA Physical Sciences Informatics (PSI), combustion science: https://psi.nasa.gov/physci/repo/search?q=combustion — 24 investigation records and their experimental tables (1,870 run rows) [S1][S2]. Licence as stated by PSI per record (CC0-1.0 for 23 of 24; not stated for PSI-10).
> - PSI investigations used, with DOIs: see the list in `docs/submission/references.md` §1 (paste all 24).
> - NASA Technical Reports Server documents: Olson & Ferkul ICES-2012-3492 (NTRS 20130010991); BASS-II Summary Report NASA/TM-20210011385; Saffire IV–V ICES-2021-266 (NTRS 20210011521); Saffire VI ICES-2026-577 (NTRS 20260001992); LUCI (NTRS 20250010653); FM2 plans (NTRS 20240015307, 20260001966); fire detection white paper (NTRS 20210022143); cool flames (NTRS 20210022617).
> - Challenge resources: "Flame in Freefall" challenge page and the PSI combustion repository. TODO (owner): add any other challenge resource pages actually used.

## 8. Space Agency Partner Data and Other References

> - Space agency partner data: none used.
> - Non-NASA publication: Dietrich et al. 2014, FLEX limiting oxygen index, Microgravity Science and Technology, doi:10.1007/s12217-014-9372-2.
> - Software (open source): Next.js (MIT), React (MIT), d3-array / d3-contour / d3-scale / d3-shape (ISC), zod (MIT); development: TypeScript (Apache-2.0), Vitest (MIT), Playwright (Apache-2.0), axe-core (MPL-2.0), ESLint (MIT), Tailwind CSS (MIT). Full list with licences in NOTICE.
> - Fonts: Newsreader, Public Sans, JetBrains Mono (SIL Open Font License 1.1).
> - Hosting: Vercel. Repository: GitHub. SI tool: Anthropic Claude (Claude Code), build time only.
> - Images: none from third parties; all charts are drawn in code.

## Checkboxes (owner)
- [ ] Read the submission requirements; agree to the Terms and Privacy Policy.
- [ ] Original work; all external resources listed in References; no copyrighted material without permission.

## Before pressing "Submit for Judging" (owner)
- [ ] Team has ≥ 2 members on the Members tab (Universal Event rule).
- [ ] Demo ≤ 30 s on the host page; public; tested in a private window.
- [ ] Production URL opens in a private window with no login wall.
- [ ] Every `[S#]` tag and TODO removed; numbers re-checked on the deployed site.
- [ ] Submitted before 23:59 Team Owner local time on 15 Nov; nothing saved afterwards.

---

## Sources of the numbers in this draft

| Tag | Number(s) | Source (where to re-check) |
|---|---|---|
| S1 | 1,870 PSI run rows (1,828 distinct) | `data/generated/snapshot.json` → `counts.totalRuns`, `counts.distinctRuns` (shown on the Sources page). Was 1,871 before the 12:59 pipeline rebuild. |
| S2 | 24 PSI combustion investigations | `snapshot.json` → `investigations.length`; PSI search "combustion science" |
| S3 | 140 solid-material tests with recorded O₂; max 22.2% O₂; 0 at or above 26.5% | `lib/data` `HEADLINE` (computed from `snapshot.json` runs); Atlas hero sentence |
| S4 | ISS 20.9% / 14.7 psia; Artemis habitat 26.5% / 10.2 psia; Exploration Atmosphere 34% / 8.2 psia | `content/curated.ts` `ATMOSPHERES` (Kickoff §C.6: NASA-STD-6001B; Artemis Deep Space Habitation paper; HEO-DM-1006) |
| S5 | Mylar 10.2 psia ULOI: Moon 15.6%, 0 g 17.0%, 1 g 21.2% | Olson & Ferkul, ICES-2012-3492, Table I (NTRS 20130010991; doi 10.2514/6.2012-3492); `content/curated.ts` `OLSON_FERKUL_2012` |
| S6 | EA 10 cm/s: PSI only DISTANT D 6.28; + published DISTANT D 2.51 (Saffire VI-2); 20 cm/s NEAR D 1.51; Moon + published DISTANT D 7.47 | Engine `evaluate()` on the snapshot; asserted by `tests/e2e/hero-flow.spec.ts`; BUILD_LOG 12:52 |
| S7 | Verdict class changes at 10.05 cm/s and 29.95 cm/s | `lib/engine` `flowSensitivity()`; BUILD_LOG 12:52; Method page §7 |
| S8 | 130 summary rows; 857 runs with both O₂ and pressure | `snapshot.json` → `counts.totalSummaryRows`, `counts.plottable` |
| S11 | Scales 2 pts O₂ / ×1.25 pressure / 5 cm/s; thresholds 1.0 and 2.5 | `lib/engine/constants.ts` `SCALES`, `VERDICT_THRESHOLDS` (Method page reads them) |
| S12 | 27 robustness combinations | `ROBUSTNESS_FACTORS` = {½, 1, 2}, three scales → 3³ |
| S13 | 0 partial-gravity PSI runs | `snapshot.json` → `counts.partialGravityRuns`; challenge statement |
