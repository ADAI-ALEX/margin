# Project page (Space Apps 2026 submission form)

Status: Final copy, 15 Nov 2026. Field names follow the Project Submission Guide (Kickoff §J.2, R1 §3).

**How to use this file**
- Text in the grey boxes is paste-ready.
- The table at the bottom gives the source of every number in the boxes, so each one can be
  re-checked against the deployed site. If the data snapshot or curated values change, the engine
  values change too; `tests/e2e/hero-flow.spec.ts` fails if the demo narrative no longer holds.
- Wording rules: evidence proximity only. No hazard/safety judgements, no predictions, no
  certification language, no "bounds" claims for partial gravity (`npm run lint:claims` scans this file).

---

## 1. Project Name

> MARGIN: How close is NASA's fire evidence to the habitats we're about to fly?

## 2. High-Level Project Summary (≈140 words)

> MARGIN is a web atlas of NASA's combustion test evidence. It places all 1,870 run rows from the 24 combustion investigations in NASA's Physical Sciences Informatics archive in one condition space (oxygen, pressure, ventilation flow, gravity and fuel type) next to the atmospheres crewed habitats will fly. For any scenario it finds the nearest comparable test and reports a documented evidence distance, with every number traced to its PSI row or NASA paper. It shows the gap plainly: the highest O₂ in any of PSI's 140 solid-material tests with a recorded O₂ value is 22.2%, while the Exploration Atmosphere is 34%. It treats gravity as separate regimes, because NASA drop-tower data show lunar results that 0 g and 1 g tests did not bound. MARGIN measures evidence proximity, not safety.

_(≈ 140 words.)_

## 3. Link to Project Demo

> https://margin.adai.systems/demo/margin-demo-30s.mp4

Also embedded at https://margin.adai.systems/guide#demo

## 4. Link to Final Project

> https://margin.adai.systems

## 5. Detailed Project Description (target 4,000–6,000 characters)

> **What it does.** NASA's combustion results are, in the challenge's words, hard to find, harder to compare and harder yet to interpret. The 24 PSI combustion investigations record their conditions in different ways: oxygen under several column names, pressure in atm, bar or mmHg (or not at all), flow as speeds or fan settings. MARGIN normalises every run row into one condition space and asks a single question for any crewed atmosphere: how close does the actual test evidence come?
>
> Pick an atmosphere (ISS cabin 20.9% O₂ at 14.7 psia; Artemis surface habitat 26.5% at 10.2 psia; the Exploration Atmosphere 34% at 8.2 psia), a fire question (material flammability, smoke and detection, suppression, liquid fuels) and a gravity regime. MARGIN shows the nearest comparable tests, how far away they are and on which axis, a verdict (DIRECT, NEAR, DISTANT or NONE), a ranked list of investigations, and the source of every number. The whole scenario lives in the URL, so a link reproduces the result.
>
> **How it works.** A pipeline downloads the 24 PSI records and their experimental tables once and writes a versioned snapshot: 1,870 run rows and 130 summary rows. Original cell values are kept beside normalised ones, unit conversions are logged and anomalies are flagged. Published NASA results that are not in PSI (Saffire IV–VI, BASS-II limit points, Olson & Ferkul 2012, LUCI) are added as clearly marked published values with page or table citations; planned experiments (FM2) are drawn but never counted as evidence.
>
> Before any distance is computed, a comparability gate requires the same gravity regime and a fuel type relevant to the question, so a gas-burner flame never counts as evidence for cabin fabrics. The distance combines oxygen (one unit = 2 percentage points), pressure (one unit = a 25% change, on a log scale) and flow (one unit = 5 cm/s). The nearest comparable run sets the verdict: DIRECT at D ≤ 1.0, NEAR at D ≤ 2.5, DISTANT above that, NONE when no comparable run exists in the regime. Because the scales are expert judgement, MARGIN recomputes the verdict for 27 combinations of halved, default and doubled scales and says whether it is robust or sensitive. Investigations are ranked by a transparent, reweightable score (proximity, hazard match, scale, coverage, measurements).
>
> **What it found.** The highest O₂ in any of PSI's 140 solid-material tests with a recorded O₂ value is 22.2%; none reaches the Artemis habitat's 26.5% or the Exploration Atmosphere's 34%. For the Exploration Atmosphere at 10 cm/s ventilation, the nearest PSI test is DISTANT (D 6.28). Adding published results brings the Saffire VI SIBAL fabric test into range, but the verdict stays DISTANT (D 2.51), just above the NEAR boundary; at 20 cm/s, a different scenario, it is NEAR (D 1.51). MARGIN shows this flow sensitivity instead of choosing the flow that looks best. PSI holds no partial-gravity combustion runs. In NASA drop-tower tests of Mylar at 10.2 psia, the lunar limiting O₂ (15.6%) was below both the 0 g (17.0%) and 1 g (21.2%) values: microgravity and Earth results did not bound lunar behaviour for this material. MARGIN therefore treats gravity as four separate regimes with no slider and no interpolation.
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

## 6. Use of Super Intelligence (SI)

> I built MARGIN for NASA Space Apps 2026. I chose the concept, decided what the tool may and may not claim, approved the distance method and its thresholds, picked the design direction and reviewed every change. I used Anthropic's Claude, through Claude Code, as a pair programmer and research assistant. Before the event it helped me research the competition rules, combustion literature and NASA data access. The idea came from the challenge itself: NASA's PSI archive holds 1,870 combustion test runs, but there was no quick way to ask how close any of them come to the atmospheres future habitats will actually use. During the event Claude wrote a large share of the code, data-pipeline code, tests and documentation under my direction, helped transcribe published values with citations, and helped review the code and the science. Each published value was checked against its primary source with AI assistance; the page or table and a short verbatim quote are recorded so anyone can re-check it. The four illustrations on the Guide page are AI-generated (made with Higgsfield) and are labelled 'AI-generated illustration' on screen; the demo video's voiceover is AI-generated (Higgsfield Seed Audio) and labelled in the video, while its picture is a screen recording of the live app and its music and sounds are synthesised in code; every chart and screenshot is drawn from the data or captured from the app. All of this is acknowledged in the README and in docs/compliance/si-usage-log.md. The deployed app makes no AI calls: every number comes from a deterministic engine and cited data. No NASA branding is used.

