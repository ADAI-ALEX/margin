/**
 * Independent first-principles arithmetic for the science tests. Deliberately does NOT import
 * lib/engine: every constant is re-typed here from Kickoff Pack §C.5 so a drift in the engine
 * constants or formula shows up as a test failure.
 */
export const K = { o2Pts: 2.0, lnR: Math.log(1.25), flow: 5.0, direct: 1.0, near: 2.5 } as const;
export const PSIA = 6.894757;
export const MMHG = 0.133322;
export const ATM = 101.325;

/** Gap terms (in scale units). Pass null for an axis that is not compared. */
export function D(dO2Pts: number | null, pRatio: number | null, dFlow: number | null): number {
  const a = dO2Pts == null ? 0 : (dO2Pts / K.o2Pts) ** 2;
  const b = pRatio == null ? 0 : (Math.log(pRatio) / K.lnR) ** 2;
  const c = dFlow == null ? 0 : (dFlow / K.flow) ** 2;
  return Math.sqrt(a + b + c);
}
export function verdictOf(d: number | null): "DIRECT" | "NEAR" | "DISTANT" | "NONE" {
  if (d == null) return "NONE";
  return d <= K.direct + 1e-9 ? "DIRECT" : d <= K.near + 1e-9 ? "NEAR" : "DISTANT";
}
/** Parse a PSI cell the way a human would read it: "~ 21.5" -> 21.5, "21.5 - 21.7" -> 21.5 (first value), "20 cm/s" -> 20. */
export function cell(s: string | undefined): number | null {
  if (s == null) return null;
  const m = s.trim().match(/^~?\s*(-?\d*\.?\d+)/);
  return m ? parseFloat(m[1]) : null;
}
/** Preset pressures exactly as the Kickoff §C.6 table defines them (psia × 6.894757, shown to 0.1 kPa). */
export const kPaFromPsia1 = (psia: number) => +(psia * PSIA).toFixed(1);
