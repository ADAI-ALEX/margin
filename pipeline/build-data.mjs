// MARGIN normaliser: pipeline/.cache/raw (PSI downloads) -> data/generated/snapshot.json
// Implements Kickoff Pack §C.3 rules. See pipeline/README.md for the rule list and known data issues.
// Deterministic: two runs on the same cache produce identical JSON apart from `generatedAt`.
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyMaterial, materialGroupOf } from "./mappings/materials.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(here, ".cache", "raw");
const OUT = path.join(here, "..", "data", "generated", "snapshot.json");
// LOCKED conversion constants (Kickoff §C.3-3; identical to lib/engine/constants.ts UNIT).
const KPA = { atm: 101.325, bar: 100, mmHg: 0.133322, psia: 6.894757, mbar: 0.1 };
const round = (x, d = 3) => +x.toFixed(d);

// ------------------------------------------------------------------ CSV
function decode(buf) {
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); }
  catch { text = new TextDecoder("windows-1252").decode(buf); }
  return text.replace(/^﻿/, "");
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
  return rows;
}
async function table(file) {
  const all = parseCSV(decode(await readFile(path.join(RAW, file))));
  const nonBlank = all.filter((r) => r.some((x) => x.trim() !== ""));
  const header = nonBlank[0].map((h) => h.replace(/\s+/g, " ").trim());
  const rows = nonBlank.slice(1).map((r) => ({ cells: r.map((x) => x.trim()), obj: Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])) }));
  return { header, rows, rawLines: all.length, blankLines: all.length - nonBlank.length };
}
const col = (row, re) => { const k = Object.keys(row).find((h) => re.test(h)); return k ? row[k] : ""; };
const colName = (row, re) => Object.keys(row).find((h) => re.test(h)) || "";

// ------------------------------------------------------------------ cell parsing (§C.3-4/5)
/** Parse one cell. Never invents a value: blanks, sentinels and words become null with a flag. */
function num(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return { v: null, flags: ["missing"], kind: "blank" };
  if (/^-999(\.0+)?$/.test(s)) return { v: null, flags: ["sentinel"], kind: "sentinel" };
  if (/^(n\/a|none|-|–|ramped|insignificant)$/i.test(s)) return { v: null, flags: ["missing"], kind: "word", text: s };
  const range = s.match(/^~?\s*(-?\d*\.?\d+)\s*(?:-|–|to)\s*(-?\d*\.?\d+)\s*([a-zA-Z/%]*)$/);
  if (range) return { v: parseFloat(range[1]), flags: ["approximate", "text-parsed"], kind: "range", formula: `first value of the reported range "${s}" (both ends kept in original)` };
  const m = s.match(/^(~)?\s*(-?\d*\.?\d+)\s*([a-zA-Z/%]*)\s*$/);
  if (!m) return { v: null, flags: ["missing"], kind: "unparsed", text: s };
  const flags = [];
  if (m[1]) flags.push("approximate");
  if (m[3]) flags.push("text-parsed");
  return { v: parseFloat(m[2]), unit: m[3] || null, flags, kind: m[1] ? "approx" : m[3] ? "text" : "number", formula: m[1] ? `"${s}" -> ${parseFloat(m[2])} (approximate)` : m[3] ? `"${s}" -> ${parseFloat(m[2])} (text-parsed)` : null };
}
/** Flags for a null axis value: sentinel/out-of-range/missing kept distinct. */
function nullFlags(p, outOfRange) { return outOfRange ? ["out-of-range"] : p.flags.filter((f) => f === "sentinel" || f === "missing"); }

