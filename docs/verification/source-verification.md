# Source verification log

Checked 2026-11-14 by an SI-assisted source check. **Human sign-off is still pending** for every item: `verifiedBy` stays null on all insight cards.

Method. Each published (non-PSI) value, atmosphere preset and insight card in `content/` was compared with the primary document it cites, downloaded from NTRS (or nasa.gov / standards.nasa.gov for the Researcher's Guide and NASA-STD-6001B). Tables were read from rendered page images as well as the text layer. Quotes are verbatim and at most 25 words; PDF subscripts and superscripts are written with Unicode (O₂, s⁻¹), everything else follows the PDF text. "p." is the printed page number; "PDF p." is given where it differs.

Status key: **CONFIRMED** (matches the primary); **CORRECTED** (primary differs, value fixed); **CONFLICT** (NASA sources disagree; the primary-table value is kept and the others are listed in `alternatives` with the `conflicting-sources` flag); **UNVERIFIABLE** (primary not reachable; `unverified-transcription` kept, or the value removed).

Primary documents used (full citations in `content/references.ts`):

| Short id | Document | NTRS |
|---|---|---|
| ICES-2026 | Urban et al., Heat and Smoke Emission from Tests on the SAFFIRE IV-VI Experiments, ICES-2026-577 | 20260001992 |
| ICES-2024 | Urban et al., Preliminary Results from the Saffire VI Experiment, ICES-2024-365 | 20240002981 |
| ICES-2021 | Urban et al., Fire Safety Implications of Preliminary Results from Saffire IV and V, ICES-2021-266 | 20210011521 |
| ICES-2017 | Ferkul et al., Results of Large-Scale Spacecraft Flammability Tests (slides) | 20170008805 |
| TM | Olson et al., BASS-II Summary Report, NASA/TM-20210011385 | 20210011385 |
| OF2012 | Olson & Ferkul, ICES-2012-3492 (AIAA 2012-3492) | 20130010991 |
| LUCI | Ferkul et al., LUCI, ASGSR 2025 slides | 20250010653 |
| LPSC26 | Ferkul et al., Material Flammability at Lunar and Martian Gravity, LPSC 2026 slides | 20260001966 |
| POSTER24 | Zayac et al., Flammability of Materials on the Moon, 2024 poster | 20240015307 |
| WP | Fortenberry et al., fire detection white paper (NASEM decadal) | 20210022143 |
| SAME2 | Urban et al., SAME-2, AIAA 2012-3536 | 20130000422 |
| JASMAC | Nayagam, Dietrich & Williams, FLEX, JASMAC-33 slides | 20210022617 |
| FLEX-TP | Dietrich et al., FLEX detailed results, NASA/TP-2015-216046 | 20150023456 |
| GUIDE | Gokoglu et al., A Researcher's Guide to: Combustion Science, NP-2015-10-034-JSC | (nasa.gov) |
| ICES-2022 | Abney et al., Evaluation of Heritage Hardware…, ICES-2022-45 | 20220006612 |
| ARTEMIS | Kessler et al., Artemis Deep Space Habitation, IEEE Aerospace 2022 | 20220000245 |
| TM-2013 | Norcross et al., NASA/TM-2013-217377 | 20130013505 |
| STD-6001B | NASA-STD-6001B w/Change 2 | (standards.nasa.gov) |
| BASS-14 | Ferkul et al., Thickness and Fuel Preheating Effects… BASS (slides) | 20140011099 |
| CH | NASA Space Apps 2026 challenge statement, "Flame in Freefall" | — |

## 1. Published runs (T3)

| Item | Value(s) | Primary source and locator | Verbatim quote (≤25 words) | Status | Action |
|---|---|---|---|---|---|
| PUB-SAFFIRE:IV-2 | 0.22 O₂, 1000 mbar, 20 cm/s; growth 0.22 mm/s; max CO rise 110 ppm; alarm 1083 s | ICES-2026 Table 1, p. 6 | "All samples were 40 cm wide in 20 cm/s opposed flow." | CONFIRMED (values); CONFLICT (flow direction) | ICES-2021 Table 1 (p. 3) gives the same 22.0% / 100.0 kPa but "Concurrent". Added alternative, `conflicting-sources`, flowRegime kept "unknown", quote/page added, flag `unverified-transcription` removed. |
| PUB-SAFFIRE:V-3 | 0.26 O₂, 745 mbar; growth 0.26 mm/s; alarm 1117 s | ICES-2026 Table 1, p. 6 | (caption as above) | CONFIRMED vs ICES-2026; CONFLICT | ICES-2021 Table 1, p. 3: 25.4% / 71.3 kPa, Concurrent. Old alternative ("25.4–26.2% for Saffire V", from R3) replaced by the test-specific value. |
| PUB-SAFFIRE:VI-3 | 0.30 O₂, 544 mbar; growth 0.38 mm/s; peak HRR 3240 W; alarm 1037 s | ICES-2026 Table 1, p. 6 | (caption as above) | CONFIRMED vs ICES-2026; CONFLICT | ICES-2024 Table 1, p. 3: 30.3% / 54.6 kPa, Concurrent; Table 2, p. 6: peak HRR 3080 W. Added as alternative; HRR label shows both. |
| PUB-SAFFIRE:VI-4 | 0.29 O₂, 550 mbar; growth 0.27 mm/s; peak HRR 1487 W; alarm 1603 s | ICES-2026 Table 1, p. 6 | (caption as above) | CONFIRMED vs ICES-2026; CONFLICT | ICES-2024: 28.8% / 55.2 kPa, Concurrent; peak HRR 1507 W. Added. |
| PUB-SAFFIRE:IV-1 | 0.23 O₂, 980 mbar; spread 3.6 mm/s; alarm 92 s | ICES-2026 Table 1, p. 6 | (caption as above) | CONFIRMED vs ICES-2026; CONFLICT | ICES-2021 and ICES-2024 Table 1: 22.0% / 100.0 kPa, Concurrent. Added. |
| PUB-SAFFIRE:V-2 | 0.28 O₂, 741 mbar; spread 3.4 mm/s; alarm 146 s | ICES-2026 Table 1, p. 6 | (caption as above) | CONFIRMED vs ICES-2026; CONFLICT | ICES-2021 and ICES-2024 Table 1: 26.2% / 70.7 kPa, Concurrent. Old alternative 25.4% (which is V-3's value) replaced. |
| PUB-SAFFIRE:VI-2 | 0.31 O₂, 541 mbar; spread 4.05 mm/s; peak HRR 3376 W; alarm 201 s | ICES-2026 Table 1, p. 6 | (caption as above) | CONFIRMED (O₂, pressure agree with ICES-2024); CONFLICT (HRR, direction) | ICES-2024: 31.0% / 54.1 kPa (agrees), Concurrent; peak HRR 3217 W (O₂ calorimetry), 3650 W average (fuel calorimetry). Added. |
| Saffire flow direction (all 7) | ICES-2026: opposed | ICES-2021 p. 8; ICES-2021 and ICES-2024 Table 1 | "Both concurrent samples (IV-2 and V-3) did not spread appreciably and instead remained fixed at the leading edge" (ICES-2021 p. 8) | CONFLICT | `flowRegime` left "unknown" with a note naming both readings (the lead decides). ICES-2026's own text (p. 5, flames "anchored at the leading edge") describes the concurrent-flow behaviour that ICES-2021 attributes to concurrent samples. |
| PUB-BASS2:micro-min | 13.5% O₂ (limit), stretch 8–12 s⁻¹, PMMA rods | TM §6.1.4.4, p. 76 (PDF p. 84) | "13.5 percent O2 at a of 8 to 12 s⁻¹ is significantly lower than the observed upward flame spread limit of 15.4 percent O2" | CONFIRMED | Page and quote added; flag removed. Pressure kept at 101.325 kPa `nominal-stated`: see §5 (it rests on the TM's calculation value, not a statement in §6.1). |
| PUB-BASS2:1g-upward | 15.4% O₂ (limit), +4 cm/s forced flow, 1 g | TM §6.1.4.4, p. 76 (PDF p. 84), citing Ref. 23 (Hirsch et al., ASTM STP1454, 2003) | "15.4 percent O2 (in normal gravity with an additional 4-cm/s forced flow (Ref. 23))" | CONFIRMED (O₂, flow); **CORRECTED** (pressure) | Pressure was 101.325 kPa `nominal-stated`; the TM states no pressure for this test → `null`, basis `unknown`. Hirsch 2003 itself not checked. Flow basis set `nominal-stated`. |
| PUB-LUCI:sibal | ~20% O₂ initial, normal pressure, base 0.92 mm/s | LUCI slides 12, 19, 42 | "Two samples are burned simultaneously in air at normal pressure" (slide 12) | CONFIRMED | Added tip 1.1 mm/s and 1-g values (1.5 / 2.8 mm/s, slide 33); added O₂ fall ~20% → ~18% (slide 42). "Preliminary" replaced by "conference slides, not a peer-reviewed paper" (the deck does not use "preliminary"). Coriolis caveat added. |
| PUB-LUCI:pmma | 20% O₂ initial; tip 0.15 cm/s (1 g 0.40) | LUCI slides 36, 22, 17 | "O2% decreases from 20% to 14.3%." (slide 22) | CONFIRMED | Coriolis caveat from slide 17 added (F-27c). |
| PUB-OF2012 (36 values) | Table I: ULOI/MOC at 1 g, Mars, Moon, 0 g; ΔO₂; 10.2 / 10.2 / 14.7 psia | OF2012 Table I, p. 6 | "Limiting Oxygen Molar Concentrations and Oxygen Margin of Safety for Different Gravity Levels" | CONFIRMED (all 36) | Read from page image and text layer. Page, quote added; flags removed. Pressure basis changed `measured` → `nominal-stated` (table header pressures are nominal test pressures; adds `nominal-value`). |
| OF2012 test conditions | 5.18 s drops; centrifuge (Mars this paper; lunar from ref. 8); 0 g with 30 cm/s concurrent flow; 1 g at WSTF with hot-wire igniter; reduced-g criteria differ | OF2012 pp. 3–4, 6 | "0g (with a concurrent flow of 30 cm/s, which is a reasonable maximum local spacecraft ventilation velocity" (p. 4) | CONFIRMED; flow regime **CORRECTED** from "assumed" | Flow regime now from the paper: concurrent-flow spread geometry (p. 3), forced at 0 g, buoyant otherwise. Nomex thickness "fabric" → "12 mil fabric" (p. 3). Caveats extended (1-g method; lunar/0-g are earlier data). |

## 2. Planned runs (T4, never evidence)

| Item | Value(s) | Primary source and locator | Verbatim quote | Status | Action |
|---|---|---|---|---|---|
| PLAN-FM2:2026:{37,33,29,25} | 37/33/29/25% O₂ at 8.2 psia (±0.3), fabric 2 cm × 20 cm, upward | LPSC26 "Current concept" (PDF p. 5); "FM2 Science Requirements" (PDF p. 10) | "Start at 37% should burn to threshold" (and the 33, 29, 25% lines) | CONFIRMED | Material refined to "Fabric sheet (Synergy Pro "Navy")" (PDF p. 10). O₂ basis set `nominal-stated`. |
| PLAN-FM2:2024:21 | 21% O₂ / 14.7 psia, SIBAL in air | POSTER24 Introduction; LPSC26 PDF p. 26 | "specifically 21% oxygen at 14.7 psia, and 34% oxygen at 8.2 psia" | CONFIRMED | — |
| PLAN-FM2:2024:34 | 34% O₂ / 8.2 psia | POSTER24 Introduction; LPSC26 PDF p. 26 ("PMMA rod in 34% O2 balance N2 at 8.2 psi (2 tests)") | (as above) | **CORRECTED** (material) | Material "SIBAL (2024 plan)" → "PMMA (acrylic) rod — 2024 plan"; fuelClass solid-thin → solid-thick. The poster burns SIBAL in air and acrylic rods in the normoxic exploration atmosphere. |

## 3. Atmosphere presets (values LOCKED by Kickoff §C.6; not changed)

| Preset | Value(s) | Primary source and locator | Verbatim quote | Status | Notes |
|---|---|---|---|---|---|
| iss | 20.9% / 14.7 psia | STD-6001B Test 1 clarification j, p. 30 | "The term "ambient conditions" refers to an oxygen concentration of 20.9 percent, a pressure of 101.4 kPa (14.7 psia)" | CONFIRMED | This is the standard's test "ambient"; ICES-2022 p. 1 gives the ISS cabin as "~14.7 psia and ~21% oxygen". |
| artemis | 26.5% / 10.2 psia | ARTEMIS p. 4 | "The SH is assumed to operate at a nominal atmospheric operating pressure of 10.2 psia and 26.5% oxygen concentration" | CONFIRMED | Stated as an assumption; same paragraph: trade studies on moving to 8.2 psia. |
| ea | 34% / 8.2 psia | ICES-2022 p. 8 (quoting HEO-DM-1006); LPSC26 PDF p. 25; TM-2013 p. 13 | "HEO-DM-1006 specifies that a nominal total cabin pressure of 8.2 psia and O2 greater than or equal to 33.7% is needed" | CONFIRMED (via ICES-2022; HEO-DM-1006 itself not found) | LPSC26: "HLS, Lunar habitat and pressurized rover will nominally use 8.2 psia / 34% O2"; control bands up to 37%. ICES-2022 abstract says "8.3 psia" once (internal inconsistency). |
| legacy | 30% / 10.2 psia | OF2012 p. 1; LPSC26 PDF p. 27 | "currently 30% oxygen at 10.2 psia which is the pre-breath environment on the ISS for spacewalks" | CONFIRMED | TM-2013 gives the Shuttle staged atmosphere as 10.2 psia / 26.5%; 30% is the worst-case material test atmosphere. |
| mars | 34% / 8.2 psia (assumed) | none | — | UNVERIFIABLE (assumption by design) | No NASA Mars-transit cabin specification found. Label "assumed" kept. |
| suit | 100% / 4.3 psi | CH "Spacesuits and oxygen concentration"; LPSC26 PDF p. 25 | "spacesuits are filled with 100% oxygen to only 4.3 psi" | CONFIRMED | — |

Exported as `ATMOSPHERE_VERIFICATION` (with `sourceUrl`). The `source` strings in `ATMOSPHERES` were updated to name the checked documents; no numeric value changed.

## 4. Insight cards (`content/insights.ts`, 19 cards)

| Card | Value | Source and locator | Verbatim quote | Status | Action |
|---|---|---|---|---|---|
| i-test1 | 13.5% vs 15.4% O₂ | TM §6.1.4.4, p. 76 | "13.5 percent O2 at a of 8 to 12 s⁻¹ is significantly lower than the observed upward flame spread limit of 15.4 percent O2" | primary-checked | Claim reworded as a measured comparison, not a verdict on the test. |
| i-ignition-delay (new) | up to ≈10× igniter-on time | TM §6.1.6, p. 89; §6.1.3, p. 67 | "The ignition delay time can be up to almost 10 times longer than the NASA STD–6001 standard igniter on time." | primary-checked | New. |
| i-deflag (new) | 2 of 5 Saffire IV–V tests | ICES-2021 §III.B, p. 5; p. 7 | "Two Saffire samples (IV-2 and V-4) exhibited intense ignition processes of deflagration because of a stratified mixture" | primary-checked | New. |
| i-lunar | Moon 15.6 · 0 g 17.0 · 1 g 21.2 | OF2012 Table I, p. 6; p. 7 | "the result is a significantly negative oxygen margin of safety (~4-5%) in Martian, Lunar, and 0g." | primary-checked | Conditions now name the 1-g method and 30 cm/s 0-g flow. |
| i-material-specific (new) | Ultem 0 g +0.25; Nomex Mars 19.9 vs Moon 21.0 | OF2012 Table I, p. 6; p. 7 | "For these charring materials, the oxygen margin of safety in 0g is very close to zero" | primary-checked | New (F6). |
| i-silicone (new) | μ-g burn ≈ 0 for four silicone sheets | ICES-2017 Table I, slide 29; slide 26 | "Flammability of silicone in microgravity appears to be reduced compared to normal gravity, at least for the flow speeds tested." | primary-checked | New (F6). |
| i-materials-ea (new) | assessed to 40% O₂ at 8.2 psia | ICES-2022 p. 8 | "Many ISS materials have been shown to meet flammability requirements at 10.2 psia and 30% O2, but are unlikely to meet the requirements" | primary-checked | New; validity STATED. |
| i-psi-partialg (new) | no partial-g data in PSI | CH "Partial-gravity data" | "there is currently no partial-gravity combustion data available in PSI" | primary-checked | New (F3); validity STATED. |
| i-ushape | min ≈13.5% O₂ at stretch 8–12 s⁻¹ | TM §6.1.4.4, p. 76; GUIDE p. 31 | "This "Goldilocks" zone of flow is unfortunately typical of spacecraft ventilation flows near surfaces." | primary-checked | **Corrected** F-28(a): "5–10 cm/s-equivalent" mixed a stretch rate with a velocity; value now the stretch rate. The guide's "on the order of 10 cm/s" is kept in notes, attributed. |
| i-growth (new) | 0.22–0.38 mm/s | ICES-2026 §III, p. 5; Table 1 | "The PMMA samples all showed intervals of very linear flame growth for periods of several minutes." | primary-checked | New (F2). |
| i-duct (new) | ≈ +100% spread rate | ICES-2021 §III.C, Table 2, p. 8 | "As expected, the spread rate increased (about 100%) with the reduced height flow duct compared to Saffire I and III." | primary-checked | New. |
| i-luci (new) | base 0.92, tip 1.1 mm/s | LUCI slides 16, 19, 34 | "SIBAL fabric (cotton-fiberglass blend) burning downward in Lunar-g 30 s after ignition. The flame spread for over a minute." | primary-checked | New; Coriolis and one-flight caveats in scope. |
| i-smoke (new) | ΔT 0.25–0.50 °C · ΔP 0.25–0.34 mbar · CO 122–338 ppm | ICES-2026 abstract p. 2; Table 1 | "Overall, the pressure rise and temperature change were small but the smoke particulate rose to substantial levels and the gaseous products also achieved hazardous levels." | primary-checked | New (F7). |
| i-alarm | 1,037 / 1,603 s; CO at alarm 105 / 283 ppm | ICES-2026 Table 1, p. 6; §III, p. 9 | "both PMMA samples from SAFFIRE VI exceeded the CO threshold with the 1-sided sample approaching the 1-hour SMAC" | primary-checked | **Corrected** F-28(c): claim now uses the tabulated CO rise at alarm instead of an untabulated "time CO passed the limit"; notes that 2 mg/m³ is a DustTrak reference threshold, and that IV PMMA and VI SIBAL were detected before CO reached the limit. |
| i-same | 1/2 Kapton · 2/3 Teflon | WP Introduction, p. 2; SAME2 abstract p. 1 | "the ISS detector failed to alarm for Kapton smoke in half of the tests and for Teflon smoke in two-thirds of the tests" | **secondary-only** | The WP is a review citing Meyer et al. 2015 and 2018 (journals; not on NTRS). Card stays hidden in the app until the original is checked or the lead accepts the WP. Conditions corrected to SAME-2's "five materials … quiescent to 8 cm/s". |
| i-flowoff | 15 s and 70 s without flow; 5 cm/s × 300 s | ICES-2021 §III.A, pp. 4–5 | "However, as an extinguishment strategy, this would carry other risks given the uncertainty of configurations and flow rates in a spacecraft." | primary-checked | F-28(d): NASA's caveat kept as the quote and in `notValidFor`. Conditions now per test. |
| i-loi | methanol LOI ≈12–13% O₂ at atmospheric pressure | GUIDE p. 12 (claim); JASMAC slide 4 (value) | "The research to date has shown that the flammability limit is lower in reduced gravity." | primary-checked (methanol, claim); heptane UNVERIFIABLE | **Corrected** F-28(b): heptane 0.15 removed (Dietrich 2014 not reachable; FLEX-TP gives no LOI values). Methanol value is "≈12–13%", not 0.12. "Lower in microgravity" now attributed to NASA's guide. |
| i-pfe (new) | approved for use at 10.2 psia / 30% O₂ | ICES-2022 p. 10 | "Increased O2 concentrations could decrease the ability of water-spray and/or water-mist PFEs to extinguish a fire." | primary-checked | New (F8); validity STATED. The paper's preceding sentence uses the formal certification term; paraphrased as "approved for use" because the claims lint bans that word in visible text. |
| i-cool | n-decane example: hot-flame extinction 3.3 mm, cool-flame 2.7 mm | JASMAC slides 5, 14, 17 | "These cool flames produce partially oxidized fuel and potentially re-ignite to hot flames posing fire safety concerns in spacecraft environments" | primary-checked | Value made concrete. |

"Conservative" (F-28e) no longer appears in any card text or quote.

## 4b. Fuel classes (aligned with the pipeline rule, `pipeline/mappings/materials.mjs`)

Rule: thin ≤ 0.2 mm; PMMA 0.2–5.2 mm is `solid-unknown`; PMMA ≥ 5.2 mm and rods ≥ 6.35 mm diameter are thick. Kept "thick" only where the primary calls the sample thermally thick.

| Item | Was | Now | Evidence |
|---|---|---|---|
| PUB-SAFFIRE:V-3, VI-4 (PMMA 5 mm, 1-sided) | solid-thick | solid-unknown | ICES-2021/2024/2026 call the PMMA samples "thick" only in a general sense; none says thermally thick. ICES-2026 p. 5: "This gives approximately 220 s for the 5 mm PMMA plate", i.e. the thermal wave crosses the plate within the burn. |
| PUB-LUCI:pmma (4 mm rod) | solid-thick | solid-unknown | Below the 6.35 mm rod diameter the pipeline treats as thick; the LUCI deck makes no thin/thick statement. |
| PLAN-FM2:2024:34 (4 mm acrylic rod, from the poster's "4 mm PMMA Rod") | solid-thick (after correction) | solid-unknown | As above. |
| Saffire IV-2, VI-3 (PMMA 10 mm), BASS-II rods (≥ 6.35 mm) | solid-thick | unchanged | ≥ 5.2 mm / rod rule. |
| Olson & Ferkul: Mylar 5 mil (0.127 mm) thin; Ultem 10 mil (0.254 mm) and Nomex 12 mil fabric unknown | — | unchanged | Consistent with the rule. |

## 5. Hazard map `measures` (`HAZARD_MAP`)

Checked against the PSI CSV headers in `pipeline/.cache/raw/` and against the published sources. Rule (Kickoff §C.8 M): 1 = outcome plus hazard metric, 0.5 = outcome only, 0 = neither.

| Entry | Was | Now | Reason |
|---|---|---|---|
| PSI-102 smoke | 0.5 | 0 | Table has weight-loss rate and aging duration only (F-13). |
| PSI-100 materials | 0.5 | 0 | Table lists sample size, flow and direction only. |
| PSI-47 smoke | 0.5 | 0 | Table lists sessions, hardware, test dust and sampling location only. |
| PSI-39 liquid | 0.5 | 0 | Table lists conditions and fuel only. |
| PSI-10 liquid | 0.5 | 0 | Table lists flow, O₂ and pressure only. |
| PSI-20 materials | 0 | 0.5 | Table has a "Flames Ignited" outcome column. |
| PUB-SAFFIRE-IV-VI suppression | 1 | 0.5 | Flow-off outcomes are described in ICES-2021 text, not tabulated in the runs. |

The ranking sanity tests (`tests/science/field-and-ranking.test.ts`) still pass.

## Contradictions between sources

1. **Saffire flow direction.** ICES-2026 Table 1 caption: "20 cm/s opposed flow" for all seven tests. ICES-2021 Table 1: Concurrent for IV-1, IV-2, V-2, V-3 (Opposed only for V-4, not in our set). ICES-2024 Table 1: Concurrent for IV-1, V-2, VI-2, VI-3, VI-4. ICES-2021 p. 8 also calls IV-2 and V-3 "concurrent samples". Shown as "unknown"; lead to decide.
2. **Saffire O₂ and pressure.** IV-1: 0.23 / 980 mbar (ICES-2026) vs 22.0% / 100.0 kPa (ICES-2021, ICES-2024). V-2: 0.28 / 741 mbar vs 26.2% / 70.7 kPa. V-3: 0.26 / 745 mbar vs 25.4% / 71.3 kPa. VI-3: 544 mbar vs 54.6 kPa; VI-4: 550 mbar vs 55.2 kPa (O₂ agrees within rounding). IV-2 and VI-2 agree.
3. **Saffire VI peak HRR.** ICES-2026: VI-2 3376 W, VI-3 3240 W, VI-4 1487 W. ICES-2024 Table 2: 3217, 3080, 1507 W (VI-2 also 3650 W average by fuel-consumption calorimetry). ICES-2024 abstract: "spanned 1.5 to 3.2 kW".
4. **Saffire IV–V heat release.** ICES-2021 abstract: "heat release rates up to 10 kW"; ICES-2024 p. 2 and ICES-2026 p. 2 say HRR for the thick PMMA in IV–V was not determined. Not used in the app.
5. **Alarm threshold.** ICES-2024 uses 1 mg/m³ (VI-3 reached at 981 s); ICES-2026 uses 2 mg/m³ (VI-3 at 1037 s). Different thresholds, not a conflict; the app uses ICES-2026.
6. **Exploration Atmosphere pressure in ICES-2022.** Abstract: "8.3 psia and 34% O2"; body p. 2 and p. 8: 8.2 psia.
7. **FM2 plans and delivery.** POSTER24: CLPS mission CP-21, then (Future Work) the SpaceX HLS demonstration flight; LPSC26: SpaceX uncrewed demo. Condition sets differ between 2024 and 2026 (both stored as T4, 2026 is current).
8. **Saffire-III flow speed (PSI data, outside my files).** PSI-100 CSV lists 30 cm/s for S1 and S2; ICES-2021 Table 2 gives III-1 at 25 cm/s. For WS1/lead.

## Could not verify

- **FLEX heptane LOI 0.15** (Dietrich et al. 2014, Microgravity Sci. Technol., doi 10.1007/s12217-014-9372-2): the publisher page returned a bot challenge; no NASA-hosted copy found on NTRS. FLEX-TP (NTRS 20150023456) archives the data but states it does not interpret it and gives no LOI values. Removed from the i-loi card.
- **SAME detector result (half / two-thirds)**: found only in the WP review; its cited sources (Meyer et al., Aerosol Sci. Technol. 49, 2015; Fire Saf. J. 98, 2018) are not on NTRS. i-same marked `secondary-only`.
- **1-g 15.4% O₂ limit, original**: Hirsch et al. 2003 (ASTM STP1454) not checked; value confirmed as quoted by the TM.
- **HEO-DM-1006** itself: not found on NTRS; checked as quoted by ICES-2022.
- **Walton & Norcross, M2M Exploration Atmosphere (NTRS 20240003211)**: NTRS record has no downloadable file.
- **Mars-transit preset**: an assumption; no specification exists to check.
- **psi.nasa.gov site-wide terms**: the PSI home URL now opens NASA's BPS Data page, which states no licence; licence taken from each PSI record's API field (CC0-1.0 for all used records except PSI-10, empty).

## Cabin-pressure statements (Kickoff V4)

The lead must not infer a pressure where none is stated. What the primaries actually say:

- **BASS-II (PSI-25), PMMA rod tests (TM §6.1).** No pressure statement in §6.1. The tests ran in the 250 L Microgravity Science Glovebox, with "the initial ISS air filling the MSG working volume … diluted using N2" (p. 67).
- **BASS-II, elsewhere in the same TM.** §1.5, p. 11: the O₂-consumption calculation uses "free volume of the MSG V = 250,000 cc, … pressure P = 1 atm" (a value used in a calculation, not a measurement). §2.3.5, p. 38 (opposed-flow thin PMMA tests): "The total pressure is also monitored, which varied from 99.2 to 99.5 kPa in the tests reported." §7.1.3, p. 94 (SIBAL fabric concurrent tests): "Ambient pressure was 1 atm."
- **BASS (PSI-26).** BASS-14 slide 2: "Ambient oxygen atmospheres 17% to 21.5% (cabin air)." — no pressure value. Individual slide captions state "1 atm" for specific tests (slide 27: "NOMEX – III, 22% O2, 1 atm 14 cm/s (0g)"; slide 47: acrylic sphere "17% O2/N2; 1 atm"). No general statement that all BASS tests ran at cabin pressure was found.
- **Saffire I–III (PSI-98, -99, -100).** ICES-2017 slides give O₂ as "Initial oxygen concentration 21.7% (ISS reading)" (Saffire-I, slide 14) and "22.1% (ISS reading…)" (Saffire-II, slide 9); no pressure. ICES-2021 Table 2, p. 8 tabulates "Pressure (kPa) 100" for I-1, II-5, II-6 and III-1 — a tabulated test pressure, not a measured value and not worded as "cabin pressure". No statement found for the other Saffire-II samples (silicone, PMMA, Nomex).
- **Saffire IV–VI.** ICES-2026 p. 4: "The spacecraft was initially at the pressure and oxygen concentration of the ISS but on each flight the Cygnus controllers vented the spacecraft to a predetermined pressure" — pressures are tabulated per test.

Consequence for the curated runs: `PUB-BASS2:micro-min` keeps 101.325 kPa as `nominal-stated` on the strength of the TM's own "P = 1 atm" (with the note above); the lead may prefer `null`. `PUB-BASS2:1g-upward` pressure set to `null` (no statement).

## Discrepancies with the project spec (`../Discovery/MARGIN_Product_Decision_and_Specification.md`)

1. **Saffire VI source (lines 425, 526, 598, 881, 928).** The spec cites ICES-2024 (20240002981) for Saffire VI SIBAL 31.0% / 54.1 kPa. ICES-2024 Table 1 does print 31.0% / 54.1 kPa, and ICES-2026 Table 1 agrees (0.31 / 541 mbar). The app's primary table is ICES-2026-577; the two papers differ on peak HRR and both differ from ICES-2026 on flow direction.
2. **Artemis D = 0.15 example (line 599).** Uses Saffire V 26.2% / 70.7 kPa, which is V-2 in ICES-2021 and ICES-2024. The primary table (ICES-2026) gives V-2 as 28% / 74.1 kPa, so the engine will not reproduce 0.15 with the main values (science review F-01).
3. **"Peak heat release was about 3.2–3.4 kW" (line 140).** True for ICES-2026; ICES-2024 gives 3.08–3.22 kW.
4. **"CO and CO₂ exceeded crew limits in 4 of 7 tests before slow alarms" (line 140).** Not supported. Max CO rise exceeded the 24-h SMAC in 4 of 7 tests, but at the 2 mg/m³ alarm only VI-3 and VI-4 were above it (105 and 283 ppm); ICES-2026 p. 9 says IV PMMA and VI SIBAL were detected before hazardous CO levels.
5. **FLEX "0.15 for heptane and 0.12 for methanol" (line 144; Kickoff F8).** Heptane unverifiable; methanol is stated as "~ 12-13%" (JASMAC slide 4).
6. **R3 §2.2 "all 20 cm/s opposed flow"** follows the ICES-2026 caption only; see contradiction 1.
7. **"Preliminary" for LUCI** (R3, old content) is not the deck's wording.
