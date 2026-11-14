/**
 * Investigations workspace + dossier derivations. Everything here is computed from the
 * shared run data, curated content and the engine — no scientific value is typed in by
 * hand. Axis display domains are derived from the data (presentation only).
 * Server-compatible: no React, no browser APIs (the dossier route imports this at build time).
 */
import type { Basis, Flag, FlowRegime, FuelClass, Gravity, Investigation, Run, Scenario } from "@/lib/schema";
import { gate, COMPARABLE_FUEL, CONTEXT_FUEL, VERDICT_THRESHOLDS, type Axis, type Evaluation, type RankRow, type Scored } from "@/lib/engine";
import { ALL_INVESTIGATIONS, ALL_RUNS, SNAP, runsByInv } from "@/lib/data";
import { ATMOSPHERES } from "@/content/curated";
import { FUEL_LABEL, GRAVITY_LABEL, GRAVITY_SHORT, fmt } from "@/lib/format";

export const GRAVS: Gravity[] = ["micro", "moon", "mars", "earth"];
export const EPS = 1e-9;

// ------------------------------------------------------------------ claim kinds (global .claim[data-kind])
export type ClaimKind = "MEASURED" | "COMPUTED" | "NOMINAL" | "REPORTED LIMIT" | "PUBLISHED" | "DRAFT" | "PLANNED";
export const CLAIM_HELP: Record<ClaimKind, string> = {
  MEASURED: "A value in a PSI table, or in a published table that has been checked against the primary source",
  COMPUTED: "Output of the MARGIN engine (distance, verdict, rank, robustness, flow sensitivity)",
  NOMINAL: "Stated in a document, not measured in the run",
  "REPORTED LIMIT": "A threshold inferred by the authors from a test series — not a tested condition",
  PUBLISHED: "From a published paper (not in PSI), checked against the primary source",
  DRAFT: "Not yet checked against the primary source",
  PLANNED: "A planned test — never counted as evidence",
};

export const isUnverified = (r: Run) => r.flags.includes("unverified-transcription");
export const isBurnerFed = (r: Run) => r.flags.includes("burner-fed-oxidizer" as Flag) || r.measures?.oxidizerXO2 != null;
export const isLimit = (r: Run) => r.flags.includes("limit-value");

/** Verification state of a run's record, in plain words. */
export function verification(r: Run): { kind: ClaimKind | null; label: string } {
  if (r.tier === "T4_PLANNED") return { kind: "PLANNED", label: "planned — not evidence" };
  if (r.tier === "T3_PUBLISHED") {
    return isUnverified(r)
      ? { kind: "DRAFT", label: "not yet checked against primary source" }
      : { kind: "PUBLISHED", label: `checked against primary source${r.source.page ? ` · ${r.source.page}` : ""}` };
  }
  return isUnverified(r) ? { kind: "DRAFT", label: "a stated value in this row is not yet checked against its primary source" } : { kind: null, label: "PSI table row" };
}

/** Claim kinds that describe one axis value of a run. */
export function valueKinds(r: Run, axis: AxisKey): ClaimKind[] {
  const b = r[BASIS[axis]];
  if (r[FIELD[axis]] == null) return [];
  const basisKind: ClaimKind | null = b === "measured" ? "MEASURED" : b === "nominal-stated" ? "NOMINAL" : b === "limit-reported" ? "REPORTED LIMIT" : null;
  if (r.tier === "T4_PLANNED") return ["PLANNED"];
  if (r.tier === "T3_PUBLISHED") {
    if (isUnverified(r)) return basisKind === "REPORTED LIMIT" ? ["REPORTED LIMIT", "DRAFT"] : ["DRAFT"];
    return basisKind ? [basisKind, "PUBLISHED"] : ["PUBLISHED"];
  }
  // A PSI row whose stated (nominal) value comes from an unchecked paraphrase.
  if (isUnverified(r) && b === "nominal-stated") return ["NOMINAL", "DRAFT"];
  return basisKind ? [basisKind] : [];
}

