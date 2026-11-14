# MARGIN design exploration: product and UX review

Evaluated as specified in BRIEF.md, not as built. Numbers (6.46, 1.51, 22.2%) are the brief's illustrative outputs.

## 1. What is actually different

| | A CONSOLE | B ATLAS | C CASEFILE |
|---|---|---|---|
| Mental model | Read an instrument for one scenario | Look at a map of where evidence exists | Compare studies against a requirement |
| Primary object | Scenario | Coverage field (a place) | Investigation |
| Entry | Preset, then numeric stepper | Drag a pin or click a landmark | Edit a sentence |
| Central interaction | Tune, then watch gauges | Move, then read the margin notes | Pin 3 studies to the tray |
| Easy | Precise what-ifs, per-axis gaps | Seeing where evidence is and isn't, comparing atmospheres, gravity as separate regimes | Which studies, how they differ, provenance, model-validation picks |
| Hard | Seeing the whole gap, comparing atmospheres or studies | Exact entry, the flow axis, ranking studies | Seeing O₂ and pressure jointly, 30-second legibility, mobile |

**A and B converge.** Both are one scenario marker on one O₂ × pressure plane. They differ only in encoding (ellipses around the marker versus a global field) and input (numbers versus drag). C is the only paradigm with a different primary object.

To separate A from B, make A instrument-first. Demote the map to a small locator and put the verdict, the gap bars and the numeric inputs in the middle. Otherwise the decision is only a choice of encoding, and the encoding question (field versus ellipses) is easy to settle.

A and B also both match the saturated "O₂–pressure gap chart" pattern. B's computed field and C's ladder are the only departures from it.

## 2. Persona walk-throughs

**A CONSOLE**
- *Fire-safety engineer.* First 10 s: dense and credible, like a test-stand screen. Aha: the signed gap bars (O₂ −11.8 pts, pressure +79%). Friction: the 27-cell matrix has unlabeled axes. Misreading: the gap bars read as pass/fail "tolerance" gauges.
- *Grad modeller.* The map is useful, but the "nearest runs" table is hidden in a bottom drawer. No path to a dataset or export from the scenario view.
- *Professor.* Good for a live demo of one scenario. Poor for teaching what was tested, because there are no studies in the primary view.
- *Mission planner.* Presets work. Comparing the Artemis habitat with the Exploration Atmosphere means two states and memory.
- *SME judge, alone.* Parses in about 10 s, but it looks like every dark space dashboard. The aha (verdict plus gaps) is real but small.

**B ATLAS**
- *Engineer.* The notes sentence ("6.5 units away, mostly oxygen and pressure") is the most readable output of the three, and it carries footnotes. Friction: flow and material are in the toolbar, so the map silently changes. The third axis is the weakest part.
- *Grad modeller.* Weak. Dots belong to studies, but there are no study objects. Specimen cards give provenance but no filtering or export.
- *Professor.* Strong. It reads as a teachable "chart of what NASA has charted". The four gravity sheets are a ready-made slide.
- *Mission planner.* Best of the three. The landmark triangles let them see coverage at ISS, the Artemis habitat and the Exploration Atmosphere at once.
- *SME judge.* Aha within 10 s: a hatched hole where 34% O₂ sits. The paper look stands out. Danger: they read the hatched region as a hazard zone.

**C CASEFILE**
- *Engineer.* The sentence editor is clear. The ladder rewards a slow read and punishes a quick one. The claim ledger is the best trust device.
- *Grad modeller.* Strongest. The compare tray, run table with original values next to normalized ones, and the fingerprint answer "what can validate my model".
- *Professor.* Strong. Fingerprints and "what varied or held constant" answer the challenge text directly.
- *Mission planner.* Weak. It is a research tool, with no spatial sense of "where we are".
- *SME judge.* Slowest to the aha. Twenty-plus rows of tick strips take time. The empty O₂ column is a good punchline only if the solids group is isolated.

### Misreading risks (the central problem)
- **B's field is the highest risk.** A teal-to-paper ramp plus contour lines plus hatching is the visual grammar of a hazard or heat map. "Uncharted" hatching beside a labelled "Exploration Atmosphere" says "danger zone" to a quick reader.
  - Keep the ramp one hue, never red or ochre. The pin may be red-ochre, but no band may be.
  - Put the legend on the map itself: "Distance to nearest comparable test. Hatched = no test within D 2.5. Not a hazard map."
- **A's ellipses read as a radius of concern or a safe zone.** They are also a 2D slice of a 3-axis distance. Flow changes the "within D 1" set while the ellipse stays put. Say so in the legend, or drop the ellipses and shade the runs that fall inside.
- **A's gauges and 27-cell matrix look like risk instrumentation.** Replace the matrix with "DIRECT 0 · NEAR 9 · DISTANT 18 of 27" as a stacked bar.
  - "Sensitive" reads like fire behaviour. Use "verdict changes under ½×/2× scale assumptions".
