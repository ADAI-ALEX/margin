/**
 * A small evidence-field frame shared by the Investigations footprint and the dossier hero: the Atlas
 * chart window (O₂ linear 10–45 %, pressure log 20–520 kPa), hairline grid, tick labels and axis titles.
 * Server-safe (no hooks). Marks come from components/atlas/marks.tsx and the .mk-* classes in ui.css.
 */
import type { ReactNode } from "react";
import { O2_DOMAIN, P_DOMAIN, r2 } from "@/components/atlas/geo";
import css from "./field.module.css";

export interface FieldGeom {
  W: number; H: number;
  M: { l: number; r: number; t: number; b: number };
  x: (o2: number) => number;
  y: (p: number) => number;
  inWindow: (o2: number, p: number) => boolean;
}

const O2_TICKS = [10, 15, 20, 25, 30, 35, 40, 45];
const P_TICKS = [20, 30, 50, 70, 100, 150, 200, 300, 500];

export function fieldGeom(W: number, H: number, M = { l: 40, r: 10, t: 10, b: 30 }): FieldGeom {
  const L0 = Math.log(P_DOMAIN[0]), L1 = Math.log(P_DOMAIN[1]);
  const x = (o2: number) => r2(M.l + ((o2 - O2_DOMAIN[0]) / (O2_DOMAIN[1] - O2_DOMAIN[0])) * (W - M.l - M.r));
  const y = (p: number) => r2(H - M.b - ((Math.log(p) - L0) / (L1 - L0)) * (H - M.t - M.b));
  const inWindow = (o2: number, p: number) => o2 >= O2_DOMAIN[0] && o2 <= O2_DOMAIN[1] && p >= P_DOMAIN[0] && p <= P_DOMAIN[1];
  return { W, H, M, x, y, inWindow };
}

/** Grid, ticks and axis titles. `dense` thins the pressure ticks for small plots. */
export function FieldAxes({ g, dense = false }: { g: FieldGeom; dense?: boolean }) {
  const { W, H, M, x, y } = g;
  const pt = dense ? P_TICKS.filter((v) => [20, 50, 100, 200, 500].includes(v)) : P_TICKS;
  const ot = dense ? O2_TICKS.filter((v) => v % 10 === 0 || v === 45) : O2_TICKS;
  return (
    <g className={css.axes}>
      <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} className={css.plot} />
      {ot.map((v) => (
        <g key={`x${v}`}>
          <line x1={x(v)} x2={x(v)} y1={M.t} y2={H - M.b} className={css.grid} />
          <text x={x(v)} y={H - M.b + 13} textAnchor="middle" className={css.tick}>{v}</text>
        </g>
      ))}
      {pt.map((v) => (
        <g key={`y${v}`}>
          <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className={css.grid} />
          <text x={M.l - 6} y={r2(y(v) + 3.5)} textAnchor="end" className={css.tick}>{v}</text>
        </g>
      ))}
      <text x={r2((M.l + W - M.r) / 2)} y={H - 4} textAnchor="middle" className={css.title}>O₂, % by volume</text>
      <text x={10} y={r2((M.t + H - M.b) / 2)} transform={`rotate(-90 10 ${r2((M.t + H - M.b) / 2)})`} textAnchor="middle" className={css.title}>Pressure, kPa (log)</text>
    </g>
  );
}

/** The scenario probe: amber ring + dot with dashed crosshairs to the axes (the one amber element). */
export function Probe({ g, o2, p }: { g: FieldGeom; o2: number; p: number }) {
  const cx = g.x(Math.min(O2_DOMAIN[1], Math.max(O2_DOMAIN[0], o2)));
  const cy = g.y(Math.min(P_DOMAIN[1], Math.max(P_DOMAIN[0], p)));
  const off = !g.inWindow(o2, p);
  return (
    <g className={css.probe}>
      <line x1={g.M.l} x2={cx} y1={cy} y2={cy} className={css.cross} />
      <line x1={cx} x2={cx} y1={cy} y2={g.H - g.M.b} className={css.cross} />
      <circle cx={cx} cy={cy} r={6.5} className={css.ring} />
      <circle cx={cx} cy={cy} r={2.6} className="mk-probe" />
      {off && <text x={cx} y={cy - 10} textAnchor="middle" className={css.probeTag}>scenario off chart</text>}
    </g>
  );
}

/**
 * Reference cabin atmospheres: hollow triangles with tracked-caps labels. Atmospheres at the same condition
 * share one label; each label takes the first candidate position that collides with no other label or mark.
 */
export function Landmarks({ g, items }: { g: FieldGeom; items: { label: string; o2: number; p: number }[] }) {
  const merged = new Map<string, { label: string; o2: number; p: number }>();
  for (const a of items) {
    if (!g.inWindow(a.o2, a.p)) continue;
    const k = `${a.o2}|${a.p}`;
    const m = merged.get(k);
    if (m) m.label = `${m.label} / ${a.label}`; else merged.set(k, { ...a });
  }
  const pts = [...merged.values()].sort((a, b) => a.o2 - b.o2).map((a) => ({ ...a, cx: g.x(a.o2), cy: g.y(a.p) }));
  type Box = { x0: number; y0: number; x1: number; y1: number };
  const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const boxes: Box[] = pts.map((p) => ({ x0: p.cx - 6, y0: p.cy - 6, x1: p.cx + 6, y1: p.cy + 6 }));
  const placed = pts.map((p) => {
    const w = p.label.length * 7 + 4, h = 11;
    const cands: { x: number; y: number; anchor: "start" | "end" | "middle" }[] = [
      { x: p.cx + 8, y: p.cy - 6, anchor: "start" }, { x: p.cx + 8, y: p.cy + 13, anchor: "start" },
      { x: p.cx - 8, y: p.cy - 6, anchor: "end" }, { x: p.cx - 8, y: p.cy + 13, anchor: "end" },
      { x: p.cx, y: p.cy - 10, anchor: "middle" }, { x: p.cx, y: p.cy + 18, anchor: "middle" },
    ];
    const boxOf = (c: (typeof cands)[number]): Box => {
      const x0 = c.anchor === "start" ? c.x : c.anchor === "end" ? c.x - w : c.x - w / 2;
      return { x0, y0: c.y - h + 2, x1: x0 + w, y1: c.y + 2 };
    };
    const inside = (b: Box) => b.x0 >= g.M.l && b.x1 <= g.W - g.M.r && b.y0 >= g.M.t && b.y1 <= g.H - g.M.b;
    const pick = cands.find((c) => { const b = boxOf(c); return inside(b) && !boxes.some((o) => hit(o, b)); }) ?? cands.find((c) => inside(boxOf(c))) ?? cands[0];
    boxes.push(boxOf(pick));
    return { ...p, t: pick };
  });
  return (
    <g className={css.landmarks}>
      {placed.map((a) => {
        const r = 4.6;
        return (
          <g key={a.label}>
            <polygon points={`${a.cx},${r2(a.cy - r)} ${r2(a.cx + r * 0.9)},${r2(a.cy + r * 0.6)} ${r2(a.cx - r * 0.9)},${r2(a.cy + r * 0.6)}`} className="mk-landmark" />
            <text x={r2(a.t.x)} y={r2(a.t.y)} textAnchor={a.t.anchor} className={css.lmLabel}>{a.label}</text>
          </g>
        );
      })}
    </g>
  );
}

export function FieldSvg({ g, label, children, className }: { g: FieldGeom; label: string; children: ReactNode; className?: string }) {
  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} role="img" aria-label={label} className={`${css.svg} ${className ?? ""}`}>
      {children}
    </svg>
  );
}