export const FLAG_TEXT: Partial<Record<Flag, string>> = {
  "ambiguous-unit": "The source column does not state its unit unambiguously; the unit was inferred.",
  "out-of-range": "A value lies outside the physically expected range; it is kept as recorded.",
  missing: "At least one of O₂, pressure or flow is not recorded in the source row.",
  sentinel: "The source uses a placeholder (for example −999) for a missing number.",
  approximate: "The source gives an approximate value or a range; the first value is used.",
  "text-parsed": "The number was parsed from text in the cell (for example “20 cm/s”).",
  "nominal-value": "A value stated in a document, not measured in this run.",
  "unverified-transcription": "Not yet checked against the primary source.",
  "conflicting-sources": "Sources disagree on this value; the alternatives are listed.",
  "limit-value": "A reported limit: a threshold inferred by the authors from a test series, not a tested condition.",
  "duplicate-row": "This row duplicates another row in the source table.",
  "derived-value": "The value is derived from other measurements (see the note).",
  "suspect-unit": "The unit looks inconsistent with the values.",
  "burner-fed-oxidizer": "Inverse flame: the O₂ value is the oxidizer stream fed through the burner, not the surrounding atmosphere.",
  "assumed-value": "A value assumed by MARGIN (see the note), not stated in the source.",
};
export const flagText = (f: Flag) => FLAG_TEXT[f] ?? f;

export const BASIS_TEXT: Record<Basis, string> = { measured: "measured", "nominal-stated": "nominal (stated, not measured)", "limit-reported": "reported limit", unknown: "not recorded" };
export const REGIME_TEXT: Record<FlowRegime, string> = { quiescent: "quiescent", opposed: "opposed flow", concurrent: "concurrent flow", coflow: "co-flow", "natural-convection": "natural convection", unknown: "regime not recorded" };

// ------------------------------------------------------------------ axes
export type AxisKey = "o2" | "p" | "flow";
export const AXIS_KEYS: AxisKey[] = ["o2", "p", "flow"];
export const ENGINE_AXIS: Record<AxisKey, Axis> = { o2: "o2", p: "pressure", flow: "flow" };
export const FIELD: Record<AxisKey, "o2Pct" | "pressureKPa" | "flowCmS"> = { o2: "o2Pct", p: "pressureKPa", flow: "flowCmS" };
export const BASIS: Record<AxisKey, "o2Basis" | "pressureBasis" | "flowBasis"> = { o2: "o2Basis", p: "pressureBasis", flow: "flowBasis" };
export const AXIS_LABEL: Record<AxisKey, string> = { o2: "O₂", p: "Pressure", flow: "Flow" };
export const AXIS_UNIT: Record<AxisKey, string> = { o2: "%", p: "kPa", flow: "cm/s" };

const floorTo = (v: number, s: number) => Math.floor(v / s) * s;
const ceilTo = (v: number, s: number) => Math.ceil(v / s) * s;
const NICE_P = [5, 10, 20, 30, 50, 70, 100, 200, 300, 500, 700, 1000, 2000];
const ambientO2 = [...ALL_RUNS.filter((r) => r.o2Pct != null && !isBurnerFed(r)).map((r) => r.o2Pct as number), ...ATMOSPHERES.filter((a) => !a.offChart).map((a) => a.o2Pct)];
const pressures = [...ALL_RUNS.filter((r) => r.pressureKPa != null && r.pressureKPa > 0).map((r) => r.pressureKPa as number), ...ATMOSPHERES.filter((a) => !a.offChart).map((a) => a.pressureKPa)];
const flows = ALL_RUNS.filter((r) => r.flowCmS != null).map((r) => r.flowCmS as number);
const pMin = Math.min(...pressures), pMax = Math.max(...pressures);