function setO2(r, raw, { fraction }) {
  const p = num(raw);
  if (p.v == null) { r.flags.push(...nullFlags(p)); return p; }
  const pct = fraction ? p.v * 100 : p.v;
  if (!(pct > 0 && pct <= 100)) { r.flags.push("out-of-range"); return p; }
  r.o2Pct = round(pct); r.o2Basis = "measured"; r.flags.push(...p.flags);
  if (fraction) r.conversions.push({ field: "o2Pct", from: `${raw} mole fraction`, to: `${r.o2Pct} %`, formula: "× 100" });
  else if (p.formula) r.conversions.push({ field: "o2Pct", from: raw, to: `${r.o2Pct} %`, formula: p.formula });
  return p;
}
function setPressure(r, raw, unit, { approxHeader = false } = {}) {
  const p = num(raw);
  if (p.v == null) { r.flags.push(...nullFlags(p)); return p; }
  if (!(p.v > 0)) { r.flags.push("out-of-range"); r.note = joinNote(r.note, `Pressure cell "${raw}" is not positive; set to null.`); return p; }
  const u = p.unit && /atm/i.test(p.unit) ? "atm" : unit;
  r.pressureKPa = round(p.v * KPA[u]); r.pressureBasis = "measured"; r.flags.push(...p.flags);
  if (approxHeader) r.flags.push("approximate");
  r.conversions.push({ field: "pressureKPa", from: p.unit ? raw : `${p.v} ${u}`, to: `${r.pressureKPa} kPa`, formula: `× ${KPA[u]}` });
  return p;
}
function setFlow(r, raw) {
  const p = num(raw);
  if (p.v == null) { r.flags.push(...nullFlags(p)); return p; }
  if (p.v < 0) { r.flags.push("out-of-range"); r.note = joinNote(r.note, `Negative flow "${raw}" set to null.`); return p; }
  r.flowCmS = p.v; r.flowBasis = "measured"; r.flags.push(...p.flags);
  if (p.formula) r.conversions.push({ field: "flowCmS", from: raw, to: `${p.v} cm/s`, formula: p.formula });
  return p;
}
function measure(r, key, raw, unit, label) {
  const p = num(raw);
  if (p.v != null) r.measures[key] = { value: p.v, unit, label };
  else if (p.kind === "sentinel") r.flags.push("sentinel");
  return p;
}
const joinNote = (a, b) => (a ? `${a} ${b}` : b);
const psiUrl = (id) => `https://psi.nasa.gov/physci/repo/data/investigations/${id}`;
const uniq = (a) => [...new Set(a)];

// ------------------------------------------------------------------ nominal pressure (§C.3-6)
// Only where a cabin-pressure statement exists. No verbatim quote is available locally for either
// (the PSI records do not state it; Discovery R3 summarises the primary papers), so the statement is
// stored as a labelled paraphrase in `note` and `source.quote` stays empty. Saffire-II/III and BASS have
// no statement at all and stay null.
const NOMINAL = {
  "PSI-25": { kpa: 101.325, statement: "Tests at ISS cabin pressure; O₂ varied by N₂ dilution of the MSG working volume", source: "BASS-II Summary Report, NASA/TM-20210011385 (as summarised in Discovery R3 §1; quote not yet verified)" },
  "PSI-98": { kpa: 101.325, statement: "Cygnus cabin pressure", source: "Ferkul et al., ICES-2017, NTRS 20170008805 (as summarised in Discovery R3 §1; quote not yet verified)" },
};
function applyNominal(run) {
  const n = NOMINAL[run.investigation];
  if (!n || run.pressureKPa != null) return;
  run.pressureKPa = n.kpa; run.pressureBasis = "nominal-stated";
  run.flags.push("nominal-value", "unverified-transcription");
  run.note = joinNote(run.note, `Pressure is nominal (stated), not measured. Paraphrase, not a quote: ${n.statement} — ${n.source}.`);
}
const NO_PRESSURE_NOTE = "Cabin pressure is not recorded in the PSI table and no quotable statement was found; left null (never inferred).";

// ------------------------------------------------------------------ outcomes (§C.3 enum)
const OUTCOME = { extinction: "extinguished", disruption: "disruption", completion: "completed", se: "self-extinguished", ft: "flow-terminated" };

