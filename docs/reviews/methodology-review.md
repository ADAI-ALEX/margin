# MARGIN — independent methodology review

Reviewer: methodology / data-pipeline workstream. Date: 2026-11-14 (after lead commit `17bc62a`).
Scope: `lib/engine/*` (distance, gate, verdict, robustness, rank, field, sensitivity), `lib/schema`, `lib/data`,
`pipeline/*`, `data/generated/snapshot.json`, `content/curated.ts` (read only), against Kickoff Pack §C.3–§C.10 and §H.
Method: re-derived each rule from the Kickoff text; hand arithmetic for 8 real cases (below); independent tests in
`tests/science/*` (hand formula in `tests/science/hand.ts`, no engine constants imported) and `tests/data/*`
(independent CSV re-parse). Engine files were not edited; proposed diffs are in §4.

Severity: **BLOCKER** = must be resolved (or disclosed exactly as stated) before the hero flow is shown;
**MAJOR** = materially misleading or non-compliant with a locked rule; **MINOR** = accuracy / robustness.

---

## 1. Spec vs code

| Rule (Kickoff) | Code | Verdict |
|---|---|---|
| dO₂ = ΔO₂/2.0 pts; dP = ln(Pr/Ps)/ln 1.25; dU = ΔU/5.0; D = √(Σ w·d²), w = 1 (§C.5) | `distance.ts` | ✔ matches; golden tests incl. wO₂ = 4 → 2 |
| Missing axis excluded, `partialMatch`, complete before partial at equal D | `distance.ts`, `sortScored` | ✔ (tie-break tested) |
| Quiescent vs ventilated = categorical, dU not computed, `flow-regime-mismatch` | `distance.ts` | ✔; also natural-convection run vs forced flow (documented extension); regime `quiescent` with null speed ≡ flow 0 (tested) |
| DIRECT ≤ 1, NEAR ≤ 2.5 inclusive, NONE if nothing comparable | `classify` | ✔, 1e-9 tolerance (1.0000000000000002 → DIRECT, 1.0000001 → NEAR) |
| Robustness: 3³ = 27 combos of ½,1,2 per scale | `robustness.ts` | ✔ (each (a,b,c) once; per-cell D = hand value) |
| Gate (a) fuel relevance per hazard; (b) gravity equality | `gate.ts` | ✔ with lead extensions: O₂ required ("placeable"), limits separated, smoke = smoke-source or solids with alarm data. Suppression broader than spec (m-5) |
| No cross-gravity distance | `distance()` throws; gate returns `other-gravity` first | ✔ (all 12 cross pairs throw; 3,456-scenario grid never mixes regimes) |
| T4 never evidence; T3 only with toggle | `gate.ts`, `rank.ts` | ✔ (grid test incl. context / other-gravity / limits lists) |
| R = 100·(0.40P + 0.20H + 0.15S + 0.15C + 0.10M), renormalised; P = e^(−Dmin); ties Dmin then accession | `rank.ts` | ✔; no-comparable rows sorted last (F-08 fix verified on every preset × regime × toggle). Accession tie-break is lexicographic, not numeric (m-7) |
| Field: same formula per grid node, scenario flow fixed | `field.ts` (17bc62a) | ✔ per-run flow term = (ΔU/5)² or 0 when flow not compared, identical to `distance()` (tested for every comparable run of 5 scenarios). Now omits runs without pressure (M-4, fixed) |

## 2. Hand calculations (real data; reproduced by `tests/science/anchors.test.ts`)

Preset pressures: ISS 14.7 psia × 6.894757 = 101.35 → 101.4 kPa; Artemis 10.2 → 70.3; EA 8.2 → 56.5. ln 1.25 = 0.223144.

