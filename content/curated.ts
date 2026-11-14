/**
 * Curated, NON-PSI content.
 *
 * STATUS (2026-11-14): every published (T3) and planned (T4) value below was checked against the primary NASA
 * document it cites (SI-assisted source check; human sign-off pending — `verifiedBy` stays null on insights).
 * Values that could not be checked keep the flag "unverified-transcription". Where NASA papers disagree, the
 * value from the cited primary table is kept and the others are listed in `alternatives` with the flag
 * "conflicting-sources". Evidence for each value: docs/verification/source-verification.md.
 */
import type { Atmosphere, Investigation, Run, Hazard } from "@/lib/schema";
import type { HazardMapEntry } from "@/lib/engine";
import { checked, unverified, type Verification } from "./verification";

export type { Verification } from "./verification";
export { REFERENCES, PSI_ATTRIBUTION, type Reference } from "./references";
export { INSIGHTS, type Insight, type Validity, type Phase } from "./insights";

const PSIA = 6.894757;
const ntrs = (id: string) => `https://ntrs.nasa.gov/citations/${id}`;

// ---------------------------------------------------------------- Atmospheres (Kickoff §C.6, LOCKED values)
export const ATMOSPHERES: Atmosphere[] = [
  { id: "iss", label: "ISS cabin", short: "ISS", o2Pct: 20.9, pressurePsia: 14.7, pressureKPa: +(14.7 * PSIA).toFixed(1), flowCmS: 10, gravity: "micro", source: "NASA-STD-6001B w/Change 2 ambient conditions (20.9% O₂, 101.4 kPa); ICES-2022-45" },
  { id: "artemis", label: "Artemis surface habitat (nominal)", short: "Artemis hab", o2Pct: 26.5, pressurePsia: 10.2, pressureKPa: +(10.2 * PSIA).toFixed(1), flowCmS: 10, gravity: "micro", source: "Kessler et al., Artemis Deep Space Habitation, IEEE Aerospace 2022 (NTRS 20220000245)" },
  { id: "ea", label: "Pressurized rover / lunar base — Exploration Atmosphere", short: "Exploration Atm.", o2Pct: 34, pressurePsia: 8.2, pressureKPa: +(8.2 * PSIA).toFixed(1), flowCmS: 10, gravity: "micro", source: "HEO-DM-1006 (8.2 psia, O₂ ≥ 33.7%) as quoted in ICES-2022-45; FM2 LPSC 2026 slides" },
  { id: "legacy", label: "Legacy staging certification (reference)", short: "30% / 10.2 psia", o2Pct: 30, pressurePsia: 10.2, pressureKPa: +(10.2 * PSIA).toFixed(1), flowCmS: 10, gravity: "micro", source: "Olson & Ferkul, ICES-2012-3492, p. 1; ICES-2022-45" },
  { id: "mars", label: "Mars transit vehicle (assumed)", short: "Mars transit", o2Pct: 34, pressurePsia: 8.2, pressureKPa: +(8.2 * PSIA).toFixed(1), flowCmS: 10, gravity: "micro", note: "Assumed; no authoritative Mars-transit cabin specification found (R3 §13)", source: "Exploration Atmosphere assumption" },
  { id: "suit", label: "Spacesuit", short: "Suit", o2Pct: 100, pressurePsia: 4.3, pressureKPa: 29.6, flowCmS: null, gravity: "micro", offChart: true, source: "Challenge statement; FM2 LPSC 2026 slides" },
];
export const PRESETS = ATMOSPHERES.filter((a) => !a.offChart);

