import type { Run, Scenario } from "@/lib/schema";
import { SCALES, AXIS_WEIGHTS, type Scales, type AxisWeights } from "./constants";

export type Axis = "o2" | "pressure" | "flow";
export interface DistanceResult {
  D: number;
  axesUsed: Axis[];
  partialMatch: boolean;
  gaps: { o2: number | null; pressure: number | null; flow: number | null }; // normalized gap units (signed)
  raw: { o2Pts: number | null; pressurePct: number | null; flowCmS: number | null }; // physical deltas (run − scenario)
  flags: ("flow-regime-mismatch")[];
}

/**
 * Evidence distance (Kickoff §C.5). Callers MUST gate first: this function
 * refuses to compare different gravity regimes.
 */
export function distance(run: Run, s: Scenario, scales: Scales = SCALES, w: AxisWeights = AXIS_WEIGHTS): DistanceResult {
  if (run.gravity !== s.gravity) throw new Error("distance(): cross-gravity comparison is not permitted");
  const axesUsed: Axis[] = [];
  const flags: DistanceResult["flags"] = [];
  let sum = 0;
  let dO2: number | null = null, dP: number | null = null, dU: number | null = null;
  const raw: DistanceResult["raw"] = { o2Pts: null, pressurePct: null, flowCmS: null };

  if (run.o2Pct != null) {
    raw.o2Pts = run.o2Pct - s.o2Pct;
    dO2 = raw.o2Pts / scales.o2Pts;
    sum += w.o2 * dO2 * dO2; axesUsed.push("o2");
  }
  if (run.pressureKPa != null && run.pressureKPa > 0) {
    raw.pressurePct = (run.pressureKPa / s.pressureKPa - 1) * 100;
    dP = Math.log(run.pressureKPa / s.pressureKPa) / Math.log(scales.pressureRatio);
    sum += w.pressure * dP * dP; axesUsed.push("pressure");
  }
  // Natural convection (buoyant flow in partial/1 g) is categorically different from forced ventilation.
  if (run.flowRegime === "natural-convection" && s.flowCmS != null && s.flowCmS > 0) flags.push("flow-regime-mismatch");
  const runQuiescent = run.flowRegime === "quiescent" || run.flowCmS === 0;
  const scenQuiescent = s.flowCmS == null || s.flowCmS === 0;
  if (flags.length) {
    // categorical mismatch already recorded; flow axis not compared
  } else if (runQuiescent !== scenQuiescent && (run.flowCmS != null || run.flowRegime === "quiescent")) {
    flags.push("flow-regime-mismatch");
  } else if (run.flowCmS != null && s.flowCmS != null) {
    raw.flowCmS = run.flowCmS - s.flowCmS;
    dU = raw.flowCmS / scales.flowCmS;
    sum += w.flow * dU * dU; axesUsed.push("flow");
  } else if (runQuiescent && scenQuiescent) {
    raw.flowCmS = 0; dU = 0; axesUsed.push("flow");
  }
  return {
    D: axesUsed.length ? Math.sqrt(sum) : Infinity,
    axesUsed,
    partialMatch: axesUsed.length < 3,
    gaps: { o2: dO2, pressure: dP, flow: dU },
    raw,
    flags,
  };
}
