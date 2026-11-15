# Publication checklist (before the repository goes public)

Checked 2026-11-14 (≈13:20 GMT) by the QA/compliance workstream against the local repository
(`git log --all`, 4 commits on `main`, no remote yet) and the working tree. Re-run the commands
below immediately before `git push` to the public remote and again before tagging `v1.0-submission`.

Legend: **PASS** · **DONE** (resolved since the first check) · **NOTE** (informational).

## 1. Secrets

| Check | Command | Result |
|---|---|---|
| Tokens/keys in git history | `git log --all -p \| grep -nE 'sk-ant-\|ghp_\|github_pat_\|AKIA\|-----BEGIN\|SUPABASE_\|VERCEL_TOKEN\|ANTHROPIC_API_KEY\|api[_-]?key\s*[:=]\|password\s*[:=]\|secret\s*[:=]'` | **PASS**: no matches |
| Tokens/keys in the working tree (excluding node_modules, .next) | same patterns with `grep -rnIE` | **PASS**: only the CI workflow's own detection regex |
| `.env*`, `*.pem`, `*.key`, `id_rsa`, `*.p12` ever committed | `git log --all --name-only --format= \| grep -iE …` | **PASS**: none; none on disk either |
| Client bundle secret scan | CI step "No secrets in the client bundle" greps `.next/static` | Runs in CI on every push |

## 2. Personal information

| Check | Result |
|---|---|
| Commit author / committer identity (`git log --all --format='%an <%ae> \| %cn <%ce>'`) | **PASS**: all 4 commits are `Alex <263986709+ADAI-ALEX@users.noreply.github.com>` (GitHub no-reply). No personal or work e-mail in history. **NOTE:** the author *name* "Alex" and the GitHub handle `ADAI-ALEX` will be public; I confirmed this account (Kickoff §I.6 item 7). |
| E-mail addresses in history diffs | **PASS**: only the GitHub no-reply address |
| E-mail addresses in tracked files | **PASS**: none |
| Absolute local paths (`/Users/…`) in tracked files | **PASS**: none |
| Handles in tracked files | **DONE:** `docs/ARCHITECTURE_DECISION.md`, which named the Vercel team and the plan tier, was replaced by `docs/ARCHITECTURE.md`, which does not. |
| Discovery documents (pre-event research) | **PASS**: not in the repository (they live in `../Discovery/`). |

## 3. `.gitignore` coverage

| Path | Ignored? |
|---|---|
| `node_modules/` | **PASS** (`/node_modules`) |
| `.next/` | **PASS** (`/.next/`) |
| `pipeline/.cache/` (raw PSI downloads) | **PASS** (`/pipeline/.cache/`) |
| `.playwright-mcp/` (screenshots from browser QA) | **PASS** (`/.playwright-mcp/`) |
| `.env*` | **PASS** |
| `test-results/`, `playwright-report/` | **PASS** |
| `.vercel` | **PASS** |
| `*.tsbuildinfo` | **PASS** |
| `.shot.mjs` (local helper) | **PASS**, but via `.git/info/exclude` (local only, not `.gitignore`). Fine as long as nobody else clones and creates it. |

## 4. Tracked files: size and content

`git ls-files | xargs du -h | sort -h | tail` (67 tracked files at the time of the check):

| Size | File | Assessment |
|---|---|---|
| 2.5 MB | `data/generated/snapshot.json` | Expected: normalised PSI data (Kickoff §D). Public NASA data, attributed. |
| 236 KB | `package-lock.json` | Expected |
| 48 KB | `docs/reviews/science-review-prototype.md` | Internal review; fine to publish. Contains no personal data. |
| ≤ 40 KB | everything else | Source, CSS, docs |

No binary blobs, archives, videos or raw PSI downloads are tracked. **PASS**

## 5. Images, logos and SI imagery

