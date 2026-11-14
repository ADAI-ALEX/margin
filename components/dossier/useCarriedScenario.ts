"use client";
import { useMemo } from "react";
import type { Scenario } from "@/lib/schema";
import { DEFAULT_SCENARIO, presetScenario, useScenarioQuery } from "@/lib/state/useMargin";
import { clampScenario, parseScenarioQuery } from "@/lib/state/scenarioQuery";

/** The scenario last used on the Atlas or the workspace in this session (ISS defaults on a direct visit). */
export function useCarriedScenario(): Scenario {
  const q = useScenarioQuery();
  return useMemo(() => {
    const { scenario, preset } = parseScenarioQuery(new URLSearchParams(q));
    const base = (preset ? presetScenario(preset) : presetScenario("iss")) ?? DEFAULT_SCENARIO;
    return clampScenario({ ...base, ...scenario });
  }, [q]);
}
