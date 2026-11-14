/**
 * Field symbols. Tier is encoded by mark type (dot / ring / dashed ring / ring with tick), fuel class by
 * shape (circle, diamond, plus, square), so nothing relies on colour. Styles: .mk-* in components/ui/ui.css.
 */
import { memo } from "react";
import type { FuelClass, Run } from "@/lib/schema";
import { r2 } from "./geo";

export type FuelShape = "circle" | "diamond" | "plus" | "square";
export function fuelShape(fc: FuelClass): FuelShape {
  if (fc.startsWith("solid")) return "circle";
  if (fc === "liquid-droplet") return "diamond";
  if (fc === "gas-burner" || fc === "gas-jet") return "plus";
  return "square";
}
export const FUEL_SHAPE_LABEL: Record<FuelShape, string> = { circle: "solid material", diamond: "liquid droplet", plus: "gas burner / jet", square: "smoke source" };

export function Dot({ x, y, shape, r, muted }: { x: number; y: number; shape: FuelShape; r: number; muted?: boolean }) {
  const cls = muted ? "mk-dot mk-dot--muted" : "mk-dot";
  const R = r2(r), x0 = r2(x - r), y0 = r2(y - r), side = r2(r * 2), arm = r2(r * 1.3);
  switch (shape) {
    case "circle": return <circle className={cls} cx={x} cy={y} r={R} />;
    case "square": return <rect className={cls} x={x0} y={y0} width={side} height={side} />;
    case "diamond": return <rect className={cls} x={x0} y={y0} width={side} height={side} transform={`rotate(45 ${x} ${y})`} />;
    case "plus": return (
      <g className={`mk-plus${muted ? " mk-dot--muted" : ""}`}>
        <line x1={r2(x - arm)} y1={y} x2={r2(x + arm)} y2={y} />
        <line x1={x} y1={r2(y - arm)} x2={x} y2={r2(y + arm)} />
      </g>
    );
  }
}

export const isLimit = (run: Run) => run.flags.includes("limit-value");

/** Reported limit: a ring with a short horizontal tick (a threshold, not a tested condition). */
export function LimitMark({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const r = r2(4 * scale), t = r2(6.5 * scale);
  return (
    <g className="mk-limit">
      <circle cx={x} cy={y} r={r} />
      <line x1={r2(x - t)} x2={r2(x + t)} y1={y} y2={y} />
    </g>
  );
}

export function TierMark({ run, x, y, scale = 1 }: { run: Run; x: number; y: number; scale?: number }) {
  if (isLimit(run)) return <LimitMark x={x} y={y} scale={scale} />;
  if (run.tier === "T4_PLANNED") return <circle className="mk-planned" cx={x} cy={y} r={r2(4.6 * scale)} />;
  if (run.tier === "T3_PUBLISHED") return <circle className="mk-ring" cx={x} cy={y} r={r2(3.8 * scale)} />;
  return null;
}

export interface PlotPoint { run: Run; x: number; y: number; comparable: boolean }
export interface MarkLayers { psi: boolean; other: boolean; published: boolean; limits: boolean; planned: boolean }

/** Memoised point layer: unchanged while the probe is dragged. */
export const PointsLayer = memo(function PointsLayer({ points, dotR, ringScale, selectedId, focusInv, layers }: {
  points: PlotPoint[]; dotR: number; ringScale: number; selectedId: string | null; focusInv: string | null; layers: MarkLayers;
}) {
  const psiMuted = layers.other ? points.filter((p) => p.run.tier === "T1_PSI_RUN" && !p.comparable) : [];
  const psiComp = layers.psi ? points.filter((p) => p.run.tier === "T1_PSI_RUN" && p.comparable) : [];
  const others = points.filter((p) => p.run.tier !== "T1_PSI_RUN" && (isLimit(p.run) ? layers.limits : p.run.tier === "T4_PLANNED" ? layers.planned : layers.published));
  const sel = selectedId ? points.find((p) => p.run.id === selectedId) : undefined;
  const hi = focusInv ? points.filter((p) => p.run.investigation === focusInv) : [];
  return (
    <g className={hi.length ? "fld-points is-dim" : "fld-points"}>
      <g className="fld-pts-muted">{psiMuted.map((p) => <Dot key={p.run.id} x={p.x} y={p.y} r={dotR * 0.8} shape={fuelShape(p.run.fuelClass)} muted />)}</g>
      <g className="fld-pts-comp">{psiComp.map((p) => <Dot key={p.run.id} x={p.x} y={p.y} r={dotR} shape={fuelShape(p.run.fuelClass)} />)}</g>
      <g className="fld-pts-tier">{others.map((p) => <TierMark key={p.run.id} run={p.run} x={p.x} y={p.y} scale={ringScale} />)}</g>
      {hi.length > 0 && <g className="fld-highlight">{hi.map((p) => <circle key={p.run.id} cx={p.x} cy={p.y} r={r2(Math.max(dotR * 2.4, 4.2) * ringScale)} />)}</g>}
      {sel && <g className="fld-selected"><circle cx={sel.x} cy={sel.y} r={r2(9 * ringScale)} /><circle cx={sel.x} cy={sel.y} r={r2(2.2)} className="fld-selected-core" /></g>}
    </g>
  );
});

/** Small inline swatches for the key. */
export function KeySwatch({ kind }: { kind: "direct" | "near" | "uncharted" | "envelope" | "dot" | "ring" | "planned" | "landmark" | "probe" | "muted" | "limit" | "gap" }) {
  const box = (children: React.ReactNode) => <svg className="fld-swatch" viewBox="0 0 22 14" width={22} height={14} aria-hidden="true">{children}</svg>;
  switch (kind) {
    case "direct": return box(<rect x={1} y={1} width={20} height={12} className="mk-ev-direct" />);
    case "near": return box(<rect x={1} y={1} width={20} height={12} className="mk-ev-near" />);
    case "uncharted": return box(<g><rect x={1} y={1} width={20} height={12} className="fld-swatch-empty" /><path d="M3 13 13 1M9 13 19 1M15 13 21 6" className="mk-hatch" /></g>);
    case "envelope": return box(<line x1={1} y1={7} x2={21} y2={7} className="mk-envelope" />);
    case "dot": return box(<circle cx={11} cy={7} r={2.2} className="mk-dot" />);
    case "muted": return box(<circle cx={11} cy={7} r={1.8} className="mk-dot mk-dot--muted" />);
    case "ring": return box(<circle cx={11} cy={7} r={3.8} className="mk-ring" />);
    case "planned": return box(<circle cx={11} cy={7} r={4.6} className="mk-planned" />);
    case "landmark": return box(<polygon points="11,2 16,12 6,12" className="mk-landmark" />);
    case "limit": return box(<LimitMark x={11} y={7} scale={0.9} />);
    case "probe": return box(<g><circle cx={11} cy={7} r={5} className="fld-probe-ring" /><circle cx={11} cy={7} r={2.2} className="mk-probe" /></g>);
    case "gap": return box(<line x1={11} y1={1} x2={11} y2={13} className="fld-gap-line" />);
  }
}
