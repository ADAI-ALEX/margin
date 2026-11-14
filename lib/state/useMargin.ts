"use client";
/**
 * Scenario state + derived evidence, shared by the Atlas (/) and Investigations (/investigations) views.
 * The scenario is mirrored into the URL query (shareable links). Encoding lives in ./scenarioQuery (pure, tested).
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Scenario } from "@/lib/schema";
import { evaluate, rank, robustness, RANK_WEIGHTS, type RankWeights } from "@/lib/engine";
import { ALL_RUNS, ALL_INVESTIGATIONS } from "@/lib/data";
import { HAZARD_MAP, PRESETS } from "@/content/curated";
import { DEFAULT_SCENARIO, clampScenario, parseScenarioQuery, scenarioOnlyQuery, scenarioToQuery } from "./scenarioQuery";

export { DEFAULT_SCENARIO } from "./scenarioQuery";

// ---- tiny external store so the global header can carry the current scenario across pages
let currentQuery = "";
const listeners = new Set<() => void>();
function publishQuery(q: string) { if (q !== currentQuery) { currentQuery = q; listeners.forEach((l) => l()); } }
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
/** The most recent scenario query string ("" until a scenario page has hydrated). */
export function useScenarioQuery() {
  return useSyncExternalStore(subscribe, () => currentQuery, () => "");
}

export function presetScenario(id: string, base: Scenario = DEFAULT_SCENARIO): Scenario | null {
  const p = PRESETS.find((x) => x.id === id);
  return p ? { ...base, o2Pct: p.o2Pct, pressureKPa: p.pressureKPa, flowCmS: p.flowCmS, gravity: p.gravity } : null;
}

export function useMargin(initialPreset = "iss") {
  const [scenario, setScenario] = useState<Scenario>(() => presetScenario(initialPreset) ?? DEFAULT_SCENARIO);
  const [preset, setPreset] = useState<string | null>(initialPreset);
  const [weights, setWeights] = useState<RankWeights>({ ...RANK_WEIGHTS });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from the URL once on the client — in an effect (not a lazy initializer) so the
  // server and first client render match and there is no hydration mismatch.
  const initialPresetRef = initialPreset;
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const { scenario: rest, preset: pr } = parseScenarioQuery(new URLSearchParams(window.location.search));
    const hasScenario = Object.keys(rest).length > 0;
    const ps = pr ? presetScenario(pr) : null;
    // A preset sets the landmark position first; explicit parameters then override it.
    if (ps) setScenario(clampScenario({ ...ps, ...rest }));
    else if (hasScenario) setScenario((s) => clampScenario({ ...s, ...rest }));
    const moved = ps && (["o2Pct", "pressureKPa"] as const).some((k) => k in rest && rest[k] !== ps[k]);
    setPreset(ps && !moved ? pr! : hasScenario || pr ? null : initialPresetRef);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialPresetRef]);

  // Never write the URL before hydration has read it (Strict Mode runs effects twice in dev).
  useEffect(() => {
    if (!hydrated) return;
    const q = scenarioToQuery(scenario, preset, new URLSearchParams(window.location.search));
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${q}`);
    publishQuery(scenarioOnlyQuery(scenario, preset));
  }, [scenario, preset, hydrated]);

  const update = useCallback((patch: Partial<Scenario>, keepPreset = false) => {
    setScenario((s) => clampScenario({ ...s, ...patch }));
    if (!keepPreset) setPreset(null);
  }, []);
  const applyPreset = useCallback((id: string) => {
    setScenario((s) => presetScenario(id, s) ?? s);
    if (PRESETS.some((x) => x.id === id)) setPreset(id);
  }, []);

  const evaluation = useMemo(() => evaluate(ALL_RUNS, scenario), [scenario]);
  const psiOnly = useMemo(() => (scenario.includePublished ? evaluate(ALL_RUNS, { ...scenario, includePublished: false }) : evaluation), [scenario, evaluation]);
  const ranking = useMemo(() => rank(ALL_INVESTIGATIONS, ALL_RUNS, evaluation, scenario, HAZARD_MAP, weights), [evaluation, scenario, weights]);
  const robust = useMemo(() => robustness(ALL_RUNS, scenario), [scenario]);

  return { scenario, update, preset, applyPreset, evaluation, psiOnly, ranking, robust, weights, setWeights, hydrated };
}
export type MarginState = ReturnType<typeof useMargin>;
