"use client";
import type { Run, Scenario } from "@/lib/schema";
import { SCALES, VERDICT_THRESHOLDS, ROBUSTNESS_FACTORS, classify, type Evaluation, type Robustness, type RankRow, type Scored, type Verdict } from "@/lib/engine";
import { COUNTS, SNAP, PSI_INVESTIGATIONS } from "../shared/data";
import { HAZARDS, INSIGHTS, OLSON_FERKUL_2012, PUBLISHED_GROUPS } from "../shared/content";
import { DISCLAIMER, GRAVITY_LABEL, VERDICT_COPY, fmt, fmtSigned, psia } from "../shared/format";
import PartialGPlot from "./PartialGPlot";
import SpecimenCard, { runTitle, sourceLabel } from "./SpecimenCard";

type Src = { key: string; label: string; url?: string };
function footnotes() {
  const list: Src[] = [];
  const ref = (s: Src) => {
    let i = list.findIndex((x) => x.key === s.key);
    if (i < 0) { list.push(s); i = list.length - 1; }
    const n = i + 1;
    return <sup className="atlas-fn"><a href={`#atlas-fn-${n}`} aria-label={`Source ${n}`}>[{n}]</a></sup>;
  };
  return { list, ref };
}
const runSrc = (r: Run): Src => ({ key: `run:${r.id}`, label: `${runTitle(r)}: ${sourceLabel(r)}`, url: r.source.url });
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

export interface NotesProps {
  scenario: Scenario;
  evaluation: Evaluation;
  psiOnly: Evaluation;
  robust: Robustness;
  ranking: RankRow[];
  coveragePct: number;
  grid: { nx: number; ny: number };
  selected: Run | null;
  selectedScored: Scored | null;
  highlightInv: string | null;
  pinnedInv: string | null;
  onInspect: (r: Run) => void;
  onCloseSpecimen: () => void;
  onHoverInv: (id: string | null) => void;
  onPinInv: (id: string) => void;
}

