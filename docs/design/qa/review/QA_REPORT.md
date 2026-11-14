# MARGIN redesign (`redesign/eyes`): independent QA review

Reviewer: workstream Q, 2026-11-14. Build under test: production `next start` on :3100.
Method: Playwright (Chromium, deviceScaleFactor 1, `reducedMotion: "reduce"`). 12 routes at 1440×900, 1280×800, 768×1024 and 390×844 (48 views), full-page captures of the document routes at 1440 and 390, interaction states at 1440 and 390, axe-core (wcag2a, wcag2aa, wcag21a, wcag21aa) on all 12 routes at 1440 and 390, a 45-stop Tab walk on `/` (1440, 390) and `/investigations` (1440), and Esc/focus checks. Captures cited below are in this folder. Files marked `@2x` were taken at deviceScaleFactor 2 to show detail.

Timing note: on every route that carries scenario parameters, the page does not show the URL scenario until about 2.0–2.6 s after navigation (defect P1-1). Captures were taken after that switch, except `01-…`, which shows the switch.

---

## P1: must fix

### P1-1. Every shared link first shows the default ISS scenario and its verdict (DIRECT, D 0.00) for 1–2 s
- **Routes / viewports:** all Atlas URLs with parameters and `/investigations?...`, at every viewport.
- **What is wrong:** the server-rendered HTML and the first client render use the default scenario (Microgravity, ISS 20.9 % / 101.4 kPa). The URL state is applied only after load completes. Measured from navigation:
  - `/?preset=ea&g=moon&pub=1&u=20`: shows "Microgravity … PSI only, Evidence DIRECT D 0.00" until 2.56 s, then "Lunar … DISTANT D 7.47".
  - `/?preset=artemis&g=mars`: shows DIRECT until 2.0 s, then NONE.
  - `/investigations?...`: the ladder shows BASS-II ("129 comparable · 112 within NEAR") until 2.46 s, then Saffire IV–VI.

  A Mars link whose answer is "no evidence" therefore opens on the strongest possible verdict. A click in that window acts on the wrong data. In testing, a click on the first ledger run, "PSI-25:r0100", opened the provenance drawer for PUB-SAFFIRE:VI-2, and focus returned to a different button. In a 30-second demo this flash is clearly visible.
- **Evidence:** `01-url-flash-lunar-shows-micro-direct_1440.jpg` (Lunar URL showing the Microgravity field and a DIRECT verdict), `19-provenance-drawer_1440.jpg`.
- **Fix:** read `searchParams` on the server (the page segment receives them) and render the URL scenario in the SSR pass. If that is not possible, render a neutral placeholder with no verdict word, no D and no bands until the URL state is applied. Never render a default verdict.

### P1-2. The empty-regime message covers the probe, its label and the landmark labels
- **Route / viewports:** `/?preset=artemis&g=mars` at 1440, 1280, 768 and 390. The same layout applies to Earth.
- **What is wrong:** the block "No comparable evidence in martian (0.38 g)" + paragraph + "Include published evidence" button is centred on the plane:
  - The button sits on top of the amber probe and the probe label ("Scena…" is visible beside the button; at 390 "Scenario · NONE" is overprinted by "from other regimes").
  - The "ISS" landmark label is printed through "comparison"/"microgravity".
  - "10.2 PSIA" pokes out to the right of the button.

  This is the "honest emptiness" state the design system names as a principle, and the probe is the one element the user placed. The heading also reads "in martian (0.38 g)": lowercase, ungrammatical.
- **Evidence:** `02-mars-empty-state-covers-probe_1440.jpg`, `03-mars-empty-state-covers-probe_390.jpg`.
- **Fix:**
  - Move the statement off the data plane: a band under the field title, or the bottom-left of the plot where nothing is drawn. Alternatively, register it as a hard obstacle in `lib/view/labels.ts` and keep the probe and its label above it.
  - Do not place a button over the plot.
  - Change the heading to "No comparable evidence in the Martian regime (0.38 g)".

