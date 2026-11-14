import type { Run, Scenario } from "@/lib/schema";
import { gate, type GateResult } from "./gate";
import { distance, type DistanceResult } from "./distance";
import { SCALES, AXIS_WEIGHTS, VERDICT_THRESHOLDS, type Scales, type AxisWeights } from "./constants";

export type Verdict = "DIRECT" | "NEAR" | "DISTANT" | "NONE";
export interface Scored { run: Run; d: DistanceResult }
export interface Evaluation {
  verdict: Verdict;
  nearest: Scored | null;
  /** Best run compared on all three axes (O₂, pressure, flow). Shown beside `nearest` when that is a partial match. */
  nearestComplete: Scored | null;
  /** Reported limit points in this regime (e.g. ULOI*), with distances — context, never evidence for the verdict. */
  limits: Scored[];
  comparable: Scored[];      // sorted: D asc, complete before partial, then id
  context: Run[];
  otherGravity: Run[];
  excludedCount: number;
}

export function classify(D: number | null): Verdict {
  if (D == null || !Number.isFinite(D)) return "NONE";
  const EPS = 1e-9; // inclusive thresholds, robust to floating-point noise
  if (D <= VERDICT_THRESHOLDS.direct + EPS) return "DIRECT";
  if (D <= VERDICT_THRESHOLDS.near + EPS) return "NEAR";
  return "DISTANT";
}

export function sortScored(a: Scored, b: Scored) {
  if (a.d.D !== b.d.D) return a.d.D - b.d.D;
  if (a.d.partialMatch !== b.d.partialMatch) return a.d.partialMatch ? 1 : -1;
  return a.run.id.localeCompare(b.run.id);
}

export function evaluate(runs: Run[], s: Scenario, scales: Scales = SCALES, w: AxisWeights = AXIS_WEIGHTS): Evaluation {
  const comparable: Scored[] = [], context: Run[] = [], otherGravity: Run[] = [], limits: Scored[] = [];
  let excludedCount = 0;
  for (const run of runs) {
    const g: GateResult = gate(run, s);
    if (g.status === "comparable") {
      const d = distance(run, s, scales, w);
      if (Number.isFinite(d.D)) comparable.push({ run, d }); else excludedCount++;
    } else if (g.status === "limit") { if (run.gravity === s.gravity) limits.push({ run, d: distance(run, s, scales, w) }); else otherGravity.push(run); }
    else if (g.status === "context") context.push(run);
    else if (g.status === "other-gravity") otherGravity.push(run);
    else excludedCount++;
  }
  comparable.sort(sortScored);
  limits.sort(sortScored);
  const nearest = comparable[0] ?? null;
  const nearestComplete = comparable.find((c) => !c.d.partialMatch) ?? null;
  return { verdict: classify(nearest?.d.D ?? null), nearest, nearestComplete, comparable, context, otherGravity, limits, excludedCount };
}
