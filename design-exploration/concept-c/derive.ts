/**
 * Concept C derivations. Everything here is computed from the shared run data and the
 * engine; no scientific value is typed in by hand. Axis domains are display ranges only.
 */
import type { Basis, Flag, FuelClass, Gravity, Investigation, Run, Scenario, Tier } from "@/lib/schema";
import { gate, COMPARABLE_FUEL, CONTEXT_FUEL, VERDICT_THRESHOLDS, type Evaluation, type RankRow, type Scored } from "@/lib/engine";
import { ALL_INVESTIGATIONS, ALL_RUNS, SNAP, runsByInv } from "../shared/data";
import { FUEL_LABEL, fmt } from "../shared/format";

// ------------------------------------------------------------------ families
export type Family = "solids" | "smoke" | "droplets" | "gas" | "ground" | "published" | "planned";
export const FAMILIES: { id: Family; label: string }[] = [
  { id: "solids", label: "Solids & large-scale" },
  { id: "smoke", label: "Smoke & aerosol" },
  { id: "droplets", label: "Droplets" },
  { id: "gas", label: "Gas flames" },
  { id: "ground", label: "Ground & modelling" },
  { id: "published", label: "Published (not in PSI)" },
  { id: "planned", label: "Planned" },
];
export const FAMILY_SHORT: Record<Family, string> = { solids: "Solids", smoke: "Smoke", droplets: "Droplets", gas: "Gas", ground: "Ground", published: "Published", planned: "Planned" };

function familyOf(inv: Investigation, runs: Run[]): Family {
  if (inv.tier === "T4_PLANNED") return "planned";
  if (inv.tier === "T3_PUBLISHED") return "published";
  if (inv.scale === "ground") return "ground";
  const tally = new Map<FuelClass, number>();
  for (const r of runs) tally.set(r.fuelClass, (tally.get(r.fuelClass) ?? 0) + 1);
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (top) {
    if (top.startsWith("solid")) return "solids";
    if (top === "smoke-source") return "smoke";
    if (top === "liquid-droplet") return "droplets";
    if (top === "gas-burner" || top === "gas-jet") return "gas";
  }
  const a = inv.acronym.toUpperCase();
  if (/BASS|SAFFIRE/.test(a)) return "solids";
  if (/SAME|DAFT/.test(a)) return "smoke";
  if (/FLEX|CFI\b/.test(a) && !/CFI-G/.test(a)) return "droplets";
  if (/ACME|SPICE|SLICE/.test(a)) return "gas";
  return "ground";
}

// ------------------------------------------------------------------ axes (display domains)
export type AxisKey = "o2" | "p" | "flow";
const maxFlow = Math.max(...ALL_RUNS.map((r) => r.flowCmS ?? 0));
export const AXES = {
  o2: { min: 10, max: 45, log: false, unit: "% O₂", label: "O₂" },
  p: { min: 20, max: 520, log: true, unit: "kPa", label: "Pressure" },
  flow: { min: 0, max: Math.ceil(maxFlow / 10) * 10, log: false, unit: "cm/s", label: "Flow" },
} as const;
export function pos(axis: AxisKey, v: number): number {
  const a = AXES[axis];
  const t = a.log ? (Math.log(v) - Math.log(a.min)) / (Math.log(a.max) - Math.log(a.min)) : (v - a.min) / (a.max - a.min);
  return r3(Math.max(0, Math.min(100, t * 100)));
}
/** Rounding keeps server and client markup identical (no hydration mismatch). */
export const r3 = (v: number) => Math.round(v * 1000) / 1000;
export const r2 = (v: number) => Math.round(v * 100) / 100;
export const inDomain = (axis: AxisKey, v: number) => v >= AXES[axis].min && v <= AXES[axis].max;

const FIELD: Record<AxisKey, "o2Pct" | "pressureKPa" | "flowCmS"> = { o2: "o2Pct", p: "pressureKPa", flow: "flowCmS" };
const BASIS: Record<AxisKey, "o2Basis" | "pressureBasis" | "flowBasis"> = { o2: "o2Basis", p: "pressureBasis", flow: "flowBasis" };
const COLUMN_RX: Record<AxisKey, RegExp> = {
  o2: /\bO2\b|oxygen|XO2|^O initial/i,
  p: /press|\(atm\)|\(bar\)|mmHg|psi|kpa|\bp(init|final|mean)\b/i,
  flow: /flow|velocity|air rate|fan|air display/i,
};

