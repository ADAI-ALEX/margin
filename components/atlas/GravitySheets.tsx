"use client";
import { useMemo, useRef } from "react";
import { scaleLinear, scaleLog } from "d3-scale";
import type { Gravity, Run, Scenario } from "@/lib/schema";
import { VERDICT_THRESHOLDS, type Field, type Verdict } from "@/lib/engine";
import { GRAVITY_LABEL, GRAVITY_SHORT } from "@/lib/format";
import { O2_DOMAIN, P_DOMAIN, bandsAtMost, gridToSvg, multiPolygonPath, r2 } from "./geo";
import { Dot, TierMark, fuelShape } from "./marks";
import { useWidth } from "./useWidth";

export const GRAVITIES: Gravity[] = ["micro", "moon", "mars", "earth"];

export interface SheetData {
  g: Gravity;
  field: Field;
  runs: Run[];
  comparableIds: Set<string>;
  verdict: Verdict;
  psi: number;
  published: number;
  planned: number;
}

function Sheet({ d, scenario }: { d: SheetData; scenario: Scenario }) {
  const [ref, w] = useWidth<HTMLDivElement>(200);
  const h = Math.round(w * 0.62);
  const { x, y } = useMemo(() => {
    const sx = scaleLinear().domain(O2_DOMAIN).range([0, w]), sy = scaleLog().domain(P_DOMAIN).range([h, 0]);
    return { x: (v: number) => r2(sx(v)), y: (v: number) => r2(sy(v)) };
  }, [w, h]);
  const paths = useMemo(() => {
    const proj = gridToSvg(d.field, x, y);
    const bands = bandsAtMost(d.field, [VERDICT_THRESHOLDS.direct, VERDICT_THRESHOLDS.near]);
    return bands.map((b) => ({ t: b.t, d: multiPolygonPath(b.geom, proj) }));
  }, [d.field, x, y]);
  const inDomain = (r: Run) => r.o2Pct != null && r.pressureKPa != null && r.o2Pct >= O2_DOMAIN[0] && r.o2Pct <= O2_DOMAIN[1] && r.pressureKPa >= P_DOMAIN[0] && r.pressureKPa <= P_DOMAIN[1];
  const runs = d.runs.filter(inDomain);
  const sx = x(Math.min(O2_DOMAIN[1], Math.max(O2_DOMAIN[0], scenario.o2Pct)));
  const sy = y(Math.min(P_DOMAIN[1], Math.max(P_DOMAIN[0], scenario.pressureKPa)));
  return (
    <div ref={ref} className="atlas-sheet-canvas">
      <svg width={w} height={h} aria-hidden="true" className="atlas-sheet-svg">
        <rect width={w} height={h} fill="url(#atlas-hatch)" />
        {paths.map((pp) => <path key={pp.t} d={pp.d} className={pp.t === VERDICT_THRESHOLDS.direct ? "atlas-band-direct" : "atlas-band-near"} />)}
        {runs.filter((r) => r.tier === "T1_PSI_RUN").map((r) => (
          <Dot key={r.id} x={x(r.o2Pct!)} y={y(r.pressureKPa!)} r={1} shape={fuelShape(r.fuelClass)} muted={!d.comparableIds.has(r.id)} />
        ))}
        {runs.filter((r) => r.tier !== "T1_PSI_RUN").map((r) => <TierMark key={r.id} run={r} x={x(r.o2Pct!)} y={y(r.pressureKPa!)} scale={0.8} />)}
        <g className="atlas-sheet-cross">
          <line x1={r2(sx - 5)} x2={r2(sx + 5)} y1={sy} y2={sy} />
          <line x1={sx} x2={sx} y1={r2(sy - 5)} y2={r2(sy + 5)} />
        </g>
        <rect width={w} height={h} className="atlas-frame" />
      </svg>
    </div>
  );
}

/**
 * Four separate sheets, one per gravity regime. They are deliberately physically
 * separate: regimes, not a continuum. The strip is the gravity radiogroup.
 */
export default function GravitySheets({ sheets, scenario, onSelect }: { sheets: SheetData[]; scenario: Scenario; onSelect: (g: Gravity) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = GRAVITIES.length;
    let k = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") k = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") k = (i - 1 + n) % n;
    else if (e.key === "Home") k = 0;
    else if (e.key === "End") k = n - 1;
    if (k < 0) return;
    e.preventDefault();
    onSelect(GRAVITIES[k]);
    refs.current[k]?.focus();
  };
  return (
    <section className="atlas-sheets" aria-labelledby="atlas-sheets-title">
      <header className="atlas-sheets-head">
        <h2 id="atlas-sheets-title" className="atlas-h3">Gravity regimes · four separate sheets</h2>
        <p className="atlas-micro">Each regime has its own evidence. No distance is computed across sheets.</p>
      </header>
      <div className="atlas-sheet-strip" role="radiogroup" aria-labelledby="atlas-sheets-title">
        {sheets.map((d, i) => {
          const on = scenario.gravity === d.g;
          const empty = d.psi === 0;
          return (
            <button
              key={d.g}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className={`atlas-sheet${on ? " is-on" : ""}`}
              onClick={() => onSelect(d.g)}
              onKeyDown={(e) => onKey(e, i)}
              aria-label={`${GRAVITY_LABEL[d.g]}: ${d.psi} PSI runs, ${d.published} published, ${d.planned} planned. Evidence at the pin: ${d.verdict}.`}
            >
              <span className="atlas-sheet-title">
                <span className="atlas-sheet-g">{GRAVITY_SHORT[d.g]}</span>
                <span className="atlas-sheet-name">{GRAVITY_LABEL[d.g]}</span>
              </span>
              <Sheet d={d} scenario={scenario} />
              <span className="atlas-sheet-cap">
                <span className={empty ? "atlas-sheet-empty" : undefined}>{empty ? "No PSI tests" : `${d.psi.toLocaleString("en-US")} PSI`}</span>
                {d.published > 0 && <span> · {d.published} published</span>}
                {d.planned > 0 && <span> · {d.planned} planned</span>}
                <span className="atlas-sheet-verdict">Evidence: {d.verdict}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
