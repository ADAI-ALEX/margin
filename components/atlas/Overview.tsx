"use client";
/**
 * Regimes overview: the four gravity regimes as four separate flat plates (small multiples on shared
 * axes), each with its own evidence counts and its verdict for the current scenario. Plates are visibly
 * separated and never connected; choosing one opens it. This is the gravity-sheets radiogroup.
 */
import { useMemo, useRef } from "react";
import { scaleLinear, scaleLog } from "d3-scale";
import type { Gravity, Run, Scenario } from "@/lib/schema";
import { VERDICT_THRESHOLDS, type Field, type Verdict } from "@/lib/engine";
import { GRAVITY_LABEL } from "@/lib/format";
import { REGIMES, REGIME_COUNTS, REGIME_G, REGIME_SHORT } from "@/lib/view/regimes";
import { O2_DOMAIN, P_DOMAIN, bandsAtMost, gridToSvg, multiPolygonPath, r2 } from "./geo";
import { Dot, TierMark, fuelShape } from "./marks";

export interface PlateData { g: Gravity; field: Field; runs: Run[]; comparableIds: Set<string>; verdict: Verdict; D: number | null }

const PW = 320, PH = 190;

function Plate({ d, scenario }: { d: PlateData; scenario: Scenario }) {
  const { x, y } = useMemo(() => {
    const sx = scaleLinear().domain(O2_DOMAIN).range([0, PW]), sy = scaleLog().domain(P_DOMAIN).range([PH, 0]);
    return { x: (v: number) => r2(sx(v)), y: (v: number) => r2(sy(v)) };
  }, []);
  const paths = useMemo(() => {
    const proj = gridToSvg(d.field, x, y);
    return bandsAtMost(d.field, [VERDICT_THRESHOLDS.direct, VERDICT_THRESHOLDS.near]).map((b) => ({ t: b.t, d: multiPolygonPath(b.geom, proj) }));
  }, [d.field, x, y]);
  const inDomain = (r: Run) => r.o2Pct != null && r.pressureKPa != null && r.o2Pct >= O2_DOMAIN[0] && r.o2Pct <= O2_DOMAIN[1] && r.pressureKPa >= P_DOMAIN[0] && r.pressureKPa <= P_DOMAIN[1];
  const runs = d.runs.filter(inDomain);
  const cx = x(Math.min(O2_DOMAIN[1], Math.max(O2_DOMAIN[0], scenario.o2Pct)));
  const cy = y(Math.min(P_DOMAIN[1], Math.max(P_DOMAIN[0], scenario.pressureKPa)));
  return (
    <svg className="ov-svg" viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="none" aria-hidden="true">
      <rect width={PW} height={PH} className="ov-bg" />
      <rect width={PW} height={PH} fill="url(#ov-hatch)" />
      {paths.map((pp) => <path key={pp.t} d={pp.d} className={pp.t === VERDICT_THRESHOLDS.direct ? "mk-ev-direct" : "mk-ev-near"} vectorEffect="non-scaling-stroke" />)}
      {runs.filter((r) => r.tier === "T1_PSI_RUN").map((r) => <Dot key={r.id} x={x(r.o2Pct!)} y={y(r.pressureKPa!)} r={1.3} shape={fuelShape(r.fuelClass)} muted={!d.comparableIds.has(r.id)} />)}
      {runs.filter((r) => r.tier !== "T1_PSI_RUN").map((r) => <TierMark key={r.id} run={r} x={x(r.o2Pct!)} y={y(r.pressureKPa!)} scale={0.9} />)}
      <g className="ov-probe"><line x1={r2(cx - 7)} x2={r2(cx + 7)} y1={cy} y2={cy} /><line x1={cx} x2={cx} y1={r2(cy - 7)} y2={r2(cy + 7)} /><circle cx={cx} cy={cy} r={2.4} className="mk-probe" /></g>
      <rect width={PW} height={PH} className="ov-frame" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function Overview({ plates, scenario, onSelect, onOpen }: { plates: PlateData[]; scenario: Scenario; onSelect: (g: Gravity) => void; onOpen: (g: Gravity) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = REGIMES.length;
    let k = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") k = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") k = (i - 1 + n) % n;
    else if (e.key === "Home") k = 0;
    else if (e.key === "End") k = n - 1;
    if (k < 0) return;
    e.preventDefault();
    onSelect(REGIMES[k]);
    refs.current[k]?.focus();
  };
  return (
    <section className="ov" data-testid="gravity-sheets" aria-labelledby="atlas-ov-title">
      <svg width="0" height="0" className="ov-defs" aria-hidden="true" focusable="false">
        <defs><pattern id="ov-hatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" className="fld-hatch-line" /></pattern></defs>
      </svg>
      <header className="ov-head">
        <h2 id="atlas-ov-title" className="ov-title">Four gravity regimes, four separate plates</h2>
        <p className="ov-sub">Arrow keys choose a regime; Enter or a click opens its plate. Each regime has its own evidence. No distance is computed across plates and nothing is estimated between them. Same axes on every plate: O₂ {O2_DOMAIN[0]}–{O2_DOMAIN[1]}% (linear) × pressure {P_DOMAIN[0]}–{P_DOMAIN[1]} kPa (log).</p>
      </header>
      <div className="ov-grid" role="radiogroup" aria-labelledby="atlas-ov-title">
        {plates.map((d, i) => {
          const on = scenario.gravity === d.g;
          const c = REGIME_COUNTS[d.g];
          const shownPub = scenario.includePublished ? c.published + c.limits : 0;
          return (
            <button key={d.g} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
              className="ov-plate" data-on={on || undefined} onClick={() => onOpen(d.g)} onKeyDown={(e) => onKey(e, i)}
              aria-label={`${GRAVITY_LABEL[d.g]}: ${c.psi} PSI runs, ${shownPub} published, ${c.planned} planned. Evidence at the probe: ${d.verdict}.`}>
              <span className="ov-plate-head">
                <span className="ov-plate-name">{REGIME_SHORT[d.g]}</span>
                <span className="ov-plate-g num">{REGIME_G[d.g]}</span>
                <span className="ov-plate-verdict">Evidence <b>{d.verdict}</b>{d.D != null && Number.isFinite(d.D) ? <span className="num"> · D {d.D.toFixed(2)}</span> : null}</span>
              </span>
              <Plate d={d} scenario={scenario} />
              <span className="ov-plate-cap">
                <span className={c.psi === 0 ? "ov-empty" : undefined}>{c.psi === 0 ? "No PSI tests" : `${c.psi.toLocaleString("en-GB")} PSI runs`}</span>
                {shownPub > 0 && <span> · {shownPub} published</span>}
                {c.planned > 0 && <span> · {c.planned} planned (not evidence)</span>}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
