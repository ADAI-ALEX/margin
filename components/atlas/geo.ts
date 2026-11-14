/**
 * Field cartography helpers: chart window, view-domain zoom (always inside the window; pressure in log
 * space), the scale-parameterised distance field used for the ½× / 2× envelopes, and d3-contour → SVG.
 */
import { contours } from "d3-contour";
import type { ContourMultiPolygon as MultiPolygon } from "d3-contour";
import { SCALES, distanceField, type Scales, type Evaluation, type Field } from "@/lib/engine";
import { DEFAULT_SCENARIO as DEFAULT_SCENARIO_FOR_FIELD } from "@/lib/state/scenarioQuery";

/** Chart window (a display window, not a scientific value): O₂ linear, pressure log. */
export const O2_DOMAIN: [number, number] = [10, 45];
export const P_DOMAIN: [number, number] = [20, 520];
export const MAIN_GRID = { nx: 120, ny: 90 } as const;
export const SHEET_GRID = { nx: 60, ny: 45 } as const;

export interface ViewDomain { o2: [number, number]; p: [number, number] }
export const FULL_DOMAIN: ViewDomain = { o2: O2_DOMAIN, p: P_DOMAIN };
export const ZOOM_STEP = 1.6;
export const MAX_ZOOM = 6;

export const zoomOf = (d: ViewDomain) => (O2_DOMAIN[1] - O2_DOMAIN[0]) / (d.o2[1] - d.o2[0]);
export const isFull = (d: ViewDomain) => Math.abs(zoomOf(d) - 1) < 1e-6;

/** A domain of zoom `z` centred as close to (o2, p) as the window allows. */
export function domainAt(z: number, o2: number, p: number): ViewDomain {
  const zz = Math.min(MAX_ZOOM, Math.max(1, z));
  const w = (O2_DOMAIN[1] - O2_DOMAIN[0]) / zz;
  const L0 = Math.log(P_DOMAIN[0]), L1 = Math.log(P_DOMAIN[1]);
  const lw = (L1 - L0) / zz;
  const c = Math.min(O2_DOMAIN[1] - w / 2, Math.max(O2_DOMAIN[0] + w / 2, o2));
  const lc = Math.min(L1 - lw / 2, Math.max(L0 + lw / 2, Math.log(p)));
  return { o2: [c - w / 2, c + w / 2], p: [Math.exp(lc - lw / 2), Math.exp(lc + lw / 2)] };
}
export function domainCenter(d: ViewDomain) { return { o2: (d.o2[0] + d.o2[1]) / 2, p: Math.sqrt(d.p[0] * d.p[1]) }; }
export function lerpDomain(a: ViewDomain, b: ViewDomain, t: number): ViewDomain {
  const l = (x: number, y: number) => x + (y - x) * t;
  const ll = (x: number, y: number) => Math.exp(l(Math.log(x), Math.log(y)));
  return { o2: [l(a.o2[0], b.o2[0]), l(a.o2[1], b.o2[1])], p: [ll(a.p[0], b.p[0]), ll(a.p[1], b.p[1])] };
}

/** The engine field under alternative axis scales: used only to draw the D = 2.5 boundary at ½× / 2× scales. */
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
export const hasEvidence = (field: Field) => field.D.some((v) => Number.isFinite(v));

/**
 * Grid-space → SVG. d3-contour places sample i at x = i + 0.5, and the field is uniform in O₂ (linear)
 * and in ln P, so the mapping onto a linear-O₂ / log-P chart is affine on each axis.
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
