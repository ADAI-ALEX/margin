import type { Run, Gravity, FuelClass } from "@/lib/schema";
import { kPaToPsia } from "@/lib/engine";
export const fmt = (n: number | null | undefined, d = 1) => (n == null || !Number.isFinite(n) ? "—" : n.toFixed(d));
export const fmtSigned = (n: number | null | undefined, d = 1) => (n == null || !Number.isFinite(n) ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(d)}`);
export const psia = (kpa: number | null) => (kpa == null ? "—" : kPaToPsia(kpa).toFixed(1));
export const GRAVITY_LABEL: Record<Gravity, string> = { micro: "Microgravity", moon: "Lunar (0.165 g)", mars: "Martian (0.38 g)", earth: "Earth (1 g)" };
export const GRAVITY_SHORT: Record<Gravity, string> = { micro: "µg", moon: "Moon", mars: "Mars", earth: "1 g" };
export const FUEL_LABEL: Record<FuelClass, string> = { "solid-thin": "Solid · thin", "solid-thick": "Solid · thick", "solid-unknown": "Solid · unclassified", "liquid-droplet": "Liquid droplet", "gas-burner": "Gas burner", "gas-jet": "Gas jet", "smoke-source": "Smoke source", none: "No fuel" };
export const TIER_LABEL = { T1_PSI_RUN: "PSI run", T3_PUBLISHED: "Published (not in PSI)", T4_PLANNED: "Planned — not evidence" } as const;
export const basisLabel = (b: Run["o2Basis"]) => ({ measured: "measured", "nominal-stated": "nominal (stated), not measured", "limit-reported": "reported limit", unknown: "not recorded" })[b];
export const VERDICT_COPY = {
  DIRECT: "Comparable tests close on every compared axis",
  NEAR: "Comparable tests nearby",
  DISTANT: "Nearest comparable tests are far away",
  NONE: "No comparable tests in this gravity regime",
} as const;
export const DISCLAIMER = "Evidence proximity, not a safety rating.";