// ------------------------------------------------------------------ table runner
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
const runs = []; const tableStats = []; const summaries = [];
async function map(id, file, fn, kind = "run", idPrefix = "") {
  const t = await table(file);
  let kept = 0; const skipped = []; const seen = new Map(); let duplicates = 0;
  t.rows.forEach(({ cells, obj }, i) => {
    const rowNo = i + 1;
    if (kind === "summary") { summaries.push({ investigation: id, file, row: rowNo, original: obj }); kept++; return; }
    const r = baseRun(id, file, rowNo, obj);
    if (idPrefix) r.id = `${id}:${idPrefix}:r${String(rowNo).padStart(4, "0")}`;
    const res = fn(r, obj);
    if (typeof res === "string") { skipped.push({ row: rowNo, reason: res, text: cells.filter(Boolean).join(" | ").slice(0, 80) }); return; }
    const key = JSON.stringify(cells);
    if (seen.has(key)) { r.flags.push("duplicate-row"); r.note = joinNote(r.note, `Exact duplicate of row ${seen.get(key)} in the PSI table (all cells identical); kept, not removed.`); duplicates++; }
    else seen.set(key, rowNo);
    // A null axis with an explanation is not "missing" noise; but keep "missing" when any of the three axes is absent.
    r.flags = uniq(r.flags).sort();
    runs.push(r); kept++;
  });
  const mine = runs.filter((r) => r.source.ref === file);
  tableStats.push({
    investigation: id, file, kind, dataRows: t.rows.length, kept, skippedNonRunRows: skipped.length, columns: t.header,
    rawLines: t.rawLines, blankLines: t.blankLines, skipped, duplicates,
    ...(kind === "run" ? {
      withO2: mine.filter((r) => r.o2Pct != null).length,
      withPressure: mine.filter((r) => r.pressureKPa != null).length,
      withFlow: mine.filter((r) => r.flowCmS != null).length,
      plottable: mine.filter((r) => r.o2Pct != null && r.pressureKPa != null).length,
    } : {}),
  });
}