1. **EA (34 %, 56.5 kPa, 10 cm/s), micro, materials, + published → Saffire VI-2 (31 %, 54.1 kPa, 20 cm/s):**
   dO₂ = (31 − 34)/2 = −1.5 → 2.25; dP = ln(54.1/56.5)/0.223144 = −0.04341/0.223144 = −0.1945 → 0.0378; dU = (20 − 10)/5 = 2 → 4.
   D = √6.2878 = **2.5076 DISTANT**. At 20 cm/s: √2.2878 = **1.5126 NEAR**.
   Flip: dU² = 6.25 − 2.2878 = 3.9622 → dU = 1.9905 → U* = 20 − 5·1.9905 = **10.047 cm/s**.
   Flow contributes 4.00 of 6.29 in D² (64 %). Robustness at 10 cm/s: 9 NEAR / 18 DISTANT, D 1.25–5.02.
2. **EA, PSI only:** Saffire-II 2-2 (`~ 22.1`, `20 cm/s`, pressure not recorded): √(((22.1 − 34)/2)² + 2²) = √(35.4025 + 4) =
   **6.2771 DISTANT (O₂ + flow only)**. Best complete match Saffire-I S1 (`21.5 - 21.7` → 21.5, nominal 101.325, 20):
   dP = ln(101.325/56.5)/0.223144 = 0.58409/0.223144 = 2.6176 → √(39.0625 + 6.8516 + 4) = **7.065**. BASS-II 22.2 % at
   nominal 101.325 (no flow): √(34.81 + 6.8516) = 6.455. (The prototype's 6.455 anchor is now superseded by 6.277.)
3. **ISS (20.9 %, 101.4, 10), PSI only:** BASS-II r0100 (20.9 %, nominal 101.325, flow not usable): dO₂ = 0,
   dP = ln(101.325/101.4)/0.223144 = −0.00332 → **D = 0.0033 DIRECT (O₂ + P only)**. Best complete: Saffire-I S1:
   √(0.3² + 0.0033² + 2²) = **2.022 NEAR**.
4. **Moon, PSI only:** no T1 run is lunar (all 1,870 are `micro`) → **NONE**. Moon + published, EA: LUCI PMMA rod
   (20 %, 101.325 kPa, natural convection → flow not compared): √(((20 − 34)/2)² + 2.6176²) = √(49 + 6.852) = **7.473 DISTANT**.
   ISS at Moon + published: √(0.45² + 0.0033²) = **0.450 DIRECT** (single preliminary flight, O₂ + P only).
   Olson & Ferkul ULOI* points are in `limits`, never nearest (Ultem lunar point at the scenario gives D_limit = 0, verdict unchanged).
5. **Liquid, ISS:** FLEX r0202 (760.2 mmHg × 0.133322 = 101.351 kPa, x_O₂ 0.21 → 21 %): dO₂ = 0.05, dP = ln(101.351/101.4)/0.223144 =
   −0.00215 → **D = 0.0500 DIRECT**, flow not compared (quiescent droplets vs 10 cm/s). Liquid, EA: FLEX r0037 (534.3 mmHg →
   71.234 kPa, 34 %): dP = ln(71.234/56.5)/0.223144 = 1.0385 → **1.0385 NEAR**.
6. **Artemis (26.5 %, 70.3, 10), + published → Saffire V-3 (26 %, 74.5 kPa, 20):** √(0.25² + (ln(74.5/70.3)/0.223144)² + 2²) =
   √(0.0625 + 0.0676 + 4) = **2.032 NEAR**; 20 cm/s → √0.1301 = **0.361 DIRECT**.
7. **Artemis, PSI only:** 10 cm/s → BASS-II 22.2 % @ 101.325: √(2.15² + 1.6382²) = **2.703 DISTANT**. 20 cm/s → Saffire-II
   22.1 %, no pressure, flow gap 0: √(2.2²) = **2.200 NEAR**; the same run at a cabin-like pressure would be 2.74 DISTANT.
8. **Smoke, ISS, PSI only:** 117 SAME/SAME-R runs, none records O₂ → gate "No O₂ recorded — not placeable" → **NONE**.
   + published: Saffire IV-2 (22 %, 100 kPa, 20, alarm 1,083 s): √(0.55² + (ln(100/101.4)/0.223144)² + 2²) = **2.075 NEAR**.

## 3. Findings

| ID | Sev | Finding | Evidence | Recommended fix |
|---|---|---|---|---|
| B-1 | **BLOCKER** (disclosure) | The hero verdict (EA + published) is decided by the *assumed* default flow, not by O₂ or pressure. At 10 cm/s it is DISTANT by 0.0076 D-units; it flips at 10.047 cm/s. The flow term is 64 % of D². Saffire VI's own flow history/direction is unverified (content V5). | Calc 1; `flowSensitivity` crossing 10.047 (tested). | Do not tune constants. Verdict card + narration must say: "DISTANT (2.51) — mainly because Saffire VI ran at 20 cm/s and your default is 10 cm/s; NEAR from 10.05 cm/s". Never narrate "NEAR" at the default. Show the flow sensitivity strip (lead's `flowSensitivity`) next to the hero verdict. |
| M-1 | MAJOR | **A 2-axis match always looks at least as close as a 3-axis match**: a missing axis contributes 0 (i.e. it is silently assumed to match). The headline verdict is not qualified and robustness reports "Robust" because it never varies that axis. Cases: ISS PSI-only DIRECT 0.003 (complete best 2.02 NEAR; 27/27 "robust"); EA PSI-only nearest is Saffire-II *because* it lacks pressure (6.28 vs 7.07 complete); Artemis PSI-only @20 cm/s NEAR 2.20 only because Saffire-II pressure is null (2.74 otherwise). Not inferring pressure (correct) thus makes verdicts *more favourable*. | Calcs 2, 3, 7; `golden.test.ts` "PARTIAL MATCH CAN LOOK CLOSER". | Keep the locked rule but qualify it: engine diff D-1 adds `qualifier` and `verdictComplete`; D-2 adds partial-cell count to robustness. UI must show an "axes compared: O₂ + pressure" chip next to every D, show `nearestComplete` beside a partial nearest, and say "Robust on O₂ + pressure only" when every robustness cell was partial. |
| M-2 | MAJOR | **Regime mismatch is reported as proximity.** Every liquid-fuel comparison is quiescent-droplet vs ventilated scenario: flow is never compared and no complete match exists, yet ISS/legacy/Artemis show DIRECT and robust. Same for the lunar case (LUCI natural convection): ISS @ Moon + published = DIRECT 0.45 from one preliminary flight. | Calcs 4, 5; `anchors.test.ts` Case 5. | D-1 `qualifier: "flow-regime-mismatch"`. Copy: "compared on O₂ and pressure only — tests were quiescent / buoyant, your scenario is ventilated". Consider capping the displayed class at NEAR when `qualifier` is set (product decision; would change locked semantics). |
| M-3 | MAJOR | §C.8 sanity "EA + materials + published: BASS-II in top 3" fails on real data: order is Saffire IV–VI 48.3, Saffire-II 40.1, Saffire-I 40.0, **BASS-II 34.1 (#4)**. With P ≈ 0 (D 6.3–7.1) the order is set by S (Saffire 1.0 vs bench 0.6). Other assertions pass (CFI-G/SPICE not top 5; FLEX #1 for liquid on all presets; SAME-R/SAME top 2 for smoke on all presets). | `field-and-ranking.test.ts` (`it.fails`). | Lead decision: amend the §C.8 assertion to "top 4" with this rationale, or accept. Do not change weights to pass a test. |
| M-4 | MAJOR → **fixed** | Field painted coverage at every pressure from runs with no recorded pressure (Saffire-II: D = 0 at 22.1 % / 20 kPa @ 20 cm/s). | Fixed in 17bc62a (`omitted`); now tested. | Remaining disclosure: the map can disagree with the verdict when the nearest run lacks pressure (EA PSI-only: verdict 6.28 Saffire-II, map 6.45 BASS-II). Legend: "map drawn from N runs that record both O₂ and pressure; `omitted` runs used in the verdict only". |
| m-1 | MINOR | Robustness and field ignore axis weights (`evaluate(runs, s, scales)` uses default `w`). Harmless while weights are not user-editable. | code | Pass `w` through if axis weights are ever exposed. |
| m-2 | MINOR | `solid-unknown` stays comparable under thin/thick selection with no flag on the comparison (§C.5(a) "with a flag"). After the pipeline rule change, PMMA 0.2–5.2 mm is unknown, so a "thick" query admits 1–5 mm sheets. | gate.ts | UI: mark `solid-unknown` comparables "thickness class unknown". |
| m-3 | MINOR | Rank `C` (share of runs within NEAR) and `comparableRuns` count exact duplicate rows (CFI 8, SPICE 34). | data | D-3: skip `duplicate-row` in totals and counts. |
| m-4 | MINOR | Natural-convection run vs quiescent scenario (partial-g) drops flow silently (no flag). Defensible (buoyant flow is not forced flow) but undisclosed. | distance.ts | Add the mismatch flag in that case too, or document. |
| m-5 | MINOR | Suppression gate admits every solid (Saffire I/II/VI have no N₂ dilution or flow-reduction protocol); spec lists BASS-II O₂ reduction and Saffire IV–V. | gate.ts | Restrict via hazard map or a run-level `suppressionRelevant` flag; low impact (FLEX dominates). |
| m-6 | MINOR | T3 Saffire "PMMA 1-sided (0.5 cm)" (5 mm) is `solid-thick` in content, while the pipeline rule (cited 5.2 mm transition) makes 5 mm PMMA `solid-unknown`. | content vs mappings | Content owner: align, or the lead sets `THICK_MIN_MM`. |
| m-7 | MINOR | Accession tie-break is lexicographic (`PSI-10` < `PSI-100` < `PSI-25`). Deterministic, so acceptable. | rank.ts | Optional numeric compare. |
| m-8 | MINOR | `distance()` does not guard scenario P ≤ 0 (NaN). Covered by `clampScenario` in lib/state. | distance.ts | None needed if all callers clamp. |

## 4. Proposed engine diffs (lead to apply)

**D-1 (M-1, M-2) `lib/engine/verdict.ts`** — qualify the headline verdict.
```diff
 export interface Evaluation {
   verdict: Verdict;
+  /** Verdict of the best run compared on all three axes (NONE if there is none). */
+  verdictComplete: Verdict;
+  /** Set when the headline verdict rests on fewer than three compared axes. */
+  qualifier: null | "partial-missing-axis" | "flow-regime-mismatch";
   nearest: Scored | null;
@@
   const nearest = comparable[0] ?? null;
   const nearestComplete = comparable.find((c) => !c.d.partialMatch) ?? null;
-  return { verdict: classify(nearest?.d.D ?? null), nearest, nearestComplete, comparable, context, otherGravity, limits, excludedCount };
+  const qualifier = !nearest ? null
+    : nearest.d.flags.includes("flow-regime-mismatch") ? "flow-regime-mismatch"
+    : nearest.d.partialMatch ? "partial-missing-axis" : null;
+  return { verdict: classify(nearest?.d.D ?? null), verdictComplete: classify(nearestComplete?.d.D ?? null), qualifier,
+    nearest, nearestComplete, comparable, context, otherGravity, limits, excludedCount };
 }
```
**D-2 (M-1) `lib/engine/robustness.ts`** — say when "robust" only means "robust on the axes that exist".
```diff
-  cells: { o2: number; pressure: number; flow: number; verdict: Verdict; D: number | null }[];
+  cells: { o2: number; pressure: number; flow: number; verdict: Verdict; D: number | null; partial: boolean }[];
+  /** Cells whose nearest run was a partial match (missing axis or regime mismatch). 27 ⇒ robustness says nothing about that axis. */
+  partialCells: number;
 }
@@
-    cells.push({ o2: a, pressure: b, flow: c, verdict: e.verdict, D: e.nearest?.d.D ?? null });
+    cells.push({ o2: a, pressure: b, flow: c, verdict: e.verdict, D: e.nearest?.d.D ?? null, partial: !!e.nearest?.d.partialMatch });
@@
     cells,
+    partialCells: cells.filter((x) => x.partial).length,
   };
```
**D-3 (m-3) `lib/engine/rank.ts`** — count distinct runs only.
```diff
   for (const sc of ev.comparable) {
+    if (sc.run.flags.includes("duplicate-row")) continue;
     const k = sc.run.investigation;
@@
-  for (const r of runs) totals.set(r.investigation, (totals.get(r.investigation) ?? 0) + 1);
+  for (const r of runs) if (!r.flags.includes("duplicate-row")) totals.set(r.investigation, (totals.get(r.investigation) ?? 0) + 1);
```

## 5. What the UI must disclose (minimum)

1. Next to every D: the axes compared ("O₂ + pressure + flow" / "O₂ + pressure only — flow not recorded" / "flow regime differs").
2. When the nearest is partial: the best complete match and its verdict (ISS PSI-only: DIRECT 0.003 on O₂ + P; best complete 2.02 NEAR).
3. Hero: the flow sensitivity (DISTANT 2.51 at 10 cm/s; NEAR from 10.05 cm/s; NEAR 1.51 at 20 cm/s) and that the main gap is flow.
4. "Nominal (stated)" pressures (BASS-II, Saffire-I) are not measurements; Saffire-II/III pressure is not recorded and therefore not compared.
5. Liquid and lunar verdicts compare O₂ and pressure only (quiescent droplets / buoyant flames vs a ventilated scenario).
6. The coverage map is drawn only from runs that record both O₂ and pressure (count of omitted runs).
7. Limits (ULOI*, BASS-II limit points) are thresholds, listed separately, never "nearest evidence".
8. Counts: 1,870 PSI runs (1,828 distinct), 887 with ambient O₂, 857 with O₂ and pressure, 274 inverse-flame runs whose O₂ is the burner stream.

## 6. Data pipeline status (prior review items)

| Item | Status |
|---|---|
| F-05 inverse-flame O₂ | `burner-fed-oxidizer` flag on all 274; O₂ null; value in `measures.oxidizerXO2` |
| F-07 nominal pressure | Only BASS-II and Saffire-I; labelled paraphrase, no `source.quote`; Saffire-II/III null with note |
| F-12 thin/thick | Rule documented in `pipeline/mappings/materials.mjs` and README; PMMA 0.2–5.2 mm → unknown; blank material not inferred; "SOOT Cleaning" removed from runs; wax/candle `materialGroup` |
| F-14 quiescent flow | Speed null + `assumed-value`; regime `quiescent`; investigation `flowRegimeNote` quotes the PSI design text (PSI never says "quiescent") |
| F-16 outcomes | Kickoff enum; burn time in measures |
| F-17 ranges / derived O₂ | First value + approximate; Saffire-II `derived-value` |
| F-18 sentinels / final O₂ | Sentinel flag for any axis or measure; final O₂ checks flag 5 BASS-II runs (final 1.6, 0.6, 0.9 via |Δ| > 5; 39.1, 40.4 via > initial + 1) |
| F-19 FLEX CO→CO₂, burning rate | Conversion note; `suspect-unit` |
| F-20 duplicates | SPICE 34 (435 distinct) and, new, **CFI 8** (rows 80–87 = 23–30); flagged, not removed |
| F-21 platform / licence | `platformNote` (Saffire-I/III Cygnus quote); PSI-10 `licenseNote` |
| Accession-only names | PSI-60/62/115/117/142 short names from titles (`acronymSource`) |
