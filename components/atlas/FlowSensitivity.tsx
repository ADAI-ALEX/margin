"use client";
import { useDeferredValue, useMemo } from "react";
import { scaleLinear } from "d3-scale";
import type { Scenario } from "@/lib/schema";
import { flowSensitivity, VERDICT_THRESHOLDS } from "@/lib/engine";
import { ALL_RUNS } from "@/lib/data";

const FLOWS = [0.0001, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30];
const W = 300, H = 132, M = { l: 30, r: 10, t: 10, b: 26 };

/**
 * How D (to the nearest comparable test) changes with the scenario's ventilation flow, all else fixed.
 * A sensitivity of the METHOD to an assumed input — not a statement about fire behaviour.
 */
export default function FlowSensitivity({ scenario }: { scenario: Scenario }) {
  const s = useDeferredValue(scenario);
  const { o2Pct, pressureKPa, gravity, hazard, materialClass, includePublished } = s;
  const res = useMemo(
    () => flowSensitivity(ALL_RUNS, { o2Pct, pressureKPa, gravity, hazard, materialClass, includePublished, flowCmS: 10 }, [null, ...FLOWS]),
    [o2Pct, pressureKPa, gravity, hazard, materialClass, includePublished],
  );
  const pts = res.points.filter((p) => p.flowCmS != null && p.D != null) as { flowCmS: number; D: number; verdict: string; partial: boolean; nearestId: string | null }[];
  const quiet = res.points[0];
  if (!pts.length) {
    return (
      <figure className="atlas-sens" data-testid="flow-sensitivity">
        <figcaption className="atlas-h4">Sensitivity to the assumed flow</figcaption>
        <p className="atlas-prose-sm">No comparable test in this regime at any flow, so D is undefined at every flow.</p>
      </figure>
    );
  }
  const yMax = Math.max(3.2, Math.min(8, Math.max(...pts.map((p) => p.D)) * 1.08));
  const x = scaleLinear().domain([0, 30]).range([M.l, W - M.r]);
  const y = scaleLinear().domain([0, yMax]).range([H - M.b, M.t]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.flowCmS).toFixed(1)},${y(Math.min(p.D, yMax)).toFixed(1)}`).join("");
  const cur = s.flowCmS;
  const curPt = cur != null ? res.points.find((p) => p.flowCmS != null && Math.abs(p.flowCmS - cur) < 1e-6) : null;
  const xings = res.crossings;
  const summary = `Evidence distance D versus assumed ventilation flow, 0 to 30 cm/s. ${pts.map((p) => `${p.flowCmS < 0.01 ? 0 : p.flowCmS} cm/s: D ${p.D.toFixed(2)}`).join("; ")}.`;

  return (
    <figure className="atlas-sens" data-testid="flow-sensitivity">
      <figcaption className="atlas-h4">Sensitivity to the assumed flow</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={summary} className="atlas-sens-svg">
        <rect x={M.l} y={y(VERDICT_THRESHOLDS.direct)} width={W - M.l - M.r} height={y(0) - y(VERDICT_THRESHOLDS.direct)} className="atlas-sens-direct" />
        <rect x={M.l} y={y(VERDICT_THRESHOLDS.near)} width={W - M.l - M.r} height={y(VERDICT_THRESHOLDS.direct) - y(VERDICT_THRESHOLDS.near)} className="atlas-sens-near" />
        {[VERDICT_THRESHOLDS.direct, VERDICT_THRESHOLDS.near].map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="atlas-sens-rule" />
            <text x={M.l - 4} y={y(t) + 3} className="atlas-sens-tick" textAnchor="end">{t}</text>
          </g>
        ))}
        <text x={W - M.r - 2} y={y(VERDICT_THRESHOLDS.direct) + 10} className="atlas-sens-zone" textAnchor="end">DIRECT</text>
        <text x={W - M.r - 2} y={y(VERDICT_THRESHOLDS.near) + 10} className="atlas-sens-zone" textAnchor="end">NEAR</text>
        <text x={W - M.r - 2} y={M.t + 8} className="atlas-sens-zone" textAnchor="end">DISTANT</text>
        {[0, 5, 10, 15, 20, 25, 30].map((t) => (
          <text key={t} x={x(t)} y={H - M.b + 12} className="atlas-sens-tick" textAnchor="middle">{t}</text>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 2} className="atlas-sens-tick" textAnchor="middle">assumed flow, cm/s</text>
        <text x={4} y={M.t + 4} className="atlas-sens-tick">D</text>
        <path d={line} className="atlas-sens-line" />
        {pts.map((p) => (
          <circle key={p.flowCmS} cx={x(p.flowCmS)} cy={y(Math.min(p.D, yMax))} r={2.2} className={p.partial ? "atlas-sens-pt is-partial" : "atlas-sens-pt"} />
        ))}
        {curPt && curPt.D != null && cur != null && (
          <g>
            <line x1={x(cur)} x2={x(cur)} y1={M.t} y2={H - M.b} className="atlas-sens-cur" />
            <circle cx={x(cur)} cy={y(Math.min(curPt.D, yMax))} r={4} className="atlas-sens-curpt" />
          </g>
        )}
      </svg>
      <p className="atlas-prose-sm">
        {curPt && curPt.D != null && cur != null ? <>At your {cur} cm/s, D = <span className="num">{curPt.D.toFixed(2)}</span> ({curPt.verdict}). </> : null}
        {xings.length
          ? <>The classification changes at {xings.map((c, i) => <span key={i}>{i ? " and " : ""}<span className="num">{c.flowCmS.toFixed(2)}</span> cm/s ({c.from}→{c.to})</span>)}. </>
          : <>The classification is {pts[0].verdict} at every flow from 0 to 30 cm/s. </>}
        {quiet && quiet.D != null && <>Quiescent air: D = <span className="num">{quiet.D.toFixed(2)}</span> ({quiet.verdict}){quiet.partial ? ", flow not compared because the flow regimes differ" : ""}. </>}
        The flow is an input you choose, not a measured property of a cabin; <a href="/method#flow">see Method</a>.
      </p>
    </figure>
  );
}