### P1-3. Phone: the field title, disclaimer and source line overprint the plot on every Atlas view
- **Route / viewport:** all Atlas routes at 390.
- **What is wrong:** the head block ("Evidence field · Microgravity", "Evidence proximity, not a safety rating. Not a hazard map. Source: NASA PSI run tables (2026-11-14) + published papers (Sources)") is drawn over:
  - the top of the plot frame;
  - the 500 kPa tick and gridline;
  - the coverage-gap annotations ("planned 26.5–34%", "max PSI solid test · 22.2%").

  The mandatory "Not a hazard map" and source line become illegible, so the one place the field must carry its disclaimer fails on phones. It is worse with a run selected, where the zoomed axis starts at 150.
- **Evidence:** `04-field-head-overlaps-plot_390@2x.jpg`, `05-run-selected-head-overlap_390.jpg`, `03-…_390.jpg`.
- **Fix:** in the compact/stack layout, set the plot's top inset from the measured head height (head bottom + `--s3`), or move the disclaimer and source line below the x-axis on phones.

### P1-4. Phone: the sticky section bar (Scenario · Verdict · Evidence · Sources · Regimes) is never visible once sticky
- **Route / viewport:** all Atlas routes at 390.
- **What is wrong:**
  - `.atlas-sheet-nav` is `position: sticky; top: 0; z-index: 20`.
  - The site header is also sticky at `top: 0`, with `z-index: 40` and 87 px height.
  - From scrollY ≈ 700 onward, the bar sits behind the header (`elementFromPoint` at the bar returns the header).

  The section navigation in DESIGN_RESEARCH §9 ("a sticky section bar") does not exist in practice once you scroll.
- **Evidence:** `06-section-bar-hidden-under-header_390.jpg` (scrolled to 1800: header only, no bar).
- **Fix:** `top: var(--header-h-mobile)` (87 px today, or 56 px if the header is brought back to spec, see P3-14) on `.atlas-sheet-nav`.

---

## P2: should fix