## 7. NASA Data

> - NASA Physical Sciences Informatics (PSI), combustion science: https://psi.nasa.gov/physci/repo/search?q=combustion — 24 investigation records and their experimental tables (1,870 run rows). Licence as stated by PSI per record (CC0-1.0 for 23 of 24; not stated for PSI-10).
> - PSI investigations used (24), with DOIs: PSI-10 ACME / Flame Design (doi:10.60555/w4zy-bt45); PSI-20 ACME BRE (doi:10.60555/vb93-3y72); PSI-21 ACME CLD Flame (doi:10.60555/23e1-9950); PSI-22 ACME E-FIELD Flames (doi:10.60555/se5a-8c73); PSI-23 ACME s-Flame (doi:10.60555/k57n-p030); PSI-25 BASS-II (doi:10.60555/4qc4-de67); PSI-26 BASS (doi:10.60555/58h4-dy80); PSI-39 CFI (doi:10.60555/m6pj-a914); PSI-47 DAFT / DAFT-2 (doi:10.60555/ztgj-d202); PSI-60 SPICE data analysis (doi:10.60555/mzjm-yv57); PSI-62 BASS flame-spread modelling (doi:10.60555/e9xp-ex83); PSI-68 FLEX-2 (doi:10.60555/byp8-h018); PSI-69 FLEX (doi:10.60555/mbq8-0451); PSI-98 SAFFIRE-I (doi:10.60555/0t15-1z43); PSI-99 SAFFIRE-II (doi:10.60555/2chp-m469); PSI-100 SAFFIRE-III (doi:10.60555/040q-4h36); PSI-101 SAME-R (doi:10.60555/2np7-jv14); PSI-102 SAME (doi:10.60555/gd4k-8h62); PSI-106 SLICE (doi:10.60555/pm12-rg61); PSI-107 SPICE (doi:10.60555/9kbh-e962); PSI-115 SAME smoke modelling (doi:10.60555/q0v5-1v28); PSI-117 Cool-flame CFD (doi:10.60555/gz0q-b577); PSI-142 Counterflow cool flames (doi:10.60555/80qf-vj95); PSI-159 ACME CFI-G (doi:10.60555/cyt1-kh64).
> - NASA Technical Reports Server documents: Olson & Ferkul ICES-2012-3492 (NTRS 20130010991); BASS-II Summary Report NASA/TM-20210011385; Saffire IV–V ICES-2021-266 (NTRS 20210011521); Saffire VI ICES-2024-365 (NTRS 20240002981) and ICES-2026-577 (NTRS 20260001992); Saffire large-scale flammability results, ICES 2017 slides (NTRS 20170008805); LUCI (NTRS 20250010653); FM2 plans (NTRS 20240015307, 20260001966); fire detection white paper (NTRS 20210022143); SAME-2, AIAA 2012-3536 (NTRS 20130000422); FLEX, JASMAC-33 (NTRS 20210022617) and NASA/TP-2015-216046 (NTRS 20150023456); heritage hardware in reduced-pressure, higher-O₂ cabins, ICES-2022-45 (NTRS 20220006612); Artemis Deep Space Habitation (NTRS 20220000245); 8 psia / 32% O₂ atmosphere, NASA/TM-2013-217377 (NTRS 20130013505).
> - Other NASA documents: A Researcher's Guide to: Combustion Science (NP-2015-10-034-JSC); NASA-STD-6001B w/Change 2.
> - Challenge resources: the "Flame in Freefall" challenge page (https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/) and the PSI combustion repository (https://psi.nasa.gov/physci/repo/search?q=combustion).

## 8. Space Agency Partner Data and Other References

> - Space agency partner data: none used.
> - Publications: every publication MARGIN cites is on NASA's Technical Reports Server or nasa.gov, or is the Space Apps challenge statement; the full list with page-level citations is on the Sources page (https://margin.adai.systems/sources).
> - Software (open source): Next.js (MIT), React (MIT), d3-array / d3-contour / d3-scale / d3-shape (ISC), zod (MIT); development: TypeScript (Apache-2.0), Vitest (MIT), Playwright (Apache-2.0), axe-core (MPL-2.0), ESLint (MIT), Tailwind CSS (MIT). Full list with licences in NOTICE.
> - Fonts: Albert Sans, IBM Plex Mono (SIL Open Font License 1.1).
> - Hosting: Vercel. Repository: GitHub. SI tools: Anthropic Claude (Claude Code), build time only; Higgsfield for the four Guide-page illustrations and the demo-video voiceover.
> - Images: none from third parties; all charts are drawn in code. The four Guide-page illustrations are AI-generated (Higgsfield) and labelled as such on screen.

## Submission checklist
- [ ] I have read the submission requirements and agree to the Terms and Privacy Policy.
- [ ] The work is original; every external resource is listed in References; no copyrighted material is used without permission.
- [ ] My team has at least 2 members on the Members tab (Universal Event rule).
- [ ] The demo is ≤ 30 s, public, and plays in a private window.
- [ ] The production URL opens in a private window with no login wall.
- [ ] The numbers in the boxes match the deployed site.
- [ ] I submit before 23:59 local time on 15 Nov and save nothing afterwards.

---

## Sources of the numbers on this page

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
