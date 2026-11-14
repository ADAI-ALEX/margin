"use client";
import { isValidElement, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Run, Scenario } from "@/lib/schema";
import { SCALES, VERDICT_THRESHOLDS, ROBUSTNESS_FACTORS, classify, kPaToPsia, SENSITIVITY_FLOWS, type Evaluation, type FlowSensitivity, type Robustness, type Scored, type Verdict } from "@/lib/engine";
import { HAZARDS, INSIGHTS, OLSON_FERKUL_2012, PLANNED } from "@/content/curated";
import { ALL_RUNS, COUNTS, HEADLINE, SNAP, invById } from "@/lib/data";
import { DISCLAIMER, GRAVITY_LABEL, fmt, fmtSigned } from "@/lib/format";
import { AXIS_KEYS, AXIS_LABEL, AXIS_UNIT, BASIS, BASIS_TEXT, FIELD, factorLabel, fetchedDate, notCompared, partialLabel, valueKinds, verification, type ClaimKind } from "./derive";
import { Claim, EvidenceWord, MethodNote, SourceRef } from "./ui";
import { ClaimBadge } from "@/components/ui/misc";
import css from "./casefile.module.css";

export interface FlowRow { u: number; current: boolean; ev: Evaluation }
interface Entry { id: string; kinds: ClaimKind[]; body: ReactNode; source: ReactNode }

const VERDICTS: Verdict[] = ["DIRECT", "NEAR", "DISTANT", "NONE"];
const AX = { o2: "O₂", pressure: "pressure", flow: "flow" } as const;
const uniq = (k: (ClaimKind | null | undefined)[]) => Array.from(new Set(k.filter((x): x is ClaimKind => !!x)));

function RunButton({ run, openRun }: { run: Run; openRun: (r: Run) => void }) {
  return <button type="button" className="ui-link-btn mono" onClick={() => openRun(run)}>{run.id}</button>;
}
function Engine({ fn }: { fn: string }) {
  return <>MARGIN engine · <code>{fn}</code> · <Link href="/method">method</Link></>;
}

function Gaps({ sc }: { sc: Scored }) {
  const d = sc.d;
  const item = (label: string, used: boolean, raw: string, u: number | null, mismatch = false) => (
    <li>{label}: {used ? <><span className="num">{raw}</span> <span className={css.quiet}>({fmtSigned(u, 2)} units)</span></> : <span className={css.nr}>{mismatch ? "not compared — flow regime differs" : "not compared — not recorded"}</span>}</li>
  );
  return (
    <ul className={css.gapList}>
      {item("O₂", d.axesUsed.includes("o2"), `${fmtSigned(d.raw.o2Pts, 1)} pts`, d.gaps.o2)}
      {item("Pressure", d.axesUsed.includes("pressure"), `${fmtSigned(d.raw.pressurePct, 0)} %`, d.gaps.pressure)}
      {item("Flow", d.axesUsed.includes("flow"), `${fmtSigned(d.raw.flowCmS, 1)} cm/s`, d.gaps.flow, d.flags.includes("flow-regime-mismatch"))}
    </ul>
  );
}

/** One line per axis value of a run, each typed by its own basis and verification state. */
function RunValues({ run }: { run: Run }) {
  return (
    <ul className={css.gapList}>
      {AXIS_KEYS.map((axis) => {
        const v = run[FIELD[axis]];
        return (
          <li key={axis}>
            {AXIS_LABEL[axis]}: {v == null ? <span className={css.nr}>not recorded</span> : <>
              <span className="num">{fmt(v, axis === "p" ? 1 : 1)} {AXIS_UNIT[axis]}</span>{axis === "p" && <span className={css.quiet}> ({fmt(kPaToPsia(v), 2)} psia)</span>}
              {" "}<span className={css.quiet}>{BASIS_TEXT[run[BASIS[axis]]]}</span> {valueKinds(run, axis).map((k) => <Claim key={k} kind={k} />)}
            </>}
          </li>
        );
      })}
    </ul>
  );
}

