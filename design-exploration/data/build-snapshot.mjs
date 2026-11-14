// Prototype-only normalizer: PSI cache -> design-exploration/data/snapshot.json
// Implements a SUBSET of Kickoff Pack §C.3 rules, enough for design evaluation.
// The production pipeline (pipeline/, WS1) replaces this with per-table mappers + golden tests.
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(here, ".cache", "raw");
const KPA = { atm: 101.325, bar: 100, mmHg: 0.133322 };

function decode(buf) {
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); }
  catch { text = new TextDecoder("windows-1252").decode(buf); }
  return text.replace(/^﻿/, "").replace(/^ï»¿/, "");
}
function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"' && cell === "") q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}
async function table(file) {
  const rows = parseCSV(decode(await readFile(path.join(RAW, file))));
  const header = rows[0].map((h) => h.replace(/\s+/g, " ").trim());
  return { header, rows: rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()]))) };
}
const col = (row, re) => { const k = Object.keys(row).find((h) => re.test(h)); return k ? row[k] : ""; };
function num(raw) {
  const s = String(raw ?? "").trim();
  if (!s || /^(n\/a|none|-|ramped|insignificant)$/i.test(s)) return { v: null, flags: s ? ["missing"] : ["missing"] };
  if (s === "-999") return { v: null, flags: ["sentinel"] };
  const range = s.match(/^~?\s*(-?\d*\.?\d+)\s*(?:-|to)\s*(-?\d*\.?\d+)$/);
  if (range) return { v: parseFloat(range[1]), flags: ["approximate", "text-parsed"], note: "first value of a reported range (both ends kept in original)" };
  const m = s.match(/^(~)?\s*(-?\d*\.?\d+)\s*([a-zA-Z/%]*)\s*$/);
  if (!m) return { v: null, flags: ["missing"] };
  const flags = [];
  if (m[1]) flags.push("approximate");
  if (m[3]) flags.push("text-parsed");
  return { v: parseFloat(m[2]), unit: m[3] || null, flags };
}
const psiUrl = (id) => `https://psi.nasa.gov/physci/repo/data/investigations/${id}`;

// Lead-reviewed material lookup (prototype version of pipeline/mappings/materials.ts; rule per Kickoff §C.3-8)
function fuelClassOf(mat, thicknessMm) {
  const m = (mat || "").toLowerCase();
  if (/sibal|cotton/.test(m)) return "solid-thin";
  if (/rod|sphere|spherical/.test(m)) return "solid-thick";
  const micron = m.match(/(\d+)\s*micron/); const mmFilm = m.match(/(\d*\.?\d+)\s*mm\s*(pmma\s*)?film/); const mmThick = m.match(/(\d*\.?\d+)\s*mm\s*thick/);
  let t = thicknessMm ?? null;
  if (micron) t = parseInt(micron[1]) / 1000; else if (mmFilm) t = parseFloat(mmFilm[1]); else if (mmThick) t = parseFloat(mmThick[1]);
  if (/pmma|film/.test(m) && t != null) { if (t <= 0.2) return "solid-thin"; if (t >= 1) return "solid-thick"; }
  if (/pmma/.test(m) && /slab/.test(m)) return "solid-thick";
  return "solid-unknown";
}

const NOMINAL = {
  "PSI-25": { kpa: 101.325, statement: "Tests at ISS cabin pressure; O2 varied by N2 dilution of the MSG working volume", source: "BASS-II Summary Report, NASA/TM-20210011385 (as summarised in Discovery R3 §1; quote not yet verified)" },
  "PSI-98": { kpa: 101.325, statement: "Cygnus cabin pressure", source: "Ferkul et al., ICES-2017, NTRS 20170008805 (as summarised in Discovery R3 §1; quote not yet verified)" },
};

