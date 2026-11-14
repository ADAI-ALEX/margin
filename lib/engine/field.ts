import type { Scenario } from "@/lib/schema";
import type { Evaluation } from "./verdict";
import { SCALES } from "./constants";

/**
 * Nearest-evidence distance field over the O2 × pressure plane, holding the
 * scenario's flow, gravity, hazard and material class fixed. Deterministic:
 * evaluates the same distance formula at each grid node. Used to draw where
 * comparable evidence is DIRECT / NEAR / DISTANT. It is a map of evidence
 * coverage, never of flammability.
 */
export interface Field { nx: number; ny: number; o2: number[]; p: number[]; D: Float32Array }
export function distanceField(ev: Evaluation, s: Scenario, o2Range: [number, number], pRange: [number, number], nx = 120, ny = 90): Field {
  const o2 = Array.from({ length: nx }, (_, i) => o2Range[0] + (i / (nx - 1)) * (o2Range[1] - o2Range[0]));
  const lp0 = Math.log(pRange[0]), lp1 = Math.log(pRange[1]);
  const p = Array.from({ length: ny }, (_, j) => Math.exp(lp0 + (j / (ny - 1)) * (lp1 - lp0)));
  const D = new Float32Array(nx * ny).fill(Infinity);
  const lnR = Math.log(SCALES.pressureRatio);
  const pts = ev.comparable.map(({ run, d }) => ({
    o2: run.o2Pct, lp: run.pressureKPa ? Math.log(run.pressureKPa) : null,
    flowTerm: d.gaps.flow != null ? d.gaps.flow * d.gaps.flow : 0,
  }));
  for (let j = 0; j < ny; j++) {
    const lps = Math.log(p[j]);
    for (let i = 0; i < nx; i++) {
      let best = Infinity;
      for (const q of pts) {
        let sum = q.flowTerm;
        if (q.o2 != null) { const a = (q.o2 - o2[i]) / SCALES.o2Pts; sum += a * a; }
        if (q.lp != null) { const b = (q.lp - lps) / lnR; sum += b * b; }
        if (sum < best) best = sum;
      }
      D[j * nx + i] = Math.sqrt(best);
    }
  }
  void s;
  return { nx, ny, o2, p, D };
}