export function FlowSensitivity({ rows, s }: { rows: FlowRow[]; s: Scenario }) {
  return (
    <div className={css.flowMod}>
      <h3 className={css.h3} id="inv-flow-h">Flow sensitivity <ClaimBadge kind="COMPUTED" /></h3>
      <p className={css.secSub}>Verdict at other ventilation flows, everything else as in your scenario ({fmt(s.o2Pct, 1)}% O₂, {fmt(s.pressureKPa, 1)} kPa, {GRAVITY_LABEL[s.gravity].toLowerCase()}, {s.includePublished ? "PSI + published" : "PSI only"}).</p>
      <div className="ui-table-scroll" data-testid="flow-sensitivity" tabIndex={0} role="region" aria-labelledby="inv-flow-h">
        <table className="ui-table">
          <caption className="sr-only">Verdict at other ventilation flows, everything else as in your scenario</caption>
          <thead><tr><th scope="col">Flow</th><th scope="col" className="is-num">D</th><th scope="col">Evidence</th><th scope="col">Nearest comparable run</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.u} data-current={r.current || undefined} className={r.current ? css.currentRow : undefined}>
                <th scope="row"><span className="num">{fmt(r.u, r.u % 1 ? 1 : 0)} cm/s</span>{r.u === 0 && <span className={css.quiet}> (quiescent)</span>}{r.current && <span className={css.youMark}> · your scenario</span>}</th>
                <td className="num is-num">{r.ev.nearest ? fmt(r.ev.nearest.d.D, 2) : "—"}</td>
                <td><span className={css.vWord}>{r.ev.verdict}</span></td>
                <td>{r.ev.nearest ? <><span className="mono">{r.ev.nearest.run.id}</span>{r.ev.nearest.d.partialMatch && <span className={css.quiet}> (partial)</span>}</> : <span className={css.nr}>none</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ClaimLedger({ s, ev, psiOnly, robust, flowRows, crossings, openRun }: { s: Scenario; ev: Evaluation; psiOnly: Evaluation; robust: Robustness; flowRows: FlowRow[]; crossings: FlowSensitivity["crossings"]; openRun: (r: Run) => void }) {
  const out: Entry[] = [];
  const n = ev.nearest;
  const hazard = HAZARDS.find((h) => h.id === s.hazard)?.label ?? s.hazard;
  const psiSrc = <>NASA PSI run tables, fetched {fetchedDate(SNAP.fetchedAt)} · <a href="https://psi.nasa.gov/" target="_blank" rel="noreferrer">psi.nasa.gov ↗</a></>;

  out.push({
    id: "verdict", kinds: ["COMPUTED"],
    body: <>
      <p className={css.claimLead}><EvidenceWord v={ev.verdict} />{n && <> · nearest comparable run D = <b className="num">{fmt(n.d.D, 2)}</b></>}{ev.qualifier && n && <span className={css.partial}>{partialLabel(n)}</span>}. <i>{DISCLAIMER}</i></p>
      {ev.qualifier && <p>On all three axes (O₂, pressure and flow): <EvidenceWord v={ev.verdictComplete} />{ev.nearestComplete ? <> (D = <span className="num">{fmt(ev.nearestComplete.d.D, 2)}</span>)</> : <> — no comparable run records all three</>}.</p>}
      <p>{ev.comparable.length} runs pass the comparability gate for “{hazard}” in {GRAVITY_LABEL[s.gravity].toLowerCase()} ({s.includePublished ? "PSI + published" : "PSI only"}). Thresholds: DIRECT D ≤ {VERDICT_THRESHOLDS.direct}, NEAR D ≤ {VERDICT_THRESHOLDS.near}.</p>
      <p><MethodNote /></p>
    </>,
    source: <Engine fn="evaluate()" />,
  });

  if (n) {
    const r = n.run;
    const v = verification(r);
    out.push({
      id: "nearest", kinds: uniq([...AXIS_KEYS.flatMap((a) => valueKinds(r, a)), v.kind]),
      body: <>
        <p className={css.claimLead}>Nearest comparable run <RunButton run={r} openRun={openRun} />: {r.material ?? "material not recorded"}{r.outcome ? ` · outcome ${r.outcome}` : ""}.</p>
        <RunValues run={r} />
        {v.kind === "DRAFT" && <p className={css.draftNote}>DRAFT: {v.label}.</p>}
      </>,
      source: <SourceRef run={r} />,
    });
    out.push({
      id: "gaps", kinds: ["COMPUTED"],
      body: <>
        <p className={css.claimLead}>Gaps to that run (run − scenario); one unit = {SCALES.o2Pts} pts O₂, ×{SCALES.pressureRatio} pressure, {SCALES.flowCmS} cm/s flow.{n.d.partialMatch && <> Partial match: compared on {n.d.axesUsed.map((a) => AX[a]).join(" + ")} only; {notCompared(n).map((a) => AX[a]).join(", ")} not compared.</>}</p>
        <Gaps sc={n} />
      </>,
      source: <Engine fn="distance()" />,
    });
    if (n.d.partialMatch) {
      const c = ev.nearestComplete;
      out.push(c ? {
        id: "complete", kinds: uniq(["COMPUTED", ...AXIS_KEYS.flatMap((a) => valueKinds(c.run, a))]),
        body: <p className={css.claimLead}>Best run compared on all three axes: <RunButton run={c.run} openRun={openRun} /> ({c.run.material ?? "material not recorded"}) — D = <b className="num">{fmt(c.d.D, 2)}</b>, <EvidenceWord v={classify(c.d.D)} />.</p>,
        source: <SourceRef run={c.run} />,
      } : {
        id: "complete", kinds: ["COMPUTED"],
        body: <p className={css.claimLead}>No comparable run in this regime is compared on all three axes.</p>,
        source: <Engine fn="evaluate().nearestComplete" />,
      });
    }
  } else {
    out.push({
      id: "none", kinds: ["COMPUTED"],
      body: <p className={css.claimLead}>No run passes the gate for this question in {GRAVITY_LABEL[s.gravity].toLowerCase()}{s.includePublished ? "" : " (PSI only)"}. {ev.otherGravity.length} relevant runs are in other gravity regimes; no distance is computed across regimes.</p>,
      source: <Engine fn="gate()" />,
    });
  }

  if (s.includePublished) {
    out.push({
      id: "psionly", kinds: ["COMPUTED"],
      body: <p className={css.claimLead}>PSI run tables alone: <EvidenceWord v={psiOnly.verdict} />{psiOnly.nearest ? <> (D = <span className="num">{fmt(psiOnly.nearest.d.D, 2)}</span>, <span className="num">{psiOnly.nearest.run.id}</span>)</> : null}. Published values add the difference.</p>,
      source: <Engine fn="evaluate(includePublished: false)" />,
    });
  }

  const present = VERDICTS.filter((x) => robust.verdicts[x] > 0);
  const fx = ROBUSTNESS_FACTORS.map(factorLabel);
  out.push({
    id: "robust", kinds: ["COMPUTED"],
    body: <>
      <p className={css.claimLead}>
        {robust.robust
          ? <>Across {robust.combos} combinations of {fx.join(", ")} axis scales the verdict stays {robust.range[0]}.</>
          : <>Across {robust.combos} combinations of {fx.join(", ")} axis scales the verdict ranges {robust.range[0]}–{robust.range[1]} ({present.map((x) => `${x} ${robust.verdicts[x]}`).join(" · ")}).</>}
        {robust.Drange && <> D spans <span className="num">{fmt(robust.Drange[0], 2)}–{fmt(robust.Drange[1], 2)}</span>.</>}
        {robust.partialCells > 0 && <> In {robust.partialCells} of the {robust.combos} combinations the nearest run is a partial match (not compared on every axis).</>}
      </p>
      <p className={css.quiet}>“Changes under ½×/2× scales” describes the method&rsquo;s sensitivity to its own assumptions, not fire behaviour.</p>
    </>,
    source: <Engine fn="robustness()" />,
  });

  const changes = new Set(flowRows.map((r) => r.ev.verdict)).size > 1;
  out.push({
    id: "flow", kinds: ["COMPUTED"],
    body: <>
      <p className={css.claimLead}>Flow sensitivity: {changes ? <>the verdict <b>changes</b> with the assumed ventilation flow.</> : <>the verdict is the same at every flow below.</>} Flow is one of the three compared axes, so a different assumed flow moves D.</p>
      {crossings.length > 0 && <p>Between quiescent air and {fmt(Math.max(...SENSITIVITY_FLOWS.map((u) => u ?? 0)), 0)} cm/s the verdict changes class at {crossings.map((c, i) => <span key={i}>{i > 0 ? ", " : ""}≈ <span className="num">{fmt(c.flowCmS, 1)}</span> cm/s ({c.from} → {c.to})</span>)}.</p>}
      <p className={css.quiet}>The verdict at each flow is in the Flow sensitivity table below.</p>
    </>,
    source: <Engine fn="evaluate() at each flow" />,
  });

  const lim = ev.limits[0];
  if (lim) {
    out.push({
      id: "limit", kinds: uniq(["REPORTED LIMIT", verification(lim.run).kind]),
      body: <p className={css.claimLead}>Nearest reported limit in this regime: <RunButton run={lim.run} openRun={openRun} />, <span className="num">{fmt(lim.run.o2Pct, 1)}% O₂</span>{lim.run.pressureKPa != null && <> at <span className="num">{fmt(lim.run.pressureKPa, 1)} kPa</span></>} ({lim.run.material ?? lim.run.investigation}). A threshold inferred by the authors from a test series — not a tested condition, never used for the verdict ({ev.limits.length} limit point{ev.limits.length === 1 ? "" : "s"} in this regime).</p>,
      source: <SourceRef run={lim.run} />,
    });
  }

  if (n && (n.run.pressureBasis === "nominal-stated" || n.run.o2Basis === "nominal-stated")) {
    out.push({
      id: "nominal", kinds: uniq(["NOMINAL", n.run.flags.includes("unverified-transcription") ? "DRAFT" : null]),
      body: <p className={css.claimLead}>The nearest run&rsquo;s {n.run.pressureBasis === "nominal-stated" ? "pressure" : "O₂"} is nominal: stated in a document, not measured in the run.{n.run.note && <> {n.run.note}</>}</p>,
      source: <SourceRef run={n.run} />,
    });
  }

  out.push({
    id: "coverage", kinds: ["MEASURED", "COMPUTED"],
    body: <p className={css.claimLead}>The highest O₂ in any of PSI&rsquo;s <span className="num">{HEADLINE.solidRunsWithO2}</span> solid-material tests with a recorded O₂ value is <b className="num">{fmt(HEADLINE.maxSolidO2, 1)}%</b>. <span className="num">{HEADLINE.atOrAboveArtemis}</span> reach the Artemis habitat&rsquo;s {fmt(HEADLINE.artemisO2, 1)}%; <span className="num">{HEADLINE.atOrAboveEA}</span> reach the Exploration Atmosphere&rsquo;s {fmt(HEADLINE.eaO2, 1)}%. ({COUNTS.totalRuns.toLocaleString("en-GB")} PSI run rows; {COUNTS.plottable.toLocaleString("en-GB")} record both O₂ and pressure.)</p>,
    source: psiSrc,
  });

  out.push({
    id: "gate", kinds: ["COMPUTED"],
    body: <p className={css.claimLead}>Of {ALL_RUNS.length.toLocaleString("en-GB")} runs and records: {ev.comparable.length} comparable, {ev.limits.length} reported limits, {ev.context.length} context only, {ev.otherGravity.length} in another gravity regime, {ev.excludedCount.toLocaleString("en-GB")} excluded by the gate (other fuel class, no O₂, planned, or published while the toggle is off).</p>,
    source: <Engine fn="gate()" />,
  });

  if (s.gravity !== "micro") {
    const ofRuns = ALL_RUNS.filter((r) => r.investigation === "PUB-OLSON-FERKUL-2012");
    const ofKinds = uniq(["REPORTED LIMIT", ofRuns.some((r) => r.flags.includes("unverified-transcription")) ? "DRAFT" : "PUBLISHED"]);
    const mylar = OLSON_FERKUL_2012.rows.find((r) => /mylar/i.test(r.material)) ?? OLSON_FERKUL_2012.rows[0];
    const lower = mylar.uloi.moon < mylar.uloi.micro && mylar.uloi.moon < mylar.uloi.earth;
    out.push({
      id: "pg-psi", kinds: ["COMPUTED"],
      body: <p className={css.claimLead}>{COUNTS.partialGravityRuns === 0 ? "PSI contains no partial-gravity combustion tests." : <>PSI holds <span className="num">{COUNTS.partialGravityRuns}</span> partial-gravity combustion runs.</>}</p>,
      source: psiSrc,
    });
    out.push({
      id: "pg-of", kinds: ofKinds,
      body: <p className={css.claimLead}>
        {mylar.material} at {mylar.pressurePsia} psia, limiting O₂ (ULOI*): Moon <span className="num">{mylar.uloi.moon}</span> · 0 g <span className="num">{mylar.uloi.micro}</span> · 1 g <span className="num">{mylar.uloi.earth}</span> % O₂.
        {lower && <> For this material the lunar value was lower than both; microgravity and Earth results did not bound lunar behaviour.</>}
      </p>,
      source: <><a href={OLSON_FERKUL_2012.source.url} target="_blank" rel="noreferrer">{OLSON_FERKUL_2012.source.ref}, {OLSON_FERKUL_2012.source.page} ↗</a> · doi {OLSON_FERKUL_2012.source.doi}</>,
    });
    const fm2 = invById.get("PLAN-FM2");
    if (fm2) out.push({
      id: "pg-fm2", kinds: ["PLANNED"],
      body: <p className={css.claimLead}>{fm2.acronym}: planned — not evidence. {PLANNED.length} planned condition sets; never counted.</p>,
      source: <a href={fm2.landingUrl} target="_blank" rel="noreferrer">{PLANNED[0]?.source.ref ?? fm2.title} ↗</a>,
    });
  }

  const insights = INSIGHTS.filter((i) => i.hazards.includes(s.hazard));
  const verified = insights.filter((i) => i.verification.status === "primary-checked");
  for (const i of verified) {
    out.push({
      id: `ins-${i.id}`, kinds: uniq([i.validity === "MEASURED" ? "MEASURED" : null, "PUBLISHED"]),
      body: <>
        <p className={css.claimLead}>{i.claim} <span className="num">{i.value}</span> · {i.conditions}.</p>
        <p className={css.quiet}>Published finding ({i.validity.toLowerCase()}). Scope: {i.scope}. Not valid for: {i.notValidFor}.</p>
        {i.verification.quote && <blockquote className={css.quote}>“{i.verification.quote}”</blockquote>}
      </>,
      source: <a href={i.source.url} target="_blank" rel="noreferrer">{i.source.ref}{i.verification.locator ? `, ${i.verification.locator}` : i.source.page ? `, ${i.source.page}` : ""} ↗</a>,
    });
  }
  const pending = insights.length - verified.length;

  const rows = out.map((c, i) => ({ ...c, n: i + 1, engine: isValidElement(c.source) && c.source.type === Engine }));
  return <LedgerTable rows={rows} pending={pending} flow={<FlowSensitivity rows={flowRows} s={s} />} />;
}

type LedgerRow = Entry & { n: number; engine: boolean };
type SortKey = "n" | "kind" | "source";
const KIND_ORDER: ClaimKind[] = ["MEASURED", "COMPUTED", "NOMINAL", "REPORTED LIMIT", "PUBLISHED", "DRAFT", "PLANNED"];

function LedgerTable({ rows, pending, flow }: { rows: LedgerRow[]; pending: number; flow: ReactNode }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "n", dir: 1 });
  const sorted = useMemo(() => {
    const kindRank = (r: LedgerRow) => Math.min(...r.kinds.map((k) => KIND_ORDER.indexOf(k)));
    const val = (r: LedgerRow) => (sort.key === "n" ? r.n : sort.key === "kind" ? kindRank(r) * 100 + r.n : (r.engine ? 0 : 1) * 100 + r.n);
    return [...rows].sort((a, b) => (val(a) - val(b)) * sort.dir);
  }, [rows, sort]);
  const th = (key: SortKey, label: string, cls?: string) => {
    const on = sort.key === key;
    return (
      <th scope="col" className={cls} aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button type="button" className={css.sortBtn} onClick={() => setSort((p) => ({ key, dir: p.key === key ? (p.dir === 1 ? -1 : 1) : 1 }))}>
          {label}<span className={css.sortGlyph} aria-hidden="true">{on ? (sort.dir === 1 ? "▲" : "▼") : "↕"}</span>
        </button>
      </th>
    );
  };
  return (
    <section className={css.ledger} aria-labelledby="inv-ledger-h" data-testid="claim-ledger">
      <div className={css.secHead}>
        <div className={css.secHeadText}>
          <h2 className={css.h2} id="inv-ledger-h">Claim ledger</h2>
          <p className={css.secSub}>Every statement made for this scenario, typed and sourced: <span className="num">{rows.length}</span> statements. Sort by number, claim type or source; run ids open their provenance.</p>
        </div>
        <p className={css.kindKey} aria-label="Claim types">
          {KIND_ORDER.map((k) => <Claim key={k} kind={k} />)}
        </p>
      </div>
      <div className={`ui-table-scroll ${css.ledgerScroll}`} tabIndex={0} role="region" aria-label="Claim ledger table">
        <table className={`ui-table ${css.ledgerTable}`}>
          <caption className="sr-only">Claim ledger: each statement for the current scenario with its claim type and source</caption>
          <thead>
            <tr>
              {th("n", "#", css.lN)}
              {th("kind", "Type", css.lKind)}
              <th scope="col" className={css.lBody}>Statement</th>
              {th("source", "Source", css.lSrc)}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} data-claim={c.id}>
                <td className={`num ${css.lN}`}>C{c.n}</td>
                <td className={css.lKind}><span className={css.kinds}>{c.kinds.map((k) => <Claim key={k} kind={k} />)}</span></td>
                <td className={css.lBody}><div className={css.claimText}>{c.body}</div></td>
                <td className={css.lSrc}><span className={css.srcLabelSm}>Source</span>{c.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pending > 0 && <p className={css.ledgerFoot}>{pending} curated finding{pending === 1 ? "" : "s"} for this question {pending === 1 ? "is" : "are"} not shown: not yet checked against the primary source.</p>}
      {flow}
    </section>
  );
}