function baseRun(id, file, rowIdx, row) {
  return {
    id: `${id}:r${String(rowIdx).padStart(4, "0")}`, investigation: id, tier: "T1_PSI_RUN",
    fuelClass: "solid-unknown", material: null, gravity: "micro",
    o2Pct: null, o2Basis: "unknown", pressureKPa: null, pressureBasis: "unknown",
    flowCmS: null, flowBasis: "unknown", flowRegime: "unknown",
    outcome: null, measures: {}, original: Object.fromEntries(Object.entries(row).filter(([, v]) => v !== "")),
    conversions: [], flags: [],
    source: { kind: "psi-table", ref: file, row: rowIdx, url: psiUrl(id) },
  };
}
function applyNominal(run) {
  const n = NOMINAL[run.investigation];
  if (!n || run.pressureKPa != null) return;
  run.pressureKPa = n.kpa; run.pressureBasis = "nominal-stated";
  run.flags.push("nominal-value", "unverified-transcription");
  run.note = `Pressure is nominal (stated), not measured. Paraphrase, not a quote: ${n.statement} — ${n.source}`;
}
const uniq = (a) => [...new Set(a)];

const runs = []; const tableStats = []; const summaries = [];
async function map(id, file, fn, kind = "run") {
  const t = await table(file);
  let kept = 0, skipped = 0;
  t.rows.forEach((row, i) => {
    if (kind === "summary") { summaries.push({ investigation: id, file, row: i + 1, original: row }); kept++; return; }
    const r = baseRun(id, file, i + 1, row);
    const ok = fn(r, row);
    if (ok === false) { skipped++; return; }
    r.flags = uniq(r.flags); runs.push(r); kept++;
  });
  tableStats.push({ investigation: id, file, kind, dataRows: t.rows.length, kept, skippedNonRunRows: skipped, columns: t.header });
}

