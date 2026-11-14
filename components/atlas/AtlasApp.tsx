"use client";
/**
 * The Atlas: a full-screen evidence field with floating instruments (NASA Eyes-inspired layout).
 *   left    Expeditions (curated entry points) and the Scenario console
 *   right   Inspector: verdict card first, tabs or the run inspector below
 *   bottom  Regime selector (four discrete detents), snapshot status and verdict readout
 *   edge    Field tools rail
 * The field fills the viewport; its plot frame sits in the area the panels leave free. Below 768 px the
 * same pieces stack: field first, then the regime control, expeditions and an inspector sheet.
 * Engine calls only (lib/engine); presentation view-models in lib/view.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Gravity, Run } from "@/lib/schema";
import { distanceField, evaluate, ROBUSTNESS_FACTORS, VERDICT_THRESHOLDS } from "@/lib/engine";
import { useMargin, DEFAULT_SCENARIO } from "@/lib/state/useMargin";
import { parseViewQuery, viewToQuery } from "@/lib/state/viewQuery";
import { ALL_RUNS, COUNTS, HEADLINE, SNAP } from "@/lib/data";
import { ATMOSPHERES, HAZARDS, PRESETS } from "@/content/curated";
import { GRAVITY_LABEL } from "@/lib/format";
import { REGIMES, occupancy } from "@/lib/view/regimes";
import { EXPEDITIONS, expeditionScenario, type Expedition } from "@/lib/view/expeditions";
import { registerSearchHandler } from "@/lib/view/searchBus";
import { parseScenarioQuery } from "@/lib/state/scenarioQuery";
import { Panel } from "@/components/ui/Panel";
import { Breadcrumb } from "@/components/ui/misc";
import { IconTarget, IconExpand, IconCollapse } from "@/components/ui/icons";
import {
  FULL_DOMAIN, MAIN_GRID, SHEET_GRID, O2_DOMAIN, P_DOMAIN, ZOOM_STEP, MAX_ZOOM, domainAt, domainCenter, fractionWithin, hasEvidence, isFull, lerpDomain, scaledField, scalesTimes, zoomOf,
  type ViewDomain,
} from "./geo";
import EvidenceField, { DEFAULT_LAYERS, type FieldLayers, type Insets } from "./EvidenceField";
import Expeditions from "./Expeditions";
import Console from "./Console";
import Inspector from "./Inspector";
import RegimeStrip from "./RegimeStrip";
import ToolRail from "./ToolRail";
import Overview, { type PlateData } from "./Overview";
import "./atlas.css";

const runById = new Map(ALL_RUNS.map((r) => [r.id, r]));
const STATUS = { date: SNAP.fetchedAt.slice(0, 10), runs: COUNTS.totalRuns.toLocaleString("en-GB") };
const GAP = { maxO2: HEADLINE.maxSolidO2, planned: [HEADLINE.artemisO2, HEADLINE.eaO2] as [number, number] };
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * The field makes room instead of being covered: when a panel opens or collapses, the plot frame eases
 * into the freed area (≤ 360 ms, decelerating). Layout-mode changes (resize across a breakpoint) jump.
 */
function useEasedInsets(target: Insets, mode: string): Insets {
  const [cur, setCur] = useState(target);
  const last = useRef({ v: target, mode });
  const raf = useRef<number | null>(null);
  const key = `${target.l},${target.t},${target.r},${target.b}`;
  useEffect(() => {
    const from = last.current.v, to = target;
    const jump = reducedMotion() || last.current.mode !== mode;
    last.current.mode = mode;
    if (jump) { last.current.v = to; setCur(to); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 360), e = 1 - Math.pow(1 - t, 3);
      const v = { l: from.l + (to.l - from.l) * e, t: from.t + (to.t - from.t) * e, r: from.r + (to.r - from.r) * e, b: from.b + (to.b - from.b) * e };
      last.current.v = v;
      setCur(v);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mode]);
  return cur;
}