/** Source check for each atmosphere preset (values are LOCKED; any disagreement is reported, not applied). */
export const ATMOSPHERE_VERIFICATION: Record<string, Verification & { sourceUrl: string | null }> = {
  iss: {
    sourceUrl: "https://standards.nasa.gov/sites/default/files/standards/NASA/B-w/CHANGE-2/2/NASA-STD-6001B-w-Change-2_Admin-Change.pdf",
    ...checked("NASA-STD-6001B w/Change 2, Test 1 clarification j (section 6.3), p. 30",
      "The term “ambient conditions” refers to an oxygen concentration of 20.9 percent, a pressure of 101.4 kPa (14.7 psia)",
      "20.9% / 14.7 psia is the standard's definition of ambient test conditions. For the ISS cabin itself, ICES-2022-45 (NTRS 20220006612) p. 1 gives “~14.7 psia and ~21% oxygen”."),
  },
  artemis: {
    sourceUrl: ntrs("20220000245"),
    ...checked("Kessler et al., IEEE Aerospace 2022 (NTRS 20220000245), p. 4",
      "The SH is assumed to operate at a nominal atmospheric operating pressure of 10.2 psia and 26.5% oxygen concentration",
      "Stated as an assumption for the surface habitat (SH). The same paragraph says trade studies were assessing a move to a nominal 8.2 psia, with the habitat keeping the capability to support both pressures."),
  },
  ea: {
    sourceUrl: ntrs("20220006612"),
    ...checked("Abney et al., ICES-2022-45 (NTRS 20220006612), p. 8",
      "HEO-DM-1006 specifies that a nominal total cabin pressure of 8.2 psia and O2 greater than or equal to 33.7% is needed",
      "HEO-DM-1006 itself was not found on NTRS; checked as quoted by ICES-2022-45. The 34% value: FM2 LPSC 2026 slides (NTRS 20260001966), PDF p. 25, “HLS, Lunar habitat and pressurized rover will nominally use 8.2 psia / 34% O2”; NASA/TM-2013-217377 (NTRS 20130013505) p. 13. ICES-2022-45 abstract says “8.3 psia” once; its body text says 8.2 psia."),
  },
  legacy: {
    sourceUrl: ntrs("20130010991"),
    ...checked("Olson & Ferkul, ICES-2012-3492 (NTRS 20130010991), p. 1",
      "currently 30% oxygen at 10.2 psia which is the pre-breath environment on the ISS for spacewalks",
      "Also FM2 LPSC 2026 slides, PDF p. 27: “This has historically been 30% O2, 10.2 psia (shuttle pre-EVA atm)”. NASA/TM-2013-217377 gives 10.2 psia / 26.5% O₂ as the Shuttle staged-decompression atmosphere; 30% is the worst-case test atmosphere used for material ratings."),
  },
  mars: {
    sourceUrl: null,
    ...unverified("Assumption made by design (same as the Exploration Atmosphere). No NASA document specifying a Mars-transit cabin atmosphere was found."),
  },
  suit: {
    sourceUrl: "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/",
    ...checked("Challenge statement, “Spacesuits and oxygen concentration” section",
      "spacesuits are filled with 100% oxygen to only 4.3 psi",
      "Also FM2 LPSC 2026 slides (NTRS 20260001966), PDF p. 25: “100% O2, 4.3 psia”. 29.6 kPa is 4.3 psia converted."),
  },
};

// ---------------------------------------------------------------- Published (T3) and planned (T4) evidence
type PubSeed = Omit<Run, "tier" | "conversions" | "measures" | "original" | "outcome" | "o2Basis" | "pressureBasis" | "flowBasis"> &
  Partial<Pick<Run, "measures" | "outcome" | "o2Basis" | "pressureBasis" | "flowBasis" | "conversions" | "original">>;
/** `checkedAgainstPrimary` removes the "unverified-transcription" flag; leave it false for anything not confirmed. */
function pub(seed: PubSeed, tier: Run["tier"] = "T3_PUBLISHED", checkedAgainstPrimary = true): Run {
  const flags = checkedAgainstPrimary ? seed.flags.filter((f) => f !== "unverified-transcription") : ["unverified-transcription" as const, ...seed.flags];
  const run = {
    tier, conversions: [], measures: {}, original: {}, outcome: null,
    o2Basis: "measured", pressureBasis: "measured", flowBasis: seed.flowCmS == null ? "unknown" : "measured",
    ...seed,
  } as Run;
  // Any value stated as nominal (not measured) carries the "nominal-value" flag.
  if ([run.o2Basis, run.pressureBasis, run.flowBasis].includes("nominal-stated")) flags.push("nominal-value");
  return { ...run, flags: Array.from(new Set(flags)) };
}

// Saffire IV–VI: primary table = ICES-2026-577 Table 1 (p. 6). ICES-2021-266 Table 1 and ICES-2024-365 Tables 1–2
// report different O₂/pressure for some tests, a different flow direction for all of them, and different peak HRR.
const S15 = { ref: "Urban et al., ICES-2026-577 (NTRS 20260001992)", url: ntrs("20260001992") };
const SAFFIRE_DIRECTION_NOTE =
  "Flow direction: the ICES-2026-577 Table 1 caption says opposed flow, while ICES-2021-266 Table 1 (IV-1, IV-2, V-2, V-3) and ICES-2024-365 Table 1 (IV-1, V-2, VI-2, VI-3, VI-4) say concurrent. Shown as unknown.";