// ---- BASS-II (PSI-25) ----
await map("PSI-25", "PSI-25_Experimental table_BASS-II.csv", (r, row) => {
  if (/fuel sample material/i.test(row["Fuel Sample Material"])) return false; // repeated header line
  r.material = row["Fuel Sample Material"] || null;
  r.fuelClass = fuelClassOf(r.material);
  const o2 = num(col(row, /initial O2/i)), o2f = num(col(row, /final O2/i));
  if (o2.v != null && o2.v > 0 && o2.v <= 100) { r.o2Pct = o2.v; r.o2Basis = "measured"; } else r.flags.push("missing");
  if (o2f.v != null && o2.v != null && o2f.v > o2.v + 1) r.flags.push("out-of-range");
  r.flowBasis = "unknown"; r.flowRegime = "unknown"; r.flags.push("ambiguous-unit");
  r.note = "Flow recorded as uncalibrated fan/air display values; not converted to cm/s in the prototype (PSI 'Fan calibration data.xlsx' mapping pending).";
  for (const [k, re, unit] of [["co2Initial", /Initial CO2/i, "% vol"], ["coFinal", /Final CO \(ppm\)/i, "ppm"], ["o2Final", /final O2/i, "% vol"]]) {
    const v = num(col(row, re)); if (v.v != null) r.measures[k] = { value: v.v, unit, label: k };
  }
  applyNominal(r);
});
// ---- BASS (PSI-26): material only ----
await map("PSI-26", "PSI-26_Experimental table_BASS.csv", (r, row) => {
  r.material = row["Fuel Sample Material"] || null; r.fuelClass = fuelClassOf(r.material);
  r.flags.push("missing"); r.note = "PSI table records date, test and material only — no O2, pressure or flow columns.";
});
// ---- Saffire I/II/III ----
for (const [id, file] of [["PSI-98", "PSI-98_Experimental table_SAFFIRE-1.csv"], ["PSI-99", "PSI-99_Experimental table_SAFFIRE-2.csv"], ["PSI-100", "PSI-100_Experimental table_SAFFIRE-3.csv"]]) {
  await map(id, file, (r, row) => {
    const sample = col(row, /^Sample Number/i);
    if (!/^(S\d|\d-\d)/.test(sample)) return false; // notes / pre-test visualisation rows
    r.material = row["Material"] || null;
    const th = num(col(row, /Th?ickness/i));
    const thMm = th.v == null ? null : /cm/.test(col(row, /Th?ickness/i)) || /\(cm\)/.test(Object.keys(row).find((k) => /Th?ickness/i.test(k)) || "") ? th.v * 10 : th.v;
    r.fuelClass = fuelClassOf(r.material, thMm);
    if (/pmma/i.test(r.material) && thMm != null && thMm >= 1) r.fuelClass = "solid-thick";
    const o2raw = col(row, /O2/i);
    const o2 = num(o2raw);
    if (o2.v != null) { r.o2Pct = o2.v; r.o2Basis = "measured"; r.flags.push(...o2.flags); if (o2.note) r.conversions.push({ field: "o2Pct", from: o2raw, to: String(o2.v), formula: o2.note }); }
    else r.flags.push("missing");
    const flowRaw = col(row, /Air Flow/i);
    const fl = num(flowRaw);
    if (fl.v != null) { r.flowCmS = fl.v; r.flowBasis = "measured"; r.flags.push(...fl.flags); }
    const dir = col(row, /Direction/i).toLowerCase();
    r.flowRegime = dir.includes("concurrent") ? "concurrent" : dir.includes("opposed") ? "opposed" : "unknown";
    const bt = num(col(row, /^Burn Time/i));
    if (bt.v != null) r.measures.burnTime = { value: bt.v, unit: "s", label: "burn time" };
    else if (col(row, /^Burn Time/i)) r.outcome = col(row, /^Burn Time/i); // e.g. "Insignificant"
    if (id === "PSI-99" && r.o2Pct != null) r.note = (r.note ? r.note + " " : "") + "O₂ derived from measured CO₂ production, referenced to ISS-reported initial O₂ (PSI table Note 1).";
    applyNominal(r);
  });
}
// ---- FLEX (PSI-69) ----
await map("PSI-69", "PSI-69_Experimental table_FLEX.csv", (r, row) => {
  r.fuelClass = "liquid-droplet"; r.material = row["Fuel"] || null; r.flowRegime = "quiescent"; r.flowCmS = 0; r.flowBasis = "nominal-stated";
  const p = num(col(row, /Ambient pressure/i));
  if (p.v != null && p.v > 0) { r.pressureKPa = +(p.v * KPA.mmHg).toFixed(3); r.pressureBasis = "measured"; r.conversions.push({ field: "pressureKPa", from: `${p.v} mmHg`, to: `${r.pressureKPa} kPa`, formula: "× 0.133322" }); }
  else r.flags.push(p.v === 0 ? "out-of-range" : "missing");
  const o2 = num(col(row, /^O initial/i));
  if (o2.v != null && o2.v > 0 && o2.v <= 1) { r.o2Pct = +(o2.v * 100).toFixed(3); r.o2Basis = "measured"; r.conversions.push({ field: "o2Pct", from: `${o2.v} mole fraction`, to: `${r.o2Pct} %`, formula: "× 100" }); }
  else r.flags.push("missing");
  r.outcome = row["Test end"] || null;
  for (const [k, re, unit] of [["dropletD0", /Droplet initial diameter/i, "mm"], ["extinctionD", /extinction diameter/i, "mm"], ["burnTime", /Burn time/i, "s"], ["co2", /^CO initial/i, "mole fraction"], ["he", /^He initial/i, "mole fraction"]]) {
    const v = num(col(row, re)); if (v.v != null) r.measures[k] = { value: v.v, unit, label: k };
  }
});
// ---- CFI (PSI-39) ----
await map("PSI-39", "PSI-39_Experimental table_CFI.csv", (r, row) => {
  r.fuelClass = "liquid-droplet"; r.material = col(row, /^Fuel/i) || null; r.flowRegime = "quiescent"; r.flowCmS = 0; r.flowBasis = "nominal-stated";
  const praw = row["Pressure"]; const p = num(praw);
  if (p.v != null && /atm/i.test(praw)) { r.pressureKPa = +(p.v * KPA.atm).toFixed(3); r.pressureBasis = "measured"; r.flags.push("text-parsed"); r.conversions.push({ field: "pressureKPa", from: praw, to: `${r.pressureKPa} kPa`, formula: "× 101.325" }); }
  else r.flags.push("missing");
  const o2 = num(row["Oxygen"]);
  if (o2.v != null && o2.v > 0 && o2.v <= 1) { r.o2Pct = +(o2.v * 100).toFixed(3); r.o2Basis = "measured"; r.conversions.push({ field: "o2Pct", from: `${o2.v} mole fraction`, to: `${r.o2Pct} %`, formula: "× 100" }); }
  else r.flags.push("missing");
});
// ---- ACME CFI-G (PSI-159) and Flame Design (PSI-10): gas burners ----
for (const [id, file, o2re, pre, punit] of [
  ["PSI-159", "PSI-159_Experimental table_CFI-G_Normal Flames.csv", /XO2 before/i, /approx p/i, "bar"],
  ["PSI-159", "PSI-159_Experimental table_CFI-G_Inverse Flames.csv", /^XO2$/i, /approx p/i, "bar"],
  ["PSI-10", "PSI-10_Experimental table_Flame Design_Normal Flame.csv", /XO2 \(init\)/i, /pmean/i, "atm"],
  ["PSI-10", "PSI-10_Experimental table_Flame Design_Inverse Flame.csv", /^XO2$/i, /pmean/i, "atm"],
]) {
  await map(id, file, (r, row) => {
    r.id = `${id}:${/Inverse/.test(file) ? "inv" : "nor"}:r${r.source.row.toString().padStart(4, "0")}`;
    r.fuelClass = "gas-burner"; r.material = row["Fuel"] || (/Flame Design/.test(file) ? "C2H4" : null); r.flowRegime = "quiescent"; r.flowCmS = 0; r.flowBasis = "nominal-stated";
    const o2 = num(col(row, o2re));
    if (/Inverse/.test(file)) {
      // Inverse flame: O₂ is fed through the burner into a fuel/diluent chamber — NOT the ambient atmosphere.
      if (o2.v != null) r.measures.oxidizerXO2 = { value: +(o2.v * 100).toFixed(3), unit: "% O₂ (burner-fed oxidizer)", label: "oxidizer-stream O₂ — inverse flame, not ambient" };
      r.flags.push("missing");
      r.note = "Inverse flame: the O₂ value is the burner-fed oxidizer stream, not the chamber atmosphere, so it is not placed on the ambient O₂ axis.";
    } else if (o2.v != null && o2.v > 0 && o2.v <= 1) { r.o2Pct = +(o2.v * 100).toFixed(3); r.o2Basis = "measured"; r.conversions.push({ field: "o2Pct", from: `${o2.v} mole fraction`, to: `${r.o2Pct} %`, formula: "× 100" }); }
    else r.flags.push("missing");
    const p = num(col(row, pre));
    if (p.v != null && p.v > 0) { r.pressureKPa = +(p.v * KPA[punit]).toFixed(3); r.pressureBasis = "measured"; r.conversions.push({ field: "pressureKPa", from: `${p.v} ${punit}`, to: `${r.pressureKPa} kPa`, formula: `× ${KPA[punit]}` }); if (/approx/i.test(Object.keys(row).find((k) => pre.test(k)) || "")) r.flags.push("approximate"); }
    else r.flags.push("missing");
    r.outcome = col(row, /Self.?-?ext/i) || col(row, /Hot ignition/i) || null;
    const tad = num(col(row, /Tad/i)); if (tad.v != null) r.measures.tad = { value: tad.v, unit: "K", label: "Tad — computed (as reported in PSI)" };
  });
}
// ---- SPICE (PSI-107): gas jet in coflow, no O2/pressure columns ----
await map("PSI-107", "PSI-107_Experimental table_Spice.csv", (r, row) => {
  r.fuelClass = "gas-jet"; r.material = row["Fuel"] || null; r.flowRegime = "coflow";
  const f = num(col(row, /Air Rate/i));
  if (f.v != null && f.v >= 0) { r.flowCmS = f.v; r.flowBasis = "measured"; } else r.flags.push(f.v != null ? "out-of-range" : "missing");
  r.flags.push("missing");
});
// ---- SAME (PSI-102), SAME-R (PSI-101): smoke sources, flow only ----
await map("PSI-102", "PSI-102_Experimental table_SAME.csv", (r, row) => {
  r.fuelClass = "smoke-source"; r.material = col(row, /Sample Material/i) || null;
  const f = num(col(row, /Air Flow/i)); if (f.v != null) { r.flowCmS = f.v; r.flowBasis = "measured"; r.flowRegime = f.v === 0 ? "quiescent" : "unknown"; }
  r.flags.push("missing");
});
await map("PSI-101", "PSI-101_Experimental table_SAME-R.csv", (r, row) => {
  r.fuelClass = "smoke-source"; r.material = row["Sample Type"] || null;
  const f = num(col(row, /Inlet velocity/i)); if (f.v != null) { r.flowCmS = f.v; r.flowBasis = "measured"; r.flowRegime = f.v === 0 ? "quiescent" : "unknown"; }
  r.flags.push("missing");
});
// ---- Summary tables (never runs) ----
for (const [id, file] of [["PSI-68", "PSI-68_Experimental table_Flex2.csv"], ["PSI-106", "PSI-106_Experimental table_Slice.csv"], ["PSI-20", "PSI-20_Experimental table_ACME BRE.csv"], ["PSI-21", "PSI-21_Experimental table_CLD Flame.csv"], ["PSI-22", "PSI-22_Experimental table_ACME E-FIELD Flames.csv"], ["PSI-23", "PSI-23_Experimental table_ACME s-Flame.csv"], ["PSI-47", "PSI-47_Experimental table_DAFT.csv"], ["PSI-142", "PSI-142_Experimental table_Data Summary Table.csv"]]) {
  await map(id, file, null, "summary");
}

