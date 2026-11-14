# MARGIN design system: "an observatory for evidence"

Status: current (redesign `redesign/eyes`, 2026-11-14). The previous interim system ("instrument graphite") is preserved on the branch `wip/instrument-graphite`. Research behind every decision: [`DESIGN_RESEARCH.md`](DESIGN_RESEARCH.md).

MARGIN is a full-screen scientific exploration environment for condition space. The O₂ × pressure plane of one gravity regime is the "universe"; NASA tests, published results, planned experiments and reference cabin atmospheres are its "bodies"; iso-distance contours of evidence coverage are its "orbits"; the user's scenario is a probe. Everything else appears as context when the probe or a test is selected.

## 1. Principles

1. **The field is the hero.** On the Atlas the evidence field fills the viewport; panels float over it and collapse. The data is the brightest thing on screen; chrome is typographic, quiet and pushed to the edges.
2. **Instruments, not forms.** Console, regime detents and tool rail read as parts of one instrument.
3. **Typographic annotation.** Landmarks, the probe and the selected run are labelled in the field (tracked caps for landmarks, sentence case for runs), placed without collisions. The key explains; it is never needed to read the field.
4. **Context on demand.** Verdict first and always visible; detail in tabs, the run inspector, drawers.
5. **Honest emptiness.** A regime without comparable evidence shows an empty, finely hatched plane and a plain statement. Never decorated away.
6. **Motion explains state change**, never decorates, never loops (§5).
7. **One identity across every route**: one shell, one type system, one token set, one component set.

## 2. Colour (tokens in `app/globals.css`)

