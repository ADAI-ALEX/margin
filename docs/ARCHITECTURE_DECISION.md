# MARGIN: architecture decision (design-exploration phase)

Date: 2026-11-14, about H2.5. Author: lead agent. Status: proposed. It becomes binding when the product owner selects a design direction.

## 1. Recommended web application architecture
**Next.js 16 (App Router) + React 19 + TypeScript (strict), statically generated, deployed on Vercel.**

The layers are separated so that the selected prototype can be promoted without a rebuild:

| Layer | Location | Contents | Runtime |
|---|---|---|---|
| Data (generated) | `data/generated/*.json` (prod); `design-exploration/data/snapshot.json` (prototype) | Normalized PSI runs, investigations, counts and QA, produced at build time by a script. No NASA calls at request time | Build |
| Content (curated) | `content/*.json` (prod); `design-exploration/shared/content.ts` (prototype) | T3 published / T4 planned values, atmospheres, hazard map, insights, all human-verified | Build |
| Schema | `lib/schema` | TypeScript types (zod at build in prod) | Both |
| Calculation | `lib/engine` | Pure, deterministic functions: gate, distance, verdict, robustness, rank, distance field. Unit-tested (`tests/unit`) | Client (pure TS) |
| Application state | `design-exploration/shared/useMargin.ts` → prod `lib/state` | Scenario state, URL query sync, memoized derived evidence | Client |
| Presentation | `design-exploration/concept-*/` → prod `components/*`, `app/*` | Concept-specific components and tokens | Client/SSG |

**Dependencies** (each one justified):
- `d3-scale`, `d3-array`, `d3-shape`, `d3-contour` (bespoke SVG charts; the contour bands are Concept B only)
- `zod` (data validation at build)
- `vitest` (engine tests)
- No component kit, no chart kit, no state library, no database client.

The Radix primitives named in the Kickoff Pack are deferred until production; the prototypes use native accessible controls.

## 2. Supabase decision: **not used** (consistent with Kickoff Pack §B.4 and §D.2)

| Question | Assessment |
|---|---|
| Bundle the NASA dataset as version-controlled JSON? | **Yes.** The structured PSI layer is 22 CSVs (about 264 KB raw; the normalized snapshot is about 2 MB uncompressed, much smaller gzipped). Versioned JSON gives reproducibility, reviewable diffs and zero runtime dependency on NASA servers through judging (to 26 Jan 2027). |
| Does remote storage or a DB offer a meaningful advantage? | No. The data is read-only, small and changes only when PSI changes. A DB adds a failure point, cost and credentials for no benefit. |
| Do users need to save investigations? | Not for the judged product. Shareable state is solved by encoding the scenario in the URL query (already implemented in `useMargin`). |
| Persistent or shareable scenarios? | URL state covers shareable scenarios. "Saved collections" would need accounts, which are explicitly out of scope (Kickoff §B.4). |
| Server-side processing? | No. The engine runs in the browser in under 50 ms on about 1,900 runs. The only optional server code is the P1 runtime-SI route handler, which needs no DB. |
| User-specific information? | None. Collecting none is also a compliance and privacy advantage. |

**Recommendation:** do not introduce Supabase. Revisit only if a post-hackathon roadmap adds team workspaces. If that happens: define the schema first, use migrations, enable RLS on every table, use the anon key client-side only, keep the service-role key server-only in Vercel env vars, and document the variables. The Supabase MCP in this environment is also **not authenticated**, which would add setup time with no product gain.

## 3. MCP and tool inventory (checked live this session)

| Tool | Status | Relevant to MARGIN? | Use |
|---|---|---|---|
| **Vercel MCP** | Connected (Hobby plan, team `adai-alex's projects`; no MARGIN project yet) | **Yes** | Create the project from the GitHub repo once a direction is approved; preview and production deploys; build logs. Not used yet: no premature deploy. |
| **Playwright MCP** | Connected | **Yes** | Visual QA, console-error checks, responsive screenshots of the three prototypes (this phase); e2e later. |
| **Context7 MCP** | Connected | Yes | Current Next.js 16 / d3 docs when an API question arises. Next 16 also ships local docs in `node_modules/next/dist/docs` (AGENTS.md). |
| **GitHub** | No MCP; the `gh` CLI is authenticated (scopes repo, workflow) | **Yes** | Create the public `margin` repo (Apache-2.0) and CI. **Not done yet**: it is outward-facing, so it waits for owner approval. |
| **Supabase MCP** | Needs authentication | No (see §2) | none |
| Claude in Chrome / computer-use | Available | Marginal | Playwright covers browser QA; Chrome would act in the owner's real browser profile. Not needed. |
| Claude Docs connector | Connected | Optional | Could host the written decision memo. Not needed for the build. |
| Higgsfield (generative media) | Connected | **No** | AI imagery needs watermarks and adds no scientific value; the rules discourage it. |
| RevenueCat, Microsoft 365 | Connected / auth needed | No | none |
| IDE diagnostics | Available | Minor | Type diagnostics (`tsc` is used directly). |

## 4. Directory structure (current, isolated exploration)

```
App/
├── app/
│   ├── page.tsx                  # design-exploration index (lead)
│   └── concepts/{a,b,c}/page.tsx # thin route shims → design-exploration/concept-*/ConceptApp
├── lib/
│   ├── schema/                   # provisional canonical types (lead)
│   └── engine/                   # deterministic engine; production-intent (lead)
├── design-exploration/
│   ├── BRIEF.md                  # concept specs + rules + ownership
│   ├── data/
│   │   ├── fetch-psi-snapshot.mjs  # live PSI fetch (24 records, 22 tables)
│   │   ├── build-snapshot.mjs      # minimal normalizer → snapshot.json
│   │   ├── snapshot.json           # real PSI data, prototype normalization
│   │   └── .cache/                 # raw downloads (gitignored)
│   ├── shared/                   # useMargin, data access, curated content, format (lead)
│   ├── concept-a/  concept-b/  concept-c/   # one agent each, disjoint
│   └── reviews/                  # science + UX reviews
├── tests/unit/engine.prototype.test.ts
└── docs/ARCHITECTURE_DECISION.md
```

**Promotion path once a direction is chosen:**
1. `lib/` stays as is.
2. `design-exploration/shared/useMargin.ts` → `lib/state/`.
3. The chosen `concept-x/` components → `components/` plus `app/` routes (Explore, `/investigations/[psiId]`, Method, Sources).
4. The prototype normalizer is replaced by `pipeline/` (per-table mappers plus golden tests) emitting `data/generated/`.
5. `content.ts` → `content/*.json` with `verifiedBy`.
6. `design-exploration/` is deleted.

## 5. Shared infrastructure, distinct designs
All three concepts share these, which keeps the comparison about design, not content:
- the same `useMargin` hook (one scenario model, one URL format)
- the same engine
- the same snapshot and curated content
- the same format and label helpers

Each concept owns its fonts, CSS tokens (scoped root class), layout, components and visualizations.