// ---- BASS-II (PSI-25) ----
await map("PSI-25", "PSI-25_Experimental table_BASS-II.csv", (r, row) => {
  if (/fuel sample material/i.test(row["Fuel Sample Material"])) return "repeated header line";
  r.material = row["Fuel Sample Material"] || null;
  const mc = classifyMaterial(r.material); r.fuelClass = mc.fuelClass;
  const grp = materialGroupOf(r.material); if (grp) r.materialGroup = grp;
  const o2 = setO2(r, col(row, /initial O2/i), { fraction: false });
  const finRaw = col(row, /final O2/i); const fin = num(finRaw);
  if (fin.kind === "sentinel") r.flags.push("sentinel");
  if (fin.v != null && o2.v != null) {
    if (fin.v > o2.v + 1) { r.flags.push("out-of-range"); r.note = joinNote(r.note, `Final O₂ ${fin.v}% exceeds initial ${o2.v}% by more than 1 point in a closed chamber; final value not used.`); }
    else if (Math.abs(fin.v - o2.v) > 5) { r.flags.push("out-of-range"); r.note = joinNote(r.note, `Final O₂ ${fin.v}% differs from initial ${o2.v}% by more than 5 points; final value implausible and not used.`); }
    else r.measures.o2Final = { value: fin.v, unit: "% vol", label: "final O₂ (post-burn)" };
  }
  r.flowRegime = "unknown"; r.flags.push("ambiguous-unit");
  r.note = joinNote(r.note, "Flow recorded as uncalibrated fan/air display values; not converted to cm/s (PSI 'Fan calibration data.xlsx' mapping not applied).");
  measure(r, "co2Initial", col(row, /Initial CO2/i), "% vol", "initial CO₂");
  measure(r, "coFinal", col(row, /Final CO \(ppm\)/i), "ppm", "final CO");
  applyNominal(r);
});
// ---- BASS (PSI-26): material only ----
await map("PSI-26", "PSI-26_Experimental table_BASS.csv", (r, row) => {
  r.material = row["Fuel Sample Material"] || null;
  if (materialGroupOf(r.material) === "maintenance") return "maintenance operation (soot cleaning), not a combustion test";
  const mc = classifyMaterial(r.material); r.fuelClass = mc.fuelClass;
  const grp = materialGroupOf(r.material); if (grp) r.materialGroup = grp;
  r.flags.push("missing");
  r.note = "PSI table records date, test and material only — no O₂, pressure or flow columns.";
});
// ---- Saffire I/II/III ----
for (const [id, file] of [["PSI-98", "PSI-98_Experimental table_SAFFIRE-1.csv"], ["PSI-99", "PSI-99_Experimental table_SAFFIRE-2.csv"], ["PSI-100", "PSI-100_Experimental table_SAFFIRE-3.csv"]]) {
  await map(id, file, (r, row) => {
    const sample = col(row, /^Sample Number/i);
    if (/^F\d+C\d/i.test(sample)) return "pre-test flow visualisation row";
    if (/^Note \d/i.test(sample)) return "table note";
    if (!/^(S\d|\d-\d)/.test(sample)) return "not a sample row";
    r.material = row["Material"] || null;
    const thRaw = col(row, /Th?ickness/i), thHead = colName(row, /Th?ickness/i);
    const th = /^0\d/.test(thRaw) ? { v: null, kind: "ambiguous" } : num(thRaw);
    if (th.kind === "ambiguous") r.note = joinNote(r.note, `Thickness cell "${thRaw}" is ambiguous (leading zero, no decimal point); not used.`);
    const inCm = /cm/.test(thRaw) || /\(cm\)/.test(thHead);
    const thMm = th.v == null ? null : inCm ? th.v * 10 : th.v;
    if (th.v != null) r.measures.thickness = { value: th.v, unit: inCm ? "cm (as labelled)" : (th.unit || "mm"), label: "sample thickness" };
    if (inCm && /sibal/i.test(r.material || "") && th.v != null && th.v < 1) {
      r.flags.push("suspect-unit");
      r.note = joinNote(r.note, `Thickness reported as ${th.v} cm; a ${round(th.v * 10, 2)} mm SIBAL fabric is implausible (the Saffire-II table lists SIBAL as "037 mm"), so the cm label is probably a unit slip. Not used for classification (SIBAL is thin by material).`);
    }
    const mc = classifyMaterial(r.material, thMm); r.fuelClass = mc.fuelClass;
    if (!r.material) r.note = joinNote(r.note, "Material cell blank in the PSI table; material and fuel class not inferred.");
    const o2raw = col(row, /O2/i);
    if (o2raw || colName(row, /O2/i)) setO2(r, o2raw, { fraction: false }); else r.flags.push("missing");
    if (id === "PSI-99" && r.o2Pct != null) { r.flags.push("derived-value"); r.note = joinNote(r.note, "O₂ derived from measured CO₂ production, referenced to the ISS-reported initial O₂ (PSI table Note 1)."); }
    setFlow(r, col(row, /Air Flow/i));
    const dir = col(row, /Direction/i).toLowerCase();
    r.flowRegime = dir.includes("concurrent") ? "concurrent" : dir.includes("opposed") ? "opposed" : "unknown";
    const btRaw = col(row, /^Burn Time/i); const bt = num(btRaw);
    if (bt.v != null) { r.measures.burnTime = { value: bt.v, unit: "s", label: "burn time" }; r.outcome = bt.v > 0 ? "ignited" : null; }
    else if (bt.kind === "word") { r.outcome = "other"; r.note = joinNote(r.note, `Burn time "${btRaw}" in the PSI table.`); }
    const spread = num(col(row, /^.-g Spread Length/i));
    if (spread.v != null && /mm\/s/.test(col(row, /^.-g Spread Length/i))) r.measures.spreadRate = { value: spread.v, unit: "mm/s", label: "low-g spread rate (column labelled 'spread length')" };
    if (r.pressureKPa == null && !NOMINAL[id]) { r.flags.push("missing"); r.note = joinNote(r.note, NO_PRESSURE_NOTE); }
    applyNominal(r);
  });
}
// ---- FLEX (PSI-69) ----
const QUIESCENT_NOTE = {
  "PSI-69": "PSI record hardware: \"Multi-user Droplet Combustion Appartatus (MDCA)\" (sic).",
  "PSI-39": "PSI record: \"Droplets of fuel are dispensed and suspended between hypodermic needles or tethered using silicon-carbide fibers.\"",
  "PSI-159": "PSI record: \"Perform spherical diffusion flame tests aboard the International Space Station.\"",
  "PSI-10": "PSI record: \"Perform spherical diffusion flame tests in drop towers and aboard the International Space Station.\"",
};
function quiescent(r) {
  // F-14: no ambient-flow column and no PSI statement of a flow value. The regime is set from the experiment
  // design (no imposed ambient flow); the speed stays null. The engine treats regime 'quiescent' as quiescent.
  r.flowRegime = "quiescent"; r.flowCmS = null; r.flowBasis = "unknown"; r.flags.push("assumed-value");
  r.note = joinNote(r.note, "Quiescent: assumed from the experiment design (see investigation flowRegimeNote); flow speed not recorded.");
}
await map("PSI-69", "PSI-69_Experimental table_FLEX.csv", (r, row) => {
  r.fuelClass = "liquid-droplet"; r.material = row["Fuel"] || null; quiescent(r);
  setPressure(r, col(row, /Ambient pressure/i), "mmHg");
  setO2(r, col(row, /^O initial/i), { fraction: true });
  const te = (row["Test end"] || "").trim(); r.outcome = te ? OUTCOME[te.toLowerCase()] ?? "other" : null;
  measure(r, "dropletD0", col(row, /Droplet initial diameter/i), "mm", "initial droplet diameter");
  measure(r, "extinctionD", col(row, /extinction diameter/i), "mm", "visible-flame extinction diameter");
  measure(r, "burnTime", col(row, /Burn time/i), "s", "burn time");
  const br = measure(r, "burningRate", col(row, /Burning rate/i), "mm (as labelled)", "burning rate — unit as labelled in PSI ('mm'); suspect");
  if (br.v != null) r.flags.push("suspect-unit");
  measure(r, "n2", col(row, /^N initial/i), "mole fraction", "initial N₂");
  measure(r, "he", col(row, /^He initial/i), "mole fraction", "initial He");
  const co = measure(r, "co2", col(row, /^CO initial/i), "mole fraction", "initial CO₂ (column labelled 'CO')");
  if (co.v != null && co.v > 0) {
    const sum = ["O", "N", "CO", "He"].reduce((a, k) => a + (num(col(row, new RegExp(`^${k} initial`))).v ?? 0), 0);
    r.conversions.push({ field: "measures.co2", from: `CO initial ambient composition = ${co.v}`, to: `CO₂ mole fraction ${co.v}`, formula: `column labelled 'CO' interpreted as CO₂ (FLEX suppressant; O+N+CO+He = ${round(sum, 3)})` });
  }
});
// ---- CFI (PSI-39) ----
await map("PSI-39", "PSI-39_Experimental table_CFI.csv", (r, row) => {
  r.fuelClass = "liquid-droplet"; r.material = col(row, /^Fuel/i) || null; quiescent(r);
  const praw = row["Pressure"]; const p = num(praw);
  if (p.v != null && /atm/i.test(praw) && p.v > 0) {
    r.pressureKPa = round(p.v * KPA.atm); r.pressureBasis = "nominal-stated"; r.flags.push("text-parsed", "nominal-value");
    r.conversions.push({ field: "pressureKPa", from: praw, to: `${r.pressureKPa} kPa`, formula: "× 101.325" });
    r.note = joinNote(r.note, `Pressure is the test set point written in the PSI table ("${praw}"), not a chamber measurement.`);
  } else r.flags.push(...(p.v != null ? ["ambiguous-unit"] : nullFlags(p)));
  setO2(r, row["Oxygen"], { fraction: true });
  measure(r, "n2", row["Nitrogen"], "mole fraction", "N₂");
  measure(r, "he", row["Helium"], "mole fraction", "He");
});
// ---- ACME CFI-G (PSI-159) and Flame Design (PSI-10): gas burners ----
for (const [id, file, o2re, pre, punit, prefix] of [
  ["PSI-159", "PSI-159_Experimental table_CFI-G_Normal Flames.csv", /XO2 before/i, /approx p/i, "bar", "nor"],
  ["PSI-159", "PSI-159_Experimental table_CFI-G_Inverse Flames.csv", /^XO2$/i, /approx p/i, "bar", "inv"],
  ["PSI-10", "PSI-10_Experimental table_Flame Design_Normal Flame.csv", /XO2 \(init\)/i, /pmean/i, "atm", "nor"],
  ["PSI-10", "PSI-10_Experimental table_Flame Design_Inverse Flame.csv", /^XO2$/i, /pmean/i, "atm", "inv"],
]) {
  await map(id, file, (r, row) => {
    r.fuelClass = "gas-burner"; r.material = row["Fuel"] || (/Flame Design/.test(file) ? "C2H4" : null); quiescent(r);
    if (!row["Fuel"] && /Flame Design/.test(file)) r.note = joinNote(r.note, "Fuel C₂H₄ per the table's XC2H4 column (no Fuel column).");
    const o2raw = col(row, o2re);
    if (prefix === "inv") {
      // Inverse flame: O₂ is fed through the burner into a fuel/diluent chamber — NOT the ambient atmosphere (F-05).
      const o2 = num(o2raw);
      if (o2.v != null) r.measures.oxidizerXO2 = { value: round(o2.v * 100), unit: "% O₂ (burner-fed oxidizer)", label: "oxidizer-stream O₂ — inverse flame, not ambient" };
      r.flags.push("burner-fed-oxidizer", "missing");
      r.note = joinNote(r.note, "Inverse flame: the O₂ value is the burner-fed oxidizer stream, not the chamber atmosphere, so it is not placed on the ambient O₂ axis.");
    } else setO2(r, o2raw, { fraction: true });
    setPressure(r, col(row, pre), punit, { approxHeader: /approx/i.test(colName(row, pre)) });
    if (id === "PSI-159") {
      const term = col(row, /Self.?-?ext/i).trim().toLowerCase(), hot = col(row, /Hot ignition/i).trim().toLowerCase();
      r.outcome = OUTCOME[term] ?? (hot === "no" ? "not-ignited" : hot || term ? "other" : null);
      if (r.outcome === "not-ignited") r.note = joinNote(r.note, "No hot-flame ignition recorded (a cool flame may still have occurred; see 'Cool flame?' / TFP columns).");
      measure(r, "burnTime", col(row, /burn time/i), "s", "burn time");
    }
    const tad = num(col(row, /Tad/i)); if (tad.v != null) r.measures.tad = { value: tad.v, unit: "K", label: "Tad — computed (as reported in PSI)" };
  }, "run", prefix);
}
// ---- SPICE (PSI-107): gas jet in coflow, no O2/pressure columns ----
await map("PSI-107", "PSI-107_Experimental table_Spice.csv", (r, row) => {
  r.fuelClass = "gas-jet"; r.material = row["Fuel"] || null; r.flowRegime = "coflow";
  setFlow(r, col(row, /Air Rate/i));
  r.flags.push("missing");
});
// ---- SAME (PSI-102), SAME-R (PSI-101): smoke sources, flow only ----
await map("PSI-102", "PSI-102_Experimental table_SAME.csv", (r, row) => {
  r.fuelClass = "smoke-source";
  const mat = col(row, /Sample Material/i);
  const ref = mat.match(/^(.*?):\s*(same conditions as .*)$/i);
  r.material = (ref ? ref[1] : mat) || null;
  if (ref) r.note = joinNote(r.note, `PSI row says "${ref[2]}" (rows 1–4 used two flows); flow and aging not assigned.`);
  const f = setFlow(r, col(row, /Air Flow/i)); if (f.v != null) r.flowRegime = f.v === 0 ? "quiescent" : "unknown";
  measure(r, "weightLossRate", col(row, /Weight loss/i), "mg/min", "weight loss rate");
  measure(r, "agingDuration", col(row, /Aging Duration/i), "min", "aging duration");
  r.flags.push("missing");
});
await map("PSI-101", "PSI-101_Experimental table_SAME-R.csv", (r, row) => {
  r.fuelClass = "smoke-source"; r.material = row["Sample Type"] || null;
  const f = setFlow(r, col(row, /Inlet velocity/i)); if (f.v != null) r.flowRegime = f.v === 0 ? "quiescent" : "unknown";
  measure(r, "rtR0", col(row, /Rt\/R0/i), "ratio", "Rt/R0");
  r.flags.push("missing");
});
// ---- Summary tables (never runs) ----
for (const [id, file] of [["PSI-68", "PSI-68_Experimental table_Flex2.csv"], ["PSI-106", "PSI-106_Experimental table_Slice.csv"], ["PSI-20", "PSI-20_Experimental table_ACME BRE.csv"], ["PSI-21", "PSI-21_Experimental table_CLD Flame.csv"], ["PSI-22", "PSI-22_Experimental table_ACME E-FIELD Flames.csv"], ["PSI-23", "PSI-23_Experimental table_ACME s-Flame.csv"], ["PSI-47", "PSI-47_Experimental table_DAFT.csv"], ["PSI-142", "PSI-142_Experimental table_Data Summary Table.csv"]]) {
  await map(id, file, null, "summary");
}

