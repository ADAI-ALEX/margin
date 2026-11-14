/**
 * Data tests for data/generated/snapshot.json (Kickoff §H.1–§H.3, §H.7, §H.9).
 * Ground truth for counts comes from an independent re-parse of the raw CSVs in pipeline/.cache/raw
 * (a separate, minimal parser written here — not the pipeline's).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import snapshot from "@/data/generated/snapshot.json";

const RAW = path.resolve(__dirname, "../../pipeline/.cache/raw");
const SNAP = snapshot as unknown as {
  generatedAt: string; fetchedAt: string; notice: string;
  counts: Record<string, unknown> & { totalRuns: number; distinctRuns: number; placeable: number; plottable: number; totalSummaryRows: number; byInvestigation: Record<string, number> };
  tableStats: { investigation: string; file: string; kind: string; dataRows: number; kept: number; skippedNonRunRows: number; blankLines: number; duplicates: number; columns: string[] }[];
  investigations: { id: string; acronym: string; title: string; license: string | null; licenseNote?: string; platformNote?: string; hasRunTable: boolean; runCount: number; landingUrl: string; doi: string | null }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw JSON rows are probed loosely; shape is checked by zod below
  runs: Record<string, any>[];
  summaries: { investigation: string; file: string; row: number; original: Record<string, string> }[];
};
const runs = SNAP.runs;

// ---------------------------------------------------------------- independent raw parse
function rawRows(file: string): { lines: number; blank: number; rows: string[][] } {
  const buf = readFileSync(path.join(RAW, file));
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { text = new TextDecoder("windows-1252").decode(buf); }
  text = text.replace(/^﻿/, "");
  const out: string[][] = []; let row: string[] = [], c = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; continue; }
    if (ch === '"' && c === "") q = true;
    else if (ch === ",") { row.push(c); c = ""; }
    else if (ch === "\r" || ch === "\n") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(c); out.push(row); row = []; c = ""; }
    else c += ch;
  }
  if (c || row.length) { row.push(c); out.push(row); }
  const nonBlank = out.filter((r) => r.some((x) => x.trim()));
  return { lines: out.length, blank: out.length - nonBlank.length, rows: nonBlank.slice(1) };
}
const RUN_TABLES: Record<string, { inv: string; rows: number; runs: number; distinct?: number }> = {
  "PSI-69_Experimental table_FLEX.csv": { inv: "PSI-69", rows: 274, runs: 274 },
  "PSI-39_Experimental table_CFI.csv": { inv: "PSI-39", rows: 87, runs: 87, distinct: 79 },
  "PSI-159_Experimental table_CFI-G_Normal Flames.csv": { inv: "PSI-159", rows: 179, runs: 179 },
  "PSI-159_Experimental table_CFI-G_Inverse Flames.csv": { inv: "PSI-159", rows: 154, runs: 154 },
  "PSI-10_Experimental table_Flame Design_Normal Flame.csv": { inv: "PSI-10", rows: 207, runs: 207 },
  "PSI-10_Experimental table_Flame Design_Inverse Flame.csv": { inv: "PSI-10", rows: 120, runs: 120 },
  "PSI-25_Experimental table_BASS-II.csv": { inv: "PSI-25", rows: 129, runs: 129 },
  "PSI-26_Experimental table_BASS.csv": { inv: "PSI-26", rows: 122, runs: 121 },          // 1 "SOOT Cleaning" maintenance row
  "PSI-107_Experimental table_Spice.csv": { inv: "PSI-107", rows: 469, runs: 469, distinct: 435 },
  "PSI-102_Experimental table_SAME.csv": { inv: "PSI-102", rows: 8, runs: 8 },
  "PSI-101_Experimental table_SAME-R.csv": { inv: "PSI-101", rows: 109, runs: 109 },
  "PSI-98_Experimental table_SAFFIRE-1.csv": { inv: "PSI-98", rows: 4, runs: 2 },          // 2 pre-test flow-visualisation rows
  "PSI-99_Experimental table_SAFFIRE-2.csv": { inv: "PSI-99", rows: 15, runs: 9 },         // 2 visualisation + 4 note rows
  "PSI-100_Experimental table_SAFFIRE-3.csv": { inv: "PSI-100", rows: 2, runs: 2 },
};
const SUMMARY_TABLES: Record<string, number> = {
  "PSI-68_Experimental table_Flex2.csv": 8, "PSI-106_Experimental table_Slice.csv": 12, "PSI-20_Experimental table_ACME BRE.csv": 18,
  "PSI-21_Experimental table_CLD Flame.csv": 32, "PSI-22_Experimental table_ACME E-FIELD Flames.csv": 32, "PSI-23_Experimental table_ACME s-Flame.csv": 18,
  "PSI-47_Experimental table_DAFT.csv": 2, "PSI-142_Experimental table_Data Summary Table.csv": 8,
};

describe("raw cache truth (§H.1, §H.2)", () => {
  it("22 experimental-table CSVs and 24 investigation records are cached", () => {
    const files = readdirSync(RAW);
    expect(files.filter((f) => f.endsWith(".csv"))).toHaveLength(22);
    expect(files.filter((f) => f.endsWith(".record.json"))).toHaveLength(24);
    expect(Object.keys(RUN_TABLES).length + Object.keys(SUMMARY_TABLES).length).toBe(22);
  });
  it("per-table data rows match the raw CSV (CFI-G inverse: 154 rows + 861 blank lines)", () => {
    for (const [f, t] of Object.entries(RUN_TABLES)) expect(rawRows(f).rows.length, f).toBe(t.rows);
    for (const [f, n] of Object.entries(SUMMARY_TABLES)) expect(rawRows(f).rows.length, f).toBe(n);
    const inv = rawRows("PSI-159_Experimental table_CFI-G_Inverse Flames.csv");
    expect(inv.blank).toBe(861);
    expect(inv.rows.length + 1 + inv.blank).toBe(1016);
  });
  it("1,879 non-blank run-table rows = 1,870 runs + 9 non-run rows (8 Saffire note/visualisation rows + 1 BASS maintenance row)", () => {
    const total = Object.keys(RUN_TABLES).reduce((a, f) => a + rawRows(f).rows.length, 0);
    expect(total).toBe(1879);
    expect(total - 8).toBe(1871); // the prototype's "run rows" figure (Saffire notes removed)
    expect(Object.values(RUN_TABLES).reduce((a, t) => a + t.runs, 0)).toBe(1870);
  });
});

describe("snapshot counts reconcile (§H.2)", () => {
  it("per table: kept runs, skipped rows, blank lines, duplicates", () => {
    for (const [f, t] of Object.entries(RUN_TABLES)) {
      const ts = SNAP.tableStats.find((x) => x.file === f)!;
      expect(ts, f).toBeTruthy();
      expect(ts.dataRows, f).toBe(t.rows);
      expect(ts.kept, f).toBe(t.runs);
      expect(ts.kept + ts.skippedNonRunRows, f).toBe(ts.dataRows);
      expect(runs.filter((r) => r.source.ref === f).length, f).toBe(t.runs);
      const distinct = runs.filter((r) => r.source.ref === f && !r.flags.includes("duplicate-row")).length;
      expect(distinct, f).toBe(t.distinct ?? t.runs);
    }
    for (const [f, n] of Object.entries(SUMMARY_TABLES)) expect(SNAP.summaries.filter((s) => s.file === f)).toHaveLength(n);
  });
  it("counts object", () => {
    const c = SNAP.counts;
    expect(c.totalRuns).toBe(runs.length);
    expect(c.totalRuns).toBe(1870);
    expect(c.totalSummaryRows).toBe(130);
    expect(c.distinctRuns).toBe(runs.filter((r) => !r.flags.includes("duplicate-row")).length);
    expect(c.distinctRuns).toBe(1870 - 34 - 8);
    expect(c.placeable).toBe(runs.filter((r) => r.o2Pct != null).length);
    expect(c.plottable).toBe(runs.filter((r) => r.o2Pct != null && r.pressureKPa != null).length);
    expect(Object.values(c.byInvestigation).reduce((a, b) => a + b, 0)).toBe(c.totalRuns);
    expect(SNAP.tableStats.reduce((a, t) => a + (t.kind === "run" ? t.kept : 0), 0)).toBe(c.totalRuns);
    expect(c.maxSolidO2).toBe(Math.max(...runs.filter((r) => r.fuelClass.startsWith("solid") && r.o2Pct != null).map((r) => r.o2Pct)));
  });
  it("FLEX outcome and fuel distribution (§H.2)", () => {
    const flex = runs.filter((r) => r.investigation === "PSI-69");
    const n = (k: string, v: unknown) => flex.filter((r) => r[k] === v).length;
    expect([n("outcome", "extinguished"), n("outcome", "disruption"), n("outcome", "completed")]).toEqual([186, 61, 27]);
    expect([n("material", "Methanol"), n("material", "Heptane")]).toEqual([157, 117]);
  });
  it("SPICE: 469 rows, 435 distinct; every duplicate points at its first occurrence", () => {
    const sp = runs.filter((r) => r.investigation === "PSI-107");
    expect(sp).toHaveLength(469);
    expect(sp.filter((r) => !r.flags.includes("duplicate-row"))).toHaveLength(435);
    const byRow = new Map(sp.map((r) => [r.source.row, r]));
    for (const r of sp.filter((x) => x.flags.includes("duplicate-row"))) {
      const first = Number(r.note.match(/duplicate of row (\d+)/)[1]);
      expect(first).toBeLessThan(r.source.row);
      expect(byRow.get(first)!.original).toEqual(r.original);
    }
  });
});

describe("every run is well-formed and traceable (§H.3, §H.9)", () => {
  it("ids unique; source has ref + row + url; original non-empty; T1 + micro", () => {
    expect(new Set(runs.map((r) => r.id)).size).toBe(runs.length);
    for (const r of runs) {
      expect(r.source.kind).toBe("psi-table");
      expect(r.source.ref).toMatch(/^PSI-\d+_Experimental table_.+\.csv$/);
      expect(Number.isInteger(r.source.row) && r.source.row >= 1).toBe(true);
      expect(r.source.url).toBe(`https://psi.nasa.gov/physci/repo/data/investigations/${r.investigation}`);
      expect(Object.keys(r.original).length).toBeGreaterThan(0);
      expect(r.tier).toBe("T1_PSI_RUN"); expect(r.gravity).toBe("micro");
    }
  });
  it("o2 in (0, 100]; pressure > 0 or null; flow ≥ 0 or null; no NaN / non-finite anywhere", () => {
    for (const r of runs) {
      if (r.o2Pct != null) { expect(r.o2Pct).toBeGreaterThan(0); expect(r.o2Pct).toBeLessThanOrEqual(100); }
      if (r.pressureKPa != null) expect(r.pressureKPa).toBeGreaterThan(0);
      if (r.flowCmS != null) expect(r.flowCmS).toBeGreaterThanOrEqual(0);
      for (const k of ["o2Pct", "pressureKPa", "flowCmS"]) if (r[k] != null) expect(Number.isFinite(r[k])).toBe(true);
      for (const m of Object.values(r.measures) as { value: number }[]) expect(Number.isFinite(m.value)).toBe(true);
    }
    expect(JSON.stringify(SNAP)).not.toMatch(/NaN|Infinity|�/);
  });
  it("basis and value agree: null ⇔ basis unknown", () => {
    for (const r of runs) {
      expect(r.o2Pct == null).toBe(r.o2Basis === "unknown");
      expect(r.pressureKPa == null).toBe(r.pressureBasis === "unknown");
      expect(r.flowCmS == null).toBe(r.flowBasis === "unknown");
    }
  });
  it("every converted field has a matching conversions[] entry (§H.3)", () => {
    for (const r of runs) {
      if (r.pressureBasis === "measured") expect(r.conversions.some((c: { field: string }) => c.field === "pressureKPa"), r.id).toBe(true);
      if (["PSI-69", "PSI-39", "PSI-159", "PSI-10"].includes(r.investigation) && r.o2Pct != null) expect(r.conversions.some((c: { field: string }) => c.field === "o2Pct"), r.id).toBe(true);
    }
  });
  it("every investigation referenced by a run exists; investigations have a short name, not just the accession", () => {
    const ids = new Set(SNAP.investigations.map((i) => i.id));
    expect(ids.size).toBe(24);
    for (const r of runs) expect(ids.has(r.investigation)).toBe(true);
    for (const s of SNAP.summaries) expect(ids.has(s.investigation)).toBe(true);
    for (const i of SNAP.investigations) { expect(i.acronym).not.toBe(i.id); expect(i.runCount).toBe(runs.filter((r) => r.investigation === i.id).length); expect(i.hasRunTable).toBe(i.runCount > 0); }
    for (const id of ["PSI-60", "PSI-62", "PSI-115", "PSI-117"]) expect(SNAP.investigations.find((i) => i.id === id)!.hasRunTable).toBe(false);
  });
});

describe("flags are consistent with values (§C.3)", () => {
  it("nominal-stated ⇒ nominal-value flag; nominal-value ⇒ some nominal-stated basis", () => {
    for (const r of runs) {
      const nominal = [r.o2Basis, r.pressureBasis, r.flowBasis].includes("nominal-stated");
      expect(r.flags.includes("nominal-value"), r.id).toBe(nominal);
    }
  });
  it("burner-fed-oxidizer ⇔ inverse-flame file, and ⇒ o2Pct null", () => {
    for (const r of runs) {
      expect(r.flags.includes("burner-fed-oxidizer"), r.id).toBe(/Inverse/.test(r.source.ref));
      if (r.flags.includes("burner-fed-oxidizer")) expect(r.o2Pct).toBeNull();
    }
  });
  it("derived-value only on Saffire-II O₂ (PSI table Note 1)", () => {
    const d = runs.filter((r) => r.flags.includes("derived-value"));
    expect(d.length).toBe(9);
    for (const r of d) { expect(r.investigation).toBe("PSI-99"); expect(r.note).toMatch(/derived from measured CO₂/); }
  });
  it("approximate ⇔ the source cell has '~', a range, or an 'approx' header", () => {
    for (const r of runs.filter((x) => x.flags.includes("approximate"))) {
      const cells = Object.entries(r.original).map(([k, v]) => `${k}=${v}`).join(" | ");
      expect(cells, r.id).toMatch(/~|\d\s*(-|to)\s*\d|approx/i);
    }
  });
  it("range cells keep the first value (never a midpoint)", () => {
    const s1 = runs.find((r) => r.id === "PSI-98:r0001")!;
    expect(s1.original["Percent O2"]).toBe("21.5 - 21.7");
    expect(s1.o2Pct).toBe(21.5);
    const s28 = runs.find((r) => r.id === "PSI-99:r0008")!;
    expect(s28.original["Percent O2 (Note 1)"]).toBe("22.1 to 22.0");
    expect(s28.o2Pct).toBe(22.1);
  });
  it("assumed-value ⇔ quiescent regime assigned from experiment design (FLEX, CFI, gas burners); speed stays null", () => {
    for (const r of runs) {
      const quiescentDesign = ["PSI-69", "PSI-39", "PSI-159", "PSI-10"].includes(r.investigation);
      expect(r.flags.includes("assumed-value"), r.id).toBe(quiescentDesign);
      if (quiescentDesign) { expect(r.flowRegime).toBe("quiescent"); expect(r.flowCmS).toBeNull(); }
    }
  });
  it("duplicate-row ⇒ note naming the first row", () => {
    for (const r of runs.filter((x) => x.flags.includes("duplicate-row"))) expect(r.note).toMatch(/Exact duplicate of row \d+/);
  });
});

describe("normalisation rules (§H.3)", () => {
  it("BASS-II uses the initial O₂ (13.6–22.2); implausible final O₂ flagged and never stored as a measure", () => {
    const b = runs.filter((r) => r.investigation === "PSI-25");
    const o2 = b.map((r) => r.o2Pct);
    expect(Math.min(...o2)).toBe(13.6); expect(Math.max(...o2)).toBe(22.2);
    for (const id of ["PSI-25:r0097", "PSI-25:r0128"]) { const r = b.find((x) => x.id === id)!; expect(r.flags).toContain("out-of-range"); expect(r.measures.o2Final).toBeUndefined(); }
    for (const r of b) if (r.measures.o2Final) expect(Math.abs(r.measures.o2Final.value - r.o2Pct)).toBeLessThanOrEqual(5);
    const finalLow = b.filter((r) => { const f = parseFloat(r.original["Calibrated final O2 % by vol"]); return Number.isFinite(f) && Math.abs(f - r.o2Pct) > 5; });
    expect(finalLow.length).toBeGreaterThanOrEqual(5); // 39.1, 40.4 (above) and 1.6, 0.9, 0.6 (below)
    for (const r of finalLow) expect(r.flags).toContain("out-of-range");
  });
  it("FLEX 0 mmHg → null + out-of-range; mmHg × 0.133322; mole fraction × 100", () => {
    const z = runs.find((r) => r.id === "PSI-69:r0114")!;
    expect(z.original["Ambient pressure; mmHg"]).toBe("0"); expect(z.pressureKPa).toBeNull(); expect(z.flags).toContain("out-of-range");
    const r1 = runs.find((r) => r.id === "PSI-69:r0001")!;
    expect(r1.pressureKPa).toBeCloseTo(757.7 * 0.133322, 3);
    expect(r1.o2Pct).toBe(21);
  });
  it("SPICE negative air rate → null + out-of-range (8 rows)", () => {
    const neg = runs.filter((r) => r.investigation === "PSI-107" && parseFloat(r.original["Air Rate (cm/s)"]) < 0);
    expect(neg).toHaveLength(8);
    for (const r of neg) { expect(r.flowCmS).toBeNull(); expect(r.flags).toContain("out-of-range"); }
  });
  it("CFI '1 atm' → 101.325 kPa, text-parsed, flagged as a set point (nominal-stated)", () => {
    const r = runs.find((x) => x.investigation === "PSI-39" && x.original.Pressure === "1 atm")!;
    expect(r.pressureKPa).toBe(101.325); expect(r.flags).toEqual(expect.arrayContaining(["text-parsed", "nominal-value"]));
  });
  it("Saffire '20 cm/s' → 20 + text-parsed; '~ 22.1' → 22.1 + approximate", () => {
    const r = runs.find((x) => x.id === "PSI-99:r0002")!;
    expect(r.flowCmS).toBe(20); expect(r.o2Pct).toBe(22.1);
    expect(r.flags).toEqual(expect.arrayContaining(["text-parsed", "approximate"]));
  });
  it("FLEX: 'CO' column logged as CO₂ interpretation; burning rate kept with suspect-unit", () => {
    const r = runs.find((x) => x.id === "PSI-69:r0114")!;
    expect(r.conversions.some((c: { field: string; formula: string }) => c.field === "measures.co2" && /interpreted as CO₂/.test(c.formula))).toBe(true);
    const withBr = runs.filter((x) => x.investigation === "PSI-69" && x.measures.burningRate);
    expect(withBr.length).toBeGreaterThan(0);
    for (const x of withBr) expect(x.flags).toContain("suspect-unit");
  });
  it("outcomes use the Kickoff enum (raw text stays in original)", () => {
    const allowed = new Set(["ignited", "extinguished", "self-extinguished", "flow-terminated", "completed", "not-ignited", "disruption", "other", null]);
    for (const r of runs) expect(allowed.has(r.outcome), `${r.id}: ${r.outcome}`).toBe(true);
  });
  it("summary rows are never runs; multi-value cells appear only in summaries", () => {
    const summaryFiles = new Set(Object.keys(SUMMARY_TABLES));
    for (const r of runs) expect(summaryFiles.has(r.source.ref)).toBe(false);
    for (const r of runs) for (const k of ["o2Pct", "pressureKPa", "flowCmS"]) if (r[k] != null) expect(typeof r[k]).toBe("number");
  });
  it("fuel classes follow the documented material rule (pipeline/mappings/materials.mjs)", () => {
    const fc = (id: string) => runs.find((r) => r.id === id)!.fuelClass;
    const byMat = (m: string) => runs.filter((r) => r.material === m).map((r) => r.fuelClass);
    expect(new Set(byMat("1/4\" clear rod"))).toEqual(new Set(["solid-thick"]));
    expect(new Set(byMat("2 cm SIBAL"))).toEqual(new Set(["solid-thin"]));
    expect(new Set(byMat("1 cm wide PMMA 2 mm thick"))).toEqual(new Set(["solid-unknown"])); // 0.2 < 2 < 5.2 mm
    expect(new Set(byMat("2 cm 0.1 mm PMMA film"))).toEqual(new Set(["solid-thin"]));
    expect(fc("PSI-99:r0006")).toBe("solid-unknown"); // blank material cell, not inferred
    expect(runs.some((r) => /soot cleaning/i.test(r.material ?? ""))).toBe(false);
    for (const r of runs.filter((x) => /candle|wax/i.test(x.material ?? ""))) expect(r.materialGroup).toBe("wax-candle");
  });
});

describe("investigation metadata (F-21, accession-only acronyms)", () => {
  it("PSI-10 licence is null with an explicit note; Saffire-I/III platform note quotes the Cygnus burn", () => {
    const fd = SNAP.investigations.find((i) => i.id === "PSI-10")!;
    expect(fd.license).toBeNull(); expect(fd.licenseNote).toBe("Licence not stated in PSI record");
    for (const id of ["PSI-98", "PSI-100"]) expect(SNAP.investigations.find((i) => i.id === id)!.platformNote).toMatch(/Cygnus resupply vehicle after it deberthed from the ISS/);
  });
  it("short names derived from the PSI title for PSI-60, 62, 115, 117, 142", () => {
    for (const id of ["PSI-60", "PSI-62", "PSI-115", "PSI-117", "PSI-142"]) {
      const i = SNAP.investigations.find((x) => x.id === id)! as { acronym: string; acronymSource?: string };
      expect(i.acronym).not.toBe(id); expect(i.acronymSource).toBe("derived-from-title");
    }
  });
});

describe("snapshot shape (zod)", () => {
  const basis = z.enum(["measured", "nominal-stated", "limit-reported", "unknown"]);
  const flag = z.enum(["ambiguous-unit", "out-of-range", "missing", "sentinel", "approximate", "text-parsed", "nominal-value", "unverified-transcription", "conflicting-sources", "limit-value", "duplicate-row", "derived-value", "suspect-unit", "burner-fed-oxidizer", "assumed-value"]);
  const numOrNull = z.number().finite().nullable();
  const Run = z.object({
    id: z.string().min(1), investigation: z.string().regex(/^PSI-\d+$/), tier: z.literal("T1_PSI_RUN"),
    fuelClass: z.enum(["solid-thin", "solid-thick", "solid-unknown", "liquid-droplet", "gas-burner", "gas-jet", "smoke-source", "none"]),
    material: z.string().nullable(), gravity: z.enum(["micro", "moon", "mars", "earth"]),
    o2Pct: numOrNull, o2Basis: basis, pressureKPa: numOrNull, pressureBasis: basis, flowCmS: numOrNull, flowBasis: basis,
    flowRegime: z.enum(["quiescent", "opposed", "concurrent", "coflow", "natural-convection", "unknown"]),
    outcome: z.string().nullable(),
    measures: z.record(z.object({ value: z.number().finite(), unit: z.string(), label: z.string() })),
    original: z.record(z.string()),
    conversions: z.array(z.object({ field: z.string(), from: z.string(), to: z.string(), formula: z.string() })),
    flags: z.array(flag), note: z.string().optional(),
    source: z.object({ kind: z.literal("psi-table"), ref: z.string(), row: z.number().int().positive(), url: z.string().url(), quote: z.string().optional(), page: z.string().optional() }),
  }).passthrough();
  const Inv = z.object({
    id: z.string(), acronym: z.string().min(1), title: z.string().min(1), tier: z.literal("T2_PSI_RECORD"),
    platform: z.string().nullable(), hardware: z.string().nullable(), pi: z.string().nullable(), doi: z.string().nullable(), license: z.string().nullable(),
    landingUrl: z.string().url(), startDate: z.string().nullable(), endDate: z.string().nullable(), objective: z.string().nullable(),
    publicationsCount: z.number().int(), hasRunTable: z.boolean(), runCount: z.number().int(), summaryRowCount: z.number().int(),
    scale: z.enum(["large", "bench", "ground"]),
  }).passthrough();
  const Snap = z.object({
    generatedAt: z.string(), fetchedAt: z.string(), notice: z.string(),
    counts: z.object({ totalRuns: z.number().int(), distinctRuns: z.number().int(), placeable: z.number().int(), plottable: z.number().int(), totalSummaryRows: z.number().int(), solidRuns: z.number().int(), solidRunsWithO2: z.number().int(), solidRunsAboveMax: z.number().int(), maxSolidO2: z.number(), maxSolidO2Runs: z.array(z.string()), partialGravityRuns: z.number().int(), byInvestigation: z.record(z.number().int()) }).passthrough(),
    tableStats: z.array(z.object({ investigation: z.string(), file: z.string(), kind: z.enum(["run", "summary"]), dataRows: z.number().int(), kept: z.number().int(), skippedNonRunRows: z.number().int(), columns: z.array(z.string()) }).passthrough()).length(22),
    investigations: z.array(Inv).length(24),
    runs: z.array(Run),
    summaries: z.array(z.object({ investigation: z.string(), file: z.string(), row: z.number().int(), original: z.record(z.string()) })),
  });
  it("validates", () => {
    const res = Snap.safeParse(SNAP);
    if (!res.success) throw new Error(JSON.stringify(res.error.issues.slice(0, 5), null, 1));
    expect(res.success).toBe(true);
  });
  it("stays a reasonable browser payload (< 2.6 MB)", () => {
    expect(JSON.stringify(SNAP).length).toBeLessThan(2.6e6);
  });
});
