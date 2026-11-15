# MARGIN design research

Date: 2026-11-14. Method: each reference was opened in Chromium (Playwright) at 1440 × 900 and 390 × 844, captured at first screen and after one viewport of scroll, and measured in the live DOM (computed font family, size, weight, line-height, letter-spacing, text and background colours, nav height, border radii, SVG/canvas counts). Raw measurements are in [`research/`](research/) (`measurements.json`, `measurements-extra.json`). Script: `scripts/capture-references.mjs`. The screen captures (`*-desktop.jpg`, `*-desktop-scroll.jpg`, `*-mobile.jpg`, `eyes-deep/*.jpg`) show other organisations' websites, including NASA insignia, so I keep them locally and they are not published in this repository; the file names below refer to them. These sites informed the design only: no images, code, logos or other assets from them are used in MARGIN.

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
**Do not copy.** The white editorial page, Playfair serif titles (exactly the "editorial" feel I rejected), the multi-hue categorical palette (MARGIN's encodings must stay restrained and never look like risk colours), cookie-banner yellow.

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
| Repeated small-caps eyebrow labels everywhere | all routes | The "AI template" feel I described |

## 7. Decisions derived from the first research pass (superseded)

> Superseded by §9 for the final redesign (`redesign/eyes`). Kept for the record: it describes the interim "instrument graphite" direction preserved on the branch `wip/instrument-graphite`.

1. **Canvas and surfaces** (Linear): graphite-navy canvas, not black; four surface levels separated by 3–5 % luminance plus 1 px hairlines; no drop shadows except on dialogs.
2. **Type** (Linear, SVS, Eyes): a single UI sans for everything readable; an expanded grotesque used *only* for the wordmark, page titles and big numerals; mono only for measurements, ids and metadata. Chosen: **Archivo** (expanded width axis) for display, **IBM Plex Sans** for UI, **IBM Plex Mono** for values — engineering heritage, excellent tabular figures, and not the Inter/Geist default.
3. **Text greys** (Linear): exactly three text levels, all ≥ 4.5 : 1 on every surface they sit on.
4. **Colour semantics** (OWID restraint, Eyes annotation): one cool *signal* hue for evidence (cyan-teal, single-hue ramp — never red/amber/green), one warm *attention* hue (amber) reserved for the user's scenario and for cautions (partial match, boundary proximity). Published evidence gets one secondary hue (periwinkle) and is also distinguished by *shape* (ring). Planned = dashed neutral. No gradients on UI.
5. **Chart as module** (OWID grapher): title → definition → plot → "Source:" line → actions; direct labels; dashed hairline grid; units on ticks.
6. **The map is the hero** (Eyes): on desktop the first screen is scenario rail · map · verdict inspector, with progressive disclosure (tabs) for breakdown, sensitivity, ranking, findings and sources.
7. **Brand from data** (D2D): the MARGIN mark is an iso-distance contour pair with a scenario point outside it — literally "the margin" between evidence and scenario.

---

## 8. NASA Eyes: interaction anatomy

Research note (workstream R, merged into this document). Captures, raw measurements and capture scripts: [`research/eyes-deep/`](research/eyes-deep/). Source: the live app at https://eyes.nasa.gov/apps/solar-system/ . All numbers come from the live DOM (`research/eyes-deep/measurements.json`) unless marked "CSS" (read from the app's `app.css` / `vendors.css` rules) or "read off capture".

### 8.1 Method

- Date: 2026-11-14. Viewports: 1440×900 desktop and 390×844 mobile (isMobile, hasTouch, iOS Safari UA), both at deviceScaleFactor 1.
- Browser: Playwright 1.65 Chromium. The default headless shell did render WebGL, but through SwiftShader (`ANGLE Vulkan SwiftShader`) at only 2–13 fps, with main-thread stalls of up to 800 ms. Planet textures also failed to load in time, so that config is unusable for timing. The config that worked was `channel: "chromium"` (new headless) with `--use-angle=metal --ignore-gpu-blocklist --enable-gpu`: renderer `ANGLE Metal Renderer: Apple M1 Pro`, about 60 fps, about 54 ms per screenshot. A headed run also worked (120 fps), but it was only used for the fps comparison.
- Timing: a `requestAnimationFrame` sampler logged `getBoundingClientRect`, computed opacity and transform for the panels, plus scene-label positions as a proxy for the camera. It ran at 50–60 fps, and the timelines are stored in `measurements.json`. Screenshot frame sequences are there for visual judgement only.
- Scripts: `research/eyes-deep/capture/` (`lib.mjs` plus one script per state group, and `assemble.mjs` to build the JSON).
- Not captured, or partial:
  - Hover on mobile (touch has no hover state).
  - The expanded mobile detail sheet (only the 107 px peek state was captured).
  - The camera's easing curve. Only the camera's start and end could be measured, from label motion; the WebGL camera state was not read.
  - The search-open timeline. The element is `display:none` at t0, so only the CSS value is reported.
  - The story-carousel slide timing (CSS values only).
- The scene is live (real time), so label positions drift slowly. At "real rate" this drift is below 1 px over the sampling windows.

### 8.2 Measured (desktop 1440×900 unless noted)

| Element | Box (x,y,w,h) | Surface | Type | Motion | Capture |
|---|---|---|---|---|---|
| Story panel (left) | 20,0,332,900; header row y 85–115 | transparent; no blur | header Metropolis 16/24 300, #95959d | collapse: cards `display:none` (instant) | desktop-01-home |
| Story card | 20,130,332,143; 4 cards, 10 px gap | rgba(37,37,39,.6), radius 3, padding 20/20/20/25; hover `linear-gradient(100deg,#434347 30%,transparent)` | title Metropolis 29/27.55 300, ls −0.58; meta 12/21.6 300, ls 7.2 px (.6em), uppercase, **#cd9745** | none (hover background swaps instantly) | desktop-10a-story-card-hover |
| Detail panel | 0,128,352,772 (22rem, flush left) | opaque #181818, radius 0; tab-group border 1 px #606060 | title Inter 22.4 600; section h5 Metropolis 18/32.4 300; body Inter 14.4/24 300 (spacecraft copy opacity .66); chips Inter 16, radius 8, rgba(255,255,255,.07), 34 px tall | enter: none; collapse: translateX 0→−372 in ≈417 ms | desktop-03b, desktop-11 |
| Layers panel | 1237,316,183,494 (replaces the rail) | `linear-gradient(#272527, rgba(37,37,39,.8) 52%, transparent)`, radius 3 | title "Layers" (h5) right-aligned with a › close chevron (30 px, opacity .6); items Metropolis 14/24, row 24 px, opacity .7 → 1 on hover/active (.2 s ease-out); checkbox 20 px #3e63dd, radius 3 | slide from right + fade ≈1.0 s | desktop-05b-layers-open |
| Menu | 0,0,1440,581 (full-width top sheet) | `linear-gradient(#252527 .7%, #000)` | column title Metropolis 14 600; links Inter 18 300 at opacity .7 | opacity 0→.95 in ≈580 ms (CSS .8 s cubic-bezier(.2,.2,0,1)) plus mask wipe 1.2 s, .1 s delay | desktop-06-menu-open |
| Search bar | 922,15,272,45 (expands from a 30 px icon) | rgba(149,149,157,.2), radius 3.2; page cover #000 at .6 (CSS .6 s) | Inter 16 300 | CSS `.search` opacity .6 s ease-out | desktop-07a |
| Search results | 922,60,272,450 | gradient rgba(37,37,39,.8 → 0), **backdrop-filter blur(8px)**, radius 0 0 3.2 3.2, 1 px #252527 border | first row 57 px; active row rgba(255,255,255,.15) | rows `transition: .3s` | desktop-07b, 07c |
| Rail buttons | x 1390, y 586/619/651(zoom, 30×62)/716/748/780; **30×30 each** | transparent; zoom group rgba(37,37,39,.6) radius 3; icon sprites at opacity .4 | n/a | rail enters with `fade-in-bottom` .5 s (CSS) | desktop-01 |
| Rail tooltip | 70×30, placed left of the button | #252527 at opacity .9, radius 4, padding 5/9 | Metropolis 14/19.6 300, #eaeaeb | appears after ≈650 ms, fade .3 s (tippy) | desktop-05a, 05c |
| Time control | nav 625,728,600,106; arc SVG 560×38 | knob 36 px circle, radial gradient #47da84, backdrop blur 4 px, shadow 0 0 12px 4px rgba(0,0,0,.4) | rate Metropolis 29 300 uppercase **#47da84** ("REAL RATE"), white once off real time; date/time Inter 16 400 #c6c6c9 | rate buttons (40×28, 32×20, radius 6) fade in on hover .5 s; knob transform .15 s | desktop-08a–d |
| LIVE chip | 409,765 (dot 12 px) | none | Metropolis 16 600 uppercase #47da84 → #95959d when not live | n/a | desktop-08c |
| Planet label | e.g. 890,393,113,24 | none | Metropolis 16 600 uppercase, ls .3em (4.8 px), opacity .75; Sun 18 px | hover → opacity 1 + icon scale 1.2 (.25 s) | desktop-02-hover-mars |
| Spacecraft label | e.g. 1047,460,138,24 | none | Metropolis 16 300, sentence case, opacity .35; hexagon icon 14×16 | hover → opacity 1 (.25 s) | desktop-04a |

Root tokens (CSS `:root`):
- Easing: `--ease-out-bezier: cubic-bezier(.2,.2,0,1)`.
- Surfaces: `--panelBg #181818`, `--grayDark #252527`, `--grayDarkAlpha #25252799`.
- Text greys: `--gray #95959d`, `--grayMed #c6c6c9`.
- Accents: `--spacecraft #cd9745`, `--live #47da84`, `--cta-blue #3e63dd`.
- Header height: `--gridHeaderHeight 75px`.

Mobile (390×844):
- Stories are a bottom sheet (0,496,390,348). The scene is pushed up by 152 px (`--offset-up` 18vh). Card title is still 29 px; meta is 12 px.
- The detail panel is a bottom sheet with a 107 px peek (y 737) and a 40 px round expand button. Its transition is `transform .4s cubic-bezier(.2,.2,0,1)`.
- The menu is full screen and contains the search field. Layers is a 390×403 bottom sheet.
- Captures: mobile-01, 03a/b, 04, 05a/b, 06, 07, 08, 09, 10.

### 8.3 Interaction patterns observed

**Hover (body).** The planet label goes from opacity .75 to 1 and its ring icon scales 1.2×, over .25 s. The body's orbit line brightens (desktop-02). Cursor is `pointer`. Spacecraft labels go from .35 to 1. There is no hover card or tooltip on scene objects.

**Select a body, camera move, detail panel** (desktop-03-select-mars-seq-sheet, timeline in JSON):
- 65 ms: the story panel is removed (`display:none`, no exit animation).
- 331 ms: the breadcrumb gains "› Mars" and the URL becomes `#/mars`.
- 603–653 ms: a loading indicator shows.
- About 653–664 ms: the detail panel switches to `display:flex`. There is no translate and no opacity ramp, so it just appears.
- About 930 ms: the camera starts flying.
- 2317 ms: the last label movement, so the flight lasts about 1.4 s.
- At the end, the target's own label fades out (~.75 s), and the child objects' labels (landers, orbiters, moons) become the visible set.
- Spacecraft selection behaves the same way (desktop-04b/c; `#/sc_parker_solar_probe`).
- Escape does **not** close the panel. The only exits are the `«` collapse button and the breadcrumb.

**Detail collapse/expand** (desktop-11 frames at 0/82/162/241/322/403 ms; desktop-11b sheet):
- Collapse is a script-driven `translateX(0 → −372px)` over about 417 ms. It accelerates for about 50 ms and then decelerates: 67 % of the distance is covered by 116 ms.
- In sync, the WebGL viewport's `left` animates 173 → 0 px over about 470 ms, so the scene recentres into the freed space.
- The time control follows over about 800 ms.

**Story panel collapse** (desktop-09):
- The cards disappear instantly. The scene viewport then recentres 173 → 0 px in about 435 ms, with the `cubic-bezier(.2,.2,0,1)` deceleration (75 → 509 ms after the click). The time control trails, settling by about 790 ms.
- Expanding reverses this: the time control moves first, and the viewport follows after about 270 ms, ending at about 1.0 s (CSS: .8 s with .2 s delay).
- The panel never slides. Only the scene moves.

**Layers** (desktop-05b):
- The panel slides in from the right (translateX 183 → 0) while fading in. It is at 50 % around 350 ms, 90 % around 680 ms, and done at about 1.0 s.
- It replaces the rail in the same slot; only the settings toggle stays visible.
- Escape does not close it. The close control is a `›` chevron in the panel header.

**Menu** (desktop-06):
- A full-width, five-column sheet that fades in over 580 ms, with a top-down mask wipe running to 1.2 s. The scene stays visible below it.
- Escape does not close it; the class stays `active`.

**Search** (desktop-07a–d):
- The 30 px magnifier expands into a 272×45 bar and focus moves into the input. The input has no placeholder and no label.
- The rest of the page is dimmed by a black cover at .6.
- Results are grouped ("Exploration", "Featured Moons"), with the exact match first and underlined.
- ArrowDown moves an `active` highlight while focus stays in the input. Escape closes the search, clears the query, and drops focus to `<body>`.
- This is the only surface where arrow keys and Escape do anything.

**Time control** (desktop-08a–d):
- The arc does not scrub the date. It is a **rate dial**: slider 0–100, with 50 = real rate. Dragging the knob to 75 set "10 HRS/S", and the knob stays put after release.
- `+`/`−` step the rate; three steps gave "6 SECS/S".
- When off real time, the rate text turns from green to white, the LIVE chip turns grey, and a "return to real time" button appears to the right of the arc.
- ArrowRight on the focused slider moved it 75 → 76 ("13 HRS/S").
- The slider has no `aria-label` or `aria-valuetext`. A `<label class="knob">` reads "Drag time slider thumb".
- On mobile, the rate buttons stay hidden until the rate text is tapped (`.touchactive`).

**Story open** (desktop-10b/c, mobile-10):
- URL becomes `#/story/<id>`. The page switches into a mode: a left text column about 451 px wide, h2 Metropolis 36 px at weight 100, and "Close ×" where Menu was. The time control and story list are hidden, and the camera moves to the story view.
- In-story controls are button grids ("Select speed" / "Select view") with a 3 px #0d67ff left border on the active option.
- ArrowRight and Escape did nothing.

**Label collisions:**
- Labels are DOM elements over the canvas, culled with a screen-space quadtree. A culled label gets `.hiddenByLabelQuadtree`, which sets opacity 0 over .75 s ease-out and `pointer-events:none`. It returns over .25 s.
- No offsetting, leader lines or stacking were observed. Among the labels left visible there were 0 overlapping pairs at every zoom level tested.
- Home view: 9 labels shown, 8 culled. Earth is culled under Venus/Mercury, and spacecraft under planets.
- Zoomed out (6 wheel steps): 2 shown, 24 culled. All planets collapse into SUN (desktop-13a).
- Zoomed in on the Sun: 0 culled (desktop-13b).
- Priority appears to run Sun > planets > spacecraft/moons.

**Keyboard and focus** (desktop-12):
- Tab from load visits 11 stops, then `<body>`, then repeats: Share, Menu, the 6 rail buttons, the story list's scroll viewport (a div), "Expand time controls", the time slider.
- Not reachable by keyboard: the search icon and story collapse (both spans), the story cards and scene labels (divs, 0 tabbable), and the home logo.
- The zoom group is a single unnamed `<button>`, with "zoom in" and "zoom out" as `span[role=button]` inside it. It is one tab stop with no accessible name.
- Focus ring: the UA default `auto 1px` on Share, Menu and time-expand. **None** on the rail buttons (`.settings button{outline:0}`) or the slider. The only focus cue on a rail button is its tooltip, which also appears on keyboard focus (tab03).
- Arrow/WASD/+/− on the canvas did nothing; the Sun label stayed at the same pixel.

### 8.4 Why it works

- **One left slot, one story at a time.** Story list, detail panel and story mode share the left column and replace each other. The user never manages more than one panel.
- **The scene makes room instead of being covered.** Every panel open or close re-centres the WebGL viewport (offset 12vw desktop, 18vh mobile), so the selected object is never hidden behind the UI.
- **Selection is addressable.** Every selection writes a hash route (`#/mars`, `#/story/…`) and a breadcrumb. Back and share work without extra UI.
- **Two-tier labels by opacity, not by size.** Primary bodies sit at .75 with tracked uppercase 600 weight; secondary objects at .35 in sentence case. Both are 16 px, so hierarchy holds without scale changes.
- **Collision culling by priority with a slow fade-out (.75 s) and a fast fade-in (.25 s).** Labels never overlap, and the scene does not flicker during continuous zoom.
- **Restrained chrome.** Icons sit at .4 opacity, cards at 60 % alpha, and there is one accent per meaning (green = live/real time, blue = selection/checkbox, amber = mission metadata).
- **Weaknesses MARGIN should not inherit:**
  - Escape only works in search.
  - Nothing in the scene is reachable by keyboard.
  - Rail buttons have no focus ring and no individual names inside the zoom group.
  - Hit targets are 30 px.
  - Tooltip delay is 650 ms.
  - UI motion takes 0.8–1.2 s, and there is a 930 ms dead time before the camera moves.

### 8.5 Mapping to MARGIN (research recommendation)

| Eyes pattern (measured) | MARGIN equivalent | Holds? | Recommendation |
|---|---|---|---|
| Story panel 332 px at a 20 px gutter; cards 143 px tall, 10 px gap, radius 3, rgba(37,37,39,.6); title 29 px/300 | Expeditions panel (curated reference atmospheres and source-checked findings; each sets a full URL state) | Yes (layout); no (type scale) | Width 320–336 px, 16–20 px gutter, cards in one column with an 8–10 px gap, radius 3–4 px, padding 16/16/16/20. Title 18–20 px (29 px display type wastes vertical space in a data tool). Metadata in neutral grey, **not amber**. |
| Story collapse: cards vanish instantly; the scene recentres in ≈435 ms with (.2,.2,0,1) | Collapse Expeditions; the field re-fits the freed width | Yes | Panel exit 160–200 ms (opacity plus 8–12 px translate), field re-fit ≤ 400 ms with `cubic-bezier(.2,.2,0,1)`, starting together (Eyes staggers by .2 s; not needed). Collapse button ≥ 32 px with a name and `aria-expanded`. |
| Select body: URL + breadcrumb at 331 ms, panel appears at ~660 ms with no animation, camera flies about 1.4 s after a 930 ms delay | Select run: the view eases to it, its investigation highlights, a run inspector opens | Yes (sequence); no (timing) | No dead time (data is local). Inspector enters at 180–220 ms, view ease ≤ 400 ms, investigation highlight ≤ 150 ms. Write `?run=<id>` to the URL. Escape closes the inspector and returns focus to the run that was selected. |
| Detail panel 352 px, opaque #181818, flush left, replaces the story panel | Run inspector in the same slot as Expeditions | Yes | Inspector 340–360 px, occupying the Expeditions slot (mutually exclusive). Opaque surface (no blur over data). Field labels Inter 14–16, values tabular figures. |
| Detail collapse translateX −372 px in ≈417 ms | Inspector dismiss | Partly | ≤ 200 ms; respect `prefers-reduced-motion` (opacity only). |
| Rail: 30×30 buttons, 2–3 px gap, icons at .4, tooltip left after 650 ms, no focus ring; zoom is one unnamed button | Field tools: key, layers, zoom in/out/reset, regimes overview, fullscreen, share | Yes (placement); no (a11y) | Visible 32×32 (≥ 28) with a ≥ 32×32 hit area (≥ 24 minimum), 4 px gap. Every control its own `<button>` with `aria-label`. Tooltip at 400–500 ms delay with a 120–150 ms fade, also shown on focus (keep this Eyes behaviour). 2 px focus ring with 2 px offset. Icon resting opacity ≥ .7 (.4 fails contrast). |
| Layers: 183 px panel replaces the rail, slides in about 1.0 s, no Escape | Layers popover from the rail | Yes (content); no (motion) | 200–240 px popover anchored to its button, ≤ 200 ms, `aria-expanded`, Escape closes and returns focus to the button. Checkbox rows ≥ 32 px tall (Eyes: 24). |
| Menu: full-width 581 px sheet, 0.8–1.2 s, no Escape | About / Sources / Method sheet | Partly | Not needed as a mega menu. If kept: ≤ 250 ms, Escape closes, focus trapped while open. |
| Search: icon → 272×45 bar, .6 cover, grouped results, ArrowDown highlight, Escape clears and drops focus to body | Ctrl/⌘K command search over local data (runs, investigations, reference atmospheres, expeditions) | Yes | Same grouping, exact match first. ArrowUp/Down plus Enter, Escape closes and **returns focus to the trigger**. Cover ≤ .4. Open ≤ 150 ms. Visible label or placeholder. `role=combobox` with `aria-activedescendant` (Eyes highlights with a class only). |
| Time arc: continuous rate dial (0–100, 50 = real), green knob 36 px, rate text green when "real" | Bottom regime selector: Microgravity / Lunar / Martian / Earth | Spatially only | Keep the bottom-centre placement and a 560–600 px span. Behaviour must differ: `role=radiogroup` with 4 discrete radios, roving tabindex, Left/Right moving between detents, no drag interpolation, no intermediate state. Each detent ≥ 44×32 hit. Switching regime = a view change ≤ 400 ms, and plates never blend. |
| Labels: quadtree culling, .75 s fade-out, .25 s fade-in, priority Sun > planets > spacecraft, 0 overlaps | Reference-atmosphere triangle labels, run labels, contour labels | Yes | Priority: probe > selected run > reference atmospheres > contour labels > run labels. Never cull the probe or axis ticks. Fade 120 ms out and 150 ms in (Eyes' .75 s lag is too long for a static chart). Culled labels drop `pointer-events`; their marks stay hoverable. |
| Hover: label to full opacity, icon ×1.2, orbit highlight, .25 s | Hover run dot: dot and investigation siblings highlight | Yes | ≤ 120 ms; no scale on data marks (scaling changes perceived position). Use stroke/opacity. |
| Zoom: continuous wheel, labels re-cull | Zoom in/out/reset; zoom out → regimes overview of four separate flat plates | Partly | Overview is a discrete state (button and keyboard), ≤ 400 ms, four plates side by side with identical axes. No perspective, no continuous morph between "one plate" and "four plates". |
| Story open: mode switch, URL `#/story/…`, Close × replaces Menu | Open an Expedition: sets the full URL state (regime, view, probe, highlighted findings) | Yes | View change ≤ 400 ms. The panel shows sources inline. Escape or Close returns to the previous URL state (Eyes: Escape does nothing). |
| Keyboard: 11 tab stops, scene unreachable, Escape only in search | Whole app | No | Every run reachable (roving focus in the field, or a synchronized list). Escape closes the topmost layer in order: search > popover > inspector. Visible focus everywhere. |

Do not copy:
- The NASA insignia or the "Eyes" wordmark.
- Starfields or space imagery behind the data.
- Pure black #000 with glowing strokes (the Eyes body is `rgb(0,0,0)`).
- Amber as metadata (Eyes uses `--spacecraft #cd9745` for card dates; in MARGIN amber means only the user's scenario probe).
- The green LIVE / REAL RATE semantics (MARGIN's data is a dated snapshot; show "Snapshot YYYY-MM-DD" in neutral grey).
- Any perspective tilt of the data plane.

### 8.6 2D vs 2.5D (research)

Eyes needs perspective because its subject is 3D. The cost of perspective shows up in exactly the reading task MARGIN depends on:
- **Foreshortening.** In desktop-01-home the near-circular Mars orbit renders about 840 px wide and about 380 px tall (read off capture, ±10 px). The same physical distance therefore covers about 2.2× more pixels horizontally than vertically. A distance read off a tilted O₂ % × log-pressure plane would carry that error, and it would vary with position.
- **Label loss grows with compression.** The tilt compresses the inner system, and the quadtree culls 8 of 17 candidate labels at the default view and 24 of 26 when zoomed out.
- **Eyes does not read distances off the scene.** Its "Toolbox" tab offers a separate distance tool.

Recommendation: keep MARGIN flat 2D SVG with orthographic axes. Reuse Eyes' interaction structure (one panel slot, the scene re-fitting into freed space, URL-addressable selection, priority culling), but not its projection. D ≤ 1 and D ≤ 2.5 contours keep their true shape only on a flat plane.


---

## 9. The mapping as built, and the decisions it rests on

I selected NASA Eyes on the Solar System as the primary reference (`research/nasa-eyes-app-desktop.jpg`). Section 8 records how it behaves; this section records what MARGIN took, what it changed and why. The design system that implements it is [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

| NASA Eyes element | MARGIN as built | Decision and reason |
|---|---|---|
| Full-bleed WebGL scene; the scene re-centres into space freed by panels | Full-bleed **evidence field** (`components/atlas/EvidenceField.tsx`): O₂ linear × pressure log plane of the active regime. The plot frame occupies the area the panels leave free and eases into freed space (≤ 360 ms) when a panel collapses; the graticule continues faintly beneath the panels | Kept the "scene makes room" behaviour (§8.4) instead of letting data pass under panels: a chart whose distances are read off the axes must never hide marks behind UI |
| Featured Stories cards (left, collapsible) | **Expeditions** (`Expeditions.tsx`, `lib/view/expeditions.ts`): the coverage gap, five reference atmospheres, six source-checked findings. Each card sets a complete, shareable scenario URL state; the active card carries the amber scenario rule | Card metadata in neutral tracked caps, **not amber** (amber means the scenario). Titles 20–26 px light (the reference's 29 px wasted height in a data tool, §8.5). Finding cards use neutral topic labels; the finding's value and source are shown verbatim and only primary-checked findings appear |
| (no equivalent) | **Scenario console** under the Expeditions (`Console.tsx`), collapsible to a one-line summary | The probe's settings stay one glance away; gravity is not here (see the regime selector) |
| Time arc (a rate dial) | **Regime selector** (`RegimeStrip.tsx`): four discrete detents in a bottom instrument strip, a radiogroup with roving focus, each detent showing its own regime's occupancy thumbnail and PSI count; snapshot status (hollow square, dated) at the left, verdict readout at the right | Kept the bottom-centre placement only. Behaviour deliberately differs from the dial: no track, no knob travel, nothing drawn between regimes. The thumbnails make the emptiness of three regimes visible before they are selected |
| Right tool rail (30 × 30, no focus ring, unnamed zoom group) | **Field tools** (`ToolRail.tsx`): key, layers, zoom in/out/reset, regimes overview, fullscreen, share; 32 × 32, each its own named button, visible tooltip on hover and focus, Esc closes popovers and returns focus | Fixed the reference's accessibility gaps (§8.3 keyboard) |
| Select a body → detail panel replaces the story panel (left), camera flies after ~930 ms | Select a run → the run inspector (`components/run/RunInspector.tsx`) opens **in the right inspector under the verdict card**; selections made from a list or search ease the view to the run (≤ 360 ms); its investigation highlights and the rest dim; `run=` is written to the URL; Esc closes and returns focus | **Revised** from the research recommendation (same slot as Expeditions): in MARGIN the run is evidence *for* the verdict, and the verdict must stay visible while it is inspected. Eyes has no persistent verdict. No dead time: the data is local. A click on the field does not move the view (the run is already in sight) |
| Zoom out to the system | **Regimes overview** (`Overview.tsx`, `view=overview`): four separate flat plates on shared axes, each with its counts and its verdict at the probe; arrows choose a regime, Enter opens its plate | Discrete state, not a continuous zoom; plates are separate elements with nothing drawn between them (§8.6, gravity rule) |
| Search (icon → bar, Esc drops focus to body) | **Command search** (`components/ui/CommandSearch.tsx`, ⌘K / Ctrl K): atmospheres, investigations, findings and runs from a local index loaded on demand; combobox + listbox; Esc returns focus to the trigger | Index loaded by dynamic import so the PSI snapshot never ships with the header |
| Two-tier labels by type; quadtree culling by priority | Tracked caps for reference atmospheres, sentence case for the selected run, amber readout for the probe; **greedy priority placement with candidate offsets** (`lib/view/labels.ts`, unit-tested): probe > selected run > atmospheres; data marks are soft obstacles; a label that fits nowhere is hidden (its mark and accessible name remain) | Offsets before culling: a static chart can afford to move a label, and a hidden landmark name costs more than a moved one |
| Menu (full-width sheet) | Not adopted | Four routes fit in the header nav; About/attribution lives in the field's credit line and the Sources page |
| Green LIVE | Not adopted | The data is a dated snapshot ("PSI snapshot 2026-11-14 · 1,870 runs") in neutral grey with a hollow square |
| Mobile: scene first, story cards below | Field first (≥ 60 svh), regime detents as a 4-segment control, a sticky section bar (Scenario · Verdict · Evidence · Sources · Regimes), expeditions as a horizontal scroller, the inspector below | The page scrolls on phones; tap places the probe; 44 px touch targets on the detents |

### 9.1 Rendering: flat 2D SVG; no WebGL, no 2.5D

Decision: every mark, label and contour is SVG on a flat orthographic plane. No WebGL or three.js. The regimes overview also stays flat.

Reasons: D is defined on this plane with specific axis scalings; §8.6 estimated a 2.2× foreshortening (read off a capture) on the reference's tilted plane, which would distort exactly the distances users read. About 900 placeable points are well within SVG limits (the field re-projects bands and points on each animation frame of a zoom). The tests and accessibility rely on SVG marks. A 2.5D stack for the overview was rejected because any stacking reads as a continuum between gravity levels.

### 9.2 Dependencies

None added. Runtime dependencies remain `d3-array`, `d3-contour`, `d3-scale`, `d3-shape`, `zod`. Zoom and transitions are a few lines of `requestAnimationFrame` interpolation (`components/atlas/geo.ts`, `AtlasApp.tsx`), so `d3-zoom` / `d3-transition` were not needed. Fonts: Albert Sans and IBM Plex Mono via `next/font/google` (self-hosted at build time, both SIL OFL 1.1).

### 9.3 Imagery

I offered generated imagery and video. None is used in the evidence views: the reference's spacecraft renders are explicitly on the "do not copy" list, MARGIN's identity is derived from its own data (contours, the probe, the detents), and every visual on screen must trace to the engine or data. Decorative imagery would also weaken the "honest emptiness" of the three nearly empty regimes. (The Guide page, added later, uses four AI-generated illustrations, each labelled "AI-generated illustration" on screen; see `docs/compliance/si-usage-log.md`.)