const saffire = (
  id: string, material: string, fc: Run["fuelClass"], mbar: number, x: number,
  alternatives: NonNullable<Run["alternatives"]>, measures: Run["measures"], extraNote = "",
) =>
  pub({
    id: `PUB-SAFFIRE:${id}`, investigation: "PUB-SAFFIRE-IV-VI", fuelClass: fc, material, gravity: "micro",
    o2Pct: +(x * 100).toFixed(1), pressureKPa: mbar / 10, flowCmS: 20, flowRegime: "unknown",
    flags: ["conflicting-sources"], measures, alternatives,
    original: { o2: `${x} (O₂ mol fraction)`, pressure: `${mbar} mbar`, flow: "20 cm/s" },
    conversions: [
      { field: "o2Pct", from: `${x} mol fraction`, to: `${+(x * 100).toFixed(1)} %`, formula: "% = mol fraction × 100" },
      { field: "pressureKPa", from: `${mbar} mbar`, to: `${mbar / 10} kPa`, formula: "kPa = mbar / 10" },
    ],
    note: `Saffire ${id}, ICES-2026-577 Table 1. ${SAFFIRE_DIRECTION_NOTE}${extraNote ? " " + extraNote : ""}`,
    source: { kind: "publication", ref: S15.ref, page: "Table 1, p. 6", quote: "All samples were 40 cm wide in 20 cm/s opposed flow.", url: S15.url },
  });
const A2021 = "ICES-2021-266 (NTRS 20210011521) Table 1, p. 3";
const A2024 = "ICES-2024-365 (NTRS 20240002981) Table 1, p. 3";
const A2024HRR = "ICES-2024-365 Table 2, p. 6";

