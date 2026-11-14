"use client";
/**
 * /investigations: which NASA investigations come closest to the scenario, how they differ, and where each
 * number comes from. The scenario is shared with the Atlas through the URL (useMargin); the compare
 * selection is kept in `cmp`.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Run } from "@/lib/schema";
import { evaluate, flowSensitivity } from "@/lib/engine";
import { useMargin } from "@/lib/state/useMargin";
import { ALL_RUNS, invById } from "@/lib/data";
import { Breadcrumb } from "@/components/ui/misc";
import { buildRows } from "./derive";
import { ScenarioSentence, type PUnit } from "./ScenarioSentence";
import { Finding } from "./Finding";
import { Ladder, sections, type SortMode } from "./Ladder";
import { Footprint } from "./Footprint";
import { PartialG } from "./PartialG";
import { ClaimLedger, type FlowRow } from "./ClaimLedger";
import { CompareTray } from "./CompareTray";
import { Provenance } from "./Provenance";
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
  const { scenario: s, evaluation: ev, psiOnly, ranking, robust, weights, setWeights } = m;
  const [pUnit, setPUnit] = useState<PUnit>("kPa");
  const [sort, setSort] = useState<SortMode>("rank");
  const [pinned, setPinned] = useState<string[]>([]);
  const [cmpReady, setCmpReady] = useState(false);
  const [provRun, setProvRun] = useState<Run | null>(null);
  const [hoverInv, setHoverInv] = useState<string | null>(null);
  const [selInv, setSelInv] = useState<string | null>(null);

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

  // The footprint follows the hovered row, else the selected one, else the top of the list.
  const firstId = useMemo(() => sections(rows, sort, s)[0]?.rows[0]?.inv.id ?? null, [rows, sort, s]);
  const focusId = hoverInv ?? (selInv && rows.some((r) => r.inv.id === selInv) ? selInv : firstId);
  const focusRow = rows.find((r) => r.inv.id === focusId) ?? null;

  return (
    <main id="main" data-scenario-view className={`ui-page ${css.root}`} data-dock={pinned.length > 0 || undefined}>
      <header className="ui-page-head">
        <Breadcrumb items={[{ label: "Atlas", href: "/" }, { label: "Investigations" }]} />
        <h1 className="ui-page-title">Investigations</h1>
        <p className="ui-page-lede">Which NASA investigations come closest to your scenario, how they differ, and where each number comes from.</p>
      </header>

      <div className={css.top}>
        <ScenarioSentence m={m} pUnit={pUnit} setPUnit={setPUnit} />
        <Finding s={s} ev={ev} flowRows={flowRows} flowSpan={[TABLE_FLOWS[0], TABLE_FLOWS[TABLE_FLOWS.length - 1]]} openRun={setProvRun} />
      </div>

      {s.gravity !== "micro" && <PartialG gravity={s.gravity} includePublished={s.includePublished} openRun={setProvRun} />}

      <div className={css.workspace}>
        <Ladder
          rows={rows} s={s} pUnit={pUnit} sort={sort} setSort={setSort} pinned={pinned} togglePin={togglePin} openRun={setProvRun}
          weights={weights} setWeights={setWeights} focusId={focusId} selectedId={selInv ?? firstId} onHover={setHoverInv} onSelect={setSelInv}
        />
        <aside className={css.fieldCol} aria-label="Footprint field">
          <Footprint row={focusRow} s={s} ev={ev} />
        </aside>
      </div>

      <ClaimLedger s={s} ev={ev} psiOnly={psiOnly} robust={robust} flowRows={flowRows} crossings={crossings} openRun={setProvRun} />

      <CompareTray rows={rows} pinned={pinned} unpin={unpin} openRun={setProvRun} />
      <Provenance run={provRun} s={s} onClose={closeProv} />
    </main>
  );
}
