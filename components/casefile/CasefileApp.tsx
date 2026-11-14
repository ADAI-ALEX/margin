"use client";
/**
 * /investigations — the investigation layer of MARGIN (the "Casefile" workspace in the Atlas identity).
 * The scenario is shared with the Atlas through the URL (useMargin); the compare selection is kept in `cmp`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Run } from "@/lib/schema";
import { evaluate, flowSensitivity } from "@/lib/engine";
import { useMargin } from "@/lib/state/useMargin";
import { ALL_RUNS, invById } from "@/lib/data";
import { DISCLAIMER, fmt } from "@/lib/format";
import { buildRows, partialLabel } from "./derive";
import { ScenarioSentence, type PUnit } from "./ScenarioSentence";
import { Ladder, type SortMode } from "./Ladder";
import { PartialG } from "./PartialG";
import { ClaimLedger, type FlowRow } from "./ClaimLedger";
import { CompareTray } from "./CompareTray";
import { Provenance } from "./Provenance";
import { EvidenceWord, MethodNote } from "./ui";
import { publishPins } from "./pinStore";
import css from "./casefile.module.css";

const MAX_PINS = 3;
/** Flows at which the verdict is recomputed for the sensitivity table (cm/s; 0 = quiescent). */
const TABLE_FLOWS = [0, 5, 10, 15, 20, 30];

export function parseCmp(v: string | null): string[] {
  if (!v) return [];
  const ids = v.split(",").map((x) => x.trim()).filter((x) => invById.has(x));
  return Array.from(new Set(ids)).slice(0, MAX_PINS);
}

const onWorkspace = () => window.location.pathname.replace(/\/$/, "") === "/investigations";

function writeCmp(ids: string[]) {
  if (!onWorkspace()) return; // the route may be kept alive (hidden) while another page owns the URL
  const q = new URLSearchParams(window.location.search);
  q.delete("cmp");
  let qs = q.toString();
  if (ids.length) qs = `${qs ? `${qs}&` : ""}cmp=${ids.map(encodeURIComponent).join(",")}`;
  const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(window.history.state, "", url);
}