Canvas `--canvas #05070a`: near-black with a trace of the evidence hue. Pure black (the reference's `#010101`) makes thin hairlines and small light text halate; this value keeps the darkest possible field while letting `--line` steps read. Surfaces are **opaque** (no glass, no blur, no shadows): depth comes from luminance steps and hairlines, as in the reference.

| Token | Value | Use |
|---|---|---|
| `--surface-1` | `#0e1114` | floating panels |
| `--surface-2` | `#14181c` | cards, inputs, table heads |
| `--surface-3` | `#1b2025` | hover, selected |
| `--surface-4` | `#232930` | pressed, tooltips |
| `--line-faint` / `--line` / `--line-strong` | `#161a1f` / `#2a3138` / `#3a424b` | hairlines |
| `--text` | `#eef1f4` | primary text (≥ 12.9:1 on every surface) |
| `--text-2` | `#acb4bd` | secondary text (≥ 7.0:1) |
| `--text-3` | `#8b949e` | tertiary text (≥ 4.77:1 on `--surface-4`, 6.56:1 on canvas) |

Exactly three text levels. Contrast was computed (WCAG relative luminance) for every text token on every surface; the lowest pair is `--text-3` on `--surface-4` at 4.77:1.

**Semantic hues, one meaning each** (never mix):

| Meaning | Token(s) | Shape that carries the same meaning |
|---|---|---|
| Evidence coverage (closeness of tested conditions) | `--ev #56c6dc`, `--ev-direct` (30 %), `--ev-near` (11 %), `--ev-edge`, `--ev-edge-soft` | filled bands with thin edges; dashed envelopes |
| The user's scenario and cautions (partial match, boundary proximity, assumed) | `--scenario #f2a93b` | the probe; caution rules |
| Published evidence (not in PSI) | `--tier-pub #97a9ff` | ring |
| Reported limits | `--limit #d29cf2` | ring + horizontal tick |
| Planned (never evidence) | `--tier-plan #8f98a3` | dashed ring |
| PSI runs | `--tier-psi`, `--tier-psi-muted` | dot (other fuel class: smaller, dimmer) |
| Snapshot status | `--text-3` | hollow square; never a green "live" dot |

Rules: coverage uses only `--ev*` (single hue, lightness = closeness), never a red/amber/green ramp, never warm colours. Amber is never metadata. Verdict classes are always written as words. No gradients in chrome, no neon, no glow.

Claim badges (`.claim[data-kind]`): MEASURED (`--ev-strong`), COMPUTED (`--text`), PUBLISHED/STATED (`--tier-pub`), NOMINAL/ASSUMED (`--scenario`, a caution), REPORTED LIMIT (`--limit`), PLANNED/DRAFT (`--text-3`, dashed border). The word is always printed.

## 3. Typography (`lib/fonts.ts`)

- **Albert Sans** (variable 100–900, SIL OFL 1.1, Google Fonts, self-hosted by `next/font`) for everything readable. A contemporary geometric grotesque that does what the reference's Metropolis does: light (300) at large sizes, 600 with wide tracking for uppercase labels, tabular figures. Not Inter, not a serif.
- **IBM Plex Mono** (OFL) only for run ids, file names, source locators and original table cells.

| Role | Size / weight / tracking |
|---|---|
| Page title | 48 px / 300 / −0.025 em (34 px on mobile) |
| Readout (verdict word, D) | 30–34 px / 300 / +0.1 em on class words |
| Card title (expedition, run) | 20–26 px / 300 / −0.02 em, leading ≈ 1.02 |
| Field title | 20 px / 300 |
| Body (reading) | 16 px / 400 / 1.55 |
| UI body | 14 px / 400 |
| Small | 12.5 px, 11.5 px |
| Caps label (`.caps`, `.ui-label`) | 10.5 px / 600 / +0.16 em, uppercase |
| Wide caps (card metadata, landmarks) | 10.5–11 px / 600 / +0.20–0.24 em |

Numbers: `.num` (tabular, lining figures) everywhere a value is shown.

## 4. Space and shape

4 px base (`--s1`…`--s9`: 4, 8, 12, 16, 20, 24, 32, 48, 64). Radii: `--r-sm 3px` controls, `--r-md 6px` panels and cards, `--r-round` only for the switch track. Hit targets: icon controls 32 × 32 px (≥ 28 px visible), primary controls 44 px on touch (regime detents on mobile). Header height 64 px (56 px on mobile). Reading measure 70 ch.

## 5. Motion

| Token | Value | Use |
|---|---|---|
| `--dur-1` | 120 ms | hover, colour |
| `--dur-2` | 200 ms | panels, drawers, dim/highlight |
| `--dur-3` | 360 ms | view transitions (zoom to a run, probe glide on a preset jump) |
| `--ease` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | decelerate |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.2, 1)` | view moves |

Regime changes are cuts: points never travel between regimes. No idle animation, no loops, no particles. `prefers-reduced-motion` makes every transition instant (global rule in `globals.css`; the field's zoom animation checks it in JS).

## 6. Components (one implementation each)

| Component | File | Notes |
|---|---|---|
| App shell: header, footer | `components/site/SiteHeader.tsx`, `SiteFooter.tsx`, `site.css` | header transparent over the Atlas, solid elsewhere; nav `aria-label="Primary"`; footer hidden on the desktop Atlas (credit line instead) |
| Brand mark | `components/site/BrandMark.tsx` | one geometry for header, favicon, banner, OG |
| Floating / collapsible panel | `components/ui/Panel.tsx` | `.ui-panel`, light label + hairline + square collapse button |
| Card | `.ui-card` (`ui.css`) | expedition and investigation cards |
| Icon rail button + tooltip | `components/ui/IconButton.tsx` | visible tooltip on hover and focus = accessible name |
| Radio group: segmented / detents | `components/ui/controls.tsx` `RadioGroup` | roving tabindex, arrows/Home/End; detents for the regime selector |
| Switch, Select, Number field with unit toggle | `controls.tsx` | number fields commit on blur/Enter |
| Tabs | `components/ui/Tabs.tsx` | `TabList` + `tabPanelProps` |
| Drawer / inspector sheet | `components/ui/Drawer.tsx` | right on wide, bottom sheet on narrow; Esc, focus return, focus trap |
| Tooltip | `.ui-tip` (rail), `.fld-tip` (field hover) | |
| Table | `.ui-table`, `.ui-table-scroll` (focusable region) | |
| Claim badge | `components/ui/misc.tsx` `ClaimBadge`, `.claim` | |
| Chart frame | `misc.tsx` `ChartFrame` | title → definition → plot → source line → actions |
| Key / legend | `misc.tsx` `KeyList`, `components/atlas/ToolRail.tsx` `FieldKey` | |
| Breadcrumb | `misc.tsx` `Breadcrumb` | |
| Command search | `components/ui/CommandSearch.tsx` | ⌘K / Ctrl K, local index loaded on demand |
| Toast | `components/ui/Toast.tsx` | "Link copied" |
| Run inspector | `components/run/RunInspector.tsx` | the single run view used by Atlas, Investigations and dossiers |
| Document page frame | `.ui-page`, `.ui-page-head`, `.ui-page-title`, `.ui-page-lede` | Method, Sources, Investigations, dossiers |

Feature CSS (`components/atlas/atlas.css`, `components/casefile/*.module.css`, `components/dossier/*`, `components/docs/docs.css`) consumes tokens only: no hex or rgb literals, no font stacks, no ad-hoc radii.

## 7. The field encoding (`.mk-*` in `ui.css`)

| Mark | Meaning |
|---|---|
| small dot (`--tier-psi`) | comparable PSI run (shape by fuel class: ● solid, ◆ droplet, + gas burner, ■ smoke source) |
| smaller, dimmer dot | PSI run of another fuel class |
| ring (`--tier-pub`) | published result (not in PSI) |
| ring + tick (`--limit`) | reported limit (a threshold, not a tested condition) |
| dashed ring (`--tier-plan`) | planned experiment (never evidence) |
| hollow triangle + tracked caps | reference cabin atmosphere |
| amber ring + dot, crosshairs, axis tags | the scenario probe (the one amber element) |
| `--ev-direct` band, `--ev-near` band, thin edges | D ≤ 1 and D ≤ 2.5 regions |
| dashed thin contour | the D = 2.5 boundary at ½× and 2× scales |
| faint hatch | no comparable evidence (D > 2.5) |

Frame: O₂ linear (10–45 %), pressure log (20–520 kPa, psia secondary axis). Never tilted. Every field carries "Evidence proximity, not a safety rating", "Not a hazard map" and a source line.

## 8. Brand

- **Mark**: two iso-distance contours of tested conditions (DIRECT filled inside NEAR, `--ev`) and the user's scenario probe outside them (`--scenario`), joined by a dashed gap: the margin between a scenario and the nearest evidence. Drawn on a 32-unit grid (`MARK_PATHS`).
- **Wordmark**: MARGIN in uppercase, Albert Sans 600, tracking +0.26 em.
- **Clear space**: one probe diameter (≈ 5.4 grid units, 17 % of the mark) on every side; between mark and wordmark, 0.5 × mark height.
- **Minimum size**: mark 16 px (favicon); mark + wordmark 20 px mark height.
- On dark only (canvas or `--surface-1`). No NASA insignia, no space imagery, no endorsement implied.

## 9. Don'ts

Inter-everywhere, purple/blue gradients, neon glow, glass cards, pill buttons everywhere, emoji icons, marketing heroes, dashboards of identical cards, starfields, planets, spacecraft, a tilted data plane, a gravity slider, anything that interpolates between regimes, warm colours on coverage, a green "live" indicator.