/** Display domains, derived from the data with padding (presentation only). */
export const DOMAIN: Record<AxisKey, { min: number; max: number; log: boolean }> = {
  o2: { min: Math.max(0, floorTo(Math.min(...ambientO2) - 1, 5)), max: ceilTo(Math.max(...ambientO2) + 1, 5), log: false },
  p: { min: [...NICE_P].reverse().find((n) => n <= pMin * 0.9) ?? NICE_P[0], max: NICE_P.find((n) => n >= pMax * 1.1) ?? NICE_P[NICE_P.length - 1], log: true },
  flow: { min: 0, max: ceilTo(Math.max(10, ...flows) * 1.05, 10), log: false },
};
export const r2 = (v: number) => Math.round(v * 100) / 100;
export function pos(axis: AxisKey, v: number): number {
  const a = DOMAIN[axis];
  const t = a.log ? (Math.log(v) - Math.log(a.min)) / (Math.log(a.max) - Math.log(a.min)) : (v - a.min) / (a.max - a.min);
  return r2(Math.max(0, Math.min(100, t * 100)));
}
export const inDomain = (axis: AxisKey, v: number) => v >= DOMAIN[axis].min && v <= DOMAIN[axis].max && !(DOMAIN[axis].log && v <= 0);
export function axisTicks(axis: AxisKey): number[] {
  const a = DOMAIN[axis];
  if (axis === "p") return NICE_P.filter((n) => n >= a.min && n <= a.max && [10, 20, 50, 100, 200, 500, 1000].includes(n));
  const step = axis === "o2" ? 10 : ceilTo((a.max - a.min) / 3, 10);
  const out: number[] = [];
  for (let v = ceilTo(a.min, step); v <= a.max + EPS; v += step) out.push(v);
  return out;
}
export function scenarioValue(axis: AxisKey, s: Scenario): number {
  return axis === "o2" ? s.o2Pct : axis === "p" ? s.pressureKPa : s.flowCmS ?? 0;
}

// ------------------------------------------------------------------ original-cell lookup
const COLUMN_RX: Record<AxisKey, RegExp> = {
  o2: /\bO2\b|oxygen|XO2|^O initial/i,
  p: /press|\(atm\)|\(bar\)|mmHg|psi|kpa|\bp(init|final|mean)\b/i,
  flow: /flow|velocity|air rate|fan|air display/i,
};
/** Columns that are about an axis (mass flow rates and flow-termination flags are not gas velocity). */
const isAxisColumn = (axis: AxisKey, col: string) => COLUMN_RX[axis].test(col) && !(axis === "flow" && /mg\/s|flow term/i.test(col));
/** Source columns in the original row that relate to an axis (name + cell). */
export function sourceCells(run: Run, axis: AxisKey): { col: string; value: string }[] {
  return Object.entries(run.original).filter(([k]) => isAxisColumn(axis, k)).map(([col, value]) => ({ col, value }));
}
export const conversionFor = (run: Run, axis: AxisKey) => run.conversions.find((c) => c.field === FIELD[axis]);
/** The single original cell shown beneath a normalized value (conversion source first). */
export function originalCell(run: Run, axis: AxisKey): string | null {
  const conv = conversionFor(run, axis);
  if (conv) return conv.from;
  const cells = sourceCells(run, axis);
  if (cells.length && run[FIELD[axis]] != null) return cells[0].value;
  return null;
}

// ------------------------------------------------------------------ families
export type Family = "solids" | "smoke" | "droplets" | "gas" | "norun" | "planned";
export const FAMILY_LABEL: Record<Family, string> = {
  solids: "Solid materials",
  smoke: "Smoke & overheated materials",
  droplets: "Liquid droplets",
  gas: "Gas flames (burners & jets)",
  norun: "No run table in PSI",
  planned: "Planned — not evidence",
};
export const FAMILY_ORDER: Family[] = ["solids", "smoke", "droplets", "gas", "norun", "planned"];

export function familyOf(inv: Investigation, runs: Run[]): Family {
  if (inv.tier === "T4_PLANNED") return "planned";
  if (runs.length === 0) return "norun";
  const tally = new Map<FuelClass, number>();
  for (const r of runs) tally.set(r.fuelClass, (tally.get(r.fuelClass) ?? 0) + 1);
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
  if (top.startsWith("solid")) return "solids";
  if (top === "smoke-source") return "smoke";
  if (top === "liquid-droplet") return "droplets";
  if (top === "gas-burner" || top === "gas-jet") return "gas";
  return "norun";
}

export interface InvStatic { inv: Investigation; runs: Run[]; family: Family }
export const INV_STATIC: InvStatic[] = ALL_INVESTIGATIONS.map((inv) => {
  const runs = runsByInv(inv.id);
  return { inv, runs, family: familyOf(inv, runs) };
});
export const staticById = new Map(INV_STATIC.map((s) => [s.inv.id, s]));
export const tierShort = (inv: Investigation) => (inv.tier === "T3_PUBLISHED" ? "Published · not in PSI" : inv.tier === "T4_PLANNED" ? "Planned" : "PSI record");