| # | Route / viewport | What is wrong | Evidence | Suggested fix |
|---|---|---|---|---|
| P2-1 | Atlas, 390 | Section links jump under the header. After tapping "Evidence", `#atlas-panel-evidence` lands at top 60 px under an 87 px header, so the first lines of the panel ("At 34.0% O₂ and 56.5 kPa…") are hidden. | `07-evidence-anchor-under-header_390.jpg` | `scroll-margin-top: calc(header + section bar + 8px)` on every anchored section. |
| P2-2 | Atlas, 390 (also 768) | **Layout swap on hydration.** The SSR markup is the desktop "app" layout, and the client switches to the stack layout only after JS measures the width. Before hydration, a phone shows a vertical tool rail stacked under the header and a thumbnail-size field in the middle of the page (CLS, flash of the wrong UI). | `08-prehydration-desktop-layout_390.jpg` | Drive app vs stack with CSS media queries (render both trees or a CSS-only layout), not `useWidth`. |
| P2-3 | Atlas, 768 | The floating inspector covers the field head and the plot's top-right: "Not a hazard map. Source …", the "planned habitats" bracket and the upper psia ticks are under the panel. This contradicts §9 ("a chart … must never hide marks behind UI"). | `09-inspector-covers-field-head_768.jpg` | Include the collapsed inspector's height in the `free` insets at the tablet breakpoint, or dock it below the head. |
| P2-4 | Atlas, 1440 and 1280 with `pub=1` | The disclaimer/source line is truncated with an ellipsis: "Source: NASA PSI run tables (2026-11-14) + …" at 1440, "…run tabl…" at 1280. The source line is mandatory. | `10-atlas-ea-pub_1280.jpg`, `22-hover-tooltip_1440.jpg` | Allow the line to wrap to two lines and include its height in the plot's top inset. |
| P2-5 | Atlas, all sizes | **Label collisions on the field:** (a) "ARTEMIS HAB" is drawn through a reported-limit mark (ringed tick between "ARTEMIS" and "HAB") at 1440 `?preset=ea&pub=1` and on Lunar. (b) The amber pressure tag (56.5 / 70.3 / 101.4) covers the first letters of the y-axis title "TOTAL PRESSURE…" at 1440, 1280 and 390 (it reads "OTAL PRESSURE", "AL PRESSURE", "TOT"). (c) The amber O₂ tag overlaps the adjacent tick label: "34.0%5" in the zoomed run view, "2 26.5%" on Mars. | `11-label-over-limit-mark_1440@2x.jpg`, `12-pressure-tag-over-axis-title_1440@2x.jpg`, `13-run-selected-no-field-label_1440.jpg`, `02-…` | (a) Make data marks hard obstacles for landmark labels, or add more candidate offsets. (b) Shift the axis title away from the tag's y-band, or clip the title around the tag. (c) Hide tick labels whose box intersects the scenario tag. |
| P2-6 | Atlas, 1440 | **The selected run is not labelled in the field.** DESIGN_SYSTEM §1.3 and §9 put "selected run" second in label priority. No SVG text exists for it (`?run=PUB-SAFFIRE:VI-2`, `?run=PSI-25:r0100`). Selecting BASS-II row 100 also removes the "ISS" landmark label, so the field ends up with fewer names. | `13-…_1440.jpg`, `14-run-selected-hides-iss-label_1440.jpg` | Emit a sentence-case run label ("BASS-II · row 100") through the label placer, ranked below the probe. |
| P2-7 | `/investigations/PSI-25`, `PSI-159`, `PSI-20`, 1440 | **Dossier footprint labels overprint data:** "ARTEMIS HAB.", "EXPLORATION ATM. / MARS TRANSIT" and "ISS" sit on top of run dots. On PSI-20 the empty-state line "No run of ACME BRE can be placed here" is overprinted by the ISS triangle and label ("No r△ISS of ACME BRE"). | `16-psi25-dossier-footprint-labels_1440.jpg`, `15-psi20-dossier-full_1440.jpg` | Use the Atlas label placer, with marks as obstacles, for the dossier chart. Put the empty-state line outside the plot or hide landmarks when there are no runs. |
| P2-8 | `/investigations/PSI-20`, all | The caption says "18 summary rows". The table sits in a 630 px max-height scroll box that ends exactly on row 13 with a rounded bottom border, so rows 14–18 look nonexistent. Full-page capture and print lose them. | `15-psi20-dossier-full_1440.jpg` | No max-height for tables under ~30 rows, or a visible "5 more rows, scroll" cue or fade. |
| P2-9 | Atlas inspector, 1280 and 390 | The tab list is clipped: "Sou…" at 1280 (scrollWidth 378 > clientWidth 334) and "Source" at 390. There is no overflow cue, and one tab is effectively hidden. | `10-atlas-ea-pub_1280.jpg`, `06-…_390.jpg` | Shorten the labels (Evidence · Sensitivity · Ranking · Findings · Sources fits at 13 px with tighter padding), or add an edge fade and arrow. |
| P2-10 | Atlas, 390 | **Phones have no key, no layer toggles and no zoom.** `ToolRail` (which contains `FieldKey`) renders only in app mode, and nothing replaces it in the stack layout. The field's encoding (rings, ticked rings, dashed rings, triangles, hatch, "SUIT 100% ▸") is never explained on a phone. | `05-…_390.jpg`, `03-…_390.jpg` | Render `FieldKey` inline under the regime strip in the stack layout. A Layers disclosure there would also be useful. |
| P2-11 | `/investigations`, Atlas; 390 especially | **Touch targets below spec.** `.ui-sq` controls (ladder pin and locate, panel collapse) are 24×24 px, against the 32 px icon-control spec and 44 px on touch. The mobile section-bar links are 36 px tall. Footnote superscript links ("Source 1") are 8×11 px. | `18-investigations-compare_390.jpg` | Expand the hit area to 32 px (44 px under `pointer: coarse`) with padding or a pseudo-element. Keep the 24 px visual size if wanted. |
| P2-12 | All routes | **axe: `label-content-name-mismatch` (serious, WCAG 2.5.3), the only axe violation found.** Instances: `.site-brand` (accessible name "MARGIN home" while the link visibly contains the tagline "How close is the evidence?" at ≥1280; all 12 routes at 1440); the Search button (name "Search (Ctrl K)", visible "Search ⌘K"; 12 routes at 1440); field landmarks (name "Preset: Artemis surface habitat (nominal), 26.5% O₂, 70.3 kPa", visible "ARTEMIS HAB"; "Preset: Legacy staging certification…", visible "30% / 10.2 PSIA"; Atlas routes, 1440 and 390); ladder D buttons (name "D_min 2.51, Evidence: DISTANT. Open provenance…", visible "2.51 DISTANT"; 3–4 nodes on `/investigations`, 1440 and 390). | axe run (see summary) | Start each accessible name with the visible text: "ARTEMIS HAB: Artemis surface habitat (nominal)…", "Search, ⌘K / Ctrl K", "2.51 DISTANT, D_min; open provenance of …". Take the tagline out of the brand link or include it in the name. |

