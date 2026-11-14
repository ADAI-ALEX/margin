import type { Run, Scenario } from "@/lib/schema";
import { evaluate, classify, type Verdict } from "./verdict";
import { VERDICT_THRESHOLDS } from "./constants";

export interface FlowPoint { flowCmS: number | null; D: number | null; verdict: Verdict; nearestId: string | null; partial: boolean }
export interface FlowSensitivity {
  points: FlowPoint[];
  /** Flows (cm/s) at which the verdict changes class, found by bisection between sampled flows. */
  crossings: { flowCmS: number; from: Verdict; to: Verdict }[];
}

/** Default flows reported on the Method page and in the Atlas: quiescent plus the 5–30 cm/s ventilation range. */
export const SENSITIVITY_FLOWS: (number | null)[] = [null, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 25, 30];

/**
 * How the evidence distance changes with the scenario's ventilation flow, every other input held fixed.
 * Deterministic: re-runs `evaluate` at each flow. This is a sensitivity of the METHOD (how D responds to
 * an assumed flow), not a statement about how fires respond to flow.
 */
export function flowSensitivity(runs: Run[], s: Scenario, flows: (number | null)[] = SENSITIVITY_FLOWS): FlowSensitivity {
  const at = (u: number | null): FlowPoint => {
    const e = evaluate(runs, { ...s, flowCmS: u });
    return { flowCmS: u, D: e.nearest ? e.nearest.d.D : null, verdict: e.verdict, nearestId: e.nearest?.run.id ?? null, partial: !!e.nearest?.d.partialMatch };
  };
  const points = flows.map(at);
  const crossings: FlowSensitivity["crossings"] = [];
  const numeric = points.filter((p) => p.flowCmS != null) as (FlowPoint & { flowCmS: number })[];
  for (let i = 1; i < numeric.length; i++) {
    const a = numeric[i - 1], b = numeric[i];
    if (a.verdict === b.verdict) continue;
    let lo = a.flowCmS, hi = b.flowCmS;
    for (let k = 0; k < 18; k++) {
      const mid = (lo + hi) / 2;
      if (at(mid).verdict === a.verdict) lo = mid; else hi = mid;
    }
    crossings.push({ flowCmS: (lo + hi) / 2, from: a.verdict, to: b.verdict });
  }
  return { points, crossings };
}

/** Distance to the nearest classification boundary, in D units (how far the verdict is from flipping). */
export function boundaryMargin(D: number | null): { boundary: number; delta: number } | null {
  if (D == null || !Number.isFinite(D)) return null;
  const bs = [VERDICT_THRESHOLDS.direct, VERDICT_THRESHOLDS.near];
  const b = bs.reduce((best, x) => (Math.abs(x - D) < Math.abs(best - D) ? x : best), bs[0]);
  return { boundary: b, delta: D - b };
}

export { classify };
