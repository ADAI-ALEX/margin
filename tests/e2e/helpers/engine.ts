/**
 * Test-side oracle: computes what the engine says for a scenario, so e2e assertions
 * follow the real data instead of hard-coding numbers that may drift with the snapshot.
 * Imports the same pure modules the app uses (lib/engine, lib/data, content).
 */
import { evaluate } from "@/lib/engine";
import { ALL_RUNS, ALL_INVESTIGATIONS, PSI_INVESTIGATIONS } from "@/lib/data";
import { PRESETS } from "@/content/curated";
import type { Scenario } from "@/lib/schema";
import { DEFAULT_SCENARIO } from "@/lib/state/scenarioQuery";

export { ALL_INVESTIGATIONS, PSI_INVESTIGATIONS, PRESETS };

export function presetScenario(id: string, patch: Partial<Scenario> = {}): Scenario {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown preset ${id}`);
  return { ...DEFAULT_SCENARIO, o2Pct: p.o2Pct, pressureKPa: p.pressureKPa, flowCmS: p.flowCmS, gravity: p.gravity, ...patch };
}

export function expectFor(s: Scenario) {
  const ev = evaluate(ALL_RUNS, s);
  return { verdict: ev.verdict, D: ev.nearest ? ev.nearest.d.D : null, nearestId: ev.nearest?.run.id ?? null, partial: ev.nearest?.d.partialMatch ?? false };
}