- **C's ladder shows marginal strips.** An investigation can have ticks at the scenario's O₂ and at its pressure without any single run matching both. The strip then falsely says "covered".
  - Fix: draw a tick solid only if the run is within NEAR on the other axes, and ghost it otherwise. This is cheap, because the engine has the per-axis gaps.
- **"DIRECT" as a word** is the most dangerous term in the system. Always render it as "Evidence: DIRECT", and never let colour carry it.
- **"Evidence proximity, not a safety rating."** It lands only if it sits next to the verdict at body size and is not a footer. A and C put it in the verdict card. B has no verdict card, so it must go in the first sentence of the notes and in the map legend.

## 3. Scientific communication

- **(a) Coverage gap (solid tests stop at about 22%, Exploration Atmosphere 34%).** Ranking: B, then A, then C.
  - B shows it as a pin in an empty field. Landing on the hatched region is the message with no reading.
  - A shows it as a dot cloud ending short of an amber crosshair. This is the same picture, with less emphasis.
  - C can show it, but only if the gas and droplet rows (up to 85% O₂) are not on the same axis as solids. As specified, the O₂ column is full of ticks to 85% and the punchline is lost. Group by family and apply the fuel-class gate to the ticks.
- **(b) Gravity as non-interpolable regimes.** Ranking: B, then C, then A.
  - B's four physically separate sheets are the only design where the layout itself says "not a continuum". A near-empty Moon sheet is the strongest single image in the three.
  - C greys out PSI rows with "different regime", which is accurate but quiet.
  - A's dim-the-µg-layer interaction is a mode switch. It is honest but reads as filtering.
- **(c) Uncertainty and robustness.** Ranking: C, then B, then A.
  - C's claim ledger (typed badges plus one row of 27-combination counts) is the most defensible, and the one an SME will trust.
  - B's dashed ½×/2× envelope is the best spatial form, and the only one that shows how a band shifts. It is explained only in a legend and needs care.
  - A's matrix is the worst form: opaque, and it looks like a risk heatmap.

## 4. Competition fit

**30-second demo storyboards**

*B (most legible).*
- 0–4 s: map with PSI dots and a hatched hole, the hero sentence over it.
- 4–10 s: click the Exploration Atmosphere triangle. The pin lands in hatching and the notes read out the 6.5-unit gap.
- 10–15 s: toggle published evidence. Rings appear, the hatch retreats and the dashed envelope shows.
- 15–18 s: flow to 20 cm/s and the verdict changes ("honest sensitivity").
- 18–26 s: Moon sheet is almost empty. Mylar dot plot with the Moon point below both.
- 26–30 s: click a ring, see the specimen card with source, then the URL.

*A.*
- 0–4 s: console with the hero readout.
- 4–12 s: Exploration Atmosphere preset. The crosshair glides and the gauges swing.
- 12–18 s: published toggle, D 6.46 to 2.51.
- 18–26 s: gravity switch to Moon, panel slides in.
- 26–30 s: provenance.

There is too much on screen to read at 1080p in video compression.

*C (least legible).*
- 0–6 s: edit the sentence.
- 6–14 s: the ladder re-sorts.
- 14–24 s: pin two studies into the tray.
- 24–30 s: ledger.

Everything is correct, and none of it fits in 30 s. The Moon moment becomes a greyed block.

**Project-page screenshots**
- B yields three self-explanatory images: the map with the hatched hole, the four-sheet row, and the notes column with footnotes.
- C's compare tray and ledger are good for the Validity and Relevance paragraphs, but the ladder needs a caption.
- A yields one good screenshot (verdict plus gaps) and two near-duplicates.

**Five criteria**

| | A | B | C |
|---|---|---|---|
| Impact | 3 | 4 (planner view) | 3 |
| Creativity | 2 | 4 (field, gravity sheets) | 4 (ladder) |
| Validity | 3 | 3 (4 with the legend) | 5 |
| Relevance | 4 | 3 (no studies or ranking) | 5 (rank, compare, fingerprints) |
| Presentation | 3 | 5 | 2 |

**Differentiation from the R5 pattern.** C differs most, because "chat, habitat re-rank, gap chart" is investigation ranking plus a chart and C reframes the ranking as evidence strips. B differs in encoding, because it computes a field rather than plotting points. A is closest to the pattern, with only the gauges and matrix distinguishing it.

## 5. Risks

