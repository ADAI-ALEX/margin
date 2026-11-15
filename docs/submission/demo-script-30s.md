# 30-second demo: script and edit

**Video:** https://margin.adai.systems/demo/margin-demo-30s.mp4 (29.5 s, 1920 × 1080 at 30 fps, H.264 + AAC stereo, −16 LUFS).
It is also the first thing on the Guide page: https://margin.adai.systems/guide#demo

**Hard limit:** 30 s. Over 30 s makes the project ineligible for Global Judging (Project Submission Guide).
The recorder refuses to produce a cut whose narration would run past 29.8 s.

## How it is made
One script, [`scripts/record-demo.mjs`](../../scripts/record-demo.mjs), records and edits the whole video:

- **Picture.** A real screen recording of the live site, https://margin.adai.systems, driven by
  Playwright along the same path as `tests/e2e/hero-flow.spec.ts`. No browser chrome: the page fills the
  frame. It opens on a title card with the MARGIN mark beside the wordmark, as in the site header. A
  pointer glides to each control and clicks it; smooth punch-in zooms (applied in the edit) frame what
  each beat is about. Captions are set in the site's typeface and every number in them is read from the
  page as it renders (the coverage-gap card, the verdict's `data-verdict` / `data-d`, the number of
  ranked investigations).
- **Narration.** I wrote the lines; they are voiced with Kokoro, an open-weight neural text-to-speech
  model (Apache-2.0), voice `af_heart`, by [`scripts/demo/narrate.py`](../../scripts/demo/narrate.py).
  One clip per beat is stored in [`scripts/demo/voice/`](../../scripts/demo/voice/), and the recorder
  starts each line when both the previous line and its on-screen action have finished, so voice and
  picture stay in step. "NASA" is passed to the voice as "Nasa" so it is spoken as a word.
- **Sound.** A quiet ambient music bed that ducks under the voice, a soft swish matched to each pointer
  glide (length and level follow the distance), a two-part mouse click on each click, and a low swoosh
  on the title and page changes. All of it is synthesised in code by
  [`scripts/demo/synth_audio.py`](../../scripts/demo/synth_audio.py): no samples, no licensed music.
  The mix is set to −16 LUFS integrated with a peak limiter.

To re-record (needs ffmpeg and Python with numpy):

```sh
FFMPEG=$(which ffmpeg) PYTHON=$(which python3) node scripts/record-demo.mjs
```

## Script (as cut)

| Time | On screen | Narration | Caption |
|---|---|---|---|
| 0:00–0:04 | Title card: MARGIN mark and wordmark; "NASA Space Apps 2026 · Flame in Freefall · margin.adai.systems". | "How close is NASA's fire evidence to the air future crews will breathe?" | (title card) |
| 0:04–0:10 | The Atlas, ISS cabin; the pointer goes to the "max PSI solid test · 22.2%" line and the shot punches in. | "NASA's space fire tests on solid materials stop at twenty-two percent oxygen." | **NASA's 140 space fire tests on solid materials top out at 22.2% O₂ · planned habitats: 26.5–34%** |
| 0:10–0:13 | Landmark → Exploration Atmosphere; punch in on the probe and the verdict: **DISTANT**, D 6.28. | "Future habitats plan thirty-four. Distant." | **Exploration Atmosphere · 34% O₂ at 56.5 kPa → nearest test DISTANT · D 6.28** |
| 0:13–0:15 | "Include published evidence" on: still **DISTANT**, D 2.51. | "Add published results. Still distant." | **+ published NASA results (Saffire) → still DISTANT · D 2.51** |
| 0:15–0:18 | Flow 20 cm/s; punch in: **NEAR**, D 1.51. | "Assume faster airflow, and it's near." | **Assume 20 cm/s airflow → NEAR · D 1.51 · a different scenario, not a correction** |
| 0:18–0:20 | Gravity → Lunar: the field empties to the lunar regime. | "On the Moon: no tests at all." | **The Moon: no PSI tests · nothing is borrowed from other gravity levels** |
| 0:20–0:22 | The nearest-test link opens the run inspector; punch in on its conditions and source. | "Every number is sourced." | **Every number links to its source: the PSI table row or the NASA paper** |
| 0:22–0:25 | Header → Investigations; the page scrolls to the ranked catalogue. | "Then rank all twenty-four NASA studies for your cabin." | **Investigations: all 24 NASA PSI combustion studies, ranked for your scenario** |
| 0:25–0:29.5 | Header → Guide (the boxed link); the Guide opens. | "Evidence proximity. Not a safety rating." | **Evidence proximity, not a safety rating · margin.adai.systems** |

The flow beat is deliberate: showing that NEAR at 20 cm/s is a different scenario, not a correction,
is an honesty point I chose to keep (BUILD_LOG 12:40).

## Numbers in the captions and where they come from
| Caption number | Source |
|---|---|
| 140 tests, 22.2%, 26.5–34% | `HEADLINE` in `lib/data` (computed from the PSI snapshot), shown on the coverage-gap card |
| 34% O₂, 56.5 kPa | Exploration Atmosphere preset, `content/curated.ts` (HEO-DM-1006) |
| D 6.28, 2.51, 1.51 | The engine on the snapshot; asserted by `tests/e2e/hero-flow.spec.ts` |
| 24 investigations | The ranked catalogue on /investigations (rows with a PSI accession) |
| Lunar regime | PSI holds no partial-gravity runs; the partial-gravity values are Olson & Ferkul ICES-2012-3492 Table I (NTRS 20130010991) |
