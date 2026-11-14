/**
 * Scenario ⇄ URL query encoding. Pure functions (unit-tested) so a shared link always
 * reproduces the same scenario, and invalid or hostile parameters are clamped or ignored.
 *
 * Keys: preset, o2 (%), p (kPa), u (cm/s | "q" = quiescent), g (micro|moon|mars|earth),
 *       h (materials|smoke|suppression|liquid), m (any|thin|thick), pub (1 = include published).
 * Any other keys (e.g. `cmp`, `run`) belong to individual pages and are preserved untouched.
 */
import type { Scenario, Gravity, Hazard, MaterialClass } from "@/lib/schema";

export const SCENARIO_KEYS = ["preset", "o2", "p", "u", "g", "h", "m", "pub"] as const;
export const GRAVITIES: Gravity[] = ["micro", "moon", "mars", "earth"];
export const HAZARD_IDS: Hazard[] = ["materials", "smoke", "suppression", "liquid"];
export const MATERIAL_CLASSES: MaterialClass[] = ["any", "thin", "thick"];

export const DEFAULT_SCENARIO: Scenario = {
  o2Pct: 20.9, pressureKPa: 101.4, flowCmS: 10, gravity: "micro",
  hazard: "materials", materialClass: "any", includePublished: false,
};

export const LIMITS = { o2: [0.1, 100], pressureKPa: [1, 1000], flowCmS: [0, 500] } as const;

/** Keep the scenario physically meaningful: O₂ in (0, 100] %, P > 0, flow ≥ 0. Non-finite → default. */
export function clampScenario(s: Scenario): Scenario {
  const ok = (x: number, [lo, hi]: readonly [number, number], fb: number) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : fb);
  return {
    ...s,
    o2Pct: ok(s.o2Pct, LIMITS.o2, DEFAULT_SCENARIO.o2Pct),
    pressureKPa: ok(s.pressureKPa, LIMITS.pressureKPa, DEFAULT_SCENARIO.pressureKPa),
    flowCmS: s.flowCmS == null ? null : ok(s.flowCmS, LIMITS.flowCmS, 0),
  };
}

export interface ParsedQuery { scenario: Partial<Scenario>; preset?: string }

export function parseScenarioQuery(q: URLSearchParams): ParsedQuery {
  const num = (k: string) => {
    const v = q.get(k);
    if (v == null || v.trim() === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const scenario: Partial<Scenario> = {};
  const o2 = num("o2"); if (o2 != null) scenario.o2Pct = o2;
  const p = num("p"); if (p != null) scenario.pressureKPa = p;
  if (q.get("u") === "q") scenario.flowCmS = null; else { const u = num("u"); if (u != null) scenario.flowCmS = u; }
  const g = q.get("g"); if (g && (GRAVITIES as string[]).includes(g)) scenario.gravity = g as Gravity;
  const h = q.get("h"); if (h && (HAZARD_IDS as string[]).includes(h)) scenario.hazard = h as Hazard;
  const m = q.get("m"); if (m && (MATERIAL_CLASSES as string[]).includes(m)) scenario.materialClass = m as MaterialClass;
  const pub = q.get("pub"); if (pub === "1") scenario.includePublished = true; else if (pub === "0") scenario.includePublished = false;
  const preset = q.get("preset");
  return { scenario, preset: preset && /^[a-z0-9-]{1,24}$/.test(preset) ? preset : undefined };
}

/** Serialise the scenario. `base` carries non-scenario params (e.g. `cmp`) that must survive. */
export function scenarioToQuery(s: Scenario, preset: string | null, base?: URLSearchParams): string {
  const q = new URLSearchParams();
  if (base) for (const [k, v] of base) if (!(SCENARIO_KEYS as readonly string[]).includes(k)) q.set(k, v);
  if (preset) q.set("preset", preset);
  q.set("o2", String(+s.o2Pct.toFixed(2)));
  q.set("p", String(+s.pressureKPa.toFixed(2)));
  q.set("u", s.flowCmS == null ? "q" : String(+s.flowCmS.toFixed(2)));
  q.set("g", s.gravity);
  q.set("h", s.hazard);
  if (s.materialClass !== "any") q.set("m", s.materialClass);
  if (s.includePublished) q.set("pub", "1");
  return q.toString();
}

/** Only the scenario part of the query — used to carry a scenario across pages. */
export function scenarioOnlyQuery(s: Scenario, preset: string | null): string {
  return scenarioToQuery(s, preset);
}
