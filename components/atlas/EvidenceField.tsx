"use client";
/**
 * The evidence field: the O₂ (linear) × total pressure (log) plane of one gravity regime, drawn full-bleed.
 * The plot frame sits in the area the floating panels leave free; the graticule continues faintly beneath
 * the panels. Coverage is one cool hue (D ≤ 1 stronger than D ≤ 2.5, thin edge lines, ½× / 2× envelopes
 * dashed). Never tilted, never a hazard map. Marks: dot, ring, dashed ring, ring + tick, hollow triangle,
 * and one amber probe with crosshairs and axis readouts. Labels are placed without collisions.
 */
import { memo, useMemo, useRef, useState, type ReactNode } from "react";
import { scaleLinear, scaleLog } from "d3-scale";
import type { Atmosphere, Run, Scenario } from "@/lib/schema";
import { SCALES, VERDICT_THRESHOLDS, psiaToKPa, type Field, type Verdict } from "@/lib/engine";
import { FUEL_LABEL, TIER_LABEL, fmt } from "@/lib/format";
import { placeLabels, textWidth, type LabelRequest } from "@/lib/view/labels";
import { O2_DOMAIN, P_DOMAIN, bandsAtMost, gridToSvg, multiPolygonPath, r2, type ViewDomain } from "./geo";
import { PointsLayer, type MarkLayers, type PlotPoint } from "./marks";
import { runTitle } from "@/components/run/RunInspector";

export interface FieldLayers extends MarkLayers { coverage: boolean; envelopes: boolean; landmarks: boolean; gap: boolean }
export const DEFAULT_LAYERS: FieldLayers = { coverage: true, envelopes: true, psi: true, other: true, published: true, limits: true, planned: true, landmarks: true, gap: true };
export interface Insets { l: number; t: number; r: number; b: number }

const P_TICKS = [10, 15, 20, 30, 50, 70, 100, 150, 200, 300, 500, 700, 1000];
const PSIA_TICKS = [3, 4, 5, 7, 10, 15, 20, 30, 50, 70];
const clamp = (v: number, [a, b]: readonly [number, number]) => Math.min(b, Math.max(a, v));
const pc = (v: number, of: number) => `${(v / of) * 100}%`;

interface Props {
  W: number; H: number; free: Insets; compact: boolean;
  domain: ViewDomain;
  field: Field; envHalf: Field; envDouble: Field;
  /** Extra notes under the plot (e.g. comparable runs not drawn because a value is missing). */
  notes?: string[];
  animating?: boolean;
  runs: Run[];
  comparableIds: Set<string>;
  scenario: Scenario;
  verdict: Verdict;
  nearestD: number | null;
  landmarks: Atmosphere[];
  offChart: Atmosphere[];
  activePreset: string | null;
  selectedId: string | null;
  focusInv: string | null;
  layers: FieldLayers;
  summary: string;
  /** Shown over the plot when the regime holds no comparable placeable evidence (honest emptiness). */
  empty: ReactNode | null;
  /** The headline coverage gap: highest O₂ in a PSI solid test, and the planned habitat range. */
  gap: { maxO2: number; planned: [number, number] } | null;
  title: ReactNode;
  onMove: (o2: number, p: number) => void;
  onPreset: (id: string) => void;
  onInspect: (run: Run) => void;
}

