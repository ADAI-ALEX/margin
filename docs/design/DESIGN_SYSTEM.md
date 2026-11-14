# MARGIN design system

Direction: **"instrument graphite"** — a precise, quiet research instrument. The data is the brightest thing on screen; chrome recedes. Derived from the research in [DESIGN_RESEARCH.md](DESIGN_RESEARCH.md). Tokens live in [`app/globals.css`](../../app/globals.css); fonts in [`lib/fonts.ts`](../../lib/fonts.ts). Feature CSS (`components/*/…css`) must consume tokens and never hard-code colours, fonts, radii or spacing.

## 1. Brand

**Mark.** Two iso-distance contours — DIRECT (filled) inside NEAR (outlined) coverage of tested conditions — and the user's scenario point (amber) outside them, joined by a dashed gap: the *margin* between a scenario and the nearest evidence. Source: `components/site/BrandMark.tsx` (paths exported as `MARK_PATHS`), `app/icon.svg`, `docs/assets/branding/`.

**Wordmark.** `MARGIN` in Archivo, width 125, weight 700, tracking +0.14 em. Always uppercase; never in a box.

**Usage.** Minimum mark size 16 px. Clear space = the height of the scenario dot on every side. The mark is always shown on `--bg` or `--surface-1`; never recoloured, rotated or placed on photography. No NASA insignia anywhere in the product or repository; MARGIN does not imply NASA endorsement.

**Voice.** Plain, exact, unexcited. Say what was measured, computed, stated or assumed. Never "safe", "risk", "predicts", "certified".

## 2. Colour

| Token | Value | Role |
|---|---|---|
| `--bg` | `#0B0F14` | Canvas (graphite-navy, never pure black) |
| `--surface-1` | `#10151C` | Panels, rails |
| `--surface-2` | `#151B24` | Raised controls, table headers |
| `--surface-3` | `#1C2430` | Selected segment, hover on raised |
| `--line` / `--line-strong` / `--line-soft` | `#262F3C` / `#34404F` / `#1B222C` | Hairlines; separation is by 1 px lines plus luminance steps, not shadows |
| `--text` / `--text-2` / `--text-3` | `#E6EAF0` / `#A6B0BD` / `#858F9D` | Three text levels only; contrast ≥ 12.9 / 7.1 / 5.1 : 1 on every surface |
| `--signal`, `--signal-strong` | `#5CC8D6`, `#8FE0EA` | **Evidence coverage** and focus. One hue only |
| `--ev-direct`, `--ev-near`, `--ev-edge` | cyan at 34 % / 12 % / edge line | Coverage bands (D ≤ 1, D ≤ 2.5) |
| `--scenario` | `#F0A53C` | **The user's scenario** and cautions (partial match, boundary proximity) |
| `--tier-pub` | `#9DB0FF` | Published evidence (not in PSI); always also a ring shape |
| `--tier-plan` | `#8D97A5` | Planned experiments; always dashed |
| `--limit` | `#C9A7F0` | Reported limits (thresholds, not tests); ring with tick |
| `--claim-*` | see file | Claim-ledger badges |

**Rules.**
- Evidence uses a single cool hue whose *lightness* encodes closeness. Never red/amber/green ramps, never a warm colour on coverage — a coverage map must not read as a hazard map.
- Amber means "yours" or "careful". It is never used for data categories.
- A verdict class (DIRECT / NEAR / DISTANT / NONE) is always written as a word; colour never carries it alone.
- No gradients in UI chrome, no glows, no glassmorphism (the sticky header uses a single 8 px backdrop blur for legibility only).

## 3. Typography

| Role | Face | Settings |
|---|---|---|
| Display (wordmark, page titles, verdict class, hero numerals) | Archivo (variable `wdth`) | width 112–125, weight 600–700, tracking −1.5 % (titles) / +2 % (verdict class) |
| Interface and reading text | IBM Plex Sans | 400 / 500 / 600; body 14 px / 1.5, small 12.5 px, labels 11 px / 600 |
| Measurements, ids, file names, dates | IBM Plex Mono | 400 / 500, tabular figures |

Scale (px): 11 · 12.5 · 14 · 16 · 20 · 28 · 40. Mono is never used for sentences. Uppercase is reserved for the wordmark, claim badges, and tracked map annotations.

## 4. Space, grid, shape

- 4 px base: `--s1`…`--s8` = 4, 8, 12, 16, 24, 32, 48, 64.
- Page gutter 24 px (16 px ≤ 640 px). Header 56 px, sticky.
- Radii: 2 px (segments, badges), 4 px (controls), 6 px (panels). No pill shapes except status dots.
- Atlas workspace grid (≥ 1180 px): `scenario rail 288 px | map (fluid) | inspector 380 px`; 900–1180 px: rail + map, inspector below; < 900 px: single column, controls collapse into a summary bar that expands.

