/**
 * MARGIN canonical types. Shape follows Kickoff Pack §C.3 with documented extensions
 * (see docs/BUILD_LOG.md). LEAD-OWNED: changes go through the lead.
 */
export type Tier = "T1_PSI_RUN" | "T3_PUBLISHED" | "T4_PLANNED";
export type FuelClass =
  | "solid-thin" | "solid-thick" | "solid-unknown"
  | "liquid-droplet" | "gas-burner" | "gas-jet" | "smoke-source" | "none";
export type Gravity = "micro" | "moon" | "mars" | "earth";
export type Basis = "measured" | "nominal-stated" | "limit-reported" | "unknown";
export type FlowRegime = "quiescent" | "opposed" | "concurrent" | "coflow" | "natural-convection" | "unknown";
export type Hazard = "materials" | "smoke" | "suppression" | "liquid";
export type MaterialClass = "any" | "thin" | "thick";
export type Flag =
  | "ambiguous-unit" | "out-of-range" | "missing" | "sentinel" | "approximate"
  | "text-parsed" | "nominal-value" | "unverified-transcription" | "conflicting-sources"
  | "limit-value"
  | "duplicate-row" | "derived-value" | "suspect-unit" | "burner-fed-oxidizer" | "assumed-value";

export interface SourceRef {
  kind: "psi-table" | "publication" | "plan";
  ref: string;            // e.g. "PSI-25_Experimental table_BASS-II.csv" or "NTRS 20260001992"
  row?: number;           // 1-based data row in the CSV
  page?: string;          // page / table reference for publications
  quote?: string;
  url: string;
}

export interface Conversion { field: string; from: string; to: string; formula: string }

export interface Run {
  id: string;
  investigation: string;  // "PSI-25" or a published group id e.g. "PUB-SAFFIRE-IV-VI"
  tier: Tier;
  fuelClass: FuelClass;
  material: string | null;
  gravity: Gravity;
  o2Pct: number | null; o2Basis: Basis;
  pressureKPa: number | null; pressureBasis: Basis;
  flowCmS: number | null; flowBasis: Basis; flowRegime: FlowRegime;
  outcome: string | null;
  measures: Record<string, { value: number; unit: string; label: string }>;
  original: Record<string, string>;
  conversions: Conversion[];
  flags: Flag[];
  note?: string;
  alternatives?: { o2Pct?: number; pressureKPa?: number; source: string }[];
  source: SourceRef;
}

export interface Investigation {
  id: string;             // accession or published-group id
  acronym: string;
  title: string;
  tier: Tier | "T2_PSI_RECORD";
  platform: string | null;
  hardware: string | null;
  pi: string | null;
  doi: string | null;
  license: string | null;
  landingUrl: string;
  startDate: string | null;
  endDate: string | null;
  objective: string | null;
  publicationsCount: number;
  hasRunTable: boolean;
  runCount: number;
  summaryRowCount: number;
  scale: "large" | "bench" | "ground";
}

export interface Scenario {
  o2Pct: number;
  pressureKPa: number;
  flowCmS: number | null;   // null = quiescent
  gravity: Gravity;
  hazard: Hazard;
  materialClass: MaterialClass;
  includePublished: boolean;
}

export interface Atmosphere {
  id: string;
  label: string;
  short: string;
  o2Pct: number;
  pressureKPa: number;
  pressurePsia: number;
  flowCmS: number | null;
  gravity: Gravity;
  note?: string;
  source: string;
  offChart?: boolean;
}