/** Bands + envelopes: contours computed once per field; only re-projected when the view moves. */
const BandsLayer = memo(function BandsLayer({ field, envHalf, envDouble, x, y, layers }: {
  field: Field; envHalf: Field; envDouble: Field; x: (v: number) => number; y: (v: number) => number; layers: FieldLayers;
}) {
  const geom = useMemo(() => {
    const bands = bandsAtMost(field, [VERDICT_THRESHOLDS.direct, VERDICT_THRESHOLDS.near]);
    return {
      near: bands.find((b) => b.t === VERDICT_THRESHOLDS.near)?.geom ?? null,
      direct: bands.find((b) => b.t === VERDICT_THRESHOLDS.direct)?.geom ?? null,
      half: bandsAtMost(envHalf, [VERDICT_THRESHOLDS.near])[0]?.geom ?? null,
      double: bandsAtMost(envDouble, [VERDICT_THRESHOLDS.near])[0]?.geom ?? null,
    };
  }, [field, envHalf, envDouble]);
  const paths = useMemo(() => {
    const proj = gridToSvg(field, x, y);
    return {
      near: geom.near ? multiPolygonPath(geom.near, proj) : "",
      direct: geom.direct ? multiPolygonPath(geom.direct, proj) : "",
      half: geom.half ? multiPolygonPath(geom.half, gridToSvg(envHalf, x, y)) : "",
      double: geom.double ? multiPolygonPath(geom.double, gridToSvg(envDouble, x, y)) : "",
    };
  }, [geom, field, envHalf, envDouble, x, y]);
  return (
    <g className="fld-bands">
      {layers.coverage && <path d={paths.near} className="mk-ev-near" />}
      {layers.coverage && <path d={paths.direct} className="mk-ev-direct" />}
      {layers.envelopes && <path d={paths.half} className="mk-envelope" />}
      {layers.envelopes && <path d={paths.double} className="mk-envelope" />}
    </g>
  );
});

/** Tick values that continue a linear step beyond the window (unlabelled, for the full-bleed graticule). */
function linearRun(a: number, b: number, step: number) { const out: number[] = []; for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(6)); return out; }
function logRun(a: number, b: number) {
  const out: number[] = [];
  for (let k = Math.floor(Math.log10(Math.max(a, 1e-3))); k <= Math.ceil(Math.log10(b)); k++) for (const m of [1, 1.5, 2, 3, 5, 7]) { const v = m * 10 ** k; if (v >= a && v <= b) out.push(v); }
  return out;
}