export const PUBLISHED: Run[] = [
  saffire("IV-2", "PMMA, 2-sided (1 cm)", "solid-thick", 1000, 0.22,
    [{ o2Pct: 22.0, pressureKPa: 100.0, source: `${A2021} (same O₂ and pressure; flow direction concurrent)` }],
    { growth: { value: 0.22, unit: "mm/s", label: "flame-length growth rate" }, coRise: { value: 110, unit: "ppm", label: "max CO rise" }, alarm: { value: 1083, unit: "s", label: "time to 2 mg/m³ aerosol" } }),
  saffire("V-3", "PMMA, 1-sided (0.5 cm)", "solid-unknown", 745, 0.26,
    [{ o2Pct: 25.4, pressureKPa: 71.3, source: `${A2021} (flow direction concurrent)` }],
    { growth: { value: 0.26, unit: "mm/s", label: "flame-length growth rate" }, alarm: { value: 1117, unit: "s", label: "time to 2 mg/m³ aerosol" } },
    "5 mm PMMA: the papers call these samples “thick” but not thermally thick; ICES-2026-577 p. 5 estimates the thermal wave crosses the 5 mm plate in about 220 s, within the burn. Classed solid-unknown under the 0.2–5.2 mm rule (pipeline/mappings/materials.mjs)."),
  saffire("VI-3", "PMMA, 2-sided (1 cm)", "solid-thick", 544, 0.30,
    [{ o2Pct: 30.3, pressureKPa: 54.6, source: `${A2024} (flow direction concurrent); peak HRR 3,080 W in ${A2024HRR}` }],
    { growth: { value: 0.38, unit: "mm/s", label: "flame-length growth rate" }, hrr: { value: 3240, unit: "W", label: "peak HRR (ICES-2024: 3,080 W)" }, alarm: { value: 1037, unit: "s", label: "time to 2 mg/m³ aerosol" } },
    "Peak HRR differs between papers: 3,240 W (ICES-2026-577) vs 3,080 W (ICES-2024-365)."),
  saffire("VI-4", "PMMA, 1-sided (0.5 cm)", "solid-unknown", 550, 0.29,
    [{ o2Pct: 28.8, pressureKPa: 55.2, source: `${A2024} (flow direction concurrent); peak HRR 1,507 W in ${A2024HRR}` }],
    { growth: { value: 0.27, unit: "mm/s", label: "flame-length growth rate" }, hrr: { value: 1487, unit: "W", label: "peak HRR (ICES-2024: 1,507 W)" }, alarm: { value: 1603, unit: "s", label: "time to 2 mg/m³ aerosol" } },
    "Peak HRR differs between papers: 1,487 W (ICES-2026-577) vs 1,507 W (ICES-2024-365). 5 mm PMMA: the papers call these samples “thick” but not thermally thick; ICES-2026-577 p. 5 estimates the thermal wave crosses the 5 mm plate in about 220 s, within the burn. Classed solid-unknown under the 0.2–5.2 mm rule (pipeline/mappings/materials.mjs)."),
  saffire("IV-1", "SIBAL fabric, 2-sided", "solid-thin", 980, 0.23,
    [{ o2Pct: 22.0, pressureKPa: 100.0, source: `${A2021}; ${A2024} (flow direction concurrent)` }],
    { spread: { value: 3.6, unit: "mm/s", label: "flame spread rate" }, alarm: { value: 92, unit: "s", label: "time to 2 mg/m³ aerosol" } }),
  saffire("V-2", "Cotton jersey, 2-sided", "solid-thin", 741, 0.28,
    [{ o2Pct: 26.2, pressureKPa: 70.7, source: `${A2021}; ${A2024} (flow direction concurrent)` }],
    { spread: { value: 3.4, unit: "mm/s", label: "flame spread rate" }, alarm: { value: 146, unit: "s", label: "time to 2 mg/m³ aerosol" } }),
  saffire("VI-2", "SIBAL fabric, 2-sided", "solid-thin", 541, 0.31,
    [{ o2Pct: 31.0, pressureKPa: 54.1, source: `${A2024} (same O₂ and pressure; flow direction concurrent); peak HRR 3,217 W by O₂ consumption and 3,650 W average by fuel consumption in ${A2024HRR}` }],
    { spread: { value: 4.05, unit: "mm/s", label: "flame spread rate" }, hrr: { value: 3376, unit: "W", label: "peak HRR (ICES-2024: 3,217 W)" }, alarm: { value: 201, unit: "s", label: "time to 2 mg/m³ aerosol" } },
    "Peak HRR differs between papers: 3,376 W (ICES-2026-577) vs 3,217 W (ICES-2024-365)."),

  // BASS-II limit points (NASA/TM-20210011385). Limits reported by the authors, not test runs.
  pub({
    id: "PUB-BASS2:micro-min", investigation: "PUB-BASS-II-LIMITS", fuelClass: "solid-thick", material: "Cast PMMA rods, concurrent flow", gravity: "micro",
    o2Pct: 13.5, o2Basis: "limit-reported", pressureKPa: 101.325, pressureBasis: "nominal-stated", flowCmS: null, flowRegime: "concurrent",
    flags: ["limit-value", "nominal-value"],
    note: "Minimum of the flammability boundary at stretch rate 8–12 s⁻¹ (not convertible to a single cm/s value). Pressure: §6.1 does not state it; 1 atm is the value the TM uses for the Glovebox in its O₂-consumption calculation (§1.5, p. 11); the TM's opposed-flow chapter reports a measured 99.2–99.5 kPa (§2.3.5, p. 38).",
    source: { kind: "publication", ref: "Olson et al., BASS-II Summary Report, NASA/TM-20210011385", page: "§6.1.4.4, p. 76 (PDF p. 84)", quote: "13.5 percent O2 at a of 8 to 12 s⁻¹ is significantly lower than the observed upward flame spread limit of 15.4 percent O2", url: ntrs("20210011385") },
  }),
  pub({
    id: "PUB-BASS2:1g-upward", investigation: "PUB-BASS-II-LIMITS", fuelClass: "solid-thick", material: "Cast PMMA rods, 1-g upward spread", gravity: "earth",
    o2Pct: 15.4, o2Basis: "limit-reported", pressureKPa: null, pressureBasis: "unknown", flowCmS: 4, flowBasis: "nominal-stated", flowRegime: "concurrent",
    flags: ["limit-value"],
    note: "1-g upward-spread limit with an added 4 cm/s forced flow, quoted by the TM from Hirsch et al. 2003 (ASTM STP1454; not checked). The TM does not state the test pressure. The TM adds a buoyant flow of about 20 cm/s at the flame base when comparing (p. 89).",
    source: { kind: "publication", ref: "Olson et al., BASS-II Summary Report, NASA/TM-20210011385", page: "§6.1.4.4, p. 76 (PDF p. 84)", quote: "15.4 percent O2 (in normal gravity with an additional 4-cm/s forced flow (Ref. 23))", url: ntrs("20210011385") },
  }),

  // LUCI (one New Shepard flight, lunar g by rotation; conference slides)
  pub({
    id: "PUB-LUCI:sibal", investigation: "PUB-LUCI", fuelClass: "solid-thin", material: "SIBAL fabric 5 × 30 cm, downward", gravity: "moon",
    o2Pct: 20, pressureKPa: 101.325, pressureBasis: "nominal-stated", flowCmS: null, flowRegime: "natural-convection",
    flags: ["approximate", "nominal-value"],
    measures: { spreadBase: { value: 0.92, unit: "mm/s", label: "flame-base spread (1 g: 1.5)" }, spreadTip: { value: 1.1, unit: "mm/s", label: "flame-tip spread (1 g: 2.8)" } },
    note: "Air at normal pressure; O₂ fell from ~20% to ~18% during the burn (initial value plotted). One flight; Coriolis force acts on the flames in the rotating vehicle; conference slides, not a peer-reviewed paper.",
    source: { kind: "publication", ref: "Ferkul et al., LUCI, ASGSR 2025 slides (NTRS 20250010653)", page: "slides 12, 19, 33, 42", quote: "Two samples are burned simultaneously in air at normal pressure", url: ntrs("20250010653") },
  }),
  pub({
    id: "PUB-LUCI:pmma", investigation: "PUB-LUCI", fuelClass: "solid-unknown", material: "PMMA rod 4 mm, upward", gravity: "moon",
    o2Pct: 20, pressureKPa: 101.325, pressureBasis: "nominal-stated", flowCmS: null, flowRegime: "natural-convection",
    flags: ["approximate", "nominal-value"],
    measures: { tipSpread: { value: 0.15, unit: "cm/s", label: "tip spread (1 g: 0.40)" } },
    note: "O₂ fell from 20% to 14.3% during the burn (initial value plotted). One flight; the Coriolis force pulled the flame away from the rod axis (slide 17); conference slides, not a peer-reviewed paper. 4 mm rod: below the 6.35 mm rod diameter the pipeline classes as thick, so solid-unknown.",
    source: { kind: "publication", ref: "Ferkul et al., LUCI, ASGSR 2025 slides (NTRS 20250010653)", page: "slides 12, 17, 22, 36", quote: "O2% decreases from 20% to 14.3%.", url: ntrs("20250010653") },
  }),
];