- **Build in ~33 h.**
  - A is lowest risk: standard panels and gauges.
  - B is medium. The field depends only on flow, material, gravity, published toggle and scales. It does not depend on the pin, so dragging is cheap. Recompute on those changes only.
    - Budget: 4 sheets × (default plus ½× and 2× envelope) at low resolution, with a worker or a coarse grid for the sheets.
    - Avoid recomputing on every pointer-move, and contouring 12 fields at full resolution.
  - C is medium to high: a per-run tick strip for 1,871 runs across 4+ columns, sorting, a compare tray and run tables.
- **Mobile.**
  - A and C collapse well, though C's ladder is cut to one column.
  - B's drag-the-pin fights page scroll on touch. Use tap-to-place with `touch-action: pan-y`, no drag on mobile.
- **Accessibility.**
  - A is small caps and 11 px text on dark.
  - B's contour field needs a table alternative or the specimen list.
  - C has thousands of tick marks. Use a real `<table>` and aria summaries per row, not per tick.
- **Scale to full product.**
  - B's notes column is the evidence brief. Footnotes become the export, which is nearly free.
  - C's compare tray is a ready model-validation pack.
  - A scales to dossiers as routes but adds nothing to export.

## 6. Recommendation

**Ranked: 1. B ATLAS, 2. C CASEFILE, 3. A CONSOLE.**

1. B is the strongest at the two things the judges see first: the coverage gap and the gravity regimes. It has the best 30-second legibility and the most distinct look.
2. C is the best science and the best answer to the challenge's "summarize, rank, interpret" wording. It loses on presentation and speed.
3. A is the safest build and also the most generic. Its best parts are cheap to take.

**Hybrid for the winner (all buildable):**
- Keep B's map, pin, four sheets and notes as the main screen.
- **From C, add an Investigations ladder below the map.**
  - The 24 PSI rows plus published groups, with a single O₂ strip per row, the scenario rule, and the D_min and R columns.
  - Use the solid-versus-ghost tick fix so the strips cannot falsely say "covered".
  - Sort by R. Clicking a row highlights its dots on the map. B has no ranking at all, and "ranks" is in the challenge text.
- **From C, add typed badges** (MEASURED, COMPUTED, NOMINAL, DRAFT) on every statement in the notes, plus one robustness line ("verdict changes under ½×/2×: DIRECT 0 · NEAR 9 · DISTANT 18 of 27"). Skip the full ledger.
- **From A, add three signed gap bars** in the notes for O₂, pressure and flow, plus numeric inputs with a kPa/psia toggle beside the pin so exact entry is possible. Skip the gauges, matrix and ellipses.
- **Legend and wording.** Put "Evidence proximity, not a safety rating. Hatched = no test within D 2.5; not a hazard map." on the map itself.
- **Mobile.** Tap to place the pin, not drag.

Decide the visual identity deliberately. The spec's palette is dark graphite, while B is paper. The spec's own "Light (report)" token set is a precedent for choosing paper.

## Summary (12 bullets)

1. Only C is a different paradigm. A and B converge on one scenario marker on the O₂ × pressure plane. Sharpen A to be instrument-first (verdict, gap bars, numeric entry) with a small map.
2. Ranking: B ATLAS, then C CASEFILE, then A CONSOLE.
3. B wins on the coverage gap, the gravity regimes (four separate sheets, an empty Moon sheet), 30-second legibility and screenshots.
4. C wins on Validity, Relevance and provenance (typed claims, compare tray, fingerprints). It loses on Presentation and the 30-second demo.
5. A is the safest build and the closest to the saturated "chat plus gap chart" pattern.
6. The biggest misreading risk is B's field (teal ramp plus hatching reads as a hazard map). Keep one hue, never red, and put "not a hazard map" on the legend.
7. A's 27-cell matrix reads as a risk heatmap (replace it with verdict counts). Its ellipses read as a radius of concern.
8. C's ladder strips falsely suggest coverage because each axis is marginal. Fix: solid tick only if the run is near on the other axes. Group solids apart from gas runs up to 85% O₂, or the punchline is lost.
9. "Evidence proximity, not a safety rating" must sit next to the verdict. B needs it in the map legend and the notes' first line. Say "Evidence: DIRECT", never colour-coded.
10. Hybrid for B: add C's investigations ladder (O₂ strip, D_min, R, sort, click-to-highlight) below the map. B has no ranking, and the challenge asks for one.
11. Hybrid for B: add typed badges and a one-line robustness count (C), and signed gap bars plus numeric entry (A). Skip gauges, matrix and ellipses.
12. Build for B: the field depends on flow, material, gravity, published and scales, not on the pin. Keep the sheets low-resolution, and use tap-to-place on mobile.