// ---- Investigations from PSI records ----
const SCALE = { "PSI-98": "large", "PSI-99": "large", "PSI-100": "large", "PSI-60": "ground", "PSI-62": "ground", "PSI-115": "ground", "PSI-117": "ground", "PSI-142": "ground" };
const files = (await readdir(RAW)).filter((f) => f.endsWith(".record.json"));
const investigations = [];
for (const f of files) {
  const r = JSON.parse(await readFile(path.join(RAW, f), "utf8"));
  const id = r.accession;
  const pi = (r.contacts || []).find((c) => (c.roles || []).some((x) => /Principal Investigator|\bPI\b/i.test(x.annotationValue))) || (r.contacts || [])[0];
  investigations.push({
    id, acronym: r.investigationAcronym || id, title: r.title, tier: "T2_PSI_RECORD",
    platform: r.flightProgram || r.projectType || null,
    hardware: (r.experimentHardware || "").split(/\n|;/)[0].trim() || null,
    pi: pi ? `${pi.firstName ?? ""} ${pi.lastName ?? ""}`.trim() || null : null,
    doi: r.doi || null, license: r.licenseIdentifier || null, landingUrl: psiUrl(id),
    startDate: r.investigationStartDate || null, endDate: r.investigationEndDate || null,
    objective: (r.objective || "").replace(/\s+/g, " ").trim() || null,
    publicationsCount: (r.publications || []).length,
    hasRunTable: runs.some((x) => x.investigation === id),
    runCount: runs.filter((x) => x.investigation === id).length,
    summaryRowCount: summaries.filter((x) => x.investigation === id).length,
    scale: SCALE[id] || "bench",
    psiVersion: r.version ?? null, psiModified: r.modifiedDate ?? null,
  });
}
investigations.sort((a, b) => parseInt(a.id.slice(4)) - parseInt(b.id.slice(4)));