// ------------------------------------------------------------------ why a run is not comparable (plain words)
export function whyNot(run: Run, s: Scenario): string | null {
  if (run.tier === "T4_PLANNED") return "planned — not evidence";
  if (run.tier === "T3_PUBLISHED" && !s.includePublished) return "published — not counted while the published toggle is off";
  const g = gate(run, s);
  if (g.status === "comparable") return null;
  if (g.status === "limit") return "reported limit — not a tested condition";
  if (g.status === "other-gravity") return `tested in ${GRAVITY_LABEL[run.gravity].toLowerCase()}`;
  if (g.status === "context") return `${FUEL_LABEL[run.fuelClass].toLowerCase()} — context only for this question`;
  const fuelOk = COMPARABLE_FUEL[s.hazard].includes(run.fuelClass) || CONTEXT_FUEL[s.hazard].includes(run.fuelClass);
  if (!fuelOk) return `${FUEL_LABEL[run.fuelClass].toLowerCase()} — not relevant to this question`;
  if (s.hazard === "smoke" && run.fuelClass.startsWith("solid") && !run.measures?.alarm) return "solid burn without smoke or alarm data";
  if ((s.materialClass === "thin" && run.fuelClass === "solid-thick") || (s.materialClass === "thick" && run.fuelClass === "solid-thin")) return "different material class";
  if (run.o2Pct == null) return isBurnerFed(run) ? "inverse flame: O₂ is burner-fed, not ambient" : "no O₂ recorded — not placeable";
  return g.reason;
}

// ------------------------------------------------------------------ ladder rows (per scenario)
export type TickKind = "run" | "published" | "limit" | "planned";
/** solid = comparable and within NEAR on the other compared axes; ghost = comparable but farther on them; faint = not comparable here */
export type TickLevel = "solid" | "ghost" | "faint";
export interface Tick { x: number; v: number; n: number; kind: TickKind; level: TickLevel; nominal: boolean }
export interface AxisSummary {
  n: number; total: number; min: number | null; max: number | null;
  nominal: number; limit: number; offLow: number; offHigh: number;
  burnerFed: { n: number; min: number; max: number } | null;
  reason: string | null;
}
export type RowStatus = "comparable" | "nocomp" | "hidden" | "otherg" | "norun" | "planned";
export interface LadderRow extends InvStatic {
  regimeRuns: Run[];
  otherRegimes: { g: Gravity; n: number }[];
  status: RowStatus;
  chip: string;
  comparable: number;
  near: number;
  Dmin: number | null;
  nearest: Scored | null;
  /** Best run of this investigation compared on all three axes (null if none). */
  nearestComplete: Scored | null;
  rank: RankRow | null;
  axes: Record<AxisKey, AxisSummary>;
  ticks: Record<AxisKey, Tick[]>;
}

/** Distance over the compared axes other than `axis` (used to grade marginal-strip ticks). */
export function otherAxesD(sc: Scored, axis: AxisKey): number {
  let sum = 0;
  for (const a of sc.d.axesUsed) {
    if (a === ENGINE_AXIS[axis]) continue;
    const g = sc.d.gaps[a];
    if (g != null) sum += g * g;
  }
  return Math.sqrt(sum);
}

const tableColumns = (invId: string) => Array.from(new Set(SNAP.tableStats.filter((t) => t.investigation === invId).flatMap((t) => t.columns)));

function axisReason(st: InvStatic, runs: Run[], axis: AxisKey): string {
  const { inv } = st;
  if (st.runs.length === 0) return inv.summaryRowCount > 0 ? "summary rows only — not runs" : "no run table in PSI";
  if (runs.length === 0) return "no runs in this gravity regime";
  if (inv.tier !== "T2_PSI_RECORD") return "not reported in source";
  if (axis === "o2" && runs.some(isBurnerFed)) return "inverse flames: O₂ is burner-fed, not ambient";
  const cols = tableColumns(inv.id).filter((c) => isAxisColumn(axis, c));
  if (cols.length === 0) return `no ${AXIS_LABEL[axis].toLowerCase()} column in the PSI table`;
  const quoted = cols.slice(0, 2).map((c) => `“${c}”`).join(", ");
  return axis === "flow" ? `${quoted} only — no cm/s value` : `${quoted} not convertible`;
}

