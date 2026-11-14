# Use of Super Intelligence (SI) — log

NASA Space Apps 2026 requires that SI use is disclosed, that SI-generated code and data are
acknowledged "in descriptive text and metadata", that SI images and video carry a visible
watermark, and that SI "should not be used to (come up with your idea of how to solve the
challenge)" (Project Submission Guide, "Use of Super Intelligence (SI)" field). This log records
what SI was used for, phase by phase. It backs the README "Use of SI" section and the SI field of
the project page.

**Tool used throughout:** Anthropic Claude via Claude Code (a lead agent on Claude Opus 5.5, with
task-specific sub-agents). No other SI tools were used. No SI-generated images, video, audio or music.

Owner-confirmed items are marked **TODO (owner)** until confirmed.

## Phase 0 — Before the event (13 Nov 2026)

| What | SI role | Human role | Where it lives |
|---|---|---|---|
| Rules and judging research (competition rules, judging criteria, past winners) | Research assistant: read public pages, summarised, flagged open questions | Read and decided | `../Discovery/research/01_*`, `02_*` (not in this repo) |
| Background science and data-access research (combustion literature, PSI and NTRS access) | Research assistant | Read and decided | `../Discovery/research/03_*`, `04_*` (not in this repo) |
| Concept analysis and specification | Assisted analysis and drafting of the concept and specification documents | **TODO (owner):** state who originated the core idea and how the concept was chosen | `../Discovery/MARGIN_Product_Decision_and_Specification.md`, `MARGIN_Kickoff_Pack.md` (not in this repo) |
| Read-only feasibility probes of PSI and NTRS | SI agent made read-only requests; results kept in a temporary scratchpad, **not** copied into the repo | Reviewed | none in repo; the pipeline re-fetched all data after kickoff |

## Phase 1 — Build (from 14 Nov 2026, 09:00 Team Owner local time)

| What | SI role | Human role |
|---|---|---|
| Project scaffold, architecture decision (Next.js, static data, no database) | Proposed and implemented | Approved (`docs/ARCHITECTURE_DECISION.md`) |
| Three design prototypes; choice of direction | Built the prototypes | **Owner chose** the Atlas + Casefile hybrid (BUILD_LOG 12:40) |
| Data pipeline (`pipeline/`): PSI fetch and normalisation | Wrote the code | Reviewed counts and anomalies |
| Evidence engine (`lib/engine`): gate, distance, verdict, robustness, ranking | Wrote the code from the locked formulas in the specification | Formulas, scales and thresholds set in the specification; reviewed |
| User interface (`app/`, `components/`) | Wrote the code | Design direction and acceptance by the owner |
| Curated published values (`content/`) | Transcribed values from NASA papers with page/table citations; flagged as unverified until checked | **People check each value against its source** before it is shown as verified |
| Tests (`tests/`), CI, banned-claims lint | Wrote them | Reviewed |
| Documentation (README, Method/Sources text, submission drafts) | Drafted | Edited and approved |

**Metadata.** Commits made with Claude Code carry a `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
trailer. Exception: commit `0abb9b1` ("Atlas test ids, axe, scripts") was made without the trailer;
it was SI-assisted like the others.

## Phase 2 — Review and verification

| What | SI role | Human role |
|---|---|---|
| Science review of the prototype (`docs/reviews/`) | An SI reviewer agent checked the engine and data handling against the specification | Fixes approved by the lead and owner |
| Source verification of published values | SI agents compared transcribed values with the primary documents | **Owner/teammate re-checks** the hero numbers (coverage headline, Olson & Ferkul Table I) on the deployed site (Kickoff V10) |
| Accessibility and end-to-end testing | SI wrote and ran Playwright/axe tests | Reviews failures |

## Phase 3 — Runtime

**No runtime SI.** The deployed app makes no calls to any SI service. Every number on screen comes
from the deterministic engine applied to the PSI snapshot and the cited published values.
(The optional runtime-SI feature in the specification, P1-5, was not built.)
**TODO (lead):** keep this line true; update it if a runtime SI feature is added.

## Phase 4 — Submission materials

| Item | SI role | Human role |
|---|---|---|
| Project-page text, demo script, shot list | Drafted (`docs/submission/`) | **Owner edits, approves and submits** |
| Demo video | None (screen recording of the real app; captions written by the team) | **Owner records and edits** |
| Screenshots | None (captured from production) | Owner selects |

## Disclosure text (for the project page "Use of SI" field)

See `docs/submission/project-page.md`, field 6.
