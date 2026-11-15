# MARGIN data pipeline

Two scripts turn NASA PSI's public combustion-science data into `data/generated/snapshot.json`,
which ships to the browser. Published (T3) and planned (T4) values do **not** come from here; they live in `content/`.

```
pipeline/fetch-psi.mjs   PSI JSON backend → pipeline/.cache/raw   (network; run rarely)
pipeline/build-data.mjs  .cache/raw → data/generated/snapshot.json (offline, deterministic)
pipeline/mappings/materials.mjs  material text → fuel class (reviewed rule, below)
```

## Re-running

```bash
npm run data:build        # normalise the cached files (no network)
npm run data:fetch        # only if the cache is missing or must be refreshed; skips files already cached
npx vitest run tests/data tests/science
```

`build-data.mjs` is deterministic: two runs on the same cache give byte-identical JSON apart from `generatedAt`.
The raw cache (`.cache/raw`, 24 records + 22 CSVs + `manifest.json`) is the provenance for every run; do not edit it.

## Endpoints (PSI JSON backend, open, no login, CC0)

| Purpose | Request |
|---|---|
| Accession list | `GET https://psi.nasa.gov/geode-py/ws/repo/search?term=&from=0&size=100&ffield=Research%20Area&fvalue=combustion%20science` (24 hits) |
| Investigation record | `GET https://psi.nasa.gov/geode-py/ws/repo/investigations/{PSI-n}` (slow: ≥120 s timeout, 2 s between calls) |
| File download | `GET https://psi.nasa.gov/geode-py/ws/studies/{PSI-n}/download?file=<file_name>&redirect=false` → presigned S3 URL (≈1 h) → `GET` it |
| Human landing page (used as `source.url`) | `https://psi.nasa.gov/physci/repo/data/investigations/{PSI-n}` |

The fetcher drops the bulky `added/modified/removed` file-delta lists from each record (counts kept) and downloads every
file listed in `experimentalTable[]`. CORS only allows psi.nasa.gov, so fetching happens at build time only.

## Output shape

Top-level keys: `generatedAt, fetchedAt, notice, counts, tableStats, investigations, runs, summaries`.
`runs[]` follow `lib/schema` `Run`; additive fields: `materialGroup` ("wax-candle") on some solid runs.
`investigations[]` follow `Investigation` plus `psiVersion, psiModified, acronymSource` and, where relevant,
`platformNote, licenseNote, flowRegimeNote`.