export default function EvidenceField(p: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<PlotPoint | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<number | null>(null);
  const tap = useRef<{ x: number; y: number; id: number } | null>(null);

  const { W, H, free, compact, domain } = p;
  const m = compact ? { l: 42, r: 34, t: 72, b: 58 } : { l: 58, r: 52, t: 104, b: 72 };
  const x0 = free.l + m.l, y0 = free.t + m.t;
  const iw = Math.max(140, W - free.l - free.r - m.l - m.r), ih = Math.max(140, H - free.t - free.b - m.t - m.b);

  const { x, y, sx, sy } = useMemo(() => {
    const sx = scaleLinear().domain(domain.o2).range([x0, x0 + iw]);
    const sy = scaleLog().domain(domain.p).range([y0 + ih, y0]);
    return { sx, sy, x: (v: number) => r2(sx(v)), y: (v: number) => r2(sy(v)) };
  }, [domain, x0, y0, iw, ih]);

  const inView = (o2: number, pk: number) => o2 >= domain.o2[0] && o2 <= domain.o2[1] && pk >= domain.p[0] && pk <= domain.p[1];
  const points: PlotPoint[] = useMemo(() => p.runs
    .filter((r) => r.o2Pct != null && r.pressureKPa != null && r.o2Pct >= domain.o2[0] && r.o2Pct <= domain.o2[1] && r.pressureKPa >= domain.p[0] && r.pressureKPa <= domain.p[1])
    .map((r) => ({ run: r, x: x(r.o2Pct!), y: y(r.pressureKPa!), comparable: p.comparableIds.has(r.id) })), [p.runs, p.comparableIds, x, y, domain]);

  const off = useMemo(() => {
    const placeable = p.runs.filter((r) => r.o2Pct != null && r.pressureKPa != null);
    const hiO2 = placeable.filter((r) => r.o2Pct! > O2_DOMAIN[1]);
    const outP = placeable.filter((r) => r.pressureKPa! < P_DOMAIN[0] || r.pressureKPa! > P_DOMAIN[1]).length;
    return { hiO2: hiO2.length, maxO2: hiO2.reduce((a, r) => Math.max(a, r.o2Pct!), -Infinity), outP };
  }, [p.runs]);

  const s = p.scenario;
  const pinO2 = clamp(s.o2Pct, domain.o2), pinP = clamp(s.pressureKPa, domain.p);
  const pinOff = pinO2 !== s.o2Pct || pinP !== s.pressureKPa;
  const px = x(pinO2), py = y(pinP);

  // ---- landmarks: coincident atmospheres share one mark and one label
  const landmarkGroups = useMemo(() => {
    const groups = new Map<string, Atmosphere[]>();
    for (const a of p.landmarks) { const k = `${a.o2Pct}|${a.pressureKPa}`; groups.set(k, [...(groups.get(k) ?? []), a]); }
    return [...groups.values()].filter((g) => inView(g[0].o2Pct, g[0].pressureKPa)).map((g) => ({
      items: g, id: g[0].id,
      label: g.map((a) => `${a.short}${a.note?.toLowerCase().startsWith("assumed") ? " (assumed)" : ""}`).join(" · ").toUpperCase(),
      x: x(g[0].o2Pct), y: y(g[0].pressureKPa),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.landmarks, x, y, domain]);

  const sel = p.selectedId ? points.find((q) => q.run.id === p.selectedId) ?? null : null;
  const showGap = p.layers.gap && p.gap && p.gap.maxO2 >= domain.o2[0] && p.gap.maxO2 <= domain.o2[1];

  // ---- direct labels, placed without collisions (probe first, then the selection, landmarks, area notes)
  const probeText = `Scenario · ${p.verdict}${p.nearestD != null && Number.isFinite(p.nearestD) ? ` · D ${fmt(p.nearestD, 2)}` : ""}${pinOff ? " (off chart)" : ""}`;
  const labels = useMemo(() => {
    const reqs: LabelRequest[] = [];
    reqs.push({ id: "probe", x: px, y: py, w: textWidth(probeText, "value") + 4, h: 14, priority: 100, candidates: [
      { dx: 14, dy: -10, anchor: "start" }, { dx: -14, dy: -10, anchor: "end" }, { dx: 14, dy: 20, anchor: "start" }, { dx: -14, dy: 20, anchor: "end" },
      { dx: 0, dy: -18, anchor: "middle" }, { dx: 0, dy: 28, anchor: "middle" },
    ] });
    if (sel) reqs.push({ id: "sel", x: sel.x, y: sel.y, w: textWidth(runTitle(sel.run), "body"), h: 13, priority: 90 });
    if (p.layers.landmarks) for (const g of landmarkGroups) reqs.push({ id: `lm:${g.id}`, x: g.x, y: g.y, w: textWidth(g.label, "caps"), h: 12, priority: 50 - g.x / 10000, candidates: [
      { dx: 0, dy: -11, anchor: "middle" }, { dx: 10, dy: 4, anchor: "start" }, { dx: -10, dy: 4, anchor: "end" }, { dx: 0, dy: 20, anchor: "middle" },
      { dx: 10, dy: -9, anchor: "start" }, { dx: -10, dy: -9, anchor: "end" }, { dx: 10, dy: 17, anchor: "start" }, { dx: -10, dy: 17, anchor: "end" },
    ] });
    // obstacles: the probe glyph, landmark triangles and the selected mark
    const obstacles = [{ x: px - 9, y: py - 9, w: 18, h: 18 }, ...landmarkGroups.map((g) => ({ x: g.x - 7, y: g.y - 7, w: 14, h: 13 })), ...(sel ? [{ x: sel.x - 9, y: sel.y - 9, w: 18, h: 18 }] : [])];
    // data marks are soft obstacles: labels avoid covering evidence when they can
    const soft = points.map((q) => ({ x: q.x - 3, y: q.y - 3, w: 6, h: 6 }));
    // the gap annotations sit along the top of the frame
    if (showGap && p.gap) obstacles.push({ x: x0, y: y0, w: iw, h: 30 });
    return new Map(placeLabels(reqs, { x: x0 + 2, y: y0 + 2, w: iw - 4, h: ih - 4 }, obstacles, soft).map((l) => [l.id, l]));
  }, [px, py, probeText, sel, landmarkGroups, p.layers.landmarks, x0, y0, iw, ih, points, showGap, p.gap]);

  // ---- pointer interaction (svg units = CSS px once measured; scaled before that)
  const local = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const k = W / (r.width || W);
    return { lx: (e.clientX - r.left) * k, ly: (e.clientY - r.top) * k };
  };
  const place = (lx: number, ly: number) => {
    const o2 = clamp(sx.invert(clamp(lx, [x0, x0 + iw])), domain.o2);
    const pk = clamp(sy.invert(clamp(ly, [y0, y0 + ih])), domain.p);
    p.onMove(Math.round(o2 * 10) / 10, Math.round(pk * 10) / 10);
  };
  const hit = (lx: number, ly: number, radius: number) => {
    let best: PlotPoint | null = null, bd = radius * radius;
    for (const q of points) {
      const d = (q.x - lx) ** 2 + (q.y - ly) ** 2;
      const dd = q.run.tier === "T1_PSI_RUN" ? d : d * 0.6; // rings win ties so published evidence is easy to open
      if (dd < bd) { bd = dd; best = q; }
    }
    return best;
  };
  const insidePlot = (lx: number, ly: number) => lx >= x0 - 4 && lx <= x0 + iw + 4 && ly >= y0 - 4 && ly <= y0 + ih + 4;

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const t = e.target as Element;
    if (t.closest("[data-role='landmark']")) return;
    const { lx, ly } = local(e);
    if (!insidePlot(lx, ly)) return;
    if (e.pointerType === "touch") { tap.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; return; } // tap to place
    if (e.button !== 0) return;
    if (t.closest("[data-role='probe']")) { drag.current = e.pointerId; setDragging(true); svgRef.current!.setPointerCapture(e.pointerId); return; }
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
      const h = insidePlot(lx, ly) ? hit(lx, ly, 7) : null;
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
        const h = hit(lx, ly, 12);
        if (h) p.onInspect(h.run); else place(lx, ly);
      }
    } else if (tp && tp.id === e.pointerId) tap.current = null;
  };
  const onProbeKey = (e: React.KeyboardEvent) => {
    const big = e.shiftKey;
    const dO2 = big ? SCALES.o2Pts : SCALES.o2Pts / 4;
    const fP = big ? SCALES.pressureRatio : Math.pow(SCALES.pressureRatio, 1 / 4);
    let o2 = s.o2Pct, pk = s.pressureKPa;
    if (e.key === "ArrowLeft") o2 -= dO2; else if (e.key === "ArrowRight") o2 += dO2;
    else if (e.key === "ArrowUp") pk *= fP; else if (e.key === "ArrowDown") pk /= fP;
    else return;
    e.preventDefault();
    p.onMove(Math.round(clamp(o2, O2_DOMAIN) * 10) / 10, Math.round(clamp(pk, P_DOMAIN) * 10) / 10);
  };

  // ---- graticule
  const o2Ticks = sx.ticks(compact ? 5 : iw > 560 ? 8 : 6);
  const o2Step = o2Ticks.length > 1 ? o2Ticks[1] - o2Ticks[0] : 5;
  const pTicks = P_TICKS.filter((t) => t >= domain.p[0] && t <= domain.p[1]);
  const psiaTicks = PSIA_TICKS.map((t) => ({ t, k: psiaToKPa(t) })).filter((o) => o.k >= domain.p[0] && o.k <= domain.p[1]);
  const extO2 = compact ? [] : linearRun(sx.invert(0), sx.invert(W), o2Step);
  const extP = compact ? [] : logRun(sy.invert(H), sy.invert(0));

  const tipLeft = hover ? Math.min(hover.x + 14, W - 280) : 0;
  const tipTop = hover ? Math.max(hover.y - 12, 8) : 0;
  const lm = (id: string) => labels.get(id);
  const probeL = lm("probe"), selL = lm("sel");

  return (
    <div className="fld" data-dragging={dragging || undefined}>
      <svg
        ref={svgRef}
        className="fld-svg"
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        data-testid="coverage-map"
        role="group"
        aria-label={p.summary}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id="fld-clip"><rect x={x0} y={y0} width={iw} height={ih} /></clipPath>
          <pattern id="fld-hatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" className="fld-hatch-line" />
          </pattern>
          <linearGradient id="fld-fade-x" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="1" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
          <mask id="fld-ext-mask"><rect x={0} y={0} width={W} height={H} fill="url(#fld-fade-x)" /></mask>
        </defs>

        {/* the plane continues faintly beneath the panels (unlabelled continuation of the same scales) */}
        <g className="fld-grid-ext" mask="url(#fld-ext-mask)" aria-hidden="true">
          {extO2.map((t) => <line key={`ex${t}`} x1={r2(sx(t))} x2={r2(sx(t))} y1={0} y2={H} />)}
          {extP.map((t) => <line key={`ey${t}`} x1={0} x2={W} y1={r2(sy(t))} y2={r2(sy(t))} />)}
        </g>

        <rect className="fld-plot-bg" x={x0} y={y0} width={iw} height={ih} />
        <g clipPath="url(#fld-clip)">
          <rect x={x0} y={y0} width={iw} height={ih} fill="url(#fld-hatch)" className="fld-hatch" />
          <BandsLayer field={p.field} envHalf={p.envHalf} envDouble={p.envDouble} x={x} y={y} layers={p.layers} />
          <g className="fld-grid" aria-hidden="true">
            {o2Ticks.map((t) => <line key={`gx${t}`} x1={x(t)} x2={x(t)} y1={y0} y2={y0 + ih} />)}
            {pTicks.map((t) => <line key={`gy${t}`} x1={x0} x2={x0 + iw} y1={y(t)} y2={y(t)} />)}
          </g>
          {showGap && p.gap && (
            <g className="fld-gap" aria-hidden="true">
              <line x1={x(p.gap.maxO2)} x2={x(p.gap.maxO2)} y1={y0} y2={y0 + ih} className="fld-gap-line" />
            </g>
          )}
          <PointsLayer points={points} dotR={compact ? 1.6 : 2} ringScale={compact ? 0.9 : 1} selectedId={p.selectedId} focusInv={p.focusInv} layers={p.layers} />
        </g>

        {/* frame + axes */}
        <rect className="fld-frame" x={x0} y={y0} width={iw} height={ih} />
        <g className="fld-axis">
          {o2Ticks.map((t) => (
            <g key={`tx${t}`} transform={`translate(${x(t)},${y0 + ih})`}><line y2={5} />{Math.abs(x(t) - px) > 34 && <text y={18} textAnchor="middle">{t}</text>}</g>
          ))}
          {pTicks.map((t) => (
            <g key={`ty${t}`} transform={`translate(${x0},${y(t)})`}><line x2={-5} />{Math.abs(y(t) - py) > 12 && <text x={-9} dy="0.32em" textAnchor="end">{t}</text>}</g>
          ))}
          {psiaTicks.map(({ t, k }) => (
            <g key={`tp${t}`} transform={`translate(${x0 + iw},${r2(sy(k))})`}><line x2={4} /><text x={8} dy="0.32em">{t}</text></g>
          ))}
          <text className="fld-axis-title" x={x0 + iw / 2} y={y0 + ih + (compact ? 34 : 40)} textAnchor="middle">Oxygen, % by volume</text>
          <text className="fld-axis-title" transform={`translate(${x0 - (compact ? 34 : 50)},${py > y0 + ih / 2 ? y0 + ih * 0.3 : y0 + ih * 0.7}) rotate(-90)`} textAnchor="middle">Total pressure, kPa (log)</text>
          <text className="fld-axis-title" transform={`translate(${x0 + iw + (compact ? 26 : 40)},${y0 + ih / 2}) rotate(90)`} textAnchor="middle">psia</text>
        </g>

        {/* the headline coverage gap, annotated along the top of the plane */}
        {showGap && p.gap && (() => {
          const gx = x(p.gap.maxO2);
          const pa = Math.max(domain.o2[0], p.gap.planned[0]), pb = Math.min(domain.o2[1], p.gap.planned[1]);
          const bracket = pb > pa;
          return (
            <g className="fld-gap-notes" aria-hidden="true">
              {(() => {
                const long = `highest O₂ in any PSI solid test · ${p.gap.maxO2}%`, short = `max PSI solid test · ${p.gap.maxO2}%`;
                const room = gx - 8 - x0;
                const t = !compact && textWidth(long, "body") < room ? long : short;
                return textWidth(t, "body") < room
                  ? <text x={gx - 6} y={y0 + 16} textAnchor="end" className="fld-gap-text">{t}</text>
                  : <text x={gx + 6} y={y0 + 40} textAnchor="start" className="fld-gap-text">{short}</text>;
              })()}
              {bracket && (
                <g>
                  <path d={`M${x(pa)},${y0 + 12}V${y0 + 6}H${x(pb)}V${y0 + 12}`} className="fld-gap-bracket" />
                  <text x={(x(pa) + x(pb)) / 2} y={y0 + 24} textAnchor="middle" className="fld-gap-text">{compact ? `planned ${p.gap.planned[0]}–${p.gap.planned[1]}%` : `planned habitats ${p.gap.planned[0]}–${p.gap.planned[1]}%`}</text>
                </g>
              )}
            </g>
          );
        })()}

        {/* off-chart notes */}
        {p.offChart.map((a) => domain.o2[1] >= O2_DOMAIN[1] && (
          <g key={a.id} className="fld-offchart" transform={`translate(${x0 + iw},${r2(sy(clamp(a.pressureKPa, domain.p)))})`}>
            <polygon points="2,-4 9,0 2,4" className="mk-landmark" />
            <text x={-4} dy="0.32em" textAnchor="end">{a.short.toUpperCase()} {a.o2Pct}% ▸</text>
          </g>
        ))}

        {/* landmark atmospheres: hollow triangles with tracked-caps labels (buttons that set the preset) */}
        <g className={`fld-labels${p.animating ? " is-hidden" : ""}`}>
          {p.layers.landmarks && landmarkGroups.map((g) => {
            const l = lm(`lm:${g.id}`);
            const active = g.items.some((it) => it.id === p.activePreset);
            const name = `${g.label}: preset ${g.items.map((it) => it.label).join(" and ")}, ${g.items[0].o2Pct}% O₂, ${g.items[0].pressureKPa} kPa`;
            return (
              <g key={g.id} data-role="landmark" role="button" tabIndex={0} aria-label={name} aria-pressed={active}
                className={`fld-landmark${active ? " is-active" : ""}`}
                onClick={() => p.onPreset(g.items[0].id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); p.onPreset(g.items[0].id); } }}>
                <polygon points={`${g.x},${r2(g.y - 6)} ${r2(g.x + 5.5)},${r2(g.y + 4)} ${r2(g.x - 5.5)},${r2(g.y + 4)}`} className="mk-landmark" />
                {l && !l.hidden && <><rect x={r2(l.box.x - 3)} y={r2(l.box.y - 2)} width={r2(l.box.w + 6)} height={r2(l.box.h + 4)} className="fld-label-hit" /><text x={l.x} y={l.y} textAnchor={l.anchor} className="fld-landmark-text">{g.label}</text></>}
              </g>
            );
          })}
          {sel && selL && !selL.hidden && <text x={selL.x} y={selL.y} textAnchor={selL.anchor} className="fld-sel-text">{runTitle(sel.run)}</text>}
        </g>

        {/* the scenario probe: crosshairs to both axes, axis readouts, the one amber element */}
        <g className="fld-probe-guides" aria-hidden="true">
          <line x1={px} x2={px} y1={py} y2={y0 + ih} />
          <line x1={x0} x2={px} y1={py} y2={py} />
          <g transform={`translate(${px},${y0 + ih})`} className="fld-probe-tag"><rect x={-24} y={3} width={48} height={16} rx={2} /><text y={15} textAnchor="middle">{fmt(s.o2Pct)}%</text></g>
          <g transform={`translate(${x0},${py})`} className="fld-probe-tag"><rect x={-46} y={-8} width={42} height={16} rx={2} /><text x={-25} y={4} textAnchor="middle">{fmt(s.pressureKPa)}</text></g>
        </g>
        <g data-role="probe" className="fld-probe" style={{ transform: `translate(${px}px, ${py}px)` }} tabIndex={0} role="button"
          aria-roledescription="movable scenario probe"
          aria-label={`Scenario probe at ${fmt(s.o2Pct)}% O₂, ${fmt(s.pressureKPa)} kPa. Arrow keys move it; hold Shift for one scale unit per step.`}
          onKeyDown={onProbeKey}>
          <circle r={18} className="fld-probe-hit" />
          <circle r={8} className="fld-probe-ring" />
          <circle r={3} className="mk-probe" />
        </g>
        {probeL && !probeL.hidden && <text x={probeL.x} y={probeL.y} textAnchor={probeL.anchor} className={`fld-probe-text${p.animating ? " is-hidden" : ""}`} aria-hidden="true">{probeText}</text>}

      </svg>

      <div className="fld-title" style={{ left: pc(x0, W), top: pc(free.t + (compact ? 6 : 12), H), width: pc(iw, W) }}>{p.title}</div>

      {p.empty && (
        <div className="fld-empty" data-v={py < y0 + ih / 2 ? "bottom" : "top"} data-h={px < x0 + iw / 2 ? "right" : "left"} style={{ left: pc(x0, W), top: pc(y0, H), width: pc(iw, W), height: pc(ih, H) }}>
          <div className="fld-empty-inner">{p.empty}</div>
        </div>
      )}

      {hover && (
        <div className="fld-tip" role="status" style={{ left: pc(tipLeft, W), top: pc(tipTop, H) }}>
          <span className="fld-tip-tier">{hover.run.flags.includes("limit-value") ? "Reported limit" : TIER_LABEL[hover.run.tier]}{hover.comparable ? " · comparable" : ""}</span>
          <strong>{runTitle(hover.run)}</strong>
          <span className="num">{fmt(hover.run.o2Pct)}% O₂ · {fmt(hover.run.pressureKPa)} kPa{hover.run.flowCmS != null ? ` · ${fmt(hover.run.flowCmS)} cm/s` : ""}</span>
          <span>{hover.run.material ? hover.run.material.replace(/\s+/g, " ").trim() : FUEL_LABEL[hover.run.fuelClass]}</span>
          <span className="fld-tip-tier">Click to inspect source</span>
        </div>
      )}
      <div className="fld-notes" style={{ left: pc(x0, W), top: pc(y0 + ih + (compact ? 40 : 48), H), width: pc(iw, W) }}>
        <p>
          {[...(p.notes ?? []), ...(off.outP > 0 ? [`${off.outP} placeable runs lie outside the ${P_DOMAIN[0]}–${P_DOMAIN[1]} kPa window and are not drawn.`] : [])].join(" ")}
        </p>
        {off.hiO2 > 0 && <p className="fld-notes-r">{off.hiO2} runs beyond {O2_DOMAIN[1]}% O₂ (to {fmt(off.maxO2, 0)}%) ▸</p>}
      </div>
    </div>
  );
}