export default function AtlasApp() {
  const m = useMargin("iss");
  const s = m.scenario;

  // ---- view state (URL: run, view) -----------------------------------------------------------
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overview, setOverview] = useState(false);
  const [viewReady, setViewReady] = useState(false);
  useEffect(() => {
    const v = parseViewQuery(new URLSearchParams(window.location.search), (id) => runById.has(id));
    setSelectedId(v.run); // eslint-disable-line react-hooks/set-state-in-effect
    setOverview(v.view === "overview");
    setViewReady(true);
  }, []);
  useEffect(() => {
    if (!viewReady || !m.hydrated || window.location.pathname !== "/") return;
    const q = viewToQuery({ run: selectedId, view: overview ? "overview" : "field" }, new URLSearchParams(window.location.search));
    const url = `${window.location.pathname}${q ? `?${q}` : ""}`;
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(window.history.state, "", url);
  }, [selectedId, overview, viewReady, m.hydrated, s, m.preset]);

  // ---- layout ---------------------------------------------------------------------------------
  const fieldRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ W: 1440, H: 900 });
  useEffect(() => {
    const el = fieldRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const W = Math.round(e.contentRect.width), H = Math.round(e.contentRect.height);
      if (W > 0 && H > 0) setSize((cur) => (cur.W === W && cur.H === H ? cur : { W, H }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [overview]);
  const app = size.W >= 768;
  const wide = size.W >= 1180;
  const roomy = size.W >= 1360;
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const narrowed = useRef(false);
  useEffect(() => {
    // Tablet: panels start closed and float over the field when opened.
    if (app && !wide && !narrowed.current) { narrowed.current = true; setLeftOpen(false); setRightOpen(false); }
  }, [app, wide]);
  const free: Insets = !app ? { l: 0, t: 0, r: 0, b: 0 }
    : wide ? { l: leftOpen ? (roomy ? 332 : 300) : 76, t: 64, r: rightOpen ? (roomy ? 448 : 412) : 64, b: 122 }
    : { l: 76, t: 64, r: 64, b: 122 };
  const shownFree = useEasedInsets(free, !app ? "stack" : wide ? (roomy ? "wide" : "mid") : "tablet");

  // ---- view domain (zoom) with an eased transition; the field is recomputed when it settles ----
  const [domain, setDomain] = useState<ViewDomain>(FULL_DOMAIN);
  const [fieldDomain, setFieldDomain] = useState<ViewDomain>(FULL_DOMAIN);
  const [animating, setAnimating] = useState(false);
  const raf = useRef<number | null>(null);
  const animateTo = useCallback((target: ViewDomain) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    if (reducedMotion()) { setDomain(target); setFieldDomain(target); return; }
    const start = domain, t0 = performance.now(), dur = 360;
    setAnimating(true);
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      setDomain(lerpDomain(start, target, easeInOut(t)));
      if (t < 1) raf.current = requestAnimationFrame(step);
      else { raf.current = null; setFieldDomain(target); setAnimating(false); }
    };
    raf.current = requestAnimationFrame(step);
  }, [domain]);
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);
  const zoom = zoomOf(domain);
  const focusPoint = () => {
    const sel = selectedId ? runById.get(selectedId) : null;
    if (sel?.o2Pct != null && sel.pressureKPa != null && sel.gravity === s.gravity) return { o2: sel.o2Pct, p: sel.pressureKPa };
    return { o2: s.o2Pct, p: s.pressureKPa };
  };
  const zoomIn = () => { const f = focusPoint(); animateTo(domainAt(zoom * ZOOM_STEP, f.o2, f.p)); };
  const zoomOut = () => { const c = domainCenter(domain); const z = zoom / ZOOM_STEP; animateTo(z <= 1.01 ? FULL_DOMAIN : domainAt(z, c.o2, c.p)); };
  const resetView = () => animateTo(FULL_DOMAIN);

  // ---- engine: evaluations and fields ---------------------------------------------------------
  const { flowCmS, hazard, materialClass, includePublished } = s;
  const base = useMemo(() => ({ ...DEFAULT_SCENARIO, flowCmS, hazard, materialClass, includePublished }), [flowCmS, hazard, materialClass, includePublished]);
  const regimeEvals = useMemo(() => REGIMES.map((g) => evaluate(ALL_RUNS, { ...base, gravity: g })), [base]);
  const comparableSets = useMemo(() => regimeEvals.map((e) => new Set(e.comparable.map((c) => c.run.id))), [regimeEvals]);
  const gi = REGIMES.indexOf(s.gravity);
  const fieldEval = regimeEvals[gi];
  const field = useMemo(() => distanceField(fieldEval, { ...base, gravity: s.gravity }, fieldDomain.o2, fieldDomain.p, MAIN_GRID.nx, MAIN_GRID.ny), [fieldEval, base, s.gravity, fieldDomain]);
  const envHalf = useMemo(() => scaledField(fieldEval, scalesTimes(ROBUSTNESS_FACTORS[0]), fieldDomain.o2, fieldDomain.p, MAIN_GRID.nx, MAIN_GRID.ny), [fieldEval, fieldDomain]);
  const envDouble = useMemo(() => scaledField(fieldEval, scalesTimes(ROBUSTNESS_FACTORS[ROBUSTNESS_FACTORS.length - 1]), fieldDomain.o2, fieldDomain.p, MAIN_GRID.nx, MAIN_GRID.ny), [fieldEval, fieldDomain]);
  const fullField = useMemo(() => (isFull(fieldDomain) ? field : distanceField(fieldEval, { ...base, gravity: s.gravity }, O2_DOMAIN, P_DOMAIN, MAIN_GRID.nx, MAIN_GRID.ny)), [field, fieldDomain, fieldEval, base, s.gravity]);
  const coveragePct = useMemo(() => fractionWithin(fullField, VERDICT_THRESHOLDS.near) * 100, [fullField]);

  const runsByG = useMemo(() => REGIMES.map((g) => ALL_RUNS.filter((r) =>
    r.gravity === g && r.o2Pct != null && r.pressureKPa != null &&
    (r.tier === "T1_PSI_RUN" || r.tier === "T4_PLANNED" || (r.tier === "T3_PUBLISHED" && includePublished)))), [includePublished]);
  const occ = useMemo(() => Object.fromEntries(REGIMES.map((g) => [g, occupancy(g, includePublished, O2_DOMAIN, P_DOMAIN)])) as Record<Gravity, number[]>, [includePublished]);

  // per-regime verdict at the probe (separate evaluations; nothing is carried across regimes)
  const regimeVerdicts = useMemo(() => REGIMES.map((g) => {
    const e = g === s.gravity ? m.evaluation : evaluate(ALL_RUNS, { ...s, gravity: g });
    return { verdict: e.verdict, D: e.nearest?.d.D ?? null };
  }), [s, m.evaluation]);
  const plateFields = useMemo(() => (overview ? regimeEvals.map((e, i) => distanceField(e, { ...base, gravity: REGIMES[i] }, O2_DOMAIN, P_DOMAIN, SHEET_GRID.nx, SHEET_GRID.ny)) : null), [overview, regimeEvals, base]);
  const plates: PlateData[] = plateFields ? REGIMES.map((g, i) => ({ g, field: plateFields[i], runs: runsByG[i], comparableIds: comparableSets[i], verdict: regimeVerdicts[i].verdict, D: regimeVerdicts[i].D })) : [];

  // ---- layers (one source of truth for the rail and the field) ----
  const [layerState, setLayerState] = useState<FieldLayers>(DEFAULT_LAYERS);
  const setLayer = (k: keyof FieldLayers, v: boolean) => setLayerState((cur) => ({ ...cur, [k]: v }));

  // ---- selection --------------------------------------------------------------------------------
  const selected: Run | null = selectedId ? runById.get(selectedId) ?? null : null;
  const [hoverInv, setHoverInv] = useState<string | null>(null);
  const [pinnedInv, setPinnedInv] = useState<string | null>(null);
  const focusInv = hoverInv ?? pinnedInv ?? selected?.investigation ?? null;
  const [tab, setTab] = useState<"evidence" | "sensitivity" | "rank" | "findings" | "sources">("evidence");

  /** Where focus returns when the run inspector closes (the control that opened it, else the active tab). */
  const opener = useRef<{ el: HTMLElement | null; key: string | null }>({ el: null, key: null });
  const closeRun = useCallback(() => {
    setSelectedId(null);
    const { el, key } = opener.current;
    opener.current = { el: null, key: null };
    requestAnimationFrame(() => {
      const target = (el && document.contains(el) ? el : null)
        ?? (key ? document.querySelector<HTMLElement>(`[data-runlink="${CSS.escape(key)}"]`) : null)
        ?? document.querySelector<HTMLElement>(".ins-tablist [aria-selected='true']");
      target?.focus();
    });
  }, []);

  /** Select a run. From a list or search (not the field) the view eases to it. */
  const selectRun = useCallback((r: Run, fromField = false) => {
    const a = document.activeElement as HTMLElement | null;
    opener.current = { el: fromField ? null : a, key: a?.dataset.runlink ?? null };
    setSelectedId(r.id);
    setOverview(false);
    if (!wide) setRightOpen(true);
    if (!fromField && r.gravity === s.gravity && r.o2Pct != null && r.pressureKPa != null) {
      const inView = r.o2Pct >= domain.o2[0] && r.o2Pct <= domain.o2[1] && r.pressureKPa >= domain.p[0] && r.pressureKPa <= domain.p[1];
      if (!inView || zoom < 1.2) animateTo(domainAt(Math.max(zoom, ZOOM_STEP), r.o2Pct, r.pressureKPa));
    }
  }, [s.gravity, domain, zoom, animateTo, wide]);
  const zoomToRun = () => { if (selected?.o2Pct != null && selected.pressureKPa != null) animateTo(domainAt(Math.max(zoom * ZOOM_STEP, 2.6), selected.o2Pct, selected.pressureKPa)); };

  const applyExpedition = useCallback((x: Expedition) => {
    const t = expeditionScenario(x, s);
    m.applyPreset(x.preset);
    m.update(t, true);
    setSelectedId(null);
    setOverview(false);
    animateTo(FULL_DOMAIN);
  }, [m, s, animateTo]);

  const selectGravity = (g: Gravity) => { m.update({ gravity: g }, true); if (selected && selected.gravity !== g) setSelectedId(null); };
  const openRegime = (g: Gravity) => { selectGravity(g); setOverview(false); };

  // ---- search in place --------------------------------------------------------------------------
  useEffect(() => registerSearchHandler((e) => {
    if (e.kind === "atmosphere") { m.applyPreset(e.id); animateTo(FULL_DOMAIN); return true; }
    if (e.kind === "run") {
      const r = runById.get(e.id);
      if (!r) return false;
      const patch: Parameters<typeof m.update>[0] = {};
      if (r.gravity !== s.gravity) patch.gravity = r.gravity;
      if (r.tier === "T3_PUBLISHED" && !s.includePublished) patch.includePublished = true;
      if (Object.keys(patch).length) m.update(patch, true);
      setSelectedId(r.id); setOverview(false);
      if (r.o2Pct != null && r.pressureKPa != null) animateTo(domainAt(ZOOM_STEP, r.o2Pct, r.pressureKPa));
      return true;
    }
    if (e.kind === "finding") {
      const x = EXPEDITIONS.find((ex) => ex.insight?.id === e.id);
      if (x) { applyExpedition(x); return true; }
      const parsed = parseScenarioQuery(new URL(e.href, "http://x").searchParams);
      if (parsed.preset) m.applyPreset(parsed.preset);
      m.update(parsed.scenario, true);
      return true;
    }
    return false;
  }), [m, s.gravity, s.includePublished, animateTo, applyExpedition]);

  // ---- keyboard (only while this route is visible: effects are torn down when it is hidden) ------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.closest("input, select, textarea, [role='dialog']") || t.isContentEditable)) return;
      if (e.key === "Escape") {
        if (document.getElementById("atlas-rail-pop")) return; // the popover closes first
        if (selectedId) { closeRun(); e.preventDefault(); }
        else if (overview) { setOverview(false); e.preventDefault(); }
        return;
      }
      if (overview) { if (e.key === "o" || e.key === "O") { setOverview(false); e.preventDefault(); } return; }
      if (e.key === "+" || e.key === "=") { zoomIn(); e.preventDefault(); }
      else if (e.key === "-" || e.key === "_") { zoomOut(); e.preventDefault(); }
      else if (e.key === "0") { resetView(); e.preventDefault(); }
      else if (e.key === "o" || e.key === "O") { setOverview(true); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- copy -------------------------------------------------------------------------------------
  const hazardLabel = HAZARDS.find((h) => h.id === s.hazard)!.label;
  const flowLabel = s.flowCmS == null ? "quiescent" : `${s.flowCmS} cm/s`;
  const ctx = `${hazardLabel} · ${flowLabel} · ${s.materialClass === "any" ? "any material" : `${s.materialClass} materials`} · ${includePublished ? "PSI + published" : "PSI only"}`;
  const nearestD = m.evaluation.nearest?.d.D ?? null;
  const placeable = (field.omitted ?? 0);
  const summary = `Evidence field, ${GRAVITY_LABEL[s.gravity]}. ${Math.round(coveragePct)} percent of the charted window lies within D ${VERDICT_THRESHOLDS.near} of comparable evidence. Scenario probe at ${s.o2Pct} percent oxygen and ${s.pressureKPa} kilopascals; evidence ${m.evaluation.verdict}${nearestD != null && Number.isFinite(nearestD) ? `, D ${nearestD.toFixed(2)}` : ""}. Evidence proximity, not a safety rating; not a hazard map.`;
  const noEvidence = !hasEvidence(fullField);
  const showGap = s.hazard === "materials" && s.gravity === "micro";
  const notes = placeable > 0 ? [`${placeable} comparable ${placeable === 1 ? "run has" : "runs have"} no recorded pressure: not drawn here, still counted for the verdict as partial ${placeable === 1 ? "match" : "matches"}.`] : [];
  const leftSummary = `${PRESETS.find((a) => a.id === m.preset)?.short ?? "Custom"} · ${s.o2Pct}% · ${s.pressureKPa} kPa · ${flowLabel}`;

  const title = (
    <>
      <h1 className="fld-h1">Evidence field <span className="fld-h1-regime">· {GRAVITY_LABEL[s.gravity]}</span></h1>
      <Breadcrumb className="fld-crumbs" items={[{ label: "Atlas" }, { label: GRAVITY_LABEL[s.gravity] }, { label: ctx }, ...(selected ? [{ label: selected.id }] : [])]} />
      <p className="fld-source"><strong>Evidence proximity, not a safety rating.</strong> Not a hazard map. Source: NASA PSI run tables ({STATUS.date}){includePublished ? " + published papers (Sources)" : ""}.</p>
    </>
  );
  const emptyNote = noEvidence ? (
    <>
      <p className="fld-empty-title">No comparable evidence in {GRAVITY_LABEL[s.gravity].toLowerCase()}</p>
      <p className="fld-empty-text">
        {s.gravity !== "micro"
          ? <>PSI holds {COUNTS.partialGravityRuns === 0 ? "no" : COUNTS.partialGravityRuns} combustion tests outside microgravity for this question{includePublished ? ", and no published point here is comparable" : ""}. The plane is left empty on purpose: nothing is estimated from other regimes.</>
          : <>No test in this regime is comparable for {hazardLabel.toLowerCase()} at {flowLabel}. The plane is left empty on purpose.</>}
      </p>
      {!includePublished && s.gravity !== "micro" && <button type="button" className="ui-btn fld-empty-btn" onClick={() => m.update({ includePublished: true }, true)}>Include published evidence</button>}
    </>
  ) : null;

  return (
    <main id="main" className="atlas" data-mode={app ? "app" : "stack"} data-left={app && leftOpen ? "open" : "closed"} data-right={app && rightOpen ? "open" : "closed"} data-wide={wide || undefined} data-overview={overview || undefined}>
      <div className="atlas-field" ref={fieldRef}>
        {overview ? (
          <div className="atlas-ov" style={app ? { paddingLeft: free.l, paddingRight: free.r, paddingTop: free.t + 12, paddingBottom: free.b } : undefined}>
            <Overview plates={plates} scenario={s} onSelect={selectGravity} onOpen={openRegime} />
          </div>
        ) : (
          <EvidenceField
            W={size.W} H={size.H} free={shownFree} compact={!app}
            domain={domain} field={field} envHalf={envHalf} envDouble={envDouble} animating={animating}
            runs={runsByG[gi]} comparableIds={comparableSets[gi]}
            scenario={s} verdict={m.evaluation.verdict} nearestD={nearestD}
            landmarks={PRESETS} offChart={ATMOSPHERES.filter((a) => a.offChart)} activePreset={m.preset}
            selectedId={selectedId} focusInv={focusInv} layers={layerState}
            summary={summary} empty={emptyNote} gap={showGap ? GAP : null} title={title} notes={notes}
            onMove={(o2Pct, pressureKPa) => m.update({ o2Pct, pressureKPa })}
            onPreset={(id) => m.applyPreset(id)}
            onInspect={(r) => selectRun(r, true)}
          />
        )}
      </div>

      <div className="atlas-left" data-open={!app || leftOpen || undefined}>
        {app && !leftOpen ? (
          <button type="button" className="atlas-left-tab" onClick={() => setLeftOpen(true)} aria-label="Show expeditions and scenario" aria-expanded={false} aria-controls="atlas-exp">
            <IconExpand /><span>Expeditions · Scenario</span>
          </button>
        ) : (
          <>
            <Panel id="atlas-exp" name="Expeditions" label="Expeditions" className="atlas-exp-panel"
              actions={app ? <button type="button" className="ui-sq" onClick={() => setLeftOpen(false)} aria-label="Collapse expeditions and scenario" aria-expanded aria-controls="atlas-exp"><IconCollapse /></button> : undefined}>
              <Expeditions scenario={s} preset={m.preset} onGo={applyExpedition} />
            </Panel>
            <Panel id="atlas-console" name="Scenario" label="Scenario" className="atlas-con-panel" collapseAxis="vertical"
              collapsed={app && !consoleOpen} onToggle={app ? () => setConsoleOpen((v) => !v) : undefined} summary={leftSummary}>
              <Console scenario={s} preset={m.preset} update={m.update} applyPreset={(id) => { m.applyPreset(id); setSelectedId(null); }} />
            </Panel>
            {app && <p className="atlas-credit">MARGIN, created by Alex de Gentile for NASA Space Apps 2026 · Apache-2.0 · NASA PSI data; no NASA endorsement · AI-assisted development, disclosed under <a href="/sources#si">Sources</a></p>}
          </>
        )}
      </div>

      <div className="atlas-strip-wrap">
        <RegimeStrip gravity={s.gravity} onChange={selectGravity} verdict={m.evaluation.verdict} D={nearestD} status={STATUS} occupancy={occ} />
      </div>

      <div className="atlas-right" data-open={!app || rightOpen || undefined}>
        <Inspector
          scenario={s} evaluation={m.evaluation} psiOnly={m.psiOnly} robust={m.robust} ranking={m.ranking}
          coveragePct={coveragePct} grid={MAIN_GRID} selected={selected} focusInv={focusInv} pinnedInv={pinnedInv}
          onInspect={(r) => selectRun(r)} onCloseRun={closeRun} onHoverInv={setHoverInv} onPinInv={(id) => setPinnedInv((c) => (c === id ? null : id))}
          collapsed={app && !rightOpen} tab={tab} setTab={setTab}
          runActions={selected && selected.gravity === s.gravity && selected.o2Pct != null && selected.pressureKPa != null
            ? <button type="button" className="ui-btn ui-btn--quiet" onClick={zoomToRun} disabled={zoom >= MAX_ZOOM - 0.01}><IconTarget /> Zoom to run</button> : null}
          head={app ? <button type="button" className="ui-sq" onClick={() => setRightOpen((v) => !v)} aria-expanded={rightOpen} aria-label={rightOpen ? "Collapse inspector to the verdict" : "Expand inspector"}>{rightOpen ? <IconExpand /> : <IconCollapse />}</button> : null}
        />
      </div>

      {app && (
        <div className="atlas-rail-wrap">
          <ToolRail layers={layerState} setLayer={setLayer} zoomIn={zoomIn} zoomOut={zoomOut} reset={resetView}
            canZoomIn={zoom < MAX_ZOOM - 0.01} canZoomOut={zoom > 1.01} isZoomed={zoom > 1.01}
            overview={overview} toggleOverview={() => setOverview((v) => !v)} />
        </div>
      )}
      {!app && (
        <nav className="atlas-sheet-nav" aria-label="Atlas sections">
          <a href="#atlas-console">Scenario</a>
          <a href="#atlas-notes-title">Verdict</a>
          <a href="#atlas-panel-evidence" onClick={() => setTab("evidence")}>Evidence</a>
          <a href="#atlas-panel-sources" onClick={() => setTab("sources")}>Sources</a>
          <button type="button" onClick={() => setOverview((v) => !v)} aria-pressed={overview} aria-label="Regimes overview">Regimes</button>
        </nav>
      )}
    </main>
  );
}