/** level: 2 = comparable and within NEAR, 1 = comparable but farther, 0 = not comparable for this scenario */
export interface Tick { v: number; count: number; tier: Tier; basis: Basis; quiescent: boolean; level: 0 | 1 | 2; limit: boolean }
export interface AxisData {
  n: number;           // runs with a value
  total: number;       // runs in the investigation
  min: number | null;
  max: number | null;
  offHigh: number;
  offLow: number;
  nominal: number;     // runs whose value is nominal (stated)
  limit: number;       // runs whose value is a reported limit
  reason: string | null; // why the axis is (partly) not recorded
}

const tableCols = (invId: string) => Array.from(new Set(SNAP.tableStats.filter((t) => t.investigation === invId).flatMap((t) => t.columns)));

function axisReason(inv: Investigation, runs: Run[], axis: AxisKey): string {
  if (runs.length === 0) return inv.summaryRowCount > 0 ? "summary table only — not runs" : "no run table in PSI";
  if (inv.tier !== "T2_PSI_RECORD") return "not reported in source";
  const nullRun = runs.find((r) => r[FIELD[axis]] == null);
  if (axis === "o2" && nullRun?.measures?.oxidizerXO2) return "inverse flames: burner-fed oxidizer, not ambient O₂";
  const cols = tableCols(inv.id).filter((c) => COLUMN_RX[axis].test(c));
  if (cols.length === 0) return `no ${AXES[axis].label} column in PSI table`;
  const quoted = cols.slice(0, 2).map((c) => `“${c}”`).join(", ");
  return axis === "flow" ? `${quoted} only — no cm/s value` : `${quoted} not convertible`;
}

function axisData(inv: Investigation, runs: Run[], axis: AxisKey): AxisData {
  const f = FIELD[axis], b = BASIS[axis];
  let n = 0, offHigh = 0, offLow = 0, nominal = 0, limit = 0, min = Infinity, max = -Infinity;
  for (const r of runs) {
    const v = r[f];
    if (v == null) continue;
    n++;
    min = Math.min(min, v); max = Math.max(max, v);
    if (r[b] === "nominal-stated") nominal++;
    if (r[b] === "limit-reported") limit++;
    if (v > AXES[axis].max) offHigh++;
    else if (v < AXES[axis].min) offLow++;
  }
  return {
    n, total: runs.length,
    min: n ? min : null, max: n ? max : null, offHigh, offLow, nominal, limit,
    reason: n < runs.length || runs.length === 0 ? axisReason(inv, runs, axis) : null,
  };
}

/** Group one investigation's runs into ticks for one axis, graded by comparability for the scenario. */
export function ticksFor(runs: Run[], axis: AxisKey, levelOf: (r: Run) => 0 | 1 | 2): Tick[] {
  const f = FIELD[axis], b = BASIS[axis];
  const groups = new Map<string, Tick>();
  for (const r of runs) {
    const v = r[f];
    if (v == null || !inDomain(axis, v)) continue;
    const level = levelOf(r);
    const limit = r.flags.includes("limit-value");
    const key = `${pos(axis, v).toFixed(1)}|${r.tier}|${r[b]}|${level}|${limit}`;
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { v, count: 1, tier: r.tier, basis: r[b], quiescent: axis === "flow" && (r.flowRegime === "quiescent" || v === 0), level, limit });
  }
  // draw faint first so full-ink ticks sit on top
  return [...groups.values()].sort((a, b2) => a.level - b2.level);
}

// ------------------------------------------------------------------ static per-investigation records
export interface InvStatic {
  inv: Investigation;
  family: Family;
  runs: Run[];
  axes: Record<AxisKey, AxisData>;
  gravities: Record<Gravity, { n: number; tier: Tier | null }>;
  fuel: { fc: FuelClass; n: number }[];
  summaryOnly: boolean;
}
const GRAVS: Gravity[] = ["micro", "moon", "mars", "earth"];

export const INV_STATIC: InvStatic[] = ALL_INVESTIGATIONS.map((inv) => {
  const runs = runsByInv(inv.id);
  const gravities = Object.fromEntries(GRAVS.map((g) => {
    const rs = runs.filter((r) => r.gravity === g);
    return [g, { n: rs.length, tier: rs[0]?.tier ?? null }];
  })) as InvStatic["gravities"];
  const ft = new Map<FuelClass, number>();
  for (const r of runs) ft.set(r.fuelClass, (ft.get(r.fuelClass) ?? 0) + 1);
  return {
    inv, runs, family: familyOf(inv, runs), gravities,
    axes: { o2: axisData(inv, runs, "o2"), p: axisData(inv, runs, "p"), flow: axisData(inv, runs, "flow") },
    fuel: [...ft.entries()].map(([fc, n]) => ({ fc, n })).sort((a, b) => b.n - a.n),
    summaryOnly: runs.length === 0 && inv.summaryRowCount > 0,
  };
});
export const staticById = new Map(INV_STATIC.map((s) => [s.inv.id, s]));