// ------------------------------------------------------------------ investigations from PSI records
const SCALE = { "PSI-98": "large", "PSI-99": "large", "PSI-100": "large", "PSI-60": "ground", "PSI-62": "ground", "PSI-115": "ground", "PSI-117": "ground", "PSI-142": "ground" };
// Records whose acronym field is empty: short name derived from the PSI record title (title kept verbatim in `title`).
const DERIVED_ACRONYM = {
  "PSI-60": "SPICE data analysis",          // "Computational and Experimental Analysis of SPICE Data Sets"
  "PSI-62": "BASS flame-spread modelling",  // "Concurrent Flame Spread Modeling using Flamelet Generated Manifolds ... BASS Experiments ..."
  "PSI-115": "SAME smoke modelling",        // "Utilization of the Smoke Aerosol Measurement Experiment Data for Advanced Modeling ..."
  "PSI-117": "Cool-flame CFD",              // "Effect of External Thermo-Convective Perturbation on Cool Flame Dynamics: A ... CFD Analysis"
  "PSI-142": "Counterflow cool flames",     // "Quantitative Studies of Cool Flame Transitions ... Using Counterflow Flames"
};
const files = (await readdir(RAW)).filter((f) => f.endsWith(".record.json")).sort();
const investigations = [];
for (const f of files) {
  const r = JSON.parse(await readFile(path.join(RAW, f), "utf8"));
  const id = r.accession;
  const pi = (r.contacts || []).find((c) => (c.roles || []).some((x) => /Principal Investigator|\bPI\b/i.test(x.annotationValue))) || (r.contacts || [])[0];
  const fp = (r.flightProgram || "").trim();
  const platform = fp && !/^not applicable$/i.test(fp) ? fp : (r.projectType || "").trim() || null;
  const approach = String(r.approach || "").replace(/\s+/g, " ");
  const cyg = approach.match(/[^.]*Cygnus[^.]*deberthed[^.]*\./);
  const acronym = (r.investigationAcronym || "").trim() || DERIVED_ACRONYM[id] || id;
  const myRuns = runs.filter((x) => x.investigation === id);
  investigations.push({
    id, acronym, title: r.title, tier: "T2_PSI_RECORD",
    platform,
    hardware: (r.experimentHardware || "").split(/\n|;/)[0].trim() || null,
    pi: pi ? `${pi.firstName ?? ""} ${pi.lastName ?? ""}`.trim() || null : null,
    doi: r.doi || null, license: (r.licenseIdentifier || "").trim() || null, landingUrl: psiUrl(id),
    startDate: r.investigationStartDate || null, endDate: r.investigationEndDate || null,
    objective: (r.objective || "").replace(/\s+/g, " ").trim() || null,
    publicationsCount: (r.publications || []).length,
    hasRunTable: myRuns.length > 0,
    runCount: myRuns.length,
    summaryRowCount: summaries.filter((x) => x.investigation === id).length,
    scale: SCALE[id] || "bench",
    psiVersion: r.version ?? null, psiModified: r.modifiedDate ?? null,
    acronymSource: (r.investigationAcronym || "").trim() ? "psi" : DERIVED_ACRONYM[id] ? "derived-from-title" : "accession",
    ...(cyg && !/cygnus/i.test(platform || "") ? { platformNote: `PSI platform field says "${platform}". The record's approach text says: "${cyg[0].trim()}"` } : {}),
    ...(!(r.licenseIdentifier || "").trim() ? { licenseNote: "Licence not stated in PSI record" } : {}),
    ...(QUIESCENT_NOTE[id] ? { flowRegimeNote: `Run flow regime 'quiescent' is assumed from the experiment design (no imposed ambient flow); the PSI table has no ambient-flow column and the record gives no flow value. ${QUIESCENT_NOTE[id]}` } : {}),
  });
}
investigations.sort((a, b) => parseInt(a.id.slice(4)) - parseInt(b.id.slice(4)));

