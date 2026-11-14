/** Prototype data access: PSI snapshot (real, fetched after kickoff) + curated content. */
import snapshot from "../data/snapshot.json";
import type { Investigation, Run } from "@/lib/schema";
import { PUBLISHED, PLANNED, PUBLISHED_GROUPS } from "./content";

type Snapshot = {
  generatedAt: string; fetchedAt: string; notice: string;
  counts: {
    totalRuns: number; totalSummaryRows: number; plottable: number; solidRuns: number; solidRunsWithO2: number;
    solidRunsAboveMax: number; maxSolidO2: number; maxSolidO2Runs: string[]; partialGravityRuns: number;
    byInvestigation: Record<string, number>;
  };
  tableStats: { investigation: string; file: string; kind: string; dataRows: number; kept: number; skippedNonRunRows: number; columns: string[] }[];
  investigations: (Investigation & { psiVersion: number | null; psiModified: string | null })[];
  runs: Run[];
  summaries: { investigation: string; file: string; row: number; original: Record<string, string> }[];
};
export const SNAP = snapshot as unknown as Snapshot;
export const PSI_RUNS: Run[] = SNAP.runs;
export const ALL_RUNS: Run[] = [...PSI_RUNS, ...PUBLISHED, ...PLANNED];
export const PSI_INVESTIGATIONS: Investigation[] = SNAP.investigations;
export const ALL_INVESTIGATIONS: Investigation[] = [...PSI_INVESTIGATIONS, ...PUBLISHED_GROUPS];
export const invById = new Map(ALL_INVESTIGATIONS.map((i) => [i.id, i]));
export const runsByInv = (id: string) => ALL_RUNS.filter((r) => r.investigation === id);
export const COUNTS = SNAP.counts;

/**
 * Coverage headline (F1), computed — never hard-coded. Avoids the tautology
 * "0 runs above the max": counts solid runs (with recorded O₂) at or above each
 * planned habitat O₂ level.
 */
import { PRESETS as _PRESETS } from "./content";
const _solidO2 = PSI_RUNS.filter((r) => r.fuelClass.startsWith("solid") && r.o2Pct != null).map((r) => r.o2Pct as number);
const _artemis = _PRESETS.find((p) => p.id === "artemis")!;
const _ea = _PRESETS.find((p) => p.id === "ea")!;
export const HEADLINE = {
  solidRunsWithO2: _solidO2.length,
  maxSolidO2: Math.max(..._solidO2),
  artemisO2: _artemis.o2Pct,
  eaO2: _ea.o2Pct,
  atOrAboveArtemis: _solidO2.filter((x) => x >= _artemis.o2Pct).length,
  atOrAboveEA: _solidO2.filter((x) => x >= _ea.o2Pct).length,
  /** Suggested copy (concepts may typeset it their own way). */
  sentence: "",
};
HEADLINE.sentence = `The highest O₂ in any of PSI's ${HEADLINE.solidRunsWithO2} solid-material tests with a recorded O₂ value is ${HEADLINE.maxSolidO2}%. Artemis surface habitats plan ${HEADLINE.artemisO2}% and the Exploration Atmosphere ${HEADLINE.eaO2}%: ${HEADLINE.atOrAboveArtemis} of those tests reach either level.`;
