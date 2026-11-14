/**
 * Expeditions: curated entry points into the Atlas. Each one sets a complete, shareable scenario state
 * (scenario URL keys only) and is described with values taken from the data and curated content.
 * Titles of finding cards are neutral topic labels; the finding itself (claim, value, source) is shown
 * verbatim from content/insights.ts, and only findings checked against their primary source appear.
 */
import type { Scenario } from "@/lib/schema";
import { HEADLINE } from "@/lib/data";
import { INSIGHTS, PRESETS, type Insight } from "@/content/curated";
import { DEFAULT_SCENARIO, scenarioToQuery } from "@/lib/state/scenarioQuery";

export type ExpeditionKind = "gap" | "atmosphere" | "finding";
export interface Expedition {
  id: string;
  kind: ExpeditionKind;
  title: string;
  /** Values line (tracked caps): from data or curated content, never hand-typed. */
  values: string;
  source: string;
  sourceUrl?: string;
  /** Marked "assumed" (e.g. Mars transit). */
  assumed?: boolean;
  preset: string;
  /** Applied over the preset position. `keep` lists scenario fields the user's own choice keeps. */
  patch: Partial<Scenario>;
  keep?: (keyof Scenario)[];
  insight?: Insight;
}

/** Card titles for the reference atmospheres (labels only; values come from ATMOSPHERES). */
const ATM_TITLE: Record<string, string> = {
  iss: "ISS cabin",
  artemis: "Artemis surface habitat",
  ea: "Exploration Atmosphere",
  legacy: "Legacy staging reference",
  mars: "Mars transit vehicle",
};

const preset = (id: string) => PRESETS.find((p) => p.id === id)!;
const isChecked = (i: Insight) => i.verification.status === "primary-checked";

/** Featured findings (each must be primary-checked to appear) and the scenario each one opens. */
const FEATURED: { id: string; title: string; preset: string; patch: Partial<Scenario> }[] = [
  { id: "i-psi-partialg", title: "Partial gravity in PSI", preset: "artemis", patch: { gravity: "mars", includePublished: false, hazard: "materials", flowCmS: 10, materialClass: "any" } },
  { id: "i-lunar", title: "Mylar at lunar gravity", preset: "artemis", patch: { gravity: "moon", includePublished: true, hazard: "materials", flowCmS: 10, materialClass: "any" } },
  { id: "i-silicone", title: "Silicone at 20 cm/s", preset: "iss", patch: { gravity: "micro", includePublished: true, hazard: "materials", flowCmS: 20, materialClass: "any" } },
  { id: "i-alarm", title: "Detection and CO", preset: "ea", patch: { gravity: "micro", includePublished: true, hazard: "smoke", flowCmS: 20, materialClass: "any" } },
  { id: "i-flowoff", title: "Turning the flow off", preset: "artemis", patch: { gravity: "micro", includePublished: true, hazard: "suppression", flowCmS: null, materialClass: "any" } },
  { id: "i-cool", title: "Cool flames on droplets", preset: "iss", patch: { gravity: "micro", includePublished: false, hazard: "liquid", flowCmS: null, materialClass: "any" } },
];

function build(): Expedition[] {
  const ea = preset("ea");
  const out: Expedition[] = [{
    id: "gap",
    kind: "gap",
    title: "The coverage gap",
    values: `Max tested ${HEADLINE.maxSolidO2}% O₂ · planned ${HEADLINE.artemisO2}–${HEADLINE.eaO2}%`,
    source: `${HEADLINE.solidRunsWithO2} PSI solid-material tests with O₂ recorded; ${HEADLINE.atOrAboveArtemis} reach ${HEADLINE.artemisO2}%`,
    preset: ea.id,
    patch: { gravity: "micro", includePublished: false, hazard: "materials", flowCmS: ea.flowCmS, materialClass: "any" },
  }];
  for (const a of PRESETS) {
    const assumed = !!a.note?.toLowerCase().startsWith("assumed");
    out.push({
      id: `atm-${a.id}`,
      kind: "atmosphere",
      title: ATM_TITLE[a.id] ?? a.label,
      values: `${a.o2Pct}% O₂ · ${a.pressureKPa} kPa · ${a.pressurePsia} psia`,
      source: a.source,
      assumed,
      preset: a.id,
      patch: { gravity: a.gravity, flowCmS: a.flowCmS },
      keep: ["hazard", "materialClass", "includePublished"],
    });
  }
  for (const f of FEATURED) {
    const ins = INSIGHTS.find((i) => i.id === f.id);
    if (!ins || !isChecked(ins)) continue;
    out.push({ id: `fnd-${f.id}`, kind: "finding", title: f.title, values: ins.value, source: ins.source.ref, sourceUrl: ins.source.url, preset: f.preset, patch: f.patch, insight: ins });
  }
  return out;
}

export const EXPEDITIONS: Expedition[] = build();

/** The scenario an expedition opens, given the user's current scenario (for the `keep` fields). */
export function expeditionScenario(x: Expedition, current: Scenario = DEFAULT_SCENARIO): Scenario {
  const p = preset(x.preset);
  const kept = Object.fromEntries((x.keep ?? []).map((k) => [k, current[k]])) as Partial<Scenario>;
  return { ...DEFAULT_SCENARIO, o2Pct: p.o2Pct, pressureKPa: p.pressureKPa, flowCmS: p.flowCmS, gravity: p.gravity, ...x.patch, ...kept };
}

export function expeditionHref(x: Expedition, current?: Scenario) {
  return `/?${scenarioToQuery(expeditionScenario(x, current), x.preset)}`;
}

/** Scenario a finding opens: its featured expedition, else the question it belongs to at the ISS cabin. */
export function findingHref(i: Insight) {
  const x = EXPEDITIONS.find((e) => e.insight?.id === i.id);
  if (x) return expeditionHref(x);
  const iss = preset("iss");
  const s: Scenario = { ...DEFAULT_SCENARIO, o2Pct: iss.o2Pct, pressureKPa: iss.pressureKPa, flowCmS: iss.flowCmS, gravity: "micro", hazard: i.hazards[0], includePublished: true };
  return `/?${scenarioToQuery(s, "iss")}`;
}

/** True when the current scenario is exactly what an expedition opens (its card shows as active). */
export function isExpeditionActive(x: Expedition, s: Scenario, presetId: string | null) {
  if (presetId !== x.preset) return false;
  const t = expeditionScenario(x, s);
  return t.gravity === s.gravity && t.hazard === s.hazard && t.flowCmS === s.flowCmS && t.includePublished === s.includePublished && t.materialClass === s.materialClass;
}
