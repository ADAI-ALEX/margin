/**
 * ATLAS cartography helpers: chart domain, the scale-parameterised distance
 * field used for the uncertainty envelope, and d3-contour → SVG projection.
 */
import { contours } from "d3-contour";
import type { ContourMultiPolygon as MultiPolygon } from "d3-contour";
import { SCALES, distanceField, type Scales, type Evaluation, type Field } from "@/lib/engine";
import { DEFAULT_SCENARIO as DEFAULT_SCENARIO_FOR_FIELD } from "@/lib/state/scenarioQuery";

/** Chart domain (a display window, not a scientific value): O₂ linear, pressure log. */
export const O2_DOMAIN: [number, number] = [10, 45];
export const P_DOMAIN: [number, number] = [20, 520];
export const MAIN_GRID = { nx: 120, ny: 90 } as const;
export const SHEET_GRID = { nx: 60, ny: 45 } as const;

/** The engine field under alternative axis scales — used only to draw the D = 2.5 boundary at ½× / 2× scales. */
export function scaledField(ev: Evaluation, scales: Scales, o2Range: [number, number], pRange: [number, number], nx: number, ny: number): Field {
  return distanceField(ev, DEFAULT_SCENARIO_FOR_FIELD, o2Range, pRange, nx, ny, scales);
}

/** O₂ and pressure scales multiplied by `k` the way robustness() does it (pressure ratio as a power). */
export function scalesTimes(k: number): Scales {
  return { o2Pts: SCALES.o2Pts * k, pressureRatio: Math.pow(SCALES.pressureRatio, k), flowCmS: SCALES.flowCmS };
}

/** Regions where D ≤ t, as grid-space multipolygons (d3-contour fills value ≥ threshold, so we negate D). */
export function bandsAtMost(field: Field, thresholds: number[]): { t: number; geom: MultiPolygon }[] {
  const FAR = 1e6; // stand-in for "no comparable evidence" (Infinity) so the grid stays finite
  const neg = Array.from(field.D, (v) => (Number.isFinite(v) ? -v : -FAR));
  const gen = contours().size([field.nx, field.ny]).thresholds(thresholds.map((t) => -t));
  return gen(neg).map((c) => ({ t: -c.value, geom: c }));
}

/** Fraction of grid nodes with D ≤ t (a computed description of the map). */
export function fractionWithin(field: Field, t: number) {
  let n = 0;
  for (const v of field.D) if (v <= t) n++;
  return n / field.D.length;
}

/**
 * Grid-space → SVG. d3-contour places sample i at x = i + 0.5, and the field is
 * uniform in O₂ (linear) and in ln P, so the mapping onto a linear-O₂ / log-P
 * chart is affine on each axis.
 */
export function gridToSvg(field: Field, x: (o2: number) => number, y: (p: number) => number) {
  const o2a = field.o2[0], o2b = field.o2[field.nx - 1];
  const lpa = Math.log(field.p[0]), lpb = Math.log(field.p[field.ny - 1]);
  return (gx: number, gy: number): [number, number] => {
    const o2 = o2a + ((gx - 0.5) / (field.nx - 1)) * (o2b - o2a);
    const p = Math.exp(lpa + ((gy - 0.5) / (field.ny - 1)) * (lpb - lpa));
    return [r2(x(o2)), r2(y(p))];
  };
}

/** Round to 2 decimals so server and client SVG output match exactly (avoids hydration drift from log/exp). */
export const r2 = (v: number) => Math.round(v * 100) / 100;

export function multiPolygonPath(geom: MultiPolygon, proj: (gx: number, gy: number) => [number, number]) {
  let d = "";
  for (const poly of geom.coordinates) {
    for (const ring of poly) {
      ring.forEach(([gx, gy], k) => {
        const [sx, sy] = proj(gx, gy);
        d += `${k ? "L" : "M"}${r2(sx)},${r2(sy)}`;
      });
      d += "Z";
    }
  }
  return d;
}
