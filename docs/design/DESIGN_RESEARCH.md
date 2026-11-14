# MARGIN design research

Date: 2026-11-14. Method: each reference was opened in Chromium (Playwright) at 1440 × 900 and 390 × 844, captured at first screen and after one viewport of scroll, and measured in the live DOM (computed font family, size, weight, line-height, letter-spacing, text and background colours, nav height, border radii, SVG/canvas counts). Captures and raw measurements are in [`research/`](research/) (`*-desktop.jpg`, `*-desktop-scroll.jpg`, `*-mobile.jpg`, `measurements.json`, `measurements-extra.json`). Script: `scripts/capture-references.mjs`.

The question for every reference was the same: *what would make MARGIN read as a precise scientific instrument rather than a generic dashboard, without making evidence coverage look like a hazard forecast?*

---

## 1. Linear — linear.app and "A calmer interface for a product in motion"

**Measured.** Canvas `rgb(8, 9, 10)` — near-black, not pure black. One typeface family (Inter Variable) for 2,046 sampled text nodes plus Berkeley Mono for 279 (labels like `FIG 0.1`, issue keys). Text uses exactly three greys: `#F7F8F8` (primary), `#8A8F98` (secondary), `#62666D` (tertiary). H1 64 px / weight 510 / tracking −1.41 px (−2.2 %); H2 48 px / 510 / −1.06 px, with the *second sentence of a heading set in the secondary grey*. Body 15 px / 24 px. Nav 73 px tall, a single hairline below it. Radius 6 px on controls, 9999 px only on the primary CTA pill.

**Why it works.**
- Hierarchy is carried by *luminance steps*, not by colour. Three text greys and one near-black background do almost all the work; colour is reserved for state (the yellow "In Progress" glyph, the star).
- Fractional font weights (510, 590) give headings presence without the heaviness of 600/700.
- The design-refresh article states the principle directly: *"Don't compete for attention you haven't earned"* — navigation is dimmed so the working area dominates.
- The product screenshot sits inside a framed surface (`#0F1011`-ish panel, 1 px border) — surfaces are separated by a 3–5 % luminance step plus a hairline, never by shadows.
- Monospace is used sparingly as a *technical register* (`FIG 0.1`, `vehicle_state`), not for running text.

**Use in MARGIN.** Three-step text greys; near-black graphite canvas with 3–4 surface levels separated by hairlines; dim navigation; mono only for values, ids and figure labels; fractional-feeling medium weights for headings; a single neutral primary button style.
**Do not copy.** Inter (the most common AI-template face), the marketing-scale 64 px hero, the pill CTA, the soft spotlight gradients behind the product shot.

## 2. Our World in Data — home, grapher chart, entry redesign

**Measured.** White canvas; brand navy `rgb(29, 61, 99)` used as the *text* colour of body copy; Lato for UI (2,629 nodes on the grapher) with Playfair Display only for chart titles; Menlo for numbers in a handful of places. Small radii (2–4 px) on chart controls; 32 px on homepage cards only. Section labels in Lato 12 px / weight 900 / tracking 1.2 px, uppercase ("ADD/REMOVE COUNTRIES AND REGIONS").

**Why it works (grapher, the most relevant artefact).**
- The chart is a *single framed module*: title + one-sentence definition with dotted-underlined glossary terms → tab bar (Table / Map / Line) → chart → time slider → **"Data source:" line directly under the chart** → actions (Download, Share, Full-screen). Provenance is part of the chart, not a footer.
- **Direct labelling**: series names sit at the line ends; there is no legend box to cross-reference.
- Horizontal gridlines only, dashed and very light; y-axis tick labels carry the unit ("25 t"); no y-axis title.
- The side panel is a ranked list with an inline bar behind each value — a table and a chart at once.
- On mobile the same module reflows into a single column, controls become icon buttons, the slider stays usable.
- The entry redesign article states the goal: make *"important insights and technical details … easily discoverable without overwhelming readers"* — summary first, details one click away.