| Check | Result |
|---|---|
| NASA logo / insignia ("meatball") / logotype ("worm") / seal / mission patches | **PASS**: none. The only image asset is `app/icon.svg`, a hand-written 6-element SVG (paper rectangle, two ellipses, one dot). The create-next-app SVGs and favicon (Vercel/Next marks) have been removed from `public/`. |
| SI-generated imagery | **PASS** at the time of the check: none. **NOTE (15 Nov):** the four illustrations on the Guide page are AI-generated (Higgsfield) and labelled 'AI-generated illustration' on screen; the demo-video narration is an AI voice (Kokoro, open-weight text-to-speech); both are disclosed in the README and `si-usage-log.md`. |
| Third-party images, icons, music | **PASS**: none. Charts are drawn in code (SVG). |
| Rendered pages | `tests/e2e/content-rules.spec.ts` asserts no `img`/icon source mentions nasa/meatball/worm/insignia/logo. |

## 6. Licences

| Item | Result |
|---|---|
| `LICENSE` | **PASS**: canonical Apache-2.0 text; appendix line `Copyright 2026 Alexander de Gentile-Murnieks`. Matches `"license": "Apache-2.0"` in package.json. |
| `NOTICE` | **PASS**: third-party production tree (37 packages), fonts, NASA data section, SI acknowledgement. |
| Production dependency licences | MIT, ISC, Apache-2.0, BSD-3-Clause, 0BSD, CC-BY-4.0 (caniuse-lite data). All OSI-compatible or data licences. **NOTE:** `@img/sharp-libvips-*` (LGPL-3.0-or-later) is an *optional* platform binary of `next` for image optimisation; MARGIN does not use `next/image`, nothing of it is in this repo, and it is not modified. Listed in NOTICE for completeness. |
| Fonts | Albert Sans, IBM Plex Mono (`lib/fonts.ts`): SIL OFL 1.1, self-hosted by `next/font/google` at build time. **NOTE:** `next build` therefore fetches font files from Google Fonts at build time (not PSI/NTRS; Kickoff §H.11 is about NASA calls). |
| NASA data | PSI: licence as stated per record; 23 of 24 records state CC0-1.0. **DONE (Kickoff V9):** PSI-10 (ACME / Flame Design, DOI 10.60555/w4zy-bt45) has an empty licence field; the Sources page and its dossier say "not stated in PSI record", and so does the NOTICE. NTRS documents are cited, not redistributed. |
| Development tools | `@axe-core/playwright` / `axe-core` are MPL-2.0 (dev only, not shipped). |

## 7. SI disclosure in metadata

| Check | Result |
|---|---|
| Commit trailers | **DONE (2026-11-14):** history was rewritten so every commit is authored and committed by me under my GitHub account (no-reply address) with no co-author trailers; SI use is disclosed in the README and `si-usage-log.md`. |
| README "Use of SI" | **PASS** (written) |
| `docs/compliance/si-usage-log.md` | **PASS** (written, including the pre-event section) |

## 8. Timing (pre-event rule)

| Check | Result |
|---|---|
| First commit time | `cad3090` dated 2026-11-14 12:59 +0000 (history rebuilt at 13:15; the BUILD_LOG records the scaffold at ~11:10 GMT). All after 09:00 GMT on 14 Nov. **NOTE:** the start clock follows my local time, GMT. |
| Pre-event material in the repo | **PASS**: none. Discovery documents and the 13 Nov feasibility probes stay outside the repo; the pipeline re-fetched PSI after kickoff (BUILD_LOG 11:18–11:21). |
| Public text that cites internal research ids | **NOTE:** several curated `source.page` strings and notes say "as transcribed in R3 §2.2" or "R3 §4". R3 is a pre-event research note that is not in the repository, so a judge cannot follow that reference. Prefer the primary citation (document, page/table) alone. |

## 9. Before pushing — commands to re-run

```bash
git log --all --format='%an <%ae> | %cn <%ce>' | sort -u
git log --all -p | grep -nE 'sk-ant-|ghp_|github_pat_|AKIA|-----BEGIN|SUPABASE_|VERCEL_TOKEN|ANTHROPIC_API_KEY|password\s*[:=]'
git log --all -p | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' | sort -u
git ls-files | xargs du -h | sort -h | tail
git status --porcelain --ignored | grep '^!!'
npm run lint:claims
```