---

## P3: polish

| # | Route / viewport | What is wrong | Evidence | Suggested fix |
|---|---|---|---|---|
| P3-1 | `/investigations`, all | The O₂ number field clips its own value: "34.0" has clientWidth 28 and scrollWidth 30. Five-character values (101.4) are worse. | `20-investigations-scenario_390.jpg` | Size the input to `6ch` with tabular figures. |
| P3-2 | Atlas inspector (default ISS) | Negative zero is printed: "Pressure −0.00 (−0 %)". | `21-focus-unlabelled-landmark_1440.jpg` (bottom right) | Normalise `-0` before formatting. |
| P3-3 | Atlas, `/investigations`, dossiers | Reference-atmosphere naming is inconsistent. The Legacy staging reference is labelled "30% / 10.2 PSIA" (a coordinate, not a name) next to "ISS" and "ARTEMIS HAB". The dossier uses "ARTEMIS HAB." (with a period) and "EXPLORATION ATM. / MARS TRANSIT". | `11-…`, `16-…` | Use one short-name table, e.g. "LEGACY REF". |
| P3-4 | Atlas, keyboard | A focused landmark whose label was culled (Tab stop 12, "Pressurized rover / lunar base") shows only an 11×10 px outline with no visible name. The focus colour is the evidence cyan (focus outline, focused-input border `#9fe3ef`), so cyan is not "evidence coverage only". | `21-focus-unlabelled-landmark_1440.jpg` | Show the label on focus. Use a neutral focus colour (`--text`). |
| P3-5 | Atlas, keyboard | **Tab order does not follow the visual order:** header (1–9), then field landmarks and probe (10–14), then the left panel (15–37), regime strip (38), inspector (39+). The tool rail comes after the whole inspector content (past stop 45). No traps and no unnamed controls were found. | Tab log | DOM order left → field → right → rail, or add skip links ("Skip to field", "Skip to tools"). |
| P3-6 | Atlas, Investigations | `aria-label` on `<p>` elements (`.ins-vd`, `._fD`, `._kindKey`). It is prohibited without a role and ignored by assistive tech (axe "incomplete": aria-prohibited-attr). | axe | Use visually hidden text, or `role="group"`. |
| P3-7 | Atlas, 1440 and 1280 | The Expeditions panel cuts its third card mid-title ("Artemis surface habitat" sliced at the panel edge) with no fade or scroll cue. At 1280 only 1.5 cards are visible. | `22-…`, `10-…` | Add a bottom fade or mask, or snap the scroll to whole cards. |
| P3-8 | Atlas | Redundant chrome: the snapshot status appears in both the header and the regime strip, and the verdict appears three times (inspector, strip, probe label). The reference has one of each. | `22-…` | Drop the strip copy of the snapshot, or the header copy on the Atlas. |
| P3-9 | `/investigations`, 1440 | When scrolled, the sticky ladder axis header covers the "Comparable runs in this regime, ranked by R" sub-heading. | `17-investigations-compare_1440.jpg` | Add `scroll-margin`/padding equal to the sticky header height. |
| P3-10 | `/investigations` ladder | "partial · all axes: none" (amber) is cryptic. | `17-…` | Use "partial match · none comparable on all 3 axes". |
| P3-11 | Provenance drawer, run inspector | Row labels mix case: "flame spread rate", "peak HRR (ICES-2024: 3,217 W)", "time to 2 mg/m³ aerosol" next to "Material", "Fuel class". | `19-provenance-drawer_1440.jpg` | Use sentence case throughout. |
| P3-12 | Dossiers | Three date formats on one page: "01-01-2010 → 12-31-2022" (US MM-DD), "24-Nov-2025", "2026-11-14". | `16-…` | Use ISO 8601 everywhere. |
| P3-13 | Atlas run inspector | A PSI run header shows an unexplained "DRAFT" badge ("PSI run DRAFT"), and the pressure row shows "NOMINAL" + "DRAFT". | `14-…` | Add a tooltip or legend line ("PSI record status: draft"), or omit the badge in the header. |
| P3-14 | All routes, 390 | The mobile header is 87 px (two rows) against the 56 px spec, which eats 10 % of the viewport above a field that should be ≥ 60 svh. | `05-…` | Collapse the nav into a single row with the actions, or into a menu. |
| P3-15 | `/investigations/PSI-20` | Three consecutive sections (Fingerprint, "Where the runs sit", Run table) each say there are no individual runs. "Summary rows" shows "3400%" and "2100%" verbatim with no flag. | `15-…` | Merge them into one statement. Mark obviously malformed source cells "as in source". |
| P3-16 | `/investigations`, 1440 | About 150 px of dead space under the scenario card, because the Finding card beside it is taller. | `20-…` (layout), 1440 capture not kept | Align the card heights, or move Reference atmospheres into the gap. |
| P3-17 | `/nope`, 1280×800 and 390 | The 404 page scrolls by 47 px and 153 px respectively. | capture log | Trim the footer padding, or allow it (minor). |
| P3-18 | All routes | Console warnings on every route: "resource … .css was preloaded using link preload but not used within a few seconds". No JS errors. | capture log | Check the route-level CSS splitting for unused preloads. |