`counts` (all computed): `totalRuns` (1,870), `distinctRuns` (1,828; excludes `duplicate-row`), `duplicateRows` (42),
`placeable` (887: ambient O₂ recorded, the engine's gate condition), `plottable` (857: O₂ **and** pressure),
`totalSummaryRows` (130), solid-run figures, `burnerFedOxidizerRuns` (274), `nominalPressureRuns` (218),
`skippedNonRunRows` (9), `blankLinesIgnored` (861), `byInvestigation`, `byFuelClass`, `byFlag`.
`tableStats[]` per CSV: `dataRows, kept, skippedNonRunRows, skipped[] (row + reason), rawLines, blankLines, duplicates,
withO2, withPressure, withFlow, plottable, columns`.

### Row accounting

| Table | non-blank data rows | runs | notes |
|---|---|---|---|
| FLEX (PSI-69) | 274 | 274 | |
| CFI (PSI-39) | 87 | 87 | rows 80–87 are exact duplicates of rows 23–30 (79 distinct) |
| CFI-G normal / inverse (PSI-159) | 179 / 154 | 179 / 154 | inverse file has 861 trailing blank lines (1,016 lines) |
| Flame Design normal / inverse (PSI-10) | 207 / 120 | 207 / 120 | |
| BASS-II (PSI-25) | 129 | 129 | |
| BASS (PSI-26) | 122 | 121 | "SOOT Cleaning" is a maintenance row, not a burn |
| SPICE (PSI-107) | 469 | 469 | 34 exact duplicates (435 distinct) |
| SAME / SAME-R (PSI-102 / 101) | 8 / 109 | 8 / 109 | |
| Saffire I / II / III (PSI-98/99/100) | 4 / 15 / 2 | 2 / 9 / 2 | flow-visualisation rows and "Note n" rows skipped |
| **Total** | **1,879** | **1,870** | prototype figure "1,871" = 1,879 − 8 Saffire non-run rows |
| Summary tables (8 files) | 130 | 0 | stored in `summaries`, never runs |

## Normalisation rules (Kickoff §C.3, as implemented)

1. **Decoding.** UTF-8 (fatal) else windows-1252 (FLEX). BOM stripped. Blank lines ignored and counted.
2. **Originals kept.** `original` holds every non-empty raw cell verbatim. Every numeric conversion is logged in
   `conversions[]` with its formula.
3. **Units.** mmHg ×0.133322, atm ×101.325, bar ×100 (psia ×6.894757, mbar ×0.1 available). Mole fraction ×100. kPa rounded to 3 dp.
4. **Text cells.** `~ x` → x + `approximate`; `x unit` → x + `text-parsed`; a range `a - b` / `a to b` → **first value** a
   + `approximate` + `text-parsed` (never a midpoint; both ends stay in `original`).
5. **Nulls, never invented.** Blank / "n/a" / "none" / "-" / "RAMPED" / "Insignificant" → null + `missing`; `-999` → null + `sentinel`
   (for any axis or measure); pressure ≤ 0, O₂ ≤ 0 or > 100, negative flow → null + `out-of-range` (with a note).
6. **Closed-chamber O₂ check (BASS-II).** final O₂ > initial + 1, or |final − initial| > 5 points → `out-of-range`, note, and the
   final value is not stored as a measure (it stays in `original`). Initial O₂ is the run's O₂.
7. **Nominal (stated) pressure.** Only where a cabin-pressure statement exists: BASS-II (PSI-25) and Saffire-I (PSI-98),
   101.325 kPa, `pressureBasis: nominal-stated`, flags `nominal-value` + `unverified-transcription`. No verbatim quote is
   available locally (PSI records do not state it; Discovery R3 summarises the papers), so the statement is a labelled
   paraphrase in `note` and `source.quote` is left empty. **Saffire-II, Saffire-III and BASS stay null.**
8. **Set-point pressure (CFI).** "1 atm" etc. are table set points → 101.325 × n kPa, `nominal-stated`, `nominal-value`, `text-parsed`.
9. **Quiescent experiments (FLEX, CFI, CFI-G, Flame Design).** No ambient-flow column and no flow value in the PSI record, so
   `flowCmS = null`, `flowRegime = "quiescent"`, flag `assumed-value`. The PSI record does not use the word "quiescent"; the
   regime comes from the design (droplets on fibres / spherical burners in a closed chamber) and the investigation's
   `flowRegimeNote` quotes the record. The engine treats regime `quiescent` exactly as flow 0.
10. **Inverse flames (CFI-G, Flame Design).** XO₂ is the burner-fed oxidizer stream, not the chamber atmosphere:
    `o2Pct = null`, flag `burner-fed-oxidizer`, value kept as `measures.oxidizerXO2`.
11. **Saffire-II O₂** is "derived from measured CO₂ production" (table Note 1) → flag `derived-value`.
12. **Duplicates.** Rows identical in every cell are kept and flagged `duplicate-row` with a note naming the first occurrence.
13. **Outcomes** use the Kickoff enum: FLEX Extinction/Disruption/Completion → extinguished/disruption/completed;
    CFI-G SE → self-extinguished, FT → flow-terminated, no hot ignition → not-ignited, "flash" → other;
    Saffire numeric burn time > 0 → ignited (burn time in `measures.burnTime`), "Insignificant" → other.
14. **Computed quantities** (Tad) go to `measures` labelled "computed (as reported in PSI)".
15. **Fuel class** (`mappings/materials.mjs`, a Kickoff [DECIDE] item):
    - `solid-thin`: SIBAL / cotton fabric; any film or sheet with stated thickness ≤ 0.2 mm.
    - `solid-thick`: rods (≥ 6.35 mm), spheres / spherical sections, PMMA with stated thickness ≥ 5.2 mm.
    - `solid-unknown`: everything else, including **PMMA 0.2–5.2 mm** (R3 §2.1 puts the thermal thin/thick transition at
      ≈5.2 mm, so the Kickoff draft's 1 mm cut is not supported), slabs without a thickness, Nomex, Ultem, silicone, mixed
      samples, blank material cells, and wax/candles (`materialGroup: "wax-candle"`).
    - Set `THICK_MIN_MM = 1` to restore the Kickoff draft rule. Current counts: thin 62, thick 106, unknown 95.
16. **Investigations.** Acronym from the record; when empty, a short name derived from the record title
    (`acronymSource: "derived-from-title"`: PSI-60, 62, 115, 117, 142). Empty licence → `license: null` +
    `licenseNote: "Licence not stated in PSI record"` (PSI-10). Platform `Not Applicable` → project type.

## Known data issues (not fixed in the data; disclosed)

- **BASS-II flow** is an uncalibrated fan/air display; `Fan calibration data.xlsx` is not in the cache → flow null, `ambiguous-unit`.
- **Saffire-I / III thickness** is labelled cm (0.37 / .33 cm) but is almost certainly mm → `suspect-unit` note; not used.
- **Saffire-II thickness** "037 mm" (no decimal point) → not used. Two Saffire-II rows have a blank material cell (2-6, 2-9).
- **Saffire-II / III cabin pressure** not recorded and no quotable statement → null. This makes Saffire-II a partial
  (O₂ + flow) match, which can look closer than complete matches (see `docs/reviews/methodology-review.md`).
- **Saffire platform.** PSI's platform field says ISS for Saffire-I and III; the record text says the burn was on Cygnus after
  it left the ISS → `platformNote`.
- **FLEX** column "CO initial ambient composition" is CO₂ (the suppressant; O + N + CO + He sum to 1) → `measures.co2` with a
  conversion note. "Burning rate; mm" has an implausible unit → kept as labelled with `suspect-unit`.
- **SAME rows 5–8** say "same conditions as 1-4" (two flows were used) → material kept, flow null.
- **SAME / SAME-R / SPICE / BASS** record no O₂: never placeable on the O₂ axis.
- **Duplicates:** SPICE 34, CFI 8 exact duplicate rows (flagged, not removed).
- Flame Design inverse rows with "RAMP" cells have no oxidizer XO₂ value.
