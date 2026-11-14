import type { Run, Scenario } from "@/lib/schema";
import { SCALES, ROBUSTNESS_FACTORS } from "./constants";
import { evaluate, type Verdict } from "./verdict";

const ORDER: Verdict[] = ["DIRECT", "NEAR", "DISTANT", "NONE"];
export interface Robustness {
  robust: boolean;
  combos: number;
  verdicts: Record<Verdict, number>;
  range: [Verdict, Verdict];
  Drange: [number, number] | null;
  cells: { o2: number; pressure: number; flow: number; verdict: Verdict; D: number | null; partial: boolean }[];
  /** Cells whose nearest run was a partial match (missing axis or regime mismatch). All 27 ⇒ robustness says nothing about the missing axis. */
  partialCells: number;
}
/** Recompute the verdict with every scale at ½×, 1×, 2× (3³ = 27 combinations). */
export function robustness(runs: Run[], s: Scenario): Robustness {
  const verdicts: Record<Verdict, number> = { DIRECT: 0, NEAR: 0, DISTANT: 0, NONE: 0 };
  let lo = Infinity, hi = -Infinity, combos = 0;
  const cells: Robustness["cells"] = [];
  for (const a of ROBUSTNESS_FACTORS) for (const b of ROBUSTNESS_FACTORS) for (const c of ROBUSTNESS_FACTORS) {
    const scales = { o2Pts: SCALES.o2Pts * a, pressureRatio: Math.pow(SCALES.pressureRatio, b), flowCmS: SCALES.flowCmS * c };
    const e = evaluate(runs, s, scales);
    verdicts[e.verdict]++; combos++;
    cells.push({ o2: a, pressure: b, flow: c, verdict: e.verdict, D: e.nearest?.d.D ?? null, partial: !!e.nearest?.d.partialMatch });
    if (e.nearest) { lo = Math.min(lo, e.nearest.d.D); hi = Math.max(hi, e.nearest.d.D); }
  }
  const present = ORDER.filter((v) => verdicts[v] > 0);
  return {
    robust: present.length === 1, combos, verdicts,
    range: [present[0], present[present.length - 1]],
    Drange: Number.isFinite(lo) ? [lo, hi] : null,
    cells,
    partialCells: cells.filter((x) => x.partial).length,
  };
}
