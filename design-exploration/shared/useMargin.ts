"use client";
/**
 * Shared prototype state + derived evidence. Each concept renders this its own way.
 * Scenario state is mirrored into the URL query (shareable), per Kickoff P0-4.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Scenario, Gravity, Hazard, MaterialClass } from "@/lib/schema";
import { evaluate, rank, robustness, RANK_WEIGHTS, type RankWeights } from "@/lib/engine";
import { ALL_RUNS, ALL_INVESTIGATIONS } from "./data";
import { HAZARD_MAP, PRESETS } from "./content";

export const DEFAULT_SCENARIO: Scenario = { o2Pct: 20.9, pressureKPa: 101.4, flowCmS: 10, gravity: "micro", hazard: "materials", materialClass: "any", includePublished: false };

function fromQuery(q: URLSearchParams): Partial<Scenario> & { preset?: string } {
  const n = (k: string) => (q.has(k) && q.get(k) !== "" && !Number.isNaN(Number(q.get(k))) ? Number(q.get(k)) : undefined);
  const out: Partial<Scenario> & { preset?: string } = {};
  if (n("o2") != null) out.o2Pct = n("o2");
  if (n("p") != null) out.pressureKPa = n("p");
  if (q.get("u") === "q") out.flowCmS = null; else if (n("u") != null) out.flowCmS = n("u");
  const g = q.get("g"); if (g && ["micro", "moon", "mars", "earth"].includes(g)) out.gravity = g as Gravity;
  const h = q.get("h"); if (h && ["materials", "smoke", "suppression", "liquid"].includes(h)) out.hazard = h as Hazard;
  const m = q.get("m"); if (m && ["any", "thin", "thick"].includes(m)) out.materialClass = m as MaterialClass;
  if (q.get("pub") === "1") out.includePublished = true;
  if (q.get("preset")) out.preset = q.get("preset")!;
  return out;
}
/** Keep the scenario physically meaningful: O₂ in (0, 100] %, P > 0, flow ≥ 0. */
function clampScenario(s: Scenario): Scenario {
  const ok = (x: number, lo: number, hi: number, fb: number) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : fb);
  return { ...s, o2Pct: ok(s.o2Pct, 0.1, 100, DEFAULT_SCENARIO.o2Pct), pressureKPa: ok(s.pressureKPa, 1, 1000, DEFAULT_SCENARIO.pressureKPa), flowCmS: s.flowCmS == null ? null : ok(s.flowCmS, 0, 500, 0) };
}
function toQuery(s: Scenario, preset: string | null) {
  const q = new URLSearchParams();
  if (preset) q.set("preset", preset);
  q.set("o2", String(+s.o2Pct.toFixed(2))); q.set("p", String(+s.pressureKPa.toFixed(2)));
  q.set("u", s.flowCmS == null ? "q" : String(s.flowCmS)); q.set("g", s.gravity); q.set("h", s.hazard);
  if (s.materialClass !== "any") q.set("m", s.materialClass);
  if (s.includePublished) q.set("pub", "1");
  return q.toString();
}

export function useMargin(initialPreset = "iss") {
  const [scenario, setScenario] = useState<Scenario>(() => {
    const p = PRESETS.find((x) => x.id === initialPreset);
    return p ? { ...DEFAULT_SCENARIO, o2Pct: p.o2Pct, pressureKPa: p.pressureKPa, flowCmS: p.flowCmS, gravity: p.gravity } : DEFAULT_SCENARIO;
  });
  const [preset, setPreset] = useState<string | null>(initialPreset);
  const [weights, setWeights] = useState<RankWeights>({ ...RANK_WEIGHTS });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from the URL once on the client. This is deliberately done in an effect,
  // not a lazy initializer, so server and client first renders match (no hydration mismatch).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const q = fromQuery(new URLSearchParams(window.location.search));
    const { preset: pr, ...rest } = q;
    if (Object.keys(rest).length) setScenario((s) => clampScenario({ ...s, ...rest }));
    if (pr !== undefined) setPreset(pr);
    else if (Object.keys(rest).length) setPreset(null);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  // Never write the URL before hydration has read it (Strict Mode runs effects twice in dev).
  useEffect(() => {
    if (!hydrated) return;
    const url = `${window.location.pathname}?${toQuery(scenario, preset)}`;
    window.history.replaceState(null, "", url);
  }, [scenario, preset, hydrated]);

  const update = useCallback((patch: Partial<Scenario>, keepPreset = false) => {
    setScenario((s) => clampScenario({ ...s, ...patch }));
    if (!keepPreset) setPreset(null);
  }, []);
  const applyPreset = useCallback((id: string) => {
    const p = PRESETS.find((x) => x.id === id); if (!p) return;
    setScenario((s) => ({ ...s, o2Pct: p.o2Pct, pressureKPa: p.pressureKPa, flowCmS: p.flowCmS, gravity: p.gravity }));
    setPreset(id);
  }, []);

  const evaluation = useMemo(() => evaluate(ALL_RUNS, scenario), [scenario]);
  const psiOnly = useMemo(() => (scenario.includePublished ? evaluate(ALL_RUNS, { ...scenario, includePublished: false }) : evaluation), [scenario, evaluation]);
  const ranking = useMemo(() => rank(ALL_INVESTIGATIONS, ALL_RUNS, evaluation, scenario, HAZARD_MAP, weights), [evaluation, scenario, weights]);
  const robust = useMemo(() => robustness(ALL_RUNS, scenario), [scenario]);

  return { scenario, update, preset, applyPreset, evaluation, psiOnly, ranking, robust, weights, setWeights };
}
export type MarginState = ReturnType<typeof useMargin>;