## 5. Surfaces

`bg` (canvas) → `surface-1` (rails, panels) → `surface-2` (inputs, table heads, raised) → `surface-3` (selected). One step = one level of emphasis. Panels: 1 px `--line`, radius 6 px, no shadow. Dialog/drawer: `surface-1`, 1 px `--line-strong`, shadow `0 24px 64px rgba(0,0,0,.45)` (the only shadow in the system).

## 6. Components

| Component | Spec |
|---|---|
| Header | Mark + wordmark, dimmed tagline, nav links with a 2 px `--signal` underline for the current page, mono status ("PSI snapshot · runs"), GitHub icon |
| Button `.btn` | 30 px, `surface-2`, 1 px `line-strong`, radius 4; pressed = cyan tint + cyan border; `.btn-quiet` transparent |
| Segmented `.seg` | 2 px inset track on `surface-1`; selected segment `surface-3` + inset hairline (no fill colour) |
| Input / select | 32 px, `surface-1`, 1 px `line-strong`; numeric inputs in mono; focus = cyan border + focus ring |
| Switch | 28 × 16 track; on = cyan track |
| Tabs `.tabs` | text tabs with a 2 px cyan underline, no boxes |
| Panel `.panel` | `surface-1`, hairline, radius 6; `.panel-head` 13 px / 600 title |
| Claim badge `.claim` | mono 10 px uppercase, 1 px border in the claim colour, 8 % tinted fill; dashed for DRAFT / PLANNED / ASSUMED |
| Tables | header row `surface-2`, 11 px / 600 labels; body rows 1 px `line-soft`; numbers right-aligned mono; wide tables scroll inside their own focusable region |
| Tooltip | `surface-3`, 1 px `line-strong`, radius 4, 12 px text; appears on hover and focus |
| Drawer | right-side, 440 px, Esc closes and focus returns |

## 7. Chart language

- **Frame**: plot on `--bg` inside a `surface-1` panel; axis lines `--line-strong`; gridlines 1 px `--line-soft`, dashed `2 4`; tick labels mono 10.5 px `--text-3` with units; axis titles 11 px Plex Sans `--text-2`.
- **Coverage bands**: `--ev-near` fill + `--ev-edge` 1 px edge at D = 2.5; `--ev-direct` at D = 1; outside: 45° hatch in `--ev-none-hatch`. Dashed thin cyan contours for the ½× / 2× scale envelopes.
- **Marks**: PSI comparable run = 2.5 px dot `--tier-psi`; other fuel class = 1.5 px dot `--text-3` at 45 %; published = 4 px ring `--tier-pub`; reported limit = ring + tick `--limit`; planned = dashed ring `--tier-plan`; landmark atmospheres = small hollow triangle + tracked caps label; **scenario** = amber pin with crosshair rules to both axes and a mono readout.
- **Labels**: direct labels beside marks (OWID); tracked uppercase for landmarks (NASA Eyes); never a legend you must decode before reading the chart — the key sits under the plot and repeats "not a hazard map".
- **Source line** under every chart: what is drawn and where it comes from.
- Small multiples (gravity regimes) share axes and scales; the active regime has a cyan top rule.

## 8. Interaction & motion

- Hover: +1 surface step. Focus: 2 px cyan ring offset by 2 px of `--bg`. Selected: cyan underline (tabs, nav) or `surface-3` (segments).
- Motion: 140 ms `cubic-bezier(.2,.7,.2,1)` for colour/opacity; the scenario pin glides 250 ms on preset jumps. `prefers-reduced-motion` disables all transitions.
- Progressive disclosure: verdict first; breakdown, sensitivity, ranking, findings and sources behind tabs; run details in a drawer.

## 9. Responsive behaviour

1440 / 1280: three-column Atlas. 768: map full width, scenario controls in a two-column grid above, inspector below. 390: one column; map ≥ 320 px tall; tap to place the pin (no drag); nav becomes a horizontal scroller under the header. No page-level horizontal scroll at any width (tested).

## 10. Accessibility

WCAG 2.1 AA: all text ≥ 4.5 : 1 (tested with axe in CI on every route at desktop and mobile); non-text marks ≥ 3 : 1 against `--bg`; every chart has a text summary (`aria-label`) and a tabular alternative (run tables, ranking); all controls keyboard-operable (segmented controls use arrow keys; pin moves with arrow keys); scroll regions are focusable; the verdict is announced with `aria-live="polite"`.
