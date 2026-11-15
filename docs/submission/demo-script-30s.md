# 30-second demo: script and recording

**Video:** https://margin-two-rho.vercel.app/demo/margin-demo-30s.mp4 (26.8 s, 1440 × 900, H.264, no audio).
It is also embedded on the Guide page: https://margin-two-rho.vercel.app/guide#demo

**Hard limit:** 30 s. Over 30 s makes the project ineligible for Global Judging (Project Submission Guide).
The recording runs 26.8 s.

## How it is made
The video is a real screen recording of a production build of the app, driven by
[`scripts/record-demo.mjs`](../../scripts/record-demo.mjs) with Playwright. The script clicks through the
same path as `tests/e2e/hero-flow.spec.ts`, shows a visible pointer for each click, and burns in an
English caption for each beat. Every number in a caption is read from the page as it renders (the
coverage-gap card and the verdict's `data-verdict` / `data-d`), so the captions cannot drift from the app.

To re-record after a change:

```sh
npm run build && npx next start -p 3100
BASE=http://localhost:3100 FFMPEG=$(which ffmpeg) node scripts/record-demo.mjs
```

Rules the recording follows: no NASA logos, insignia or mission patches; no music; no personal
information on screen; no AI-generated imagery (the Guide illustrations do not appear in it).

## Script (as recorded)

| Time | On screen | Caption |
|---|---|---|
| 0:00–0:03 | Title card: "NASA Space Apps 2026 · Flame in Freefall", MARGIN, tagline. | **How close is NASA's fire evidence to the habitats we're about to fly?** |
| 0:03–0:06 | The Atlas, ISS cabin in microgravity; the dashed line marks the highest O₂ in any PSI solid-material test. | **NASA's space fire tests (PSI): 140 solid-material tests with recorded O₂ top out at 22.2%. Planned habitats: 26.5–34%.** |
| 0:06–0:10 | Landmark → Exploration Atmosphere. The probe jumps to 34% / 56.5 kPa; verdict **DISTANT**, D 6.28. | **Exploration Atmosphere, 34% O₂ at 56.5 kPa: nearest PSI test is DISTANT, D 6.28.** |
| 0:10–0:14 | Switch on "Include published evidence". Saffire results appear; verdict stays **DISTANT**, D 2.51. | **Add published NASA results (Saffire): still DISTANT at 10 cm/s, D 2.51.** |
| 0:14–0:18 | Flow 20 cm/s. Verdict **NEAR**, D 1.51. | **Assume 20 cm/s airflow, a different scenario: NEAR, D 1.51. MARGIN shows the sensitivity; it does not pick the flow.** |
| 0:18–0:22 | Gravity → Lunar. The field changes to the lunar regime; the partial-gravity panel appears. | **The Moon: PSI has no partial-gravity tests. Nothing is borrowed from other gravity levels.** |
| 0:22–0:25 | The nearest-test link in the field notes opens the run inspector with its NTRS source. | **Every number links to its source: NASA PSI table rows and NTRS papers.** |
| 0:25–0:27 | End card. | **Evidence proximity, not a safety rating.** · margin-two-rho.vercel.app |

The flow-sensitivity beat is deliberate: showing that NEAR at 20 cm/s is a different scenario, not a
correction, is an honesty point I chose to keep (BUILD_LOG 12:40).

## Numbers in the captions and where they come from
| Caption number | Source |
|---|---|
| 140 tests, 22.2%, 26.5–34% | `HEADLINE` in `lib/data` (computed from the PSI snapshot), shown on the coverage-gap card |
| 34% O₂, 56.5 kPa | Exploration Atmosphere preset, `content/curated.ts` (HEO-DM-1006) |
| D 6.28, 2.51, 1.51 | The engine on the snapshot; asserted by `tests/e2e/hero-flow.spec.ts` |
| Lunar regime | PSI holds no partial-gravity runs; the partial-gravity values are Olson & Ferkul ICES-2012-3492 Table I (NTRS 20130010991) |