// ---------------------------------------------------------------- Olson & Ferkul 2012, Table I (checked 14 Nov against the paper, p. 6)
export type GLevel = "earth" | "mars" | "moon" | "micro";
export interface PartialGRow { material: string; thickness: string; pressurePsia: number; uloi: Record<GLevel, number>; moc: Record<GLevel, number>; margin: { mars: number; moon: number; micro: number } }
export const OLSON_FERKUL_2012: { source: { ref: string; url: string; doi: string; page: string }; caveats: string[]; rows: PartialGRow[] } = {
  source: { ref: "Olson & Ferkul, ICES-2012-3492", url: ntrs("20130010991"), doi: "10.2514/6.2012-3492", page: "Table I, p. 6" },
  caveats: [
    "5.18 s drop-tower tests (rotating centrifuge for Mars and Moon)",
    "Reduced-g criteria (ULOI*, MOC*) differ from the 1-g test",
    "0-g values used a 30 cm/s concurrent forced flow",
    "1-g values from WSTF tests using a hot-wire igniter",
    "Lunar and 0-g values are earlier data (Ferkul & Olson 2011)",
    "3 materials, one thickness each",
  ],
  rows: [
    { material: "Mylar G", thickness: "5 mil", pressurePsia: 10.2, uloi: { earth: 21.2, mars: 18.0, moon: 15.6, micro: 17.0 }, moc: { earth: 20.0, mars: 17.0, moon: 14.1, micro: 16.0 }, margin: { mars: -3.1, moon: -5.75, micro: -4.1 } },
    { material: "Ultem 1000", thickness: "10 mil", pressurePsia: 10.2, uloi: { earth: 23.5, mars: 22.0, moon: 21.0, micro: 24.0 }, moc: { earth: 23.0, mars: 21.1, moon: 19.9, micro: 23.0 }, margin: { mars: -1.7, moon: -2.8, micro: 0.25 } },
    { material: "Nomex HT90-40", thickness: "12 mil fabric", pressurePsia: 14.7, uloi: { earth: 23.5, mars: 19.9, moon: 21.0, micro: 23.0 }, moc: { earth: 22.1, mars: 19.0, moon: 19.9, micro: 22.0 }, margin: { mars: -3.35, moon: -2.35, micro: -0.3 } },
  ],
};
const OF_FC: Record<string, Run["fuelClass"]> = { "Mylar G": "solid-thin", "Ultem 1000": "solid-unknown", "Nomex HT90-40": "solid-unknown" };
const OF_NOTE: Record<GLevel, string> = {
  earth: "1-g upward limiting O₂ (ULOI) from NASA WSTF tests with a hot-wire igniter (p. 4).",
  mars: "Martian-g limiting O₂ (ULOI*) from 5.18 s drop-tower centrifuge tests (this paper); reduced-g criteria differ from 1 g. The authors note weak Nomex and Ultem flames might have gone out with more test time (p. 4).",
  moon: "Lunar-g limiting O₂ (ULOI*) from 5.18 s drop-tower centrifuge tests (earlier data, ref. 8 of the paper); reduced-g criteria differ from 1 g.",
  micro: "0-g limiting O₂ (ULOI*) from 5.18 s drop-tower tests with 30 cm/s concurrent flow (earlier data, ref. 8 of the paper); reduced-g criteria differ from 1 g.",
};
for (const row of OLSON_FERKUL_2012.rows) {
  for (const g of ["earth", "mars", "moon", "micro"] as GLevel[]) {
    PUBLISHED.push(pub({
      id: `PUB-OF2012:${row.material}:${g}`, investigation: "PUB-OLSON-FERKUL-2012", fuelClass: OF_FC[row.material], material: `${row.material} (${row.thickness})`,
      gravity: g, o2Pct: row.uloi[g], o2Basis: "limit-reported", pressureKPa: +(row.pressurePsia * PSIA).toFixed(2), pressureBasis: "nominal-stated",
      flowCmS: g === "micro" ? 30 : null, flowBasis: g === "micro" ? "nominal-stated" : "unknown", flowRegime: g === "micro" ? "concurrent" : "natural-convection",
      flags: ["limit-value"], measures: { moc: { value: row.moc[g], unit: "% O₂", label: g === "earth" ? "MOC" : "MOC*" } },
      original: { pressure: `${row.pressurePsia} psia` },
      conversions: [{ field: "pressureKPa", from: `${row.pressurePsia} psia`, to: `${+(row.pressurePsia * PSIA).toFixed(2)} kPa`, formula: "kPa = psia × 6.894757" }],
      note: `${OF_NOTE[g]} Spread was concurrent (upward); ${g === "micro" ? "flow was forced" : "flow was buoyancy-driven"} (p. 3).`,
      source: { kind: "publication", ref: OLSON_FERKUL_2012.source.ref, page: "Table I, p. 6", quote: "Limiting Oxygen Molar Concentrations and Oxygen Margin of Safety for Different Gravity Levels", url: OLSON_FERKUL_2012.source.url },
    }));
  }
}