// ------------------------------------------------------------------ per-scenario row state
export type RowState = "comparable" | "limit" | "regime" | "unplaceable" | "context" | "material" | "irrelevant" | "hidden" | "planned" | "norun";
export interface LadderRow extends InvStatic {
  state: RowState;
  chip: string;
  comparableRuns: number;
  Dmin: number | null;
  R: number | null;
  nearest: Scored | null;
  nearRuns: number;    // runs jointly within NEAR (D over all compared axes)
  ticks: Record<AxisKey, Tick[]>;
}

const CHIP: Record<Exclude<RowState, "norun">, string> = {
  comparable: "comparable",
  limit: "reported limit — not a tested condition",
  regime: "different regime",
  unplaceable: "not placeable — no O₂",
  context: "context only",
  material: "different material class",
  irrelevant: "not relevant to question",
  hidden: "published — toggle to include",
  planned: "planned — not evidence",
};

export function rowState(st: InvStatic, s: Scenario): { state: RowState; chip: string; comparableRuns: number } {
  const { inv, runs } = st;
  if (inv.tier === "T4_PLANNED") return { state: "planned", chip: CHIP.planned, comparableRuns: 0 };
  if (inv.tier === "T3_PUBLISHED" && !s.includePublished) return { state: "hidden", chip: CHIP.hidden, comparableRuns: 0 };
  if (inv.tier === "T2_PSI_RECORD" && s.gravity !== "micro" && runs.every((r) => r.gravity !== s.gravity)) return { state: "regime", chip: CHIP.regime, comparableRuns: 0 };
  if (runs.length === 0) return { state: "norun", chip: inv.summaryRowCount > 0 ? "summary table only — not runs" : "no run table in PSI", comparableRuns: 0 };
  let comparable = 0, other = 0, unplaceable = 0, context = 0, material = 0, limit = 0;
  for (const r of runs) {
    const g = gate(r, s);
    if (g.status === "comparable") comparable++;
    else if (g.status === "limit") { if (r.gravity === s.gravity) limit++; else other++; }
    else if (g.status === "other-gravity") other++;
    else if (g.status === "context") context++;
    else if (COMPARABLE_FUEL[s.hazard].includes(r.fuelClass)) {
      if ((s.materialClass === "thin" && r.fuelClass === "solid-thick") || (s.materialClass === "thick" && r.fuelClass === "solid-thin")) material++;
      else if (r.o2Pct == null) unplaceable++;
    }
  }
  if (comparable > 0) return { state: "comparable", chip: CHIP.comparable, comparableRuns: comparable };
  if (limit > 0) return { state: "limit", chip: CHIP.limit, comparableRuns: 0 };
  if (runs.every((r) => r.gravity !== s.gravity) || other > 0) return { state: "regime", chip: CHIP.regime, comparableRuns: 0 };
  if (unplaceable > 0) return { state: "unplaceable", chip: CHIP.unplaceable, comparableRuns: 0 };
  if (context > 0) return { state: "context", chip: CHIP.context, comparableRuns: 0 };
  if (material > 0) return { state: "material", chip: CHIP.material, comparableRuns: 0 };
  void CONTEXT_FUEL;
  return { state: "irrelevant", chip: CHIP.irrelevant, comparableRuns: 0 };
}

export function buildRows(s: Scenario, ev: Evaluation, ranking: RankRow[]): LadderRow[] {
  const rankBy = new Map(ranking.map((r) => [r.investigation.id, r]));
  const nearestBy = new Map<string, Scored>();
  const level = new Map<string, 1 | 2>();
  for (const sc of ev.comparable) {
    if (!nearestBy.has(sc.run.investigation)) nearestBy.set(sc.run.investigation, sc);
    level.set(sc.run.id, sc.d.D <= VERDICT_THRESHOLDS.near ? 2 : 1);
  }
  for (const sc of ev.limits) level.set(sc.run.id, sc.d.D <= VERDICT_THRESHOLDS.near ? 2 : 1);
  const levelOf = (r: Run) => level.get(r.id) ?? 0;
  return INV_STATIC.map((st) => {
    const rs = rowState(st, s);
    const rr = rankBy.get(st.inv.id);
    return {
      ...st, ...rs, Dmin: rr?.Dmin ?? null, R: rr ? rr.R : null, nearest: nearestBy.get(st.inv.id) ?? null,
      nearRuns: rs.state === "comparable" ? st.runs.filter((r) => level.get(r.id) === 2).length : 0,
      ticks: { o2: ticksFor(st.runs, "o2", levelOf), p: ticksFor(st.runs, "p", levelOf), flow: ticksFor(st.runs, "flow", levelOf) },
    };
  });
}

