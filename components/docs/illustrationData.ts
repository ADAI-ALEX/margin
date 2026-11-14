/**
 * Data for the Method page's illustration of evidence distance (server side, build time).
 * Every region and every D below comes from the engine (evaluate, distance, distanceField, classify);
 * nothing here re-implements the formula. Contours: the same d3-contour helpers the Atlas uses.
 *
 * The illustration places ONE example test (the nearest comparable test to the Exploration Atmosphere,
 * published evidence included) and a probe at the Exploration Atmosphere's O₂ and pressure. It shows the
 * D ≤ 1 and D ≤ 2.5 regions around that single test with all three scales at ½×, 1× or 2× their defaults,
 * and with the probe's flow either equal to the test's flow or at the preset flow.
 */
import {
  SCALES, VERDICT_THRESHOLDS, ROBUSTNESS_FACTORS, evaluate, distance, distanceField, classify,
  type Scales, type Verdict,
} from "@/lib/engine";
import { bandsAtMost, gridToSvg, multiPolygonPath, r2 } from "@/components/atlas/geo";
import type { Run, Scenario } from "@/lib/schema";

export type FlowKey = "test" | "preset";
export interface IllState {
  k: number; flow: FlowKey;
  direct: string; near: string;
  /** Top-most point of each region (for an in-field label), from the contour itself; null if the region is empty. */
  directTop: [number, number] | null; nearTop: [number, number] | null;
  D: number; verdict: Verdict;
  gaps: { o2: number | null; pressure: number | null; flow: number | null };
  scales: Scales;
}
export interface IllData {
  view: { w: number; h: number; x0: number; x1: number; y0: number; y1: number };
  xTicks: { v: number; x: number }[];
  yTicks: { v: number; y: number }[];
  test: { x: number; y: number; tier: Run["tier"]; id: string; material: string | null; o2: number; p: number; flow: number | null };
  probe: { x: number; y: number; o2: number; p: number };
  flows: { key: FlowKey; cmS: number | null }[];
  factors: number[];
  states: IllState[];
}

/** All three scales multiplied by k, as robustness() does on its diagonal (pressure ratio raised to the power k). */
export const scalesAt = (k: number): Scales => ({
  o2Pts: SCALES.o2Pts * k, pressureRatio: Math.pow(SCALES.pressureRatio, k), flowCmS: SCALES.flowCmS * k,
});

export function buildIllustration(runs: Run[], base: Scenario): IllData | null {
  const near = evaluate(runs, base).nearest;
  if (!near || near.run.o2Pct == null || near.run.pressureKPa == null) return null;
  const run = near.run;
  const runO2 = run.o2Pct!, runP = run.pressureKPa!;

  // Display window (not a scientific value): centred on the test, wide enough for the D = 2.5 region at the
  // largest scale factor plus a margin. In scaled units the window is square, so regions draw as circles.
  const kMax = Math.max(...ROBUSTNESS_FACTORS);
  const halfUnits = VERDICT_THRESHOLDS.near * kMax * 1.2;
  const o2Range: [number, number] = [runO2 - halfUnits * SCALES.o2Pts, runO2 + halfUnits * SCALES.o2Pts];
  const lnHalf = halfUnits * Math.log(SCALES.pressureRatio);
  const pRange: [number, number] = [runP * Math.exp(-lnHalf), runP * Math.exp(lnHalf)];

  const W = 440, H = 420, x0 = 52, x1 = W - 14, y0 = 12, y1 = H - 40;
  const x = (o2: number) => r2(x0 + ((o2 - o2Range[0]) / (o2Range[1] - o2Range[0])) * (x1 - x0));
  const y = (p: number) => r2(y1 - ((Math.log(p) - Math.log(pRange[0])) / (Math.log(pRange[1]) - Math.log(pRange[0]))) * (y1 - y0));

  const xTicks: IllData["xTicks"] = [];
  for (let v = Math.ceil(o2Range[0] / 5) * 5; v <= o2Range[1]; v += 5) xTicks.push({ v, x: x(v) });
  const yTicks = [10, 15, 20, 30, 50, 70, 100, 150, 200, 300].filter((v) => v >= pRange[0] && v <= pRange[1]).map((v) => ({ v, y: y(v) }));

  const flows: IllData["flows"] = [];
  if (run.flowCmS != null && run.flowCmS !== base.flowCmS) flows.push({ key: "test", cmS: run.flowCmS });
  flows.push({ key: "preset", cmS: base.flowCmS });

  const states: IllState[] = [];
  for (const f of flows) {
    const probe: Scenario = { ...base, flowCmS: f.cmS };
    for (const k of ROBUSTNESS_FACTORS) {
      const scales = scalesAt(k);
      const ev = evaluate([run], probe, scales);
      const field = distanceField(ev, probe, o2Range, pRange, 110, 110, scales);
      const proj = gridToSvg(field, x, y);
      const bands = bandsAtMost(field, [VERDICT_THRESHOLDS.direct, VERDICT_THRESHOLDS.near]);
      const path = (t: number) => { const b = bands.find((q) => q.t === t); return b ? multiPolygonPath(b.geom, proj) : ""; };
      const top = (t: number): [number, number] | null => {
        const b = bands.find((q) => q.t === t);
        let best: [number, number] | null = null;
        for (const poly of b?.geom.coordinates ?? []) for (const ring of poly) for (const [gx, gy] of ring) {
          const pt = proj(gx, gy);
          if (!best || pt[1] < best[1]) best = pt;
        }
        return best;
      };
      const d = distance(run, probe, scales);
      states.push({
        k, flow: f.key, direct: path(VERDICT_THRESHOLDS.direct), near: path(VERDICT_THRESHOLDS.near),
        directTop: top(VERDICT_THRESHOLDS.direct), nearTop: top(VERDICT_THRESHOLDS.near),
        D: d.D, verdict: classify(d.D), gaps: d.gaps, scales,
      });
    }
  }

  return {
    view: { w: W, h: H, x0, x1, y0, y1 }, xTicks, yTicks,
    test: { x: x(runO2), y: y(runP), tier: run.tier, id: run.id, material: run.material, o2: runO2, p: runP, flow: run.flowCmS },
    probe: { x: x(base.o2Pct), y: y(base.pressureKPa), o2: base.o2Pct, p: base.pressureKPa },
    flows, factors: [...ROBUSTNESS_FACTORS], states,
  };
}