// FM2 plans: never evidence.
const FM2_2026_QUOTE: Record<number, string> = {
  37: "Start at 37% should burn to threshold",
  33: "Start at 33% should burn to threshold",
  29: "Start at 29% should burn to threshold",
  25: "Start at 25% not expected to ignite but would provide a margin of safety if the limit was lower than expected.",
};
export const PLANNED: Run[] = [
  ...[37, 33, 29, 25].map((o2) => pub({
    id: `PLAN-FM2:2026:${o2}`, investigation: "PLAN-FM2", fuelClass: "solid-thin", material: "Fabric sheet (Synergy Pro “Navy”), upward — 2026 concept", gravity: "moon",
    o2Pct: o2, o2Basis: "nominal-stated", pressureKPa: +(8.2 * PSIA).toFixed(1), pressureBasis: "nominal-stated", flowCmS: null, flowRegime: "natural-convection", flags: ["conflicting-sources"],
    note: "Planned, not flown. Current concept: four tests at 8.2 psia (±0.3 psi), 2 cm × 20 cm fabric strips, a material with an expected lunar limit of 24–26% O₂. The 2024 poster lists a different plan (SIBAL in air; PMMA rods at 34% / 8.2 psia).",
    source: { kind: "plan", ref: "Ferkul et al., LPSC 2026 slides (NTRS 20260001966)", page: "“Current concept” (PDF p. 5); “FM2 Science Requirements” (PDF p. 10)", quote: FM2_2026_QUOTE[o2], url: ntrs("20260001966") },
  }, "T4_PLANNED")),
  ...[
    { o2: 21, psia: 14.7, material: "SIBAL fabric, in air — 2024 plan", fc: "solid-thin" as const },
    { o2: 34, psia: 8.2, material: "PMMA (acrylic) rod, 4 mm — 2024 plan", fc: "solid-unknown" as const },
  ].map(({ o2, psia, material, fc }) => pub({
    id: `PLAN-FM2:2024:${o2}`, investigation: "PLAN-FM2", fuelClass: fc, material, gravity: "moon",
    o2Pct: o2, o2Basis: "nominal-stated", pressureKPa: +(psia * PSIA).toFixed(1), pressureBasis: "nominal-stated", flowCmS: null, flowRegime: "natural-convection", flags: ["conflicting-sources"],
    note: "Planned, not flown. 2024 poster plan: two SIBAL samples in air and two acrylic rods in the normoxic exploration atmosphere, one of each burned upward and one downward. Fuel-to-atmosphere pairing confirmed by LPSC 2026 slides, PDF p. 26. Superseded by the 2026 concept.",
    source: { kind: "plan", ref: "Zayac et al., 2024 poster (NTRS 20240015307)", page: "Introduction", quote: "specifically 21% oxygen at 14.7 psia, and 34% oxygen at 8.2 psia", url: ntrs("20240015307") },
  }, "T4_PLANNED")),
];

