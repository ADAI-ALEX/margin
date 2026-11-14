# 30-second demo: script and recording plan

**Hard limit:** 30 s. Over 30 s makes the project ineligible for Global Judging (Project Submission
Guide; Kickoff §I.8). **Target total: 0:27, never above 0:28.** Check the duration shown on the host
page (YouTube), not only the editor timeline.

Status: DRAFT. Every on-screen number below is computed by the app; re-check it on production on
the recording day. `[S#]` tags point to the source table in `project-page.md`; they are notes for
us, not captions.

## Rules for the recording
- Record the **production site** in a clean browser profile: no bookmarks bar, no other tabs, no
  extensions, no personal names, e-mail addresses or notifications on screen.
- Window 1440 × 900 at 100% zoom (matches the Playwright `desktop` project, so the flow is tested).
- **No NASA logos**, insignia or mission patches anywhere (none exist in the app; do not add a title
  card with one).
- **Burned-in English captions** for every line. Voice-over optional; if used, read the captions.
- **No music** (copyright risk). Silence or room tone is fine.
- No minors on screen or in audio. No SI-generated imagery.
- Start URL: `<!-- PRODUCTION_URL -->/` (default ISS view). Do one full dry run first so routes are warm.

## Script (second by second)

| Time | On screen (action) | Caption (burned in) |
|---|---|---|
| 0:00–0:03 | Title card on warm paper: "MARGIN" and the tagline. Team name small. | **MARGIN: how close is NASA's fire evidence to the habitats we're about to fly?** · TODO team name |
| 0:03–0:07 | Atlas loaded. Slow zoom or highlight on the hero sentence above the map. | **PSI's 140 solid-material tests with a recorded O₂ top out at 22.2%. [S3]** |
| 0:07–0:11 | Landmark menu → "Pressurized rover / lunar base — Exploration Atmosphere". Pin jumps to 34% / 8.2 psia. Verdict card reads **DISTANT** (D 6.28). | **Exploration Atmosphere, 34% O₂: nearest PSI test is DISTANT. [S4][S6]** |
| 0:11–0:15 | Click "Include published evidence". Saffire VI ring appears near the pin. Verdict stays **DISTANT**, D **2.51**; robustness reads "Sensitive". | **Add published NASA results (Saffire VI): still DISTANT at 10 cm/s, D 2.51. [S6]** |
| 0:15–0:18 | Flow "20" in the toolbar. Verdict changes to **NEAR**, D 1.51. Flow-sensitivity chart visible in field notes if it fits the frame. | **At 20 cm/s, a different scenario, it is NEAR. MARGIN shows the sensitivity; it does not pick the flow. [S6][S7]** |
| 0:18–0:23 | Gravity "Moon". The Moon sheet is selected and reads "No PSI tests"; the partial-gravity dot plot shows Mylar Moon 15.6, 0 g 17.0, 1 g 21.2 as separate points. | **Moon: PSI has no partial-gravity tests. For Mylar, the lunar limit sat below both 0 g and 1 g. [S13][S5]** |
| 0:23–0:26 | Click the nearest-test link in the field notes. Specimen card opens with original values and its NTRS source link; hover the link. | **Every number links to its source: NASA PSI rows and NTRS papers.** |
| 0:26–0:28 | End card (or hold on the Atlas) with the short URL. | **Evidence proximity, not a safety rating.** · TODO short URL |

Total: 0:28 maximum. If the cut runs long, shorten 0:03–0:07 to 3 s first, then trim the end card
to 1.5 s. Never cut the flow-sensitivity beat: showing that NEAR at 20 cm/s is a different scenario,
not a correction, is a deliberate honesty point (owner decision, BUILD_LOG 12:40).

## Exact click path (tested by `tests/e2e/hero-flow.spec.ts`)
1. `select#atlas-preset` → value `ea` (label "Pressurized rover / lunar base — Exploration Atmosphere").
2. Switch "Include published evidence".
3. Flow radio "20" (accessible name "20 centimetres per second").
4. Gravity radio "Moon" (accessible name "Lunar (0.165 g)").
5. Field notes → first underlined test name (`button.atlas-runlink`) → specimen card → source link.

At step 4 with published evidence on, the nearest test is the LUCI PMMA rod (published, D 7.47,
verdict DISTANT) and its specimen card links to NTRS 20250010653 [S6]. With published evidence off,
the Moon verdict is NONE.

## Numbers in the captions and where they come from
| Caption number | Source |
|---|---|
| 140 tests, 22.2% | `HEADLINE` in `lib/data` (computed from the PSI snapshot) [S3] |
| 34% O₂ | Exploration Atmosphere preset, `content/curated.ts` (HEO-DM-1006) [S4] |
| D 6.28, 2.51, 1.51 | Engine on the snapshot; `hero-flow.spec.ts` oracle; BUILD_LOG 12:52 [S6] |
| Mylar 15.6 / 17.0 / 21.2 | Olson & Ferkul ICES-2012-3492 Table I (NTRS 20130010991) [S5] |

## After recording (owner)
- [ ] Duration on the host page ≤ 0:28.
- [ ] Captions legible at 720p; English.
- [ ] Link is public (or unlisted) and plays in a private window with no login.
- [ ] No personal information, notifications or other tabs visible in any frame.
- [ ] Paste the link into the project page (field 3) and the README.
