"use client";
/**
 * The inspector (right): the verdict card first, always visible; then context on demand in tabs:
 * Evidence (partial gravity first on the Moon and Mars), Sensitivity, Ranking, Findings, Sources.
 * Selecting a run opens the run inspector in place of the tabs; Esc or Close returns to them.
 */
import type { Run, Scenario } from "@/lib/schema";
import Link from "next/link";
import type { ReactNode } from "react";
import { SCALES, VERDICT_THRESHOLDS, ROBUSTNESS_FACTORS, classify, boundaryMargin, type Evaluation, type Robustness, type RankRow, type Scored, type Verdict } from "@/lib/engine";
import { COUNTS, SNAP, PSI_INVESTIGATIONS } from "@/lib/data";
import { HAZARDS, INSIGHTS, OLSON_FERKUL_2012, PUBLISHED_GROUPS } from "@/content/curated";
import { DISCLAIMER, GRAVITY_LABEL, VERDICT_COPY, fmt, fmtSigned, psia } from "@/lib/format";
import { useScenarioQuery } from "@/lib/state/useMargin";
import { TabList, tabPanelProps } from "@/components/ui/Tabs";
import { ClaimBadge } from "@/components/ui/misc";
import RunInspector, { runTitle, runSourceLabel } from "@/components/run/RunInspector";
import PartialGPlot from "./PartialGPlot";
import FlowSensitivity from "./FlowSensitivity";
import VerdictScale from "./VerdictScale";

export type TabId = "evidence" | "sensitivity" | "rank" | "findings" | "sources";
const TABS: { id: TabId; label: string }[] = [
  { id: "evidence", label: "Evidence" },
  { id: "sensitivity", label: "Sensitivity" },
  { id: "rank", label: "Ranking" },
  { id: "findings", label: "Findings" },
  { id: "sources", label: "Sources" },
];

/** An insight renders as a finding only once it has been checked against its primary source. */
const isPrimaryChecked = (i: { verification?: { status?: string } }) => i.verification?.status === "primary-checked";

type Src = { key: string; label: string; url?: string };
function footnotes(onJump?: () => void) {
  const list: Src[] = [];
  const ref = (s: Src) => {
    let i = list.findIndex((x) => x.key === s.key);
    if (i < 0) { list.push(s); i = list.length - 1; }
    const n = i + 1;
    return <sup className="ins-fn"><a href={`#atlas-fn-${n}`} aria-label={`Source ${n}`} onClick={onJump}>[{n}]</a></sup>;
  };
  return { list, ref };
}
const runSrc = (r: Run): Src => ({ key: `run:${r.id}`, label: `${runTitle(r)}: ${runSourceLabel(r)}`, url: r.source.url });
const PSI_SRC: Src = { key: "psi", label: `NASA PSI combustion archive, run tables fetched ${SNAP.fetchedAt.slice(0, 10)}`, url: "https://psi.nasa.gov/" };
const OF_SRC: Src = { key: "of2012", label: `${OLSON_FERKUL_2012.source.ref}, ${OLSON_FERKUL_2012.source.page} (doi ${OLSON_FERKUL_2012.source.doi})`, url: OLSON_FERKUL_2012.source.url };
const ENGINE_SRC: Src = { key: "engine", label: "MARGIN engine (lib/engine): distance D, verdict thresholds, 27-combination robustness. Deterministic computation." };

const AXIS_NAME = { o2: "oxygen", pressure: "pressure", flow: "flow" } as const;
const factor = (k: number) => (k === 0.5 ? "½×" : `${k}×`);
const pct = (v: number) => `${v < 1 && v > 0 ? "<1" : Math.round(v)}%`;

function gapPhrase(s: Scored) {
  const parts = (["o2", "pressure", "flow"] as const)
    .filter((a) => s.d.gaps[a] != null)
    .map((a) => ({ a, g: Math.abs(s.d.gaps[a]!), txt: a === "o2" ? `${fmtSigned(s.d.raw.o2Pts)} pts` : a === "pressure" ? `${fmtSigned(s.d.raw.pressurePct, 0)}%` : `${fmtSigned(s.d.raw.flowCmS)} cm/s` }))
    .sort((x, y) => y.g - x.g);
  if (!parts.length) return "";
  const max = parts[0].g;
  if (max < 0.25) return ", matching on every compared axis";
  const dom = parts.filter((p) => p.g >= max * 0.5 && p.g >= 0.25);
  const list = dom.map((p) => `${AXIS_NAME[p.a]} (${p.txt})`);
  return `, mostly in ${list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list[0]}`;
}