// ---------------------------------------------------------------- Pseudo-investigations for published groups
const pubInv = (id: string, acronym: string, title: string, tier: Investigation["tier"], scale: Investigation["scale"], url: string, platform: string): Investigation => ({
  id, acronym, title, tier, platform, hardware: null, pi: null, doi: null, license: null, landingUrl: url,
  startDate: null, endDate: null, objective: null, publicationsCount: 1, hasRunTable: false,
  runCount: [...PUBLISHED, ...PLANNED].filter((r) => r.investigation === id).length, summaryRowCount: 0, scale,
});
export const PUBLISHED_GROUPS: Investigation[] = [
  pubInv("PUB-SAFFIRE-IV-VI", "Saffire IV–VI", "Saffire IV–VI large-scale tests (published, not in PSI; 7 of the tests)", "T3_PUBLISHED", "large", S15.url, "Cygnus"),
  pubInv("PUB-BASS-II-LIMITS", "BASS-II limits", "BASS-II flammability-limit points (published)", "T3_PUBLISHED", "bench", ntrs("20210011385"), "ISS MSG / 1-g lab"),
  pubInv("PUB-OLSON-FERKUL-2012", "Olson & Ferkul 2012", "Drop-tower limiting O₂ at 1 g, Mars, Moon, 0 g (Table I)", "T3_PUBLISHED", "ground", ntrs("20130010991"), "Drop tower (5.18 s)"),
  pubInv("PUB-LUCI", "LUCI", "Lunar Combustion Investigation (one flight, conference slides)", "T3_PUBLISHED", "ground", ntrs("20250010653"), "Blue Origin New Shepard"),
  pubInv("PLAN-FM2", "FM2", "Flammability of Materials on the Moon (planned)", "T4_PLANNED", "bench", ntrs("20260001966"), "Lunar surface (planned)"),
];