export default function FieldNotes(p: NotesProps) {
  const { scenario: s, evaluation: ev, psiOnly, robust } = p;
  const fn = footnotes();
  const n = ev.nearest;
  const verdict: Verdict = ev.verdict;
  const partialG = s.gravity === "moon" || s.gravity === "mars";
  const hazard = HAZARDS.find((h) => h.id === s.hazard)!;
  const flowTxt = s.flowCmS == null || s.flowCmS === 0 ? "in quiescent air" : `with ${fmt(s.flowCmS, 0)} cm/s ventilation`;
  const loc = `At ${fmt(s.o2Pct)}% O₂ and ${fmt(s.pressureKPa)} kPa (${psia(s.pressureKPa)} psia), ${flowTxt}`;
  const unit = `one unit = ${SCALES.o2Pts} pts O₂, ${Math.round((SCALES.pressureRatio - 1) * 100)}% pressure or ${SCALES.flowCmS} cm/s flow`;
  const psiN = psiOnly.nearest;
  const fx = [ROBUSTNESS_FACTORS[0], ROBUSTNESS_FACTORS[ROBUSTNESS_FACTORS.length - 1]];

  const verdictCounts = (Object.keys(robust.verdicts) as Verdict[]).filter((v) => robust.verdicts[v] > 0).map((v) => `${v} ${robust.verdicts[v]}`).join(" · ");
  const insights = INSIGHTS.filter((i) => (partialG ? i.id === "i-lunar" || i.hazards.includes(s.hazard) : i.hazards.includes(s.hazard) && i.id !== "i-lunar"))
    .sort((a, b) => (partialG ? Number(b.id === "i-lunar") - Number(a.id === "i-lunar") : 0)).slice(0, 3);
  const mylar = OLSON_FERKUL_2012.rows.find((r) => r.material.startsWith("Mylar"));
  const lunarClaim = mylar && mylar.uloi.moon < mylar.uloi.micro && mylar.uloi.moon < mylar.uloi.earth;
  const fm2 = PUBLISHED_GROUPS.find((g) => g.id === "PLAN-FM2");
  const top = p.ranking.slice(0, 6);
  const maxR = Math.max(1, ...top.map((r) => r.R));

  return (
    <aside className="atlas-notes" aria-labelledby="atlas-notes-title">
      <h2 id="atlas-notes-title" className="atlas-notes-title">Field notes</h2>
      <p className="atlas-notes-loc">{GRAVITY_LABEL[s.gravity]} · {hazard.label} · {s.materialClass === "any" ? "any material" : `${s.materialClass} materials`} · {s.includePublished ? "PSI + published" : "PSI only"}</p>

      <div className="atlas-verdict" aria-live="polite">
        <p className="atlas-verdict-line">
          <span className="atlas-verdict-word">Evidence: {verdict}</span>
          <span className="atlas-disclaimer">{DISCLAIMER}</span>
        </p>
        <p className="atlas-verdict-copy">{VERDICT_COPY[verdict]}{n && <> · <span className="atlas-computed">computed</span> D <span className="atlas-num">{fmt(n.d.D, 2)}</span></>}{fn.ref(ENGINE_SRC)}</p>
      </div>

      {p.selected && (
        <div className="atlas-specimen-slot">
          <SpecimenCard key={p.selected.id} run={p.selected} scored={p.selectedScored} onClose={p.onCloseSpecimen} />
        </div>
      )}

      <div className="atlas-prose">
        {n ? (
          <p>
            {loc}, the nearest comparable test is{" "}
            <button type="button" className="atlas-runlink" onClick={() => p.onInspect(n.run)}>{runTitle(n.run)}</button>
            {n.run.material ? ` (${n.run.material.replace(/\s+/g, " ").trim()})` : " (material not recorded)"}{fn.ref(runSrc(n.run))}, {fmt(n.d.D, 1)} units away
            {n.d.partialMatch
              ? <> <strong>on {n.d.axesUsed.map((ax) => AXIS_NAME[ax]).join(" and ")} only; {n.d.flags.includes("flow-regime-mismatch") ? "flow regime differs, so flow is not compared" : `${(["o2", "pressure", "flow"] as const).filter((ax) => !n.d.axesUsed.includes(ax)).map((ax) => AXIS_NAME[ax]).join(" and ")} not recorded`}</strong>{gapPhrase(n)}.</>
              : <>{gapPhrase(n)}.</>}
            {" "}Differences are test minus scenario; {unit}.
            {n.d.partialMatch && (p.evaluation.nearestComplete
              ? <> Best fully-compared test:{" "}<button type="button" className="atlas-runlink" onClick={() => p.onInspect(p.evaluation.nearestComplete!.run)}>{runTitle(p.evaluation.nearestComplete.run)}</button>{fn.ref(runSrc(p.evaluation.nearestComplete.run))}, D <span className="atlas-num">{fmt(p.evaluation.nearestComplete.d.D, 2)}</span> ({classify(p.evaluation.nearestComplete.d.D)}).</>
              : <> No test in this regime is comparable on all three axes.</>)}
            {n.run.pressureBasis === "nominal-stated" && <> Its pressure is nominal (stated), not measured.</>}
            {n.run.tier === "T3_PUBLISHED" && <> It is a published value, not a PSI table row, transcribed and awaiting verification.</>}
          </p>
        ) : (
          <p>
            {loc}, there is <strong>no comparable test</strong> in {GRAVITY_LABEL[s.gravity].toLowerCase()} for this question{s.includePublished ? "" : " in PSI"}.
            {s.gravity !== "micro" && <> PSI holds {COUNTS.partialGravityRuns === 0 ? "no" : COUNTS.partialGravityRuns} partial-gravity combustion tests; every PSI run in this snapshot was flown in microgravity{fn.ref(PSI_SRC)}.</>}
            {!s.includePublished && s.gravity !== "micro" && <> Turn on published evidence to see the drop-tower and LUCI points for this regime.</>}
          </p>
        )}

        {s.includePublished ? (
          psiN?.run.id !== n?.run.id ? (
            <p>PSI alone places the nearest test at {psiN ? <>D <span className="atlas-num">{fmt(psiN.d.D, 2)}</span> ({psiOnly.verdict})</> : <>nothing ({psiOnly.verdict})</>}; with published evidence it is D <span className="atlas-num">{n ? fmt(n.d.D, 2) : "—"}</span> ({verdict}). The rings on the map are those published tests.</p>
          ) : <p>Published evidence is included but does not change the nearest test here.</p>
        ) : <p className="atlas-quiet">Published evidence is off: only PSI run-table rows are counted.</p>}

        <p>
          <span className={`atlas-robust ${robust.robust ? "is-robust" : "is-sensitive"}`}>{robust.robust ? "Robust" : "Sensitive"}</span>{" "}
          {robust.robust
            ? <>All {robust.combos} combinations of {fx.map(factor).join(" and ")} axis scales give {robust.range[0]}.</>
            : <>Across {robust.combos} combinations of {factor(fx[0])}, 1× and {factor(fx[1])} axis scales the verdict ranges from {robust.range[0]} to {robust.range[1]} ({verdictCounts}).</>}
          {robust.Drange && <> D spans <span className="atlas-num">{fmt(robust.Drange[0], 2)}–{fmt(robust.Drange[1], 2)}</span>.</>}
          {" "}The dashed contours on the map show where the NEAR boundary would sit if the O₂ and pressure scales were halved or doubled{fn.ref(ENGINE_SRC)}.
        </p>

        {ev.limits.length > 0 && <p className="atlas-quiet">{ev.limits.length} reported limit {ev.limits.length === 1 ? "point" : "points"} in this regime (ticked rings) are thresholds inferred from test series, not tested conditions; they never set the verdict or the bands.</p>}
        <p className="atlas-quiet">{pct(p.coveragePct)} of this charted window lies within D {VERDICT_THRESHOLDS.near} of comparable evidence (computed on a {p.grid.nx} × {p.grid.ny} grid; uniform in log pressure). {ev.otherGravity.length > 0 && <>{ev.otherGravity.length.toLocaleString("en-US")} placeable runs from other gravity regimes stay on their own sheets.</>}</p>
      </div>

      {partialG && (
        <section className="atlas-notes-sec" aria-labelledby="atlas-pg-title">
          <h3 id="atlas-pg-title" className="atlas-h3">Partial gravity: a separate regime</h3>
          <p className="atlas-prose-sm">PSI contains no partial-gravity combustion tests{fn.ref(PSI_SRC)}. The only reduced-gravity limits on record here are drop-tower values{fn.ref(OF_SRC)}, shown as points per gravity level.</p>
          <PartialGPlot selected={s.gravity} />
          {lunarClaim && mylar && <p className="atlas-pullquote">For {mylar.material.split(" ")[0]} at {mylar.pressurePsia} psia, NASA drop-tower tests found a lower flammability limit at lunar gravity than at either 0 g or 1 g. Microgravity and Earth results did not bound lunar behaviour for this material.{fn.ref(OF_SRC)}</p>}
          <ul className="atlas-caveats">{OLSON_FERKUL_2012.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
          {fm2 && s.gravity === "moon" && <p className="atlas-prose-sm"><span className="atlas-planned-tag">planned — not evidence</span> {fm2.acronym}: planned — first lunar-surface test. Its condition sets are drawn as dashed rings and never counted{fn.ref({ key: "fm2", label: fm2.title, url: fm2.landingUrl })}.</p>}
          <p className="atlas-micro">Method: we do not interpolate between gravity levels.</p>
        </section>
      )}

      <section className="atlas-notes-sec" aria-labelledby="atlas-rank-title">
        <h3 id="atlas-rank-title" className="atlas-h3">Investigations, ranked for this question</h3>
        <p className="atlas-micro">R is computed (proximity, hazard match, scale, coverage, measures). Hover or select a row to find its runs on the map.</p>
        <ol className="atlas-rank">
          {top.map((r, i) => {
            const id = r.investigation.id;
            const c = r.contributions;
            return (
              <li key={id}>
                <button
                  type="button"
                  className={`atlas-rank-row${p.highlightInv === id ? " is-hi" : ""}`}
                  aria-pressed={p.pinnedInv === id}
                  onMouseEnter={() => p.onHoverInv(id)}
                  onMouseLeave={() => p.onHoverInv(null)}
                  onFocus={() => p.onHoverInv(id)}
                  onBlur={() => p.onHoverInv(null)}
                  onClick={() => p.onPinInv(id)}
                >
                  <span className="atlas-rank-n">{i + 1}</span>
                  <span className="atlas-rank-name">
                    {r.investigation.acronym}
                    {r.investigation.tier === "T3_PUBLISHED" && <span className="atlas-rank-tag">published</span>}
                  </span>
                  <span className="atlas-rank-d"><span className="atlas-micro-label">D min</span>{r.Dmin != null ? fmt(r.Dmin, 2) : "none"}</span>
                  <span className="atlas-rank-r"><span className="atlas-micro-label">R</span>{fmt(r.R, 0)}</span>
                  <span className="atlas-rank-bar" aria-hidden="true">
                    {(["P", "H", "S", "C", "M"] as const).map((k) => <span key={k} className={`atlas-seg atlas-seg-${k}`} style={{ width: `${Math.round((c[k] * 100 / maxR) * 10000) / 100}%` }} />)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="atlas-rank-key" aria-hidden="true">
          {(["P", "H", "S", "C", "M"] as const).map((k) => <span key={k}><i className={`atlas-seg atlas-seg-${k}`} />{k}</span>)}
          <span className="atlas-quiet">P proximity · H hazard · S scale · C coverage · M measures</span>
        </p>
      </section>

      <section className="atlas-notes-sec" aria-labelledby="atlas-ins-title">
        <h3 id="atlas-ins-title" className="atlas-h3">Marginalia</h3>
        {insights.map((i) => (
          <article key={i.id} className="atlas-insight">
            <p className="atlas-insight-stamps"><span className="atlas-draft">DRAFT — unverified</span><span className="atlas-validity">{i.validity}</span></p>
            <p className="atlas-insight-claim">{i.claim}</p>
            <p className="atlas-insight-meta"><span className="atlas-num">{i.value}</span> · {i.conditions}</p>
            <p className="atlas-insight-meta"><b>Scope</b> {i.scope}</p>
            <p className="atlas-insight-meta"><b>Not valid for</b> {i.notValidFor}</p>
            <p className="atlas-insight-meta"><a href={i.source.url} target="_blank" rel="noreferrer">{i.source.ref} ↗</a></p>
          </article>
        ))}
      </section>

      <section className="atlas-notes-sec" aria-labelledby="atlas-arch-title">
        <h3 id="atlas-arch-title" className="atlas-h3">The archive</h3>
        <p className="atlas-prose-sm">
          PSI holds {COUNTS.totalRuns.toLocaleString("en-US")} run rows across {PSI_INVESTIGATIONS.length} investigation records; {COUNTS.plottable.toLocaleString("en-US")} have values that can be placed on this map{fn.ref(PSI_SRC)}.
          Of the {COUNTS.solidRunsWithO2} solid-material tests with a recorded O₂ value, the highest is {COUNTS.maxSolidO2}% O₂.
        </p>
      </section>

      <footer className="atlas-footnotes">
        <h3 className="atlas-h4">Sources</h3>
        <ol>
          {fn.list.map((f, i) => (
            <li key={f.key} id={`atlas-fn-${i + 1}`}>
              {f.label}
              {f.url && <> <a href={f.url} target="_blank" rel="noreferrer">↗</a></>}
            </li>
          ))}
        </ol>
      </footer>
    </aside>
  );
}
