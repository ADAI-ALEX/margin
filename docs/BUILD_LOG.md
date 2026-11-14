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