// ---------------------------------------------------------------- Hazard map (DRAFT — lead-reviewed in production)
// `measures` (Kickoff §C.8 M): 1 = outcome plus a hazard-relevant metric; 0.5 = outcome only (or metric only, as noted); 0 = neither.
// Checked 14 Nov against the PSI CSV headers and the published sources.
const H = (investigation: string, hazard: Hazard, match: HazardMapEntry["match"], measures: HazardMapEntry["measures"], rationale: string): HazardMapEntry => ({ investigation, hazard, match, measures, rationale });
export const HAZARD_MAP: HazardMapEntry[] = [
  H("PSI-25", "materials", "primary", 0.5, "Solid-fuel flammability limits vs O₂ and flow; table has initial/final O₂, CO₂ and CO but no outcome column"),
  H("PSI-26", "materials", "primary", 0, "Solid-fuel burning; run table lists materials only"),
  H("PSI-98", "materials", "primary", 0.5, "Large-scale fabric burns; table has burn time and flow direction, no outcome column"),
  H("PSI-99", "materials", "primary", 0.5, "Low-g flammability of 9 samples; table has burn and spread lengths"),
  H("PSI-100", "materials", "primary", 0, "Large-scale fabric burns; table lists sample size, flow and direction only"),
  H("PSI-20", "materials", "secondary", 0.5, "Gas burner emulating condensed fuels (context only); table records whether flames ignited"),
  H("PUB-SAFFIRE-IV-VI", "materials", "primary", 1, "Large-scale burns at exploration-like atmospheres; growth or spread rate, HRR, CO (ICES-2026-577 Table 1)"),
  H("PUB-BASS-II-LIMITS", "materials", "primary", 0.5, "Limit points reported by the authors"),
  H("PUB-OLSON-FERKUL-2012", "materials", "primary", 0.5, "Limit points by gravity level"),
  H("PUB-LUCI", "materials", "primary", 0.5, "Lunar-g burns; spread rates from one flight"),
  H("PSI-102", "smoke", "primary", 0, "Smoke from overheated materials; table has weight-loss rate and aging time only (no outcome or smoke metric); size results at investigation level only"),
  H("PSI-101", "smoke", "primary", 1, "Smoke particle size, wider matrix; table has detector ratio Rt/R0"),
  H("PSI-47", "smoke", "secondary", 0, "Particle-counter feasibility with test dust; table lists sessions, hardware and sampling location only"),
  H("PUB-SAFFIRE-IV-VI", "smoke", "secondary", 1, "Time to 2 mg/m³ aerosol, CO and CO₂ rise (ICES-2026-577 Table 1)"),
  H("PSI-98", "smoke", "secondary", 0, "Large-scale burns"),
  H("PSI-69", "suppression", "primary", 1, "Inert-gas suppression of droplets (LOI); extinction diameter and burning rate"),
  H("PSI-68", "suppression", "primary", 0, "Planned matrix only"),
  H("PSI-25", "suppression", "secondary", 0.5, "O₂ reduction by N₂ dilution"),
  H("PSI-26", "suppression", "secondary", 0, "N₂ suppression jets (per PSI text)"),
  H("PUB-SAFFIRE-IV-VI", "suppression", "secondary", 0.5, "Flow-off extinction outcomes described in the text of ICES-2021-266 for four tests; not tabulated in the runs"),
  H("PSI-69", "liquid", "primary", 1, "Droplet combustion and extinction"),
  H("PSI-39", "liquid", "primary", 0, "Cool-flame droplet tests; table lists conditions and fuel only"),
  H("PSI-68", "liquid", "primary", 0, "Planned matrix only"),
  H("PSI-159", "liquid", "secondary", 1, "Gas-burner cool flames (context); table records cool-flame outcome and burn time"),
  H("PSI-10", "liquid", "secondary", 0, "Gas-burner flames (context); table lists flow, O₂ and pressure conditions only"),
];

export const HAZARDS: { id: Hazard; label: string; short: string }[] = [
  { id: "materials", label: "Material flammability", short: "Materials" },
  { id: "smoke", label: "Smoke & detection", short: "Smoke" },
  { id: "suppression", label: "Suppression", short: "Suppression" },
  { id: "liquid", label: "Liquid fuel & cool flames", short: "Liquid" },
];

export const LIMITATIONS = [
  "Evidence distance measures coverage of test conditions, not flammability. Being close to a test does not mean a material behaves the same way.",
  "The axis scales (2 pts O₂, 25% pressure, 5 cm/s flow) are expert judgement; robustness to ½×–2× is shown.",
  "Tested configurations are narrow: mostly PMMA, SIBAL fabric, a few liquid fuels and gas burners.",
  "Partial-gravity evidence is three materials in 5.18 s drops plus one rotating sounding-rocket flight reported in conference slides.",
  "Published values differ between papers (Saffire O₂, pressure, flow direction and heat release); all reported values are shown.",
  "“Nominal (stated)” pressures are not measurements.",
];