function summarize(st: InvStatic, runs: Run[], axis: AxisKey): AxisSummary {
  const f = FIELD[axis], b = BASIS[axis];
  let n = 0, nominal = 0, limit = 0, offLow = 0, offHigh = 0, min = Infinity, max = -Infinity;
  for (const r of runs) {
    const v = r[f];
    if (v == null) continue;
    n++; min = Math.min(min, v); max = Math.max(max, v);
    if (r[b] === "nominal-stated") nominal++;
    if (r[b] === "limit-reported" || isLimit(r)) limit++;
    if (v > DOMAIN[axis].max) offHigh++; else if (v < DOMAIN[axis].min) offLow++;
  }
  let burnerFed: AxisSummary["burnerFed"] = null;
  if (axis === "o2") {
    const bf = runs.filter(isBurnerFed).map((r) => r.measures?.oxidizerXO2?.value).filter((v): v is number => v != null);
    if (bf.length) burnerFed = { n: bf.length, min: Math.min(...bf), max: Math.max(...bf) };
  }
  return { n, total: runs.length, min: n ? min : null, max: n ? max : null, nominal, limit, offLow, offHigh, burnerFed, reason: n < runs.length || runs.length === 0 ? axisReason(st, runs, axis) : null };
}

function ticksFor(runs: Run[], axis: AxisKey, info: (r: Run) => { kind: TickKind; level: TickLevel }): Tick[] {
  const f = FIELD[axis], b = BASIS[axis];
  const groups = new Map<string, Tick>();
  for (const r of runs) {
    const v = r[f];
    if (v == null || !inDomain(axis, v)) continue;
    const { kind, level } = info(r);
    const x = pos(axis, v);
    const nominal = r[b] === "nominal-stated";
    const key = `${Math.round(x * 2)}|${kind}|${level}|${nominal}`;
    const g = groups.get(key);
    if (g) g.n++;
    else groups.set(key, { x, v, n: 1, kind, level, nominal });
  }
  const order: Record<TickLevel, number> = { faint: 0, ghost: 1, solid: 2 };
  return [...groups.values()].sort((a, c) => order[a.level] - order[c.level]);
}

