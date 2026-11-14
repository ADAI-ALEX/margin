/**
 * ATLAS map symbols. Tier is encoded by mark type (filled / ring / dashed ring),
 * fuel class by shape (redundant with label in the key), so nothing relies on colour.
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
export const FUEL_SHAPE_LABEL: Record<FuelShape, string> = {
  circle: "solid material",
  diamond: "liquid droplet",
  plus: "gas burner / jet",
  square: "smoke source",
};

/** A single PSI-run dot (filled). `muted` = placeable but not comparable for this question. */
export function Dot({ x, y, shape, r, muted }: { x: number; y: number; shape: FuelShape; r: number; muted?: boolean }) {
  const cls = muted ? "atlas-dot atlas-dot--muted" : "atlas-dot";
  const R = r2(r), x0 = r2(x - r), y0 = r2(y - r), side = r2(r * 2), arm = r2(r * 1.3);
  switch (shape) {
    case "circle": return <circle className={cls} cx={x} cy={y} r={R} />;
    case "square": return <rect className={cls} x={x0} y={y0} width={side} height={side} />;
    case "diamond": return <rect className={cls} x={x0} y={y0} width={side} height={side} transform={`rotate(45 ${x} ${y})`} />;
    case "plus": return (
      <g className={cls + " atlas-dot--plus"}>
        <line x1={r2(x - arm)} y1={y} x2={r2(x + arm)} y2={y} />
        <line x1={x} y1={r2(y - arm)} x2={x} y2={r2(y + arm)} />
      </g>
    );
  }
}

export const isLimit = (run: Run) => run.flags.includes("limit-value");

/** Reported limit: a ring with a short horizontal tick — a threshold, not a tested condition. */
export function LimitMark({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const r = r2(4 * scale), t = r2(6.5 * scale);
  return (
    <g className="atlas-limit">
      <circle cx={x} cy={y} r={r} />
      <line x1={r2(x - t)} x2={r2(x + t)} y1={y} y2={y} />
    </g>
  );
}

export function TierMark({ run, x, y, scale = 1, selected }: { run: Run; x: number; y: number; scale?: number; selected?: boolean }) {
  if (isLimit(run)) return <LimitMark x={x} y={y} scale={scale} />;
  if (run.tier === "T4_PLANNED") return <circle className="atlas-planned" cx={x} cy={y} r={r2(4.6 * scale)} data-sel={selected || undefined} />;
  if (run.tier === "T3_PUBLISHED") return <circle className="atlas-ring" cx={x} cy={y} r={r2(3.6 * scale)} data-sel={selected || undefined} />;
  return null;
}

export interface PlotPoint { run: Run; x: number; y: number; comparable: boolean }

/** Memoised point layer: unchanged while the pin is dragged. */
export const PointsLayer = memo(function PointsLayer({ points, dotR, ringScale, selectedId, highlightInv }: { points: PlotPoint[]; dotR: number; ringScale: number; selectedId: string | null; highlightInv?: string | null }) {
  const psiMuted = points.filter((p) => p.run.tier === "T1_PSI_RUN" && !p.comparable);
  const psiComp = points.filter((p) => p.run.tier === "T1_PSI_RUN" && p.comparable);
  const others = points.filter((p) => p.run.tier !== "T1_PSI_RUN");
  const sel = selectedId ? points.find((p) => p.run.id === selectedId) : undefined;
  const hi = highlightInv ? points.filter((p) => p.run.investigation === highlightInv) : [];
  return (
    <g className={hi.length ? "atlas-points atlas-points--dim" : "atlas-points"}>
      <g>{psiMuted.map((p) => <Dot key={p.run.id} x={p.x} y={p.y} r={dotR * 0.85} shape={fuelShape(p.run.fuelClass)} muted />)}</g>
      <g>{psiComp.map((p) => <Dot key={p.run.id} x={p.x} y={p.y} r={dotR} shape={fuelShape(p.run.fuelClass)} />)}</g>
      <g>{others.map((p) => <TierMark key={p.run.id} run={p.run} x={p.x} y={p.y} scale={ringScale} />)}</g>
      {hi.length > 0 && <g className="atlas-highlight">{hi.map((p) => <circle key={p.run.id} cx={p.x} cy={p.y} r={r2(Math.max(dotR * 2.2, 4) * ringScale)} />)}</g>}
      {sel && <circle className="atlas-selected" cx={sel.x} cy={sel.y} r={r2(7 * ringScale)} />}
    </g>
  );
});

/** Small inline swatches for the key. */
export function KeySwatch({ kind }: { kind: "direct" | "near" | "uncharted" | "envelope" | "dot" | "ring" | "planned" | "landmark" | "pin" | "muted" | "limit" }) {
  const box = (children: React.ReactNode) => <svg className="atlas-swatch" viewBox="0 0 22 14" width={22} height={14} aria-hidden="true">{children}</svg>;
  switch (kind) {
    case "direct": return box(<rect x={1} y={1} width={20} height={12} className="atlas-band-direct" />);
    case "near": return box(<rect x={1} y={1} width={20} height={12} className="atlas-band-near" />);
    case "uncharted": return box(<rect x={1} y={1} width={20} height={12} fill="url(#atlas-hatch)" className="atlas-swatch-hatch" />);
    case "envelope": return box(<line x1={1} y1={7} x2={21} y2={7} className="atlas-envelope" />);
    case "dot": return box(<circle cx={11} cy={7} r={2.2} className="atlas-dot" />);
    case "muted": return box(<circle cx={11} cy={7} r={2} className="atlas-dot atlas-dot--muted" />);
    case "ring": return box(<circle cx={11} cy={7} r={3.8} className="atlas-ring" />);
    case "planned": return box(<circle cx={11} cy={7} r={4.6} className="atlas-planned" />);
    case "landmark": return box(<polygon points="11,2 16,12 6,12" className="atlas-landmark" />);
    case "limit": return box(<LimitMark x={11} y={7} scale={0.9} />);
    case "pin": return box(<circle cx={11} cy={7} r={4} className="atlas-pin-head" />);
  }
}
