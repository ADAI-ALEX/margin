import type { Run, Scenario, FuelClass, Hazard } from "@/lib/schema";

/** Fuel classes that count as evidence for each hazard question (Kickoff §C.5a). */
export const COMPARABLE_FUEL: Record<Hazard, FuelClass[]> = {
  materials: ["solid-thin", "solid-thick", "solid-unknown"],
  // Smoke: smoke-source runs; solids only when they carry smoke/alarm measurements (Saffire T3) — see gate().
  smoke: ["smoke-source", "solid-thin", "solid-thick", "solid-unknown"],
  suppression: ["liquid-droplet", "solid-thin", "solid-thick", "solid-unknown"],
  liquid: ["liquid-droplet"],
};
export const CONTEXT_FUEL: Record<Hazard, FuelClass[]> = {
  materials: [],   // Kickoff names BRE (summary rows only, no runs) as context; gas-burner runs are not context for materials
  smoke: ["none"],
  suppression: [],
  liquid: ["gas-burner"],
};

export type GateResult =
  | { status: "comparable" }
  | { status: "context"; reason: string }
  | { status: "other-gravity"; reason: string }
  | { status: "limit"; reason: string }
  | { status: "excluded"; reason: string };

export function gate(run: Run, s: Scenario): GateResult {
  if (run.tier === "T4_PLANNED") return { status: "excluded", reason: "Planned experiment — never counted as evidence" };
  if (run.tier === "T3_PUBLISHED" && !s.includePublished) return { status: "excluded", reason: "Published evidence hidden" };
  let fuelOk = COMPARABLE_FUEL[s.hazard].includes(run.fuelClass);
  if (s.hazard === "smoke" && run.fuelClass.startsWith("solid") && !run.measures?.alarm) fuelOk = false;
  if (!fuelOk) {
    return CONTEXT_FUEL[s.hazard].includes(run.fuelClass)
      ? { status: "context", reason: `${run.fuelClass} is context only for this question` }
      : s.hazard === "smoke" && run.fuelClass.startsWith("solid")
      ? { status: "excluded", reason: "Solid burn without smoke or alarm measurements" }
      : { status: "excluded", reason: `${run.fuelClass} is not relevant to this question` };
  }
  if (s.materialClass === "thin" && run.fuelClass === "solid-thick") return { status: "excluded", reason: "Thick solid; thin material selected" };
  if (s.materialClass === "thick" && run.fuelClass === "solid-thin") return { status: "excluded", reason: "Thin solid; thick material selected" };
  // [DECIDE, lead] O2 is the anchoring axis: a run with no recorded O2 cannot be placed in
  // condition space (otherwise a pressure-only partial match could look deceptively close).
  if (run.o2Pct == null) return { status: "excluded", reason: "No O₂ recorded — not placeable" };
  // Reported flammability LIMITS are thresholds inferred from test series, not tested conditions:
  // shown separately, never used as "nearest evidence".
  if (run.flags.includes("limit-value")) return { status: "limit", reason: "Reported limit value — shown separately, not a tested condition" };
  if (run.gravity !== s.gravity) return { status: "other-gravity", reason: `Tested in ${run.gravity} gravity — no cross-regime distance is computed` };
  return { status: "comparable" };
}
