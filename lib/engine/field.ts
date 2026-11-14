import type { Scenario } from "@/lib/schema";
import type { Evaluation } from "./verdict";
import { SCALES, type Scales } from "./constants";

/**
 * Nearest-evidence distance field over the O₂ × pressure plane, holding the scenario's flow,
 * gravity, hazard and material class fixed. Deterministic: evaluates the same distance formula
 * as distance() at each grid node,
 *   D(node) = min over runs √( flowTermᵣ + ((O₂ᵣ − O₂)/s_O₂)² + (ln(Pᵣ/P)/ln r)² ),
 * where flowTermᵣ is that run's flow gap to the scenario (0 when flow is not compared).
 *
 * Only runs that can be PLACED on this plane (both O₂ and pressure recorded) shape the field.
 * A run with no recorded pressure would otherwise paint a band across every pressure, which
 * would draw coverage that no test provides. Such runs still count for the verdict (as partial
 * matches, disclosed in the text); `omitted` reports how many were left off the map.
 *
 * It is a map of evidence coverage under MARGIN's method, never of flammability.
 */
export interface Field { nx: number; ny: number; o2: number[]; p: number[]; D: Float32Array; omitted: number }

export function distanceField(
  ev: Evaluation, s: Scenario, o2Range: [number, number], pRange: [number, number], nx = 120, ny = 90, scales: Scales = SCALES,
): Field {
  const o2 = Array.from({ length: nx }, (_, i) => o2Range[0] + (i / (nx - 1)) * (o2Range[1] - o2Range[0]));
  const lp0 = Math.log(pRange[0]), lp1 = Math.log(pRange[1]);
  const p = Array.from({ length: ny }, (_, j) => Math.exp(lp0 + (j / (ny - 1)) * (lp1 - lp0)));
  const D = new Float32Array(nx * ny).fill(Infinity);
  const lnR = Math.log(scales.pressureRatio);
  let omitted = 0;
  const pts: { o2: number; lp: number; flowTerm: number }[] = [];
  for (const { run, d } of ev.comparable) {
    if (run.o2Pct == null || run.pressureKPa == null || !(run.pressureKPa > 0)) { omitted++; continue; }
    // Rebuild the flow gap from the physical delta so a non-default flow scale is honoured.
    const g = d.axesUsed.includes("flow") && d.raw.flowCmS != null ? d.raw.flowCmS / scales.flowCmS : 0;
    pts.push({ o2: run.o2Pct, lp: Math.log(run.pressureKPa), flowTerm: g * g });
  }
  for (let j = 0; j < ny; j++) {
    const lps = Math.log(p[j]);
    for (let i = 0; i < nx; i++) {
      let best = Infinity;
      for (const q of pts) {
        const a = (q.o2 - o2[i]) / scales.o2Pts;
        const b = (q.lp - lps) / lnR;
        const sum = q.flowTerm + a * a + b * b;
        if (sum < best) best = sum;
      }
      D[j * nx + i] = Math.sqrt(best);
    }
  }
  void s;
  return { nx, ny, o2, p, D, omitted };
}