function mostCommon(xs: string[]): string | null {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function buildRows(s: Scenario, ev: Evaluation, ranking: RankRow[]): LadderRow[] {
  const rankBy = new Map(ranking.map((r) => [r.investigation.id, r]));
  const scored = new Map<string, Scored>();
  const nearestBy = new Map<string, Scored>();
  const completeBy = new Map<string, Scored>();
  for (const sc of ev.comparable) {
    scored.set(sc.run.id, sc);
    if (!nearestBy.has(sc.run.investigation)) nearestBy.set(sc.run.investigation, sc);
    if (!sc.d.partialMatch && !completeBy.has(sc.run.investigation)) completeBy.set(sc.run.investigation, sc);
  }
  const limitScored = new Map(ev.limits.map((sc) => [sc.run.id, sc]));

  return INV_STATIC.map((st) => {
    const regimeRuns = st.runs.filter((r) => r.gravity === s.gravity);
    const otherRegimes = GRAVS.filter((g) => g !== s.gravity).map((g) => ({ g, n: st.runs.filter((r) => r.gravity === g).length })).filter((x) => x.n > 0);
    const comparable = regimeRuns.filter((r) => scored.has(r.id)).length;
    const near = regimeRuns.filter((r) => (scored.get(r.id)?.d.D ?? Infinity) <= VERDICT_THRESHOLDS.near + EPS).length;
    const rank = rankBy.get(st.inv.id) ?? null;
    const nearest = nearestBy.get(st.inv.id) ?? null;

    let status: RowStatus, chip: string;
    if (st.inv.tier === "T4_PLANNED") { status = "planned"; chip = "planned — not evidence"; }
    else if (st.runs.length === 0) { status = "norun"; chip = st.inv.summaryRowCount > 0 ? "PSI has summary rows only — not runs" : "no experimental table in PSI"; }
    else if (st.inv.tier === "T3_PUBLISHED" && !s.includePublished) { status = "hidden"; chip = "published — not counted (toggle off)"; }
    else if (comparable > 0) { status = "comparable"; chip = `${comparable} comparable · ${near} within NEAR`; }
    else if (regimeRuns.length === 0) { status = "otherg"; chip = `tested only in ${otherRegimes.map((o) => GRAVITY_LABEL[o.g].toLowerCase()).join(", ")}`; }
    else { status = "nocomp"; chip = mostCommon(regimeRuns.map((r) => whyNot(r, s) ?? "")) || "no comparable runs"; }

    const info = (r: Run): { kind: TickKind; level: TickLevel } => {
      const kind: TickKind = r.tier === "T4_PLANNED" ? "planned" : isLimit(r) ? "limit" : r.tier === "T3_PUBLISHED" ? "published" : "run";
      return { kind, level: "faint" };
    };
    const ticks = {} as Record<AxisKey, Tick[]>;
    for (const axis of AXIS_KEYS) {
      ticks[axis] = ticksFor(regimeRuns, axis, (r) => {
        const base = info(r);
        const sc = scored.get(r.id) ?? limitScored.get(r.id);
        if (!sc || r.tier === "T4_PLANNED") return base;
        return { ...base, level: otherAxesD(sc, axis) <= VERDICT_THRESHOLDS.near + EPS ? "solid" : "ghost" };
      });
    }
    return {
      ...st, regimeRuns, otherRegimes, status, chip, comparable, near,
      Dmin: nearest ? nearest.d.D : null, nearest, nearestComplete: completeBy.get(st.inv.id) ?? null, rank,
      axes: { o2: summarize(st, regimeRuns, "o2"), p: summarize(st, regimeRuns, "p"), flow: summarize(st, regimeRuns, "flow") },
      ticks,
    };
  });
}

const AXIS_WORD: Record<Axis, string> = { o2: "O₂", pressure: "pressure", flow: "flow" };
/** e.g. "partial: compared on O₂ + pressure only" (flow-regime mismatch says so). */
export const partialLabel = (sc: Scored) =>
  `partial: ${sc.d.flags.includes("flow-regime-mismatch") ? "flow regime differs — " : ""}compared on ${sc.d.axesUsed.map((a) => AXIS_WORD[a]).join(" + ")} only`;
export const notCompared = (sc: Scored) => (["o2", "pressure", "flow"] as Axis[]).filter((a) => !sc.d.axesUsed.includes(a));

// ------------------------------------------------------------------ fingerprint (computed)
export interface AxisPrint { axis: AxisKey; state: "varied" | "held" | "not recorded"; levels: number; min: number | null; max: number | null; n: number; total: number; basis: string; reason: string | null }
export interface Fingerprint {
  runs: number;
  axes: AxisPrint[];
  burnerFed: { n: number; min: number; max: number } | null;
  materials: { label: string; n: number }[];
  fuel: { fc: FuelClass; n: number }[];
  gravity: { g: Gravity; n: number }[];
  regimes: { regime: FlowRegime; n: number }[];
  variedCols: { col: string; distinct: number }[];
  heldCols: { col: string; value: string }[];
  identifiers: string[];
  outcomes: { label: string; n: number }[];
  measures: { label: string; unit: string; n: number }[];
  flags: { flag: Flag; n: number }[];
  placeable: number;
  charted: number;
  notPlaceable: { reason: string; n: number }[];
}

const tally = <K,>(xs: K[]) => { const m = new Map<K, number>(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };

export function fingerprint(st: InvStatic): Fingerprint {
  const { runs } = st;
  const axes: AxisPrint[] = AXIS_KEYS.map((axis) => {
    const sum = summarize(st, runs, axis);
    const vals = Array.from(new Set(runs.map((r) => r[FIELD[axis]]).filter((v): v is number => v != null)));
    const bases = tally(runs.filter((r) => r[FIELD[axis]] != null).map((r) => r[BASIS[axis]]));
    const basis = bases.map(([b, n]) => (bases.length > 1 ? `${BASIS_TEXT[b]} ${n}` : BASIS_TEXT[b])).join(" · ");
    return { axis, state: vals.length === 0 ? "not recorded" : vals.length === 1 ? "held" : "varied", levels: vals.length, min: sum.min, max: sum.max, n: sum.n, total: runs.length, basis, reason: sum.reason };
  });
  const cols = new Map<string, Set<string>>();
  for (const r of runs) for (const [k, v] of Object.entries(r.original)) {
    const t = (v ?? "").trim();
    if (!t) continue;
    if (!cols.has(k)) cols.set(k, new Set());
    cols.get(k)!.add(t);
  }
  const identifiers: string[] = [], variedCols: Fingerprint["variedCols"] = [], heldCols: Fingerprint["heldCols"] = [];
  for (const [col, set] of cols) {
    if (set.size === 1) heldCols.push({ col, value: [...set][0] });
    else if (runs.length > 2 && set.size >= runs.length * 0.9) identifiers.push(col);
    else variedCols.push({ col, distinct: set.size });
  }
  const measures = new Map<string, { label: string; unit: string; n: number }>();
  for (const r of runs) for (const [k, m] of Object.entries(r.measures ?? {})) {
    const cur = measures.get(k) ?? { label: m.label, unit: m.unit, n: 0 };
    cur.n++; measures.set(k, cur);
  }
  const placeable = runs.filter((r) => r.o2Pct != null).length;
  const charted = runs.filter((r) => r.o2Pct != null && r.pressureKPa != null).length;
  const np: string[] = [];
  for (const r of runs) {
    if (r.o2Pct != null) continue;
    np.push(isBurnerFed(r) ? "inverse flame: O₂ is the burner-fed oxidizer stream, not the ambient atmosphere" : "no O₂ value recorded in the source row");
  }
  const bfAxis = summarize(st, runs, "o2").burnerFed;
  return {
    runs: runs.length, axes, burnerFed: bfAxis,
    materials: tally(runs.map((r) => r.material?.replace(/\s+/g, " ").trim() || "not recorded")).map(([label, n]) => ({ label, n })),
    fuel: tally(runs.map((r) => r.fuelClass)).map(([fc, n]) => ({ fc, n })),
    gravity: tally(runs.map((r) => r.gravity)).map(([g, n]) => ({ g, n })),
    regimes: tally(runs.map((r) => r.flowRegime)).map(([regime, n]) => ({ regime, n })),
    variedCols: variedCols.sort((a, b) => b.distinct - a.distinct), heldCols, identifiers,
    outcomes: tally(runs.map((r) => r.outcome?.trim() || "not recorded")).map(([label, n]) => ({ label, n })),
    measures: [...measures.values()].sort((a, b) => b.n - a.n),
    flags: tally(runs.flatMap((r) => r.flags)).map(([flag, n]) => ({ flag, n })),
    placeable, charted,
    notPlaceable: tally(np).map(([reason, n]) => ({ reason, n })),
  };
}

export function axisPrintText(a: AxisPrint): string {
  const u = AXIS_UNIT[a.axis];
  const d = a.axis === "p" ? 1 : 1;
  if (a.state === "not recorded") return `not recorded${a.reason ? ` — ${a.reason}` : ""}`;
  const range = a.state === "held" ? `${fmt(a.min, d)} ${u}` : `${fmt(a.min, d)}–${fmt(a.max, d)} ${u} · ${a.levels} levels`;
  const part = a.n < a.total ? ` · ${a.n}/${a.total} recorded` : "";
  return `${range} · ${a.basis}${part}`;
}

export const gravityList = (gs: { g: Gravity; n: number }[]) => gs.map((x) => `${GRAVITY_SHORT[x.g]} ${x.n}`).join(" · ");

// ------------------------------------------------------------------ misc
export function fetchedDate(iso: string): string {
  const d = new Date(iso);
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getUTCDate()} ${M[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export const factorLabel = (k: number) => (k === 0.5 ? "½×" : k === 0.25 ? "¼×" : `${k}×`);
export const runLabel = (r: Run) => (r.source.row != null ? `${r.investigation} · row ${r.source.row}` : r.id);
export const sourceLabel = (r: Run) => `${r.source.ref}${r.source.row != null ? ` · row ${r.source.row}` : ""}${r.source.page ? ` · ${r.source.page}` : ""}`;
export const invExtra = (id: string) => SNAP.investigations.find((i) => i.id === id) ?? null;
export const summariesFor = (id: string) => SNAP.summaries.filter((x) => x.investigation === id);
export const tablesFor = (id: string) => SNAP.tableStats.filter((t) => t.investigation === id);