// ------------------------------------------------------------------ counts (computed, never hard-coded)
const solid = runs.filter((r) => r.fuelClass.startsWith("solid"));
const solidWithO2 = solid.filter((r) => r.o2Pct != null);
const maxSolidO2 = Math.max(...solidWithO2.map((r) => r.o2Pct));
const tally = (arr, key) => arr.reduce((m, x) => { for (const k of [].concat(key(x))) m[k] = (m[k] ?? 0) + 1; return m; }, {});
const sortObj = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const counts = {
  totalRuns: runs.length,
  distinctRuns: runs.filter((r) => !r.flags.includes("duplicate-row")).length,
  duplicateRows: runs.filter((r) => r.flags.includes("duplicate-row")).length,
  totalSummaryRows: summaries.length,
  placeable: runs.filter((r) => r.o2Pct != null).length,
  plottable: runs.filter((r) => r.o2Pct != null && r.pressureKPa != null).length,
  solidRuns: solid.length,
  solidRunsWithO2: solidWithO2.length,
  solidRunsWithoutO2: solid.length - solidWithO2.length,
  solidRunsAboveMax: solidWithO2.filter((r) => r.o2Pct > maxSolidO2).length,
  maxSolidO2,
  maxSolidO2Runs: solidWithO2.filter((r) => r.o2Pct === maxSolidO2).map((r) => r.id),
  partialGravityRuns: runs.filter((r) => r.gravity !== "micro").length,
  burnerFedOxidizerRuns: runs.filter((r) => r.flags.includes("burner-fed-oxidizer")).length,
  nominalPressureRuns: runs.filter((r) => r.pressureBasis === "nominal-stated").length,
  skippedNonRunRows: tableStats.reduce((a, t) => a + t.skippedNonRunRows, 0),
  blankLinesIgnored: tableStats.reduce((a, t) => a + t.blankLines, 0),
  byInvestigation: Object.fromEntries(investigations.map((i) => [i.id, i.runCount])),
  byFuelClass: sortObj(tally(runs, (r) => r.fuelClass)),
  byFlag: sortObj(tally(runs, (r) => r.flags)),
};
const manifest = JSON.parse(await readFile(path.join(RAW, "manifest.json"), "utf8"));
const out = {
  generatedAt: new Date().toISOString(), fetchedAt: manifest.fetchedAt,
  notice: "PSI snapshot fetched from NASA PSI and normalised by pipeline/build-data.mjs (rules in pipeline/README.md). Published (T3) and planned (T4) values live in content/, not here.",
  counts, tableStats, investigations, runs, summaries,
};
await writeFile(OUT, JSON.stringify(out));
const { byInvestigation, byFuelClass, byFlag, maxSolidO2Runs, ...head } = counts;
console.log(JSON.stringify(head, null, 1));
console.log(tableStats.map((t) => `${t.file}: rows ${t.dataRows}, kept ${t.kept}, skipped ${t.skippedNonRunRows}, blank ${t.blankLines}, dup ${t.duplicates}`).join("\n"));
