/**
 * Gravity regimes as separate categories: per-regime evidence counts and coarse occupancy bins for the
 * regime detents and the overview plates. Counts come straight from the data; nothing is interpolated
 * between regimes and no regime borrows another's evidence.
 */
import type { Gravity, Run } from "@/lib/schema";
import { ALL_RUNS } from "@/lib/data";
import { GRAVITY_LABEL } from "@/lib/format";

export const REGIMES: Gravity[] = ["micro", "moon", "mars", "earth"];
export const REGIME_SHORT: Record<Gravity, string> = { micro: "Micro", moon: "Lunar", mars: "Martian", earth: "Earth" };
export const REGIME_G: Record<Gravity, string> = { micro: "µg", moon: "0.165 g", mars: "0.38 g", earth: "1 g" };
export { GRAVITY_LABEL };

const isLimit = (r: Run) => r.flags.includes("limit-value");
const distinct = (r: Run) => !r.flags.includes("duplicate-row");

export interface RegimeCounts { psi: number; published: number; limits: number; planned: number }

/** Run counts per regime (distinct PSI rows; published values split into tested points and reported limits). */
export function regimeCounts(g: Gravity): RegimeCounts {
  const rs = ALL_RUNS.filter((r) => r.gravity === g && distinct(r));
  return {
    psi: rs.filter((r) => r.tier === "T1_PSI_RUN").length,
    published: rs.filter((r) => r.tier === "T3_PUBLISHED" && !isLimit(r)).length,
    limits: rs.filter((r) => r.tier === "T3_PUBLISHED" && isLimit(r)).length,
    planned: rs.filter((r) => r.tier === "T4_PLANNED").length,
  };
}
export const REGIME_COUNTS: Record<Gravity, RegimeCounts> = Object.fromEntries(REGIMES.map((g) => [g, regimeCounts(g)])) as Record<Gravity, RegimeCounts>;

/**
 * Occupancy of a regime's O₂ × log-pressure window on a coarse grid (for thumbnails only): the number of
 * placeable runs per cell. Tiers follow the scenario (published only when included; planned never counted).
 */
export function occupancy(g: Gravity, includePublished: boolean, o2: [number, number], p: [number, number], nx = 10, ny = 6): number[] {
  const cells = new Array(nx * ny).fill(0);
  const lp0 = Math.log(p[0]), lp1 = Math.log(p[1]);
  for (const r of ALL_RUNS) {
    if (r.gravity !== g || !distinct(r) || r.o2Pct == null || r.pressureKPa == null || !(r.pressureKPa > 0)) continue;
    if (r.tier === "T4_PLANNED" || (r.tier === "T3_PUBLISHED" && !includePublished)) continue;
    const fx = (r.o2Pct - o2[0]) / (o2[1] - o2[0]);
    const fy = (Math.log(r.pressureKPa) - lp0) / (lp1 - lp0);
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) continue;
    const i = Math.min(nx - 1, Math.floor(fx * nx)), j = Math.min(ny - 1, Math.floor(fy * ny));
    cells[(ny - 1 - j) * nx + i]++;
  }
  return cells;
}