export default function CasefileApp() {
  const m = useMargin("iss");
  const { scenario: s, evaluation: ev, psiOnly, ranking, robust, weights } = m;
  const [pUnit, setPUnit] = useState<PUnit>("kPa");
  const [sort, setSort] = useState<SortMode>("rank");
  const [pinned, setPinned] = useState<string[]>([]);
  const [cmpReady, setCmpReady] = useState(false);
  const [provRun, setProvRun] = useState<Run | null>(null);

  // Read `cmp` from the URL on mount (in an effect so server and first client render match). With Cache
  // Components the route can be re-shown from a hidden <Activity>; then a URL without `cmp` keeps the pins.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (onWorkspace()) {
      const raw = new URLSearchParams(window.location.search).get("cmp");
      if (raw != null) setPinned(parseCmp(raw));
    }
    setCmpReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  // Merge `cmp` into the live query; the scenario keys are written by useMargin and left untouched.
  useEffect(() => { if (cmpReady) { writeCmp(pinned); publishPins(pinned); } }, [pinned, cmpReady]);

  const rows = useMemo(() => buildRows(s, ev, ranking), [s, ev, ranking]);
  const flowRows: FlowRow[] = useMemo(() => {
    const cur = s.flowCmS ?? 0;
    const us = Array.from(new Set([...TABLE_FLOWS, cur])).sort((a, b) => a - b);
    return us.map((u) => ({ u, current: u === cur, ev: u === cur ? ev : evaluate(ALL_RUNS, { ...s, flowCmS: u }) }));
  }, [s, ev]);

  const crossings = useMemo(() => flowSensitivity(ALL_RUNS, s).crossings, [s]);

  const togglePin = useCallback((id: string) => {
    setPinned((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_PINS ? p : [...p, id]));
  }, []);
  const unpin = useCallback((id: string) => setPinned((p) => p.filter((x) => x !== id)), []);
  const closeProv = useCallback(() => setProvRun(null), []);

  const n = ev.nearest;
  const others = flowRows.filter((r) => r.ev.verdict !== ev.verdict);
  const byVerdict = new Map<string, string[]>();
  for (const r of others) byVerdict.set(r.ev.verdict, [...(byVerdict.get(r.ev.verdict) ?? []), `${fmt(r.u, r.u % 1 ? 1 : 0)}${r.ev.qualifier ? " (partial match)" : ""}`]);
  const nearestInv = n ? invById.get(n.run.investigation) : null;

  return (
    <main id="main" className={css.root}>
      <header className={css.pageHead}>
        <h1 className={css.h1}>Investigations</h1>
        <p className={css.purpose}>Which NASA investigations come closest to your scenario, how they differ, and where each number comes from.</p>
      </header>

      <ScenarioSentence m={m} pUnit={pUnit} setPUnit={setPUnit} />

      <section className={css.finding} aria-live="polite" aria-label="Finding for this scenario" data-testid="finding" data-verdict={ev.verdict}>
        <p className={css.findingLine}>
          <span className={css.verdictWord}><EvidenceWord v={ev.verdict} /></span>
          {n && <span className={css.findingD}>D <b className="num">{fmt(n.d.D, 2)}</b> to <button type="button" className={css.runLink} onClick={() => setProvRun(n.run)}>{n.run.id}</button>{nearestInv && <> ({nearestInv.acronym})</>}{n.d.partialMatch && <span className={css.partial}>{partialLabel(n)}</span>}</span>}
          <span className={css.disclaimer}>{DISCLAIMER}</span>
        </p>
        {ev.qualifier && (
          <p className={css.findingNote}>
            {ev.qualifier === "flow-regime-mismatch" ? "The nearest run's flow regime differs from the scenario's, so flow is not compared" : "The nearest run does not record every axis"}.{" "}
            {ev.nearestComplete
              ? <>On all three axes the nearest comparable run is <button type="button" className={css.runLink} onClick={() => setProvRun(ev.nearestComplete!.run)}>{ev.nearestComplete.run.id}</button> at D <b className="num">{fmt(ev.nearestComplete.d.D, 2)}</b> — <EvidenceWord v={ev.verdictComplete} />.</>
              : <>No comparable run in this regime is compared on all three axes — on all three axes, <EvidenceWord v={ev.verdictComplete} />.</>}
          </p>
        )}
        {others.length > 0 ? (
          <p className={css.findingNote}>
            The verdict depends on the assumed ventilation flow: {[...byVerdict.entries()].map(([v, us], i) => <span key={v}>{i > 0 ? "; " : ""}<b>{v}</b> at {us.join(", ")} cm/s</span>)} (see the flow table in the claim ledger).
          </p>
        ) : (
          <p className={css.findingNote}>Same verdict at every flow from {TABLE_FLOWS[0]} to {TABLE_FLOWS[TABLE_FLOWS.length - 1]} cm/s.</p>
        )}
        <p className={css.findingNote}><MethodNote /></p>
      </section>

      {s.gravity !== "micro" && <PartialG gravity={s.gravity} includePublished={s.includePublished} openRun={setProvRun} />}

      <div className={css.workspace}>
        <div className={css.mainCol}>
          <Ladder rows={rows} s={s} pUnit={pUnit} sort={sort} setSort={setSort} pinned={pinned} togglePin={togglePin} openRun={setProvRun} weights={weights} />
          <CompareTray rows={rows} pinned={pinned} unpin={unpin} openRun={setProvRun} />
        </div>
        <aside className={css.sideCol} aria-label="Claim ledger">
          <ClaimLedger s={s} ev={ev} psiOnly={psiOnly} robust={robust} flowRows={flowRows} crossings={crossings} openRun={setProvRun} />
        </aside>
      </div>

      <Provenance run={provRun} s={s} onClose={closeProv} />
    </main>
  );
}
