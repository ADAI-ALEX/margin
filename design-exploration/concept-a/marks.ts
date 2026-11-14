/**
 * Concept A visual encodings. Colour = fuel family, shape = fuel family (redundant),
 * fill/ring/dashed ring = evidence tier. Pure presentation, no science here.
 */
import type { FuelClass, Run, Tier } from "@/lib/schema";
import type { Verdict } from "@/lib/engine";

export type Family = "solid" | "liquid" | "gas" | "smoke";
export const FAMILY_OF: Record<FuelClass, Family> = {
  "solid-thin": "solid", "solid-thick": "solid", "solid-unknown": "solid",
  "liquid-droplet": "liquid", "gas-burner": "gas", "gas-jet": "gas", "smoke-source": "smoke", none: "smoke",
};
export const FAMILY_COLOR: Record<Family, string> = { solid: "#FF7A45", liquid: "#5CC8FF", gas: "#6FDDB0", smoke: "#A7B0BA" };
export const FAMILY_LABEL: Record<Family, string> = { solid: "Solid", liquid: "Liquid droplet", gas: "Gas flame", smoke: "Smoke source" };
export const FAMILY_SHAPE: Record<Family, Shape> = { solid: "circle", liquid: "square", gas: "triangle", smoke: "diamond" };
export const FAMILIES: Family[] = ["solid", "liquid", "gas", "smoke"];

export type Shape = "circle" | "square" | "triangle" | "diamond";

/** Path for one marker of radius r centred on (x, y). */
export function shapePath(shape: Shape, x: number, y: number, r: number): string {
  const f = (n: number) => n.toFixed(1);
  switch (shape) {
    case "circle":
      return `M${f(x - r)} ${f(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
    case "square": {
      const s = r * 0.9;
      return `M${f(x - s)} ${f(y - s)}h${f(2 * s)}v${f(2 * s)}h${f(-2 * s)}Z`;
    }
    case "triangle":
      return `M${f(x)} ${f(y - r * 1.2)}L${f(x + r * 1.1)} ${f(y + r * 0.75)}L${f(x - r * 1.1)} ${f(y + r * 0.75)}Z`;
    case "diamond":
      return `M${f(x)} ${f(y - r * 1.25)}L${f(x + r * 1.25)} ${f(y)}L${f(x)} ${f(y + r * 1.25)}L${f(x - r * 1.25)} ${f(y)}Z`;
  }
}

export const TIER_SHORT: Record<Tier, string> = { T1_PSI_RUN: "T1 PSI", T3_PUBLISHED: "T3 PUB", T4_PLANNED: "T4 PLAN" };
export const markerRadius = (tier: Tier) => (tier === "T1_PSI_RUN" ? 2.3 : tier === "T3_PUBLISHED" ? 5 : 5.5);

export const familyOf = (r: Run) => FAMILY_OF[r.fuelClass];

/** Verdict encoding: neutral single-hue (graphite → ink) luminance steps + letter redundancy.
 *  Deliberately not a red/amber/green scale: this is evidence proximity, not a hazard rating. */
export const VERDICT_FILL: Record<Verdict, string> = { DIRECT: "#C9D3DC", NEAR: "#7D8C99", DISTANT: "#36414C", NONE: "transparent" };
export const VERDICT_INK: Record<Verdict, string> = { DIRECT: "#0B0D10", NEAR: "#0B0D10", DISTANT: "#C9D3DC", NONE: "#8B97A4" };
export const VERDICT_LETTER: Record<Verdict, string> = { DIRECT: "D", NEAR: "N", DISTANT: "Di", NONE: "–" };

export const RANK_COMPONENTS = ["P", "H", "S", "C", "M"] as const;
export type RankKey = (typeof RANK_COMPONENTS)[number];
export const RANK_LABEL: Record<RankKey, string> = { P: "Proximity", H: "Hazard match", S: "Scale", C: "Coverage", M: "Measures" };
export const RANK_COLOR: Record<RankKey, string> = { P: "#5CC8FF", H: "#3D93BF", S: "#8B97A4", C: "#5B6875", M: "#C9D1D9" };