// ---- Deterministic headline (F1): never hard-coded ----
const solid = runs.filter((r) => r.fuelClass.startsWith("solid"));
const solidWithO2 = solid.filter((r) => r.o2Pct != null);
const maxSolidO2 = Math.max(...solidWithO2.map((r) => r.o2Pct));
const counts = {
  totalRuns: runs.length,
  totalSummaryRows: summaries.length,
  plottable: runs.filter((r) => r.o2Pct != null && r.pressureKPa != null).length,
  solidRuns: solid.length,
  solidRunsWithO2: solidWithO2.length,
  solidRunsAboveMax: solidWithO2.filter((r) => r.o2Pct > maxSolidO2).length,
  maxSolidO2,
  maxSolidO2Runs: solidWithO2.filter((r) => r.o2Pct === maxSolidO2).map((r) => r.id),
  partialGravityRuns: runs.filter((r) => r.gravity !== "micro").length,
  byInvestigation: Object.fromEntries(investigations.map((i) => [i.id, i.runCount])),
};
const manifest = JSON.parse(await readFile(path.join(RAW, "manifest.json"), "utf8"));
const out = { generatedAt: new Date().toISOString(), fetchedAt: manifest.fetchedAt, notice: "PROTOTYPE SNAPSHOT — fetched live from NASA PSI after kickoff, minimally normalized for design evaluation. Production pipeline will regenerate.", counts, tableStats, investigations, runs, summaries };
await writeFile(path.join(here, "snapshot.json"), JSON.stringify(out));
console.log(JSON.stringify({ ...counts, byInvestigation: undefined }, null, 1));
console.log(tableStats.map((t) => `${t.file}: rows ${t.dataRows}, kept ${t.kept}, skipped ${t.skippedNonRunRows}`).join("\n"));