**Use in MARGIN.** Chart-as-module (title, definition, controls, plot, source line, actions); direct labels on the map (landmarks, scenario) instead of a legend hunt; dashed light gridlines; units on tick labels; ranked list with inline bars for the investigation ranking; summary-first with progressive disclosure for method details.
**Do not copy.** The white editorial page, Playfair serif titles (exactly the "editorial" feel the owner rejected), the multi-hue categorical palette (MARGIN's encodings must stay restrained and never look like risk colours), cookie-banner yellow.

## 3. NASA Eyes — science.nasa.gov/eyes and the Eyes on the Solar System app

**Measured.** App canvas pure black with a WebGL `<canvas>`; UI in Metropolis (light 300 body, 600 labels) with **wide tracking on uppercase labels** (`MARS`, `VENUS`, 0.64 px+ and much wider on planet labels); thin coloured orbit strokes, each body a hollow ring marker with an uppercase label. A bottom "time" control (LIVE, date, REAL RATE) is a single arced instrument strip. Right-hand vertical icon rail for layers/zoom.

**Why it works.** Real data is the hero and fills the viewport; UI chrome is minimal and translucent at the edges. Annotation is typographic (tracked caps beside hollow markers) — legible on dark without boxes. The app communicates "live, real" through a single state cue (green LIVE dot).

**Use in MARGIN.** Let the coverage map dominate the first screen; annotate landmarks and the scenario with small tracked-caps labels beside hollow markers; one restrained status cue ("PSI snapshot · 1,870 runs") instead of decoration; a compact tool rail.
**Do not copy.** Pure black with stars/space imagery (cliché, and MARGIN is not a space-scene product), story cards with spacecraft renders, the NASA insignia (MARGIN must not imply NASA endorsement).

## 4. NASA/JPL Data to Discovery — datavis.caltech.edu, d2d.caltech.edu

(`datavis.caltech.edu` does not resolve without `www.`; captured via `www.datavis.caltech.edu`.)

**Measured.** Oli Grotesk; uppercase tracked nav (ABOUT · PROJECTS · COLLABORATE) with a 2 px underline for the active item; a radial, data-driven hero (arcs and nodes), and on the projects page a dark `rgb(32, 32, 32)` canvas with thin arc rings.

**Why it works.** The identity is built *from the kind of data they visualise* — radial arcs and linked nodes — rather than generic shapes. It is research-oriented: the page states the method (co-design with scientists) before the gallery.

**Use in MARGIN.** Derive the brand mark and banner from MARGIN's own geometry: iso-distance contours around tested conditions, the O₂ × pressure plane, the scenario point outside the contour. Active-nav underline rather than filled tabs.
**Do not copy.** Saturated orange full-bleed backgrounds; red-node accents (red must never appear on an evidence map — it reads as danger).

## 5. NASA Scientific Visualization Studio — science.nasa.gov SVS page

**Measured.** Inter headings (48 px / 700), Public Sans body (16 px / 26.4 px), DM Mono for metadata; black header bar, white page; breadcrumb + secondary nav; a full-width visualisation with a one-line purpose statement above it.

**Why it works.** A clear hierarchy: one-sentence purpose → the visualisation itself → explanation. Metadata (dates, IDs, credits) is set in mono so it reads as reference information.

**Use in MARGIN.** "Purpose sentence → instrument → explanation" order on every page; mono for metadata (run ids, file names, NTRS ids, dates); breadcrumbs on dossiers.
**Do not copy.** The NASA meatball and NASA site chrome; the bold 700-weight Inter headings.

---

## 6. Diagnosis of the current MARGIN interface (before captures in `qa/before/`)

| Problem | Evidence in the captures | Consequence |
|---|---|---|
| Warm off-white paper canvas and serif body | `atlas-1440.jpg`, `method-1440.jpg` | Reads as an editorial article, not a tool; low perceived precision |
| Every region has equal weight | toolbar, plate, key, sheets and notes all at the same contrast | The coverage map is not the obvious hero; no first-glance story |
| The verdict lives in a long prose column | field notes run ~4 screens | Users must read to find the answer; the class and D are not instrument-like |
| Toolbar wraps to two rows at 1440 px | `atlas-1440.jpg` | Controls feel improvised |
| Chart styling is default-like | thin grey grid, small ticks, mixed label weights | Undercuts the scientific claim |
| Repeated small-caps eyebrow labels everywhere | all routes | The "AI template" feel the owner described |

## 7. Decisions derived from the research

1. **Canvas and surfaces** (Linear): graphite-navy canvas, not black; four surface levels separated by 3–5 % luminance plus 1 px hairlines; no drop shadows except on dialogs.
2. **Type** (Linear, SVS, Eyes): a single UI sans for everything readable; an expanded grotesque used *only* for the wordmark, page titles and big numerals; mono only for measurements, ids and metadata. Chosen: **Archivo** (expanded width axis) for display, **IBM Plex Sans** for UI, **IBM Plex Mono** for values — engineering heritage, excellent tabular figures, and not the Inter/Geist default.
3. **Text greys** (Linear): exactly three text levels, all ≥ 4.5 : 1 on every surface they sit on.
4. **Colour semantics** (OWID restraint, Eyes annotation): one cool *signal* hue for evidence (cyan-teal, single-hue ramp — never red/amber/green), one warm *attention* hue (amber) reserved for the user's scenario and for cautions (partial match, boundary proximity). Published evidence gets one secondary hue (periwinkle) and is also distinguished by *shape* (ring). Planned = dashed neutral. No gradients on UI.
5. **Chart as module** (OWID grapher): title → definition → plot → "Source:" line → actions; direct labels; dashed hairline grid; units on ticks.
6. **The map is the hero** (Eyes): on desktop the first screen is scenario rail · map · verdict inspector, with progressive disclosure (tabs) for breakdown, sensitivity, ranking, findings and sources.
7. **Brand from data** (D2D): the MARGIN mark is an iso-distance contour pair with a scenario point outside it — literally "the margin" between evidence and scenario.
