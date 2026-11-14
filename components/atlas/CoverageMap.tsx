"use client";
import { memo, useMemo, useRef, useState } from "react";
import { scaleLinear, scaleLog } from "d3-scale";
import type { Run, Scenario, Atmosphere } from "@/lib/schema";
import { SCALES, VERDICT_THRESHOLDS, psiaToKPa, type Field, type Verdict } from "@/lib/engine";
import { fmt } from "@/lib/format";
import { O2_DOMAIN, P_DOMAIN, bandsAtMost, gridToSvg, multiPolygonPath, r2 } from "./geo";
import { PointsLayer, type PlotPoint } from "./marks";
import { useWidth } from "./useWidth";
import { runTitle } from "./SpecimenCard";
import { TIER_LABEL, FUEL_LABEL } from "@/lib/format";

const P_TICKS = [20, 30, 50, 70, 100, 150, 200, 300, 500];
const PSIA_TICKS = [3, 5, 7, 10, 15, 20, 30, 50, 70];
const clamp = (v: number, [a, b]: [number, number]) => Math.min(b, Math.max(a, v));

interface Props {
  field: Field;
  envHalf: Field;
  envDouble: Field;
  runs: Run[];                 // placeable runs at this gravity (tiers already filtered)
  comparableIds: Set<string>;
  scenario: Scenario;
  verdict: Verdict;
  nearestD: number | null;
  landmarks: Atmosphere[];
  offChartLandmarks: Atmosphere[];
  activePreset: string | null;
  selectedId: string | null;
  highlightInv: string | null;
  plateLabel: string;
  coveragePct: number;
  onMove: (o2: number, p: number) => void;
  onPreset: (id: string) => void;
  onInspect: (run: Run) => void;
}

/** Bands + envelope + hatch: recomputed only when the field (not the pin) changes. */
const BandsLayer = memo(function BandsLayer({ field, envHalf, envDouble, x, y, w, h }: {
  field: Field; envHalf: Field; envDouble: Field; x: (v: number) => number; y: (v: number) => number; w: number; h: number;
}) {
  const paths = useMemo(() => {
    const proj = gridToSvg(field, x, y);
    const bands = bandsAtMost(field, [VERDICT_THRESHOLDS.direct, VERDICT_THRESHOLDS.near]);
    const near = bands.find((b) => b.t === VERDICT_THRESHOLDS.near);
    const direct = bands.find((b) => b.t === VERDICT_THRESHOLDS.direct);
    const env = (f: Field) => {
      const b = bandsAtMost(f, [VERDICT_THRESHOLDS.near])[0];
      return b ? multiPolygonPath(b.geom, gridToSvg(f, x, y)) : "";
    };
    return {
      near: near ? multiPolygonPath(near.geom, proj) : "",
      direct: direct ? multiPolygonPath(direct.geom, proj) : "",
      half: env(envHalf),
      double: env(envDouble),
    };
    // x/y are memoised on chart size by the parent, so this recomputes on field or size change only
  }, [field, envHalf, envDouble, x, y]);
  return (
    <g>
      <rect x={0} y={0} width={w} height={h} fill="url(#atlas-hatch)" />
      <path d={paths.near} className="atlas-band-near" />
      <path d={paths.direct} className="atlas-band-direct" />
      <path d={paths.near} className="atlas-band-edge" />
      <path d={paths.half} className="atlas-envelope" />
      <path d={paths.double} className="atlas-envelope" />
    </g>
  );
});