---

## Axe, overflow and console summary

- **Axe** (2 viewports × 12 routes, after the URL state settled):
  - The only rule violated is `label-content-name-mismatch` (serious). It appears on all 12 routes at 1440 (2–6 nodes each). At 390 it appears on `/`, `?preset=ea&pub=1`, the Lunar view (1 node each: a landmark) and `/investigations` (4 nodes). There are no violations at 390 on the Mars view, the overview, the dossiers, Method, Sources or 404.
  - "Incomplete" items for manual review: `aria-prohibited-attr` (aria-label on `<p>`), and `color-contrast` on text over hatched gradients ("no pressure column in the PSI table" cells) and next to SVG.
  - No other WCAG A/AA rule failed.
- **Horizontal overflow:** none in any of the 48 views (scrollWidth equals innerWidth everywhere).
- **Console:** no JS errors and no page errors in any route or interaction. One or two CSS-preload warnings per route. The 404 response on `/nope` is expected.
- **Esc and focus:**
  - Run inspector: Esc closes it, removes `run=` from the URL, and returns focus to the run link.
  - Layers and Key popovers: Esc closes them and focus returns to the rail button.
  - Command search: Esc closes it and focus returns to the previously focused element (body when opened from load).
  - Provenance drawer: focus is trapped over 25 Tabs, and Esc closes it and returns focus to the trigger (subject to P1-1).

## What works well

- **The Atlas at 1440 reads as the intended observatory.** The field is the brightest element; the chrome is quiet, opaque and hairlined; the tool rail sits at the right edge; the instrument strip is bottom-centre. Tooltips name every rail button. There is no glow, glass, gradient or space imagery.
- **Semantic colour is disciplined.** Coverage uses one cyan, with lightness for closeness and dashed ½×/2× envelopes. Amber is limited to the probe, scenario rules, the active preset and caution boxes. The verdict is always a word.
- **Gravity separation is respected.** The regime detents are discrete, each with its own thumbnail and count. The overview (`23-regimes-overview_1440.jpg`, `25-regimes-overview_390.jpg`) shows four separate plates with nothing drawn between them, and "No distance is computed across plates" is stated.
- **Disclaimers are present on every surface:** field head, footprints, inspector, footer and dossiers ("Evidence proximity, not a safety rating", "not a hazard map", "no NASA endorsement"). Nothing reads as a hazard map, except during the P1-1 flash, which shows a wrong verdict rather than a hazard reading.
- **The hover tooltip** (`22-…`) is clear and correctly typed (PSI run · comparable, conditions, material, "Click to inspect source").
- **Provenance** (`19-…`): claim badges typed per value, signed gaps, and the D formula stated in place.
- **Command search** (capture not kept) is fast and well grouped (Investigation / Finding / Run), with an honest "nothing is sent anywhere" line.
- **Method and Sources** are clean reading pages with consistent type, a contents rail and a good measure.
- **The 404 page** is designed and on-brand.
- **The Layers popover** (`24-layers-popover_1440.jpg`) uses swatches that match the field encoding.
