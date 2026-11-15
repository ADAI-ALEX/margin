# 30-second demo: script and recording

**Video:** https://margin.adai.systems/demo/margin-demo-30s.mp4 (25.2 s, 1920 × 1080, H.264 + AAC stereo, −16 LUFS).
It is also the first thing on the Guide page: https://margin.adai.systems/guide#demo

**Hard limit:** 30 s. Over 30 s makes the project ineligible for Global Judging (Project Submission Guide).
The recording runs 25.2 s.

## How it is made
- **Picture.** A real screen recording of the live site, https://margin.adai.systems, driven by
  [`scripts/record-demo.mjs`](../../scripts/record-demo.mjs) with Playwright along the same path as
  `tests/e2e/hero-flow.spec.ts`. It is framed in a browser window whose tab shows the MARGIN favicon and
  whose address bar shows margin.adai.systems; the title and end cards carry the MARGIN mark. A visible
  pointer shows each click, and every beat has a burned-in English caption whose numbers are read from
  the page as it renders (the coverage-gap card and the verdict's `data-verdict` / `data-d`).
- **Voiceover.** I wrote the narration; it was voiced with Higgsfield (Seed Audio, preset voice
  "Arthur") and is stored as [`scripts/demo/narration.flac`](../../scripts/demo/narration.flac). The
  recorder cuts it into its phrases and places each one on the beat it describes. The browser frame
  carries the label "AI voiceover (Higgsfield)" for the whole video, and the end card repeats it.
- **Music and sounds.** An ambient pad (A minor, F, C, G) with soft high plucks, a click for each
  interaction, a whoosh on the title and end cards and a chime when the verdict class changes, all
  synthesised in code by [`scripts/demo/synth_audio.py`](../../scripts/demo/synth_audio.py): no samples,
  no licensed music. The music ducks under the voice; the mix is set to −16 LUFS with a peak limiter.

To re-record (needs ffmpeg and Python with numpy):

```sh
FFMPEG=$(which ffmpeg) PYTHON=$(which python3) node scripts/record-demo.mjs
```

Rules the recording follows: no NASA logos, insignia or mission patches; no personal information on
screen; no AI-generated imagery (the Guide illustrations do not appear in it).

## Script (as recorded)

| Time | On screen | Voiceover | Caption |
|---|---|---|---|
| 0:00–0:04 | Title card with the MARGIN mark: "NASA Space Apps 2026 · Flame in Freefall". | "How close is NASA's fire evidence to the air we'll breathe?" | (title card) |
| 0:04–0:08 | The Atlas, ISS cabin in microgravity; the dashed line marks the highest O₂ in any PSI solid-material test. | "Its space tests stop at twenty-two percent oxygen." | **NASA's 140 space fire tests on solid materials top out at 22.2% O₂. Planned habitats: 26.5–34%.** |
| 0:08–0:11 | Landmark → Exploration Atmosphere; verdict **DISTANT**, D 6.28. | "Future habitats plan thirty-four." | **Exploration Atmosphere, 34% O₂ at 56.5 kPa: nearest test DISTANT, D 6.28** |
| 0:11–0:14 | "Include published evidence" on; still **DISTANT**, D 2.51. | "Add results," | **+ published NASA results (Saffire): still DISTANT, D 2.51** |
| 0:14–0:17 | Flow 20 cm/s; **NEAR**, D 1.51. | "change the airflow: MARGIN shows the shift." | **Assume 20 cm/s airflow: NEAR, D 1.51 · a different scenario, not a correction** |
| 0:17–0:20 | Gravity → Lunar. | "The Moon? No tests." | **The Moon: no PSI tests. Nothing is borrowed from other gravity levels.** |
| 0:20–0:22 | The nearest-test link opens the run inspector with its NTRS source. | "Every number, sourced." | **Every number links to its NASA source.** |
| 0:22–0:25 | End card with the MARGIN mark and margin.adai.systems. | (music) | **Evidence proximity, not a safety rating.** |

The flow-sensitivity beat is deliberate: showing that NEAR at 20 cm/s is a different scenario, not a
correction, is an honesty point I chose to keep (BUILD_LOG 12:40).

## Numbers in the captions and where they come from
| Caption number | Source |
|---|---|
| 140 tests, 22.2%, 26.5–34% | `HEADLINE` in `lib/data` (computed from the PSI snapshot), shown on the coverage-gap card |
| 34% O₂, 56.5 kPa | Exploration Atmosphere preset, `content/curated.ts` (HEO-DM-1006) |
| D 6.28, 2.51, 1.51 | The engine on the snapshot; asserted by `tests/e2e/hero-flow.spec.ts` |
| Lunar regime | PSI holds no partial-gravity runs; the partial-gravity values are Olson & Ferkul ICES-2012-3492 Table I (NTRS 20130010991) |