export interface InspectorProps {
  scenario: Scenario;
  evaluation: Evaluation;
  psiOnly: Evaluation;
  robust: Robustness;
  ranking: RankRow[];
  coveragePct: number;
  grid: { nx: number; ny: number };
  selected: Run | null;
  focusInv: string | null;
  pinnedInv: string | null;
  onInspect: (r: Run) => void;
  onCloseRun: () => void;
  onHoverInv: (id: string | null) => void;
  onPinInv: (id: string) => void;
  runActions?: ReactNode;
  /** Collapsed: only the verdict card is shown (a slim verdict pill). */
  collapsed: boolean;
  head: ReactNode;
  tab: TabId;
  setTab: (t: TabId) => void;
}

export default function Inspector(p: InspectorProps) {
  const { scenario: s, evaluation: ev, psiOnly, robust } = p;
  const { tab, setTab } = p;
  const fn = footnotes(() => setTab("sources"));
  const q = useScenarioQuery();
  const n = ev.nearest;
  const verdict: Verdict = ev.verdict;
  const partialG = s.gravity === "moon" || s.gravity === "mars";
  const hazard = HAZARDS.find((h) => h.id === s.hazard)!;
  const flowTxt = s.flowCmS == null || s.flowCmS === 0 ? "in quiescent air" : `with ${fmt(s.flowCmS, 0)} cm/s ventilation`;
  const loc = `At ${fmt(s.o2Pct)}% O₂ and ${fmt(s.pressureKPa)} kPa (${psia(s.pressureKPa)} psia), ${flowTxt}`;
  const unit = `one unit = ${SCALES.o2Pts} pts O₂, ${Math.round((SCALES.pressureRatio - 1) * 100)}% pressure or ${SCALES.flowCmS} cm/s flow`;
  const psiN = psiOnly.nearest;
  const bm = n ? boundaryMargin(n.d.D) : null;
  const fx = [ROBUSTNESS_FACTORS[0], ROBUSTNESS_FACTORS[ROBUSTNESS_FACTORS.length - 1]];

  const verdictCounts = (Object.keys(robust.verdicts) as Verdict[]).filter((v) => robust.verdicts[v] > 0).map((v) => `${v} ${robust.verdicts[v]}`).join(" · ");
  const insights = INSIGHTS.filter(isPrimaryChecked).filter((i) => (partialG ? i.id === "i-lunar" || i.hazards.includes(s.hazard) : i.hazards.includes(s.hazard) && i.id !== "i-lunar"))
    .sort((a, b) => (partialG ? Number(b.id === "i-lunar") - Number(a.id === "i-lunar") : 0)).slice(0, 4);
  const mylar = OLSON_FERKUL_2012.rows.find((r) => r.material.startsWith("Mylar"));
  const lunarClaim = mylar && mylar.uloi.moon < mylar.uloi.micro && mylar.uloi.moon < mylar.uloi.earth;
  const fm2 = PUBLISHED_GROUPS.find((g) => g.id === "PLAN-FM2");
  const top = p.ranking.slice(0, 8);
  const maxR = Math.max(1, ...top.map((r) => r.R));

  return (
    <aside className="ins" aria-labelledby="atlas-notes-title" data-testid="field-notes" data-collapsed={p.collapsed || undefined}>
      <div className="ins-head">
        <h2 id="atlas-notes-title" className="ui-panel-label">Inspector</h2>
        <span className="ui-panel-rule" aria-hidden="true" />
        {p.head}
      </div>

      <div className="ins-verdict" aria-live="polite" data-testid="verdict" data-verdict={verdict} data-d={n ? n.d.D.toFixed(3) : ""}>
        <p className="ins-ctx">{GRAVITY_LABEL[s.gravity]} · {hazard.label} · {s.materialClass === "any" ? "any material" : `${s.materialClass} materials`} · {s.includePublished ? "PSI + published" : "PSI only"}</p>
        <div className="ins-vrow">
          <p className="ins-vword"><span className="caps">Evidence</span><span className="ins-vclass">{verdict}</span></p>
          {n && (
            <p className="ins-vd" aria-label={`Evidence distance D ${fmt(n.d.D, 2)}`}>
              <span className="ins-vdl">D</span><span className="ins-vdv num">{fmt(n.d.D, 2)}</span><ClaimBadge kind="COMPUTED">computed</ClaimBadge>
            </p>
          )}
        </div>
        {!p.collapsed && <VerdictScale D={n ? n.d.D : null} />}
        {!p.collapsed && <p className="ins-vcopy">{VERDICT_COPY[verdict]}{fn.ref(ENGINE_SRC)}</p>}
        {ev.qualifier && n && (
          <p className="ins-qual" data-testid="verdict-qualifier" data-qualifier={ev.qualifier}>
            <ClaimBadge kind="ASSUMED">partial match</ClaimBadge>{" "}
            Compared on {n.d.axesUsed.map((ax) => AXIS_NAME[ax]).join(" + ")} only; {ev.qualifier === "flow-regime-mismatch" ? "the flow regimes differ, so flow is not compared" : `${(["o2", "pressure", "flow"] as const).filter((ax) => !n.d.axesUsed.includes(ax)).map((ax) => AXIS_NAME[ax]).join(" and ")} not recorded`}. A missing axis can only make a test look closer.{" "}
            {ev.nearestComplete
              ? <>On all three axes: <strong>{ev.verdictComplete}</strong> (D <span className="num">{fmt(ev.nearestComplete.d.D, 2)}</span>).</>
              : <>No test in this regime is comparable on all three axes.</>}
          </p>
        )}
        {!p.collapsed && bm && Math.abs(bm.delta) < 0.25 && <p className="ins-edge">D is <span className="num">{fmt(Math.abs(bm.delta), 2)}</span> {bm.delta > 0 ? "above" : "below"} the {bm.boundary === VERDICT_THRESHOLDS.near ? "NEAR/DISTANT" : "DIRECT/NEAR"} boundary ({bm.boundary}): a small change in an input or assumption changes the class.</p>}
        <p className="ins-disclaimer">{DISCLAIMER}</p>
        {!p.collapsed && <p className="ins-method">DIRECT (D ≤ {VERDICT_THRESHOLDS.direct}), NEAR (≤ {VERDICT_THRESHOLDS.near}) and DISTANT are classes defined by MARGIN&rsquo;s method, not established scientific categories. <Link href="/method#verdicts">How D is computed</Link></p>}
      </div>

      {!p.collapsed && (p.selected ? (
        <div className="ins-run">
          <RunInspector key={p.selected.id} run={p.selected} scenario={s} onClose={p.onCloseRun} testId="specimen-card" titleId="atlas-specimen-title" autoFocus actions={p.runActions} />
        </div>
      ) : (
        <div className="ins-tabs">
          <TabList prefix="atlas" tabs={TABS} value={tab} onChange={setTab} label="Inspector sections" className="ins-tablist" />

          <div className="ins-panel" {...tabPanelProps("atlas", "evidence", tab)}>
            {partialG && (
              <section className="ins-sec" aria-labelledby="atlas-pg-title">
                <h3 id="atlas-pg-title" className="ins-h3">Partial gravity: a separate regime</h3>
                <p>PSI contains no partial-gravity combustion tests{fn.ref(PSI_SRC)}. The only reduced-gravity limits on record here are drop-tower values{fn.ref(OF_SRC)}, shown as points per gravity level.</p>
                <PartialGPlot selected={s.gravity} />
                {lunarClaim && mylar && <p className="ins-pull">For {mylar.material.split(" ")[0]} at {mylar.pressurePsia} psia, NASA drop-tower tests found a lower flammability limit at lunar gravity than at either 0 g or 1 g. Microgravity and Earth results did not bound lunar behaviour for this material.{fn.ref(OF_SRC)}</p>}
                <ul className="ins-caveats">{OLSON_FERKUL_2012.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
                {fm2 && s.gravity === "moon" && <p><ClaimBadge kind="PLANNED">planned · not evidence</ClaimBadge> {fm2.acronym}: planned, the first lunar-surface test. Its condition sets are drawn as dashed rings and never counted{fn.ref({ key: "fm2", label: fm2.title, url: fm2.landingUrl })}.</p>}
                <p className="ins-micro">Each gravity level is a separate regime: no line, curve or estimate is drawn between them.</p>
              </section>
            )}
            <div className="ins-prose">
              {n ? (
                <p>
                  {loc}, the nearest comparable test is{" "}
                  <button type="button" className="atlas-runlink ui-link-btn" onClick={() => p.onInspect(n.run)}>{runTitle(n.run)}</button>
                  {n.run.material ? ` (${n.run.material.replace(/\s+/g, " ").trim()})` : " (material not recorded)"}{fn.ref(runSrc(n.run))}, {fmt(n.d.D, 2)} units away
                  {n.d.partialMatch
                    ? <> <strong>on {n.d.axesUsed.map((ax) => AXIS_NAME[ax]).join(" and ")} only; {n.d.flags.includes("flow-regime-mismatch") ? "flow regime differs, so flow is not compared" : `${(["o2", "pressure", "flow"] as const).filter((ax) => !n.d.axesUsed.includes(ax)).map((ax) => AXIS_NAME[ax]).join(" and ")} not recorded`}</strong>{gapPhrase(n)}.</>
                    : <>{gapPhrase(n)}.</>}
                  {" "}Differences are test minus scenario; {unit}.
                  {n.d.partialMatch && (ev.nearestComplete
                    ? <> Best fully-compared test:{" "}<button type="button" className="atlas-runlink ui-link-btn" onClick={() => p.onInspect(ev.nearestComplete!.run)}>{runTitle(ev.nearestComplete.run)}</button>{fn.ref(runSrc(ev.nearestComplete.run))}, D <span className="num">{fmt(ev.nearestComplete.d.D, 2)}</span> ({classify(ev.nearestComplete.d.D)}).</>
                    : <> No test in this regime is comparable on all three axes.</>)}
                  {n.run.pressureBasis === "nominal-stated" && <> Its pressure is nominal (stated), not measured.</>}
                  {n.run.tier === "T3_PUBLISHED" && (n.run.flags.includes("unverified-transcription")
                    ? <> It is a published value, not a PSI table row, and has not yet been checked against its primary source.</>
                    : <> It is a published value, not a PSI table row{n.run.source.page ? <>, from {n.run.source.page}</> : null}.</>)}
                </p>
              ) : (
                <p>
                  {loc}, there is <strong>no comparable test</strong> in {GRAVITY_LABEL[s.gravity].toLowerCase()} for this question{s.includePublished ? "" : " in PSI"}.
                  {s.gravity !== "micro" && <> PSI holds {COUNTS.partialGravityRuns === 0 ? "no" : COUNTS.partialGravityRuns} partial-gravity combustion tests; every PSI run in this snapshot was flown in microgravity{fn.ref(PSI_SRC)}.</>}
                  {!s.includePublished && s.gravity !== "micro" && <> Turn on published evidence to see the drop-tower and LUCI points for this regime.</>}
                </p>
              )}

              {n && <GapBars scored={n} title={n.d.partialMatch ? "Gaps to the nearest test (partial match)" : "Gaps to the nearest test"} />}
              {n && n.d.partialMatch && ev.nearestComplete && <GapBars scored={ev.nearestComplete} title="Gaps to the best fully-compared test" />}

              {s.includePublished ? (
                psiN?.run.id !== n?.run.id ? (
                  <p>PSI alone places the nearest test at {psiN ? <>D <span className="num">{fmt(psiN.d.D, 2)}</span> ({psiOnly.verdict})</> : <>nothing ({psiOnly.verdict})</>}; with published evidence it is D <span className="num">{n ? fmt(n.d.D, 2) : "—"}</span> ({verdict}). The rings on the field are those published tests.</p>
                ) : <p>Published evidence is included but does not change the nearest test here.</p>
              ) : <p className="ins-quiet">Published evidence is off: only PSI run-table rows are counted.</p>}
              {ev.limits.length > 0 && <p className="ins-quiet">{ev.limits.length} reported limit {ev.limits.length === 1 ? "point" : "points"} in this regime (ticked rings) are thresholds inferred from test series, not tested conditions; they never set the verdict or the bands.</p>}
              <p className="ins-quiet">{pct(p.coveragePct)} of the charted window lies within D {VERDICT_THRESHOLDS.near} of comparable evidence (computed on a {p.grid.nx} × {p.grid.ny} grid; uniform in log pressure). {ev.otherGravity.length > 0 && <>{ev.otherGravity.length.toLocaleString("en-US")} placeable runs from other gravity regimes stay in their own regimes.</>}</p>
            </div>
          </div>

          <div className="ins-panel" {...tabPanelProps("atlas", "sensitivity", tab)}>
            <div className="ins-prose">
              <p>
                <span className="ins-robust" data-robust={robust.robust || undefined}>{robust.robust ? "Robust" : "Sensitive"}</span>{" "}
                {robust.robust
                  ? <>All {robust.combos} combinations of {fx.map(factor).join(" and ")} axis scales give {robust.range[0]}.</>
                  : <>Across {robust.combos} combinations of {factor(fx[0])}, 1× and {factor(fx[1])} axis scales the verdict ranges from {robust.range[0]} to {robust.range[1]} ({verdictCounts}).</>}
                {robust.partialCells === robust.combos && <> Every combination rests on a partial match, so this says nothing about the axis that is not compared.</>}
                {robust.Drange && <> D spans <span className="num">{fmt(robust.Drange[0], 2)}–{fmt(robust.Drange[1], 2)}</span>.</>}
                {" "}The dashed contours on the field show where the NEAR boundary would sit if the O₂ and pressure scales were halved or doubled{fn.ref(ENGINE_SRC)}.
              </p>
              <FlowSensitivity scenario={s} />
            </div>
          </div>

          <section className="ins-panel ins-sec" {...tabPanelProps("atlas", "rank", tab)} aria-labelledby="atlas-rank-title">
            <h3 id="atlas-rank-title" className="ins-h3">Investigations, ranked for this question</h3>
            <p className="ins-micro">R is computed (proximity, hazard match, scale, coverage, measures). Hover or select a row to find its runs on the field.</p>
            <ol className="ins-rank">
              {top.map((r, i) => {
                const id = r.investigation.id;
                const c = r.contributions;
                return (
                  <li key={id}>
                    <button type="button" className={`ins-rank-row${p.focusInv === id ? " is-hi" : ""}`} aria-pressed={p.pinnedInv === id}
                      onMouseEnter={() => p.onHoverInv(id)} onMouseLeave={() => p.onHoverInv(null)} onFocus={() => p.onHoverInv(id)} onBlur={() => p.onHoverInv(null)} onClick={() => p.onPinInv(id)}>
                      <span className="ins-rank-n num">{i + 1}</span>
                      <span className="ins-rank-name">{r.investigation.acronym}{r.investigation.tier === "T3_PUBLISHED" && <span className="ins-rank-tag">published</span>}</span>
                      <span className="ins-rank-d num"><span className="ins-micro-label">D min</span>{r.Dmin != null ? fmt(r.Dmin, 2) : "none"}</span>
                      <span className="ins-rank-r num"><span className="ins-micro-label">R</span>{fmt(r.R, 0)}</span>
                      <span className="ins-rank-bar" aria-hidden="true">
                        {(["P", "H", "S", "C", "M"] as const).map((k) => <span key={k} className="ins-seg" data-c={k} style={{ width: `${Math.round((c[k] * 100 / maxR) * 10000) / 100}%` }} />)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="ins-rank-key" aria-hidden="true">{(["P", "H", "S", "C", "M"] as const).map((k) => <span key={k}><i className="ins-seg" data-c={k} />{k}</span>)}<span>P proximity · H hazard · S scale · C coverage · M measures</span></p>
            <p><Link href={q ? `/investigations?${q}` : "/investigations"}>Compare all investigations, their runs and sources</Link></p>
          </section>

          <section className="ins-panel ins-sec" {...tabPanelProps("atlas", "findings", tab)} aria-labelledby="atlas-ins-title">
            <h3 id="atlas-ins-title" className="ins-h3">Findings checked against primary sources</h3>
            {insights.length === 0 && <p className="ins-micro">No source-checked findings for this question yet. Findings appear here only after they have been checked against their primary source.</p>}
            {insights.map((i) => (
              <article key={i.id} className="ins-finding">
                <p className="ins-finding-stamps"><ClaimBadge kind={i.validity === "MEASURED" ? "MEASURED" : i.validity === "STATED" ? "PUBLISHED" : "ASSUMED"}>{i.validity}</ClaimBadge> <span className="ins-micro">checked against primary source · human sign-off pending</span></p>
                <p className="ins-finding-claim">{i.claim}</p>
                <p className="ins-finding-meta"><span className="num">{i.value}</span> · {i.conditions}</p>
                <p className="ins-finding-meta"><b>Scope</b> {i.scope}</p>
                <p className="ins-finding-meta"><b>Not valid for</b> {i.notValidFor}</p>
                {i.verification.quote && <blockquote className="ins-quote">&ldquo;{i.verification.quote}&rdquo;</blockquote>}
                <p className="ins-finding-meta"><a href={i.source.url} target="_blank" rel="noreferrer">{i.source.ref}{i.verification.locator ? `, ${i.verification.locator}` : ""}<span className="sr-only"> (opens in a new tab)</span></a></p>
              </article>
            ))}
          </section>

          <div className="ins-panel" {...tabPanelProps("atlas", "sources", tab)}>
            <section className="ins-sec" aria-labelledby="atlas-arch-title">
              <h3 id="atlas-arch-title" className="ins-h3">The archive</h3>
              <p>
                PSI holds {COUNTS.totalRuns.toLocaleString("en-US")} run rows across {PSI_INVESTIGATIONS.length} investigation records; {COUNTS.plottable.toLocaleString("en-US")} have values that can be placed on this field{fn.ref(PSI_SRC)}.
                Of the {COUNTS.solidRunsWithO2} solid-material tests with a recorded O₂ value, the highest is {COUNTS.maxSolidO2}% O₂.
              </p>
            </section>
            <footer className="ins-footnotes">
              <h3 className="caps">Sources</h3>
              <ol>
                {fn.list.map((f, i) => (
                  <li key={f.key} id={`atlas-fn-${i + 1}`}>
                    {f.label}
                    {f.url && <> <a href={f.url} target="_blank" rel="noreferrer">link<span className="sr-only"> to source {i + 1} (opens in a new tab)</span></a></>}
                  </li>
                ))}
              </ol>
              <p className="ins-micro">Every reference, licence and the AI-use disclosure: <Link href="/sources">Sources</Link>.</p>
            </footer>
          </div>
        </div>
      ))}
    </aside>
  );
}

/** Signed per-axis gaps (test − scenario) in scale units, physical difference alongside. Neutral ink. */
function GapBars({ scored, title }: { scored: Scored; title: string }) {
  const { d } = scored;
  const AX = [
    { k: "o2" as const, label: "O₂", unit: "pts", raw: d.raw.o2Pts, digits: 1, scale: `${SCALES.o2Pts} pts` },
    { k: "pressure" as const, label: "Pressure", unit: "%", raw: d.raw.pressurePct, digits: 0, scale: `×${SCALES.pressureRatio}` },
    { k: "flow" as const, label: "Flow", unit: "cm/s", raw: d.raw.flowCmS, digits: 1, scale: `${SCALES.flowCmS} cm/s` },
  ];
  const MAX = 4;
  const mismatch = d.flags.includes("flow-regime-mismatch");
  return (
    <figure className="ins-gaps" aria-label={`${title}: per-axis gaps`}>
      <figcaption className="caps">{title}</figcaption>
      <table className="run-gaps">
        <thead className="sr-only"><tr><th scope="col">Axis</th><th scope="col">Gap in scale units</th><th scope="col">Physical difference</th></tr></thead>
        <tbody>
          {AX.map((a) => {
            const g = d.gaps[a.k];
            const used = d.axesUsed.includes(a.k);
            const w = g == null ? 0 : (Math.min(Math.abs(g), MAX) / MAX) * 50;
            return (
              <tr key={a.k} data-off={!used || undefined}>
                <th scope="row">{a.label}<span className="run-scale">1 unit = {a.scale}</span></th>
                <td className="run-barcell">{used && g != null
                  ? <span className="run-track" aria-hidden="true"><span className="run-zero" /><span className={`run-bar${Math.abs(g) > MAX ? " is-clipped" : ""}`} style={{ left: g < 0 ? `${50 - w}%` : "50%", width: `${w}%` }} /></span>
                  : <span className="run-nr">{a.k === "flow" && mismatch ? "flow regime differs · not compared" : "not recorded · not compared"}</span>}</td>
                <td className="run-gapval num">{used && g != null ? <>{fmtSigned(g, 2)}<span className="run-q"> ({fmtSigned(a.raw, a.digits)} {a.unit})</span></> : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="run-micro">D = √(Σ gap²) = <span className="num">{Number.isFinite(d.D) ? d.D.toFixed(2) : "—"}</span> on {d.axesUsed.length} of 3 axes. Signed as test minus scenario.</p>
    </figure>
  );
}