// ------------------------------------------------------------------ original-cell lookup
export function originalFor(run: Run, axis: AxisKey): { col: string; value: string } | null {
  const conv = run.conversions.find((c) => c.field === FIELD[axis]);
  const keys = Object.keys(run.original);
  const col = keys.find((k) => COLUMN_RX[axis].test(k));
  if (conv) return { col: col ?? conv.field, value: conv.from };
  if (col) return { col, value: run.original[col] };
  return null;
}

// ------------------------------------------------------------------ fingerprint (computed)
export interface Fingerprint {
  runs: number;
  varied: { label: string; detail: string }[];
  constant: { label: string; detail: string }[];
  notRecorded: string[];
  identifiers: string[];
  variedCols: { col: string; distinct: number }[];
  constantCols: { col: string; value: string }[];
  outcomes: { label: string; n: number }[];
  flags: { flag: Flag; n: number }[];
}

const AXIS_FMT: Record<AxisKey, (v: number) => string> = {
  o2: (v) => `${fmt(v, 1)} %`,
  p: (v) => `${fmt(v, 1)} kPa`,
  flow: (v) => `${fmt(v, 1)} cm/s`,
};

export function fingerprint(st: InvStatic): Fingerprint {
  const { runs } = st;
  const varied: Fingerprint["varied"] = [], constant: Fingerprint["constant"] = [], notRecorded: string[] = [];
  for (const axis of ["o2", "p", "flow"] as AxisKey[]) {
    const a = st.axes[axis];
    const vals = Array.from(new Set(runs.map((r) => r[FIELD[axis]]).filter((v): v is number => v != null)));
    const basisNote = a.nominal === a.n && a.n > 0 ? " · nominal (stated)" : a.limit === a.n && a.n > 0 ? " · reported limit" : "";
    const partial = a.n < runs.length ? ` · ${a.n}/${runs.length} recorded` : "";
    if (vals.length === 0) notRecorded.push(`${AXES[axis].label}${a.reason ? ` (${a.reason})` : ""}`);
    else if (vals.length === 1) constant.push({ label: AXES[axis].label, detail: `${AXIS_FMT[axis](vals[0])}${basisNote}${partial}` });
    else varied.push({ label: AXES[axis].label, detail: `${AXIS_FMT[axis](Math.min(...vals))} – ${AXIS_FMT[axis](Math.max(...vals))} · ${vals.length} levels${basisNote}${partial}` });
  }
  const cat = (label: string, values: (string | null)[]) => {
    const d = Array.from(new Set(values.filter((v): v is string => !!v)));
    if (d.length === 0) notRecorded.push(label);
    else if (d.length === 1) constant.push({ label, detail: d[0] });
    else varied.push({ label, detail: `${d.length} distinct` });
  };
  cat("Material", runs.map((r) => r.material?.trim() || null));
  cat("Fuel class", runs.map((r) => FUEL_LABEL[r.fuelClass]));
  cat("Gravity", runs.map((r) => r.gravity));

  const cols = new Map<string, Set<string>>();
  for (const r of runs) for (const [k, v] of Object.entries(r.original)) {
    const t = (v ?? "").trim();
    if (!t) continue;
    if (!cols.has(k)) cols.set(k, new Set());
    cols.get(k)!.add(t);
  }
  const identifiers: string[] = [], variedCols: Fingerprint["variedCols"] = [], constantCols: Fingerprint["constantCols"] = [];
  for (const [col, set] of cols) {
    if (set.size === 1) constantCols.push({ col, value: [...set][0] });
    else if (runs.length > 2 && set.size === runs.length) identifiers.push(col);
    else variedCols.push({ col, distinct: set.size });
  }
  const oc = new Map<string, number>();
  for (const r of runs) { const k = r.outcome?.trim() || "not recorded"; oc.set(k, (oc.get(k) ?? 0) + 1); }
  const fl = new Map<Flag, number>();
  for (const r of runs) for (const f of r.flags) fl.set(f, (fl.get(f) ?? 0) + 1);
  return {
    runs: runs.length, varied, constant, notRecorded, identifiers,
    variedCols: variedCols.sort((a, b) => b.distinct - a.distinct), constantCols,
    outcomes: [...oc.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n),
    flags: [...fl.entries()].map(([flag, n]) => ({ flag, n })).sort((a, b) => b.n - a.n),
  };
}

// ------------------------------------------------------------------ misc
export function fetchedDate(iso: string): string {
  const d = new Date(iso);
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getUTCDate()} ${M[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