export default function CoverageMap(p: Props) {
  const [wrapRef, width] = useWidth<HTMLDivElement>(880);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<PlotPoint | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<number | null>(null);
  const tap = useRef<{ x: number; y: number; id: number } | null>(null);

  const narrow = width < 560;
  const m = narrow ? { l: 40, r: 34, t: 14, b: 36 } : { l: 56, r: 48, t: 18, b: 42 };
  const height = Math.round(clamp(width * (narrow ? 0.82 : 0.68), [300, 640]));
  const iw = width - m.l - m.r, ih = height - m.t - m.b;

  // x/y return coordinates rounded to 2 dp (hydration-stable); sx/sy are the raw scales for invert/ticks
  const { x, y, sx, sy } = useMemo(() => {
    const sx = scaleLinear().domain(O2_DOMAIN).range([0, iw]);
    const sy = scaleLog().domain(P_DOMAIN).range([ih, 0]);
    return { sx, sy, x: (v: number) => r2(sx(v)), y: (v: number) => r2(sy(v)) };
  }, [iw, ih]);

  const points: PlotPoint[] = useMemo(() => p.runs
    .filter((r) => r.o2Pct != null && r.pressureKPa != null && r.o2Pct <= O2_DOMAIN[1] && r.o2Pct >= O2_DOMAIN[0] && r.pressureKPa >= P_DOMAIN[0] && r.pressureKPa <= P_DOMAIN[1])
    .map((r) => ({ run: r, x: x(r.o2Pct!), y: y(r.pressureKPa!), comparable: p.comparableIds.has(r.id) })), [p.runs, p.comparableIds, x, y]);

  const off = useMemo(() => {
    const hiO2 = p.runs.filter((r) => r.o2Pct != null && r.pressureKPa != null && r.o2Pct > O2_DOMAIN[1]);
    const outP = p.runs.filter((r) => r.o2Pct != null && r.pressureKPa != null && (r.pressureKPa < P_DOMAIN[0] || r.pressureKPa > P_DOMAIN[1])).length;
    const maxO2 = hiO2.reduce((a, r) => Math.max(a, r.o2Pct!), -Infinity);
    return { hiO2, outP, maxO2 };
  }, [p.runs]);

  const pinO2 = clamp(p.scenario.o2Pct, O2_DOMAIN), pinP = clamp(p.scenario.pressureKPa, P_DOMAIN);
  const pinOff = pinO2 !== p.scenario.o2Pct || pinP !== p.scenario.pressureKPa;
  const px = x(pinO2), py = y(pinP);

  // "no comparable evidence" area label: where the field is farthest from evidence, and clear of the pin
  const unchartedAt = useMemo(() => {
    const cands: [number, number][] = [[41, 380], [41, 30], [14, 380], [14, 30], [28, 440], [41, 120]];
    let best: { o2: number; p: number; D: number } | null = null;
    const lp0 = Math.log(p.field.p[0]), lp1 = Math.log(p.field.p[p.field.ny - 1]);
    for (const [o2, pk] of cands) {
      if (Math.hypot(x(o2) - px, y(pk) - py) < 150) continue;
      const i = Math.round(((o2 - p.field.o2[0]) / (p.field.o2[p.field.nx - 1] - p.field.o2[0])) * (p.field.nx - 1));
      const j = Math.round(((Math.log(pk) - lp0) / (lp1 - lp0)) * (p.field.ny - 1));
      const D = p.field.D[clamp(j, [0, p.field.ny - 1]) * p.field.nx + clamp(i, [0, p.field.nx - 1])];
      if (D > VERDICT_THRESHOLDS.near && (!best || D > best.D)) best = { o2, p: pk, D };
    }
    return best;
  }, [p.field, x, y, px, py]);

  // landmarks: coincident atmospheres share one label; labels sit above the triangle unless they
  // would collide with the left neighbour or with the pin (then below)
  const landmarkGroups = useMemo(() => {
    const groups = new Map<string, Atmosphere[]>();
    for (const a of p.landmarks) {
      const k = `${a.o2Pct}|${a.pressureKPa}`;
      groups.set(k, [...(groups.get(k) ?? []), a]);
    }
    const out = [...groups.values()].map((g) => ({
      items: g,
      label: g.map((a) => `${a.short}${a.note?.toLowerCase().startsWith("assumed") ? " (assumed)" : ""}`).join(" · "),
      x: x(g[0].o2Pct), y: y(g[0].pressureKPa), below: false,
    })).sort((a, b) => a.x - b.x);
    let lastRight = -Infinity;
    for (const g of out) {
      const wLab = g.label.length * 6.9;
      if (g.x - wLab / 2 < lastRight + 6) g.below = true; else lastRight = g.x + wLab / 2;
    }
    return out;
  }, [p.landmarks, x, y]);

  const local = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { lx: e.clientX - r.left - m.l, ly: e.clientY - r.top - m.t };
  };
  const place = (lx: number, ly: number) => {
    const o2 = clamp(sx.invert(clamp(lx, [0, iw])), O2_DOMAIN);
    const pk = clamp(sy.invert(clamp(ly, [0, ih])), P_DOMAIN);
    p.onMove(Math.round(o2 * 10) / 10, Math.round(pk * 10) / 10);
  };
  const hit = (lx: number, ly: number, radius: number) => {
    let best: PlotPoint | null = null, bd = radius * radius;
    for (const q of points) {
      const d = (q.x - lx) ** 2 + (q.y - ly) ** 2;
      // rings/planned win ties over dots so published evidence is easy to open
      const dd = q.run.tier === "T1_PSI_RUN" ? d : d * 0.6;
      if (dd < bd) { bd = dd; best = q; }
    }
    return best;
  };
  const inside = (lx: number, ly: number) => lx >= -4 && lx <= iw + 4 && ly >= -4 && ly <= ih + 4;

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const t = e.target as Element;
    if (t.closest("[data-role='landmark']")) return;
    const { lx, ly } = local(e);
    if (!inside(lx, ly)) return;
    if (e.pointerType === "touch") { tap.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; return; } // tap-to-place
    if (e.button !== 0) return;
    if (t.closest("[data-role='pin']")) {
      drag.current = e.pointerId; setDragging(true);
      svgRef.current!.setPointerCapture(e.pointerId);
      return;
    }
    const h = hit(lx, ly, 6);
    if (h) { p.onInspect(h.run); return; }
    place(lx, ly);
    drag.current = e.pointerId; setDragging(true);
    svgRef.current!.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag.current !== e.pointerId) {
      if (e.pointerType !== "mouse") return;
      const { lx, ly } = local(e);
      const h = inside(lx, ly) ? hit(lx, ly, 7) : null;
      setHover((cur) => (h ? (cur?.run.id === h.run.id ? cur : h) : null));
      return;
    }
    const { lx, ly } = local(e);
    place(lx, ly);
  };
  const end = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag.current === e.pointerId) { drag.current = null; setDragging(false); }
    const tp = tap.current;
    if (tp && tp.id === e.pointerId && e.type === "pointerup") {
      tap.current = null;
      if (Math.hypot(e.clientX - tp.x, e.clientY - tp.y) < 10) {
        const { lx, ly } = local(e);
        const h = hit(lx, ly, 11);
        if (h) p.onInspect(h.run); else place(lx, ly);
      }
    } else if (tp && tp.id === e.pointerId) tap.current = null;
  };

  const onPinKey = (e: React.KeyboardEvent) => {
    const big = e.shiftKey;
    const dO2 = big ? SCALES.o2Pts : SCALES.o2Pts / 4;
    const fP = big ? SCALES.pressureRatio : Math.pow(SCALES.pressureRatio, 1 / 4);
    let o2 = p.scenario.o2Pct, pk = p.scenario.pressureKPa;
    if (e.key === "ArrowLeft") o2 -= dO2;
    else if (e.key === "ArrowRight") o2 += dO2;
    else if (e.key === "ArrowUp") pk *= fP;
    else if (e.key === "ArrowDown") pk /= fP;
    else return;
    e.preventDefault();
    p.onMove(Math.round(clamp(o2, O2_DOMAIN) * 10) / 10, Math.round(clamp(pk, P_DOMAIN) * 10) / 10);
  };

  const pTicks = P_TICKS.filter((t) => t >= P_DOMAIN[0] && t <= P_DOMAIN[1]);
  const psiaTicks = PSIA_TICKS.map((t) => ({ t, k: psiaToKPa(t) })).filter((o) => o.k >= P_DOMAIN[0] && o.k <= P_DOMAIN[1]);
  const o2Ticks = sx.ticks(narrow ? 4 : 7);
  const labelRight = px < iw * 0.62;
  const verdictWord = p.verdict;
  const summary = `Coverage map, ${p.plateLabel}. ${Math.round(p.coveragePct)} percent of the charted window lies within D ${VERDICT_THRESHOLDS.near} of comparable evidence. Scenario pin at ${fmt(p.scenario.o2Pct)} percent oxygen and ${fmt(p.scenario.pressureKPa)} kilopascals; evidence ${verdictWord}${p.nearestD != null && Number.isFinite(p.nearestD) ? `, D ${fmt(p.nearestD, 2)}` : ""}. ${points.length} runs drawn.`;

  return (
    <div ref={wrapRef} className="atlas-mapwrap">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className={`atlas-map${dragging ? " is-dragging" : ""}`}
        data-testid="coverage-map"
        role="group"
        aria-label={summary}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id="atlas-plot-clip"><rect x={0} y={0} width={iw} height={ih} /></clipPath>
        </defs>
        <g transform={`translate(${m.l},${m.t})`}>
          <g clipPath="url(#atlas-plot-clip)">
            <BandsLayer field={p.field} envHalf={p.envHalf} envDouble={p.envDouble} x={x} y={y} w={iw} h={ih} />
            {/* graticule over the bands, like a printed grid */}
            <g className="atlas-grid">
              {o2Ticks.map((t) => <line key={`gx${t}`} x1={x(t)} x2={x(t)} y1={0} y2={ih} />)}
              {pTicks.map((t) => <line key={`gy${t}`} x1={0} x2={iw} y1={y(t)} y2={y(t)} />)}
            </g>
            {unchartedAt && (
              <g className="atlas-uncharted-label" transform={`translate(${x(unchartedAt.o2)},${y(unchartedAt.p)})`} textAnchor={unchartedAt.o2 > 30 ? "end" : "start"}>
                <text className="atlas-area-label" y={0}>no comparable evidence</text>
                <text className="atlas-area-sub" y={14}>for this question and flow (D &gt; {VERDICT_THRESHOLDS.near})</text>
              </g>
            )}
            <PointsLayer points={points} dotR={narrow ? 1.5 : 1.8} ringScale={narrow ? 0.9 : 1} selectedId={p.selectedId} highlightInv={p.highlightInv} />
          </g>

          {/* frame + axes */}
          <rect className="atlas-frame" x={0} y={0} width={iw} height={ih} />
          <g className="atlas-axis">
            {o2Ticks.map((t) => (
              <g key={`tx${t}`} transform={`translate(${x(t)},${ih})`}>
                <line y2={5} /><text y={17} textAnchor="middle">{t}</text>
              </g>
            ))}
            {pTicks.map((t) => (
              <g key={`ty${t}`} transform={`translate(0,${y(t)})`}>
                <line x2={-5} /><text x={-8} dy="0.32em" textAnchor="end">{t}</text>
              </g>
            ))}
            {psiaTicks.map(({ t, k }) => (
              <g key={`tp${t}`} transform={`translate(${iw},${y(k)})`}>
                <line x2={4} /><text x={7} dy="0.32em">{t}</text>
              </g>
            ))}
            <text className="atlas-axis-title" x={iw / 2} y={ih + (narrow ? 31 : 36)} textAnchor="middle">Oxygen, % by volume</text>
            <text className="atlas-axis-title" transform={`translate(${-m.l + 11},${ih / 2}) rotate(-90)`} textAnchor="middle">Total pressure, kPa (log)</text>
            <text className="atlas-axis-title" transform={`translate(${iw + m.r - 6},${ih / 2}) rotate(90)`} textAnchor="middle">psia</text>
          </g>

          {/* off-chart indicators */}
          {off.hiO2.length > 0 && (
            <g className="atlas-offchart">
              {off.hiO2.filter((r) => r.pressureKPa! >= P_DOMAIN[0] && r.pressureKPa! <= P_DOMAIN[1]).map((r) => (
                <line key={r.id} x1={iw + 1} x2={iw + 5} y1={y(r.pressureKPa!)} y2={y(r.pressureKPa!)} />
              ))}
              <text x={iw - 4} y={-5} textAnchor="end">{off.hiO2.length} runs beyond {O2_DOMAIN[1]}% O₂ (to {fmt(off.maxO2, 0)}%) ▸</text>
            </g>
          )}
          {p.offChartLandmarks.map((a) => (
            <g key={a.id} className="atlas-offchart" transform={`translate(${iw},${y(clamp(a.pressureKPa, P_DOMAIN))})`}>
              <polygon points="0,-4 7,0 0,4" className="atlas-landmark atlas-landmark--off" />
              <text x={-4} dy="0.32em" textAnchor="end">{a.short} {a.o2Pct}% ▸</text>
            </g>
          ))}

          {/* habitat landmarks */}
          {landmarkGroups.map((g) => (
            <g key={g.items[0].id} transform={`translate(${g.x},${g.y})`}>
              <polygon points="0,-6 5.5,4 -5.5,4" className="atlas-landmark" data-role="landmark" style={{ cursor: "pointer" }} onClick={() => p.onPreset(g.items[0].id)} />
              {(() => {
                const a = g.items[0];
                const below = g.below || Math.hypot(g.x - px, g.y - py) < 26;
                const active = g.items.some((it) => it.id === p.activePreset);
                const wLab = g.label.length * 6.9;
                return (
                  <g
                    data-role="landmark"
                    role="button"
                    tabIndex={0}
                    aria-label={`Preset: ${g.items.map((it) => it.label).join(" and ")}, ${a.o2Pct}% O₂, ${a.pressureKPa} kPa`}
                    aria-pressed={active}
                    className={`atlas-landmark-label${active ? " is-active" : ""}`}
                    onClick={() => p.onPreset(a.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); p.onPreset(a.id); } }}
                  >
                    <rect x={r2(-wLab / 2 - 3)} y={below ? 8 : -21} width={r2(wLab + 6)} height={13} className="atlas-label-hit" />
                    <text textAnchor="middle" y={below ? 18 : -11}>{g.label}</text>
                  </g>
                );
              })()}
            </g>
          ))}

          {/* scenario pin */}
          <g className="atlas-pin-guides" aria-hidden="true">
            <line x1={px} x2={px} y1={py} y2={ih} />
            <line x1={0} x2={px} y1={py} y2={py} />
          </g>
          <g
            data-role="pin"
            className="atlas-pin"
            style={{ transform: `translate(${px}px, ${py}px)` }}
            tabIndex={0}
            role="button"
            aria-roledescription="movable scenario pin"
            aria-label={`Scenario pin at ${fmt(p.scenario.o2Pct)}% O₂, ${fmt(p.scenario.pressureKPa)} kPa. Arrow keys move it; hold Shift for one scale unit per step.`}
            onKeyDown={onPinKey}
          >
            <circle r={16} className="atlas-pin-hit" />
            <line y1={0} y2={-9} className="atlas-pin-stem" />
            <circle cy={-14} r={6} className="atlas-pin-head" />
            <circle cy={-14} r={1.8} className="atlas-pin-eye" />
            <circle r={2} className="atlas-pin-foot" />
            {!p.activePreset && <g transform={`translate(${labelRight ? 12 : -12},${py < 46 ? 20 : -26})`} textAnchor={labelRight ? "start" : "end"} className="atlas-pin-label">
              <text className="atlas-pin-coords">{fmt(p.scenario.o2Pct)}% · {fmt(p.scenario.pressureKPa)} kPa{pinOff ? " (off chart)" : ""}</text>
            </g>}
          </g>
        </g>
      </svg>
      {hover && (
        <div className="atlas-tip" role="status" style={{ left: Math.min(hover.x + m.l + 14, width - 270), top: Math.max(hover.y + m.t - 12, 0) }}>
          <span className="atlas-tip-tier" style={{ color: hover.run.tier === "T3_PUBLISHED" ? "var(--tier-pub)" : hover.run.tier === "T4_PLANNED" ? "var(--tier-plan)" : "var(--text-3)" }}>
            {hover.run.flags.includes("limit-value") ? "Reported limit" : TIER_LABEL[hover.run.tier]}{hover.comparable ? " · comparable" : ""}
          </span>
          <strong>{runTitle(hover.run)}</strong>
          <span className="num">{fmt(hover.run.o2Pct)}% O₂ · {fmt(hover.run.pressureKPa)} kPa{hover.run.flowCmS != null ? ` · ${fmt(hover.run.flowCmS)} cm/s` : ""}</span>
          <br />{hover.run.material ? hover.run.material.replace(/\s+/g, " ").trim() : FUEL_LABEL[hover.run.fuelClass]}
          <br /><span className="atlas-tip-tier">Click to inspect source</span>
        </div>
      )}
      {off.outP > 0 && <p className="atlas-mapnote">{off.outP} placeable runs lie outside the {P_DOMAIN[0]}–{P_DOMAIN[1]} kPa window and are not drawn.</p>}
    </div>
  );
}
