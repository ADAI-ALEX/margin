import { kPaToPsia } from "@/lib/engine";

export type PUnit = "kPa" | "psia";
export const unitLabel = (u: PUnit) => u;
/** Pressure in the selected display unit; null → "not recorded". */
export const fmtP = (kpa: number | null | undefined, u: PUnit, d?: number) => {
  if (kpa == null || !Number.isFinite(kpa)) return "not recorded";
  return u === "kPa" ? kpa.toFixed(d ?? 1) : kPaToPsia(kpa).toFixed(d ?? 2);
};

/** Round a computed coordinate/percentage to 2 decimals so SSR and client markup match exactly. */
export const r2 = (n: number) => Math.round(n * 100) / 100;
