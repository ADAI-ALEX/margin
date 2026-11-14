/**
 * Curated, NON-PSI content for the design prototypes.
 *
 * STATUS: transcribed from Discovery/research/03_combustion_science.md (R3) and the
 * Kickoff Pack. None of it has `verifiedBy` from a human yet. Every record therefore
 * carries the flag "unverified-transcription", and the prototypes must show that state.
 * Production replaces this file with content/*.json (WS2) after human verification.
 */
import type { Atmosphere, Investigation, Run, Hazard } from "@/lib/schema";
import type { HazardMapEntry } from "@/lib/engine";

const PSIA = 6.894757;
const ntrs = (id: string) => `https://ntrs.nasa.gov/citations/${id}`;

// ---------------------------------------------------------------- Atmospheres (Kickoff §C.6, LOCKED values)
export const ATMOSPHERES: Atmosphere[] = [
  { id: "iss", label: "ISS cabin", short: "ISS", o2Pct: 20.9, pressurePsia: 14.7, pressureKPa: +(14.7 * PSIA).toFixed(1), flowCmS: 10, gravity: "micro", source: "NASA-STD-6001B ambient; R3 §4" },
  { id: "artemis", label: "Artemis surface habitat (nominal)", short: "Artemis hab", o2Pct: 26.5, pressurePsia: 10.2, pressureKPa: +(10.2 * PSIA).toFixed(1), flowCmS: 10, gravity: "micro", source: "Artemis Deep Space Habitation paper (R3 S46d)" },
  { id: "ea", label: "Pressurized rover / lunar base — Exploration Atmosphere", short: "Exploration Atm.", o2Pct: 34, pressurePsia: 8.2, pressureKPa: +(8.2 * PSIA).toFixed(1), flowCmS: 10, gravity: "micro", source: "HEO-DM-1006 (≥33.7% O₂); R3 S46a–c" },
  { id: "legacy", label: "Legacy staging certification (reference)", short: "30% / 10.2 psia", o2Pct: 30, pressurePsia: 10.2, pressureKPa: +(10.2 * PSIA).toFixed(1), flowCmS: 10, gravity: "micro", source: "Shuttle/ISS certification envelope (R3 §4)" },
  { id: "mars", label: "Mars transit vehicle (assumed)", short: "Mars transit", o2Pct: 34, pressurePsia: 8.2, pressureKPa: +(8.2 * PSIA).toFixed(1), flowCmS: 10, gravity: "micro", note: "Assumed; no authoritative Mars-transit cabin specification found (R3 §13)", source: "Exploration Atmosphere assumption" },
  { id: "suit", label: "Spacesuit", short: "Suit", o2Pct: 100, pressurePsia: 4.3, pressureKPa: 29.6, flowCmS: null, gravity: "micro", offChart: true, source: "Challenge statement" },
];
export const PRESETS = ATMOSPHERES.filter((a) => !a.offChart);

// ---------------------------------------------------------------- Published (T3) and planned (T4) evidence
type PubSeed = Omit<Run, "tier" | "conversions" | "measures" | "original" | "outcome" | "o2Basis" | "pressureBasis" | "flowBasis"> &
  Partial<Pick<Run, "measures" | "outcome" | "o2Basis" | "pressureBasis" | "flowBasis">>;
function pub(seed: PubSeed, tier: Run["tier"] = "T3_PUBLISHED"): Run {
  return {
    tier, conversions: [], measures: {}, original: {}, outcome: null,
    o2Basis: "measured", pressureBasis: "measured", flowBasis: seed.flowCmS == null ? "unknown" : "measured",
    ...seed,
    flags: Array.from(new Set(["unverified-transcription", ...seed.flags])),
  } as Run;
}

const S15 = { ref: "Urban et al., ICES-2026-577 (NTRS 20260001992)", url: ntrs("20260001992") };
const saffire = (id: string, material: string, fc: Run["fuelClass"], mbar: number, x: number, extra: Partial<Run> = {}, measures: Run["measures"] = {}) =>
  pub({
    id: `PUB-SAFFIRE:${id}`, investigation: "PUB-SAFFIRE-IV-VI", fuelClass: fc, material, gravity: "micro",
    o2Pct: +(x * 100).toFixed(1), pressureKPa: mbar / 10, flowCmS: 20, flowRegime: "unknown",
    flags: [], measures,
    note: "Flow 20 cm/s per R3 table; flow direction per test still to be verified (Kickoff V5).",
    source: { kind: "publication", ref: S15.ref, page: "Saffire IV–VI summary table (as transcribed in R3 §2.2)", url: S15.url },
    ...extra,
  });

export const PUBLISHED: Run[] = [
  saffire("IV-2", "PMMA, 2-sided (1 cm)", "solid-thick", 1000, 0.22, {}, { growth: { value: 0.22, unit: "mm/s", label: "growth rate" }, coRise: { value: 110, unit: "ppm", label: "max CO rise" }, alarm: { value: 1083, unit: "s", label: "time to 2 mg/m³ alarm" } }),
  saffire("V-3", "PMMA, 1-sided (0.5 cm)", "solid-thick", 745, 0.26, {
    flags: ["conflicting-sources"],
    alternatives: [{ o2Pct: 25.4, source: "ICES-2021-266 reports 25.4–26.2% for Saffire V (R3 §1)" }],
  }, { growth: { value: 0.26, unit: "mm/s", label: "growth rate" }, alarm: { value: 1117, unit: "s", label: "time to 2 mg/m³ alarm" } }),
  saffire("VI-3", "PMMA, 2-sided (1 cm)", "solid-thick", 544, 0.30, {}, { growth: { value: 0.38, unit: "mm/s", label: "growth rate" }, hrr: { value: 3240, unit: "W", label: "peak HRR" }, alarm: { value: 1037, unit: "s", label: "time to 2 mg/m³ alarm" } }),
  saffire("VI-4", "PMMA, 1-sided (0.5 cm)", "solid-thick", 550, 0.29, {}, { growth: { value: 0.27, unit: "mm/s", label: "growth rate" }, hrr: { value: 1487, unit: "W", label: "peak HRR" }, alarm: { value: 1603, unit: "s", label: "time to 2 mg/m³ alarm" } }),
  saffire("IV-1", "SIBAL fabric, 2-sided", "solid-thin", 980, 0.23, {}, { spread: { value: 3.6, unit: "mm/s", label: "spread rate" }, alarm: { value: 92, unit: "s", label: "time to 2 mg/m³ alarm" } }),
  saffire("V-2", "Cotton jersey, 2-sided", "solid-thin", 741, 0.28, {
    flags: ["conflicting-sources"],
    alternatives: [{ o2Pct: 25.4, source: "ICES-2021-266 reports 25.4–26.2% for Saffire V (R3 §1)" }],
  }, { spread: { value: 3.4, unit: "mm/s", label: "spread rate" }, alarm: { value: 146, unit: "s", label: "time to 2 mg/m³ alarm" } }),
  saffire("VI-2", "SIBAL fabric, 2-sided", "solid-thin", 541, 0.31, {}, { spread: { value: 4.05, unit: "mm/s", label: "spread rate" }, hrr: { value: 3376, unit: "W", label: "peak HRR" }, alarm: { value: 201, unit: "s", label: "time to 2 mg/m³ alarm" } }),

  // BASS-II limit points (NASA/TM-20210011385)
  pub({
    id: "PUB-BASS2:micro-min", investigation: "PUB-BASS-II-LIMITS", fuelClass: "solid-thick", material: "Cast PMMA rods, concurrent flow", gravity: "micro",
    o2Pct: 13.5, o2Basis: "limit-reported", pressureKPa: 101.325, pressureBasis: "nominal-stated", flowCmS: null, flowRegime: "concurrent",
    flags: ["limit-value", "nominal-value"],
    note: "Minimum of the flammability boundary at stretch rate 8–12 s⁻¹ (not convertible to a single cm/s value).",
    source: { kind: "publication", ref: "Olson et al., BASS-II Summary Report, NASA/TM-20210011385", page: "§6 (as summarised in R3 §2.1)", url: ntrs("20210011385") },
  }),
  pub({
    id: "PUB-BASS2:1g-upward", investigation: "PUB-BASS-II-LIMITS", fuelClass: "solid-thick", material: "Cast PMMA rods, 1-g upward spread", gravity: "earth",
    o2Pct: 15.4, o2Basis: "limit-reported", pressureKPa: 101.325, pressureBasis: "nominal-stated", flowCmS: 4, flowRegime: "concurrent",
    flags: ["limit-value", "nominal-value"],
    note: "1-g upward-spread limit with +4 cm/s forced flow.",
    source: { kind: "publication", ref: "Olson et al., BASS-II Summary Report, NASA/TM-20210011385", page: "§6 (as summarised in R3 §2.1)", url: ntrs("20210011385") },
  }),

  // LUCI (preliminary; single New Shepard flight; lunar g by rotation)
  pub({
    id: "PUB-LUCI:sibal", investigation: "PUB-LUCI", fuelClass: "solid-thin", material: "SIBAL fabric 5 × 30 cm, downward", gravity: "moon",
    o2Pct: 20, pressureKPa: 101.325, pressureBasis: "nominal-stated", flowCmS: null, flowRegime: "natural-convection",
    flags: ["approximate", "nominal-value"], measures: { spreadBase: { value: 0.92, unit: "mm/s", label: "flame-base spread" } },
    note: "Air at 1 atm, ~20% O₂ initial. Preliminary; Coriolis effects bend flames; one flight.",
    source: { kind: "publication", ref: "Ferkul et al., LUCI (NTRS 20250010653)", page: "results slides (as summarised in R3 §2.8)", url: ntrs("20250010653") },
  }),
  pub({
    id: "PUB-LUCI:pmma", investigation: "PUB-LUCI", fuelClass: "solid-thick", material: "PMMA rod 4 mm, upward", gravity: "moon",
    o2Pct: 20, pressureKPa: 101.325, pressureBasis: "nominal-stated", flowCmS: null, flowRegime: "natural-convection",
    flags: ["approximate", "nominal-value"], measures: { tipSpread: { value: 0.15, unit: "cm/s", label: "tip spread (1 g: 0.40)" } },
    note: "O₂ fell from ~20% to 14.3% during the burn (initial value plotted). Preliminary; Coriolis effects; one flight.",
    source: { kind: "publication", ref: "Ferkul et al., LUCI (NTRS 20250010653)", page: "results slides (as summarised in R3 §2.8)", url: ntrs("20250010653") },
  }),
];

// ---------------------------------------------------------------- Olson & Ferkul 2012, Table I (primary checked 13 Nov by research agent)
export type GLevel = "earth" | "mars" | "moon" | "micro";
export interface PartialGRow { material: string; thickness: string; pressurePsia: number; uloi: Record<GLevel, number>; moc: Record<GLevel, number>; margin: { mars: number; moon: number; micro: number } }
export const OLSON_FERKUL_2012: { source: { ref: string; url: string; doi: string; page: string }; caveats: string[]; rows: PartialGRow[] } = {
  source: { ref: "Olson & Ferkul, ICES-2012-3492", url: ntrs("20130010991"), doi: "10.2514/6.2012-3492", page: "Table I" },
  caveats: [
    "5.18 s drop-tower tests (centrifuge for Mars/Moon)",
    "Reduced-g criteria (ULOI*, MOC*) differ from the 1-g test",
    "0-g values used a 30 cm/s forced flow",
    "3 materials, one thickness each",
  ],
  rows: [
    { material: "Mylar G", thickness: "5 mil", pressurePsia: 10.2, uloi: { earth: 21.2, mars: 18.0, moon: 15.6, micro: 17.0 }, moc: { earth: 20.0, mars: 17.0, moon: 14.1, micro: 16.0 }, margin: { mars: -3.1, moon: -5.75, micro: -4.1 } },
    { material: "Ultem 1000", thickness: "10 mil", pressurePsia: 10.2, uloi: { earth: 23.5, mars: 22.0, moon: 21.0, micro: 24.0 }, moc: { earth: 23.0, mars: 21.1, moon: 19.9, micro: 23.0 }, margin: { mars: -1.7, moon: -2.8, micro: 0.25 } },
    { material: "Nomex HT90-40", thickness: "fabric", pressurePsia: 14.7, uloi: { earth: 23.5, mars: 19.9, moon: 21.0, micro: 23.0 }, moc: { earth: 22.1, mars: 19.0, moon: 19.9, micro: 22.0 }, margin: { mars: -3.35, moon: -2.35, micro: -0.3 } },
  ],
};
const OF_FC: Record<string, Run["fuelClass"]> = { "Mylar G": "solid-thin", "Ultem 1000": "solid-unknown", "Nomex HT90-40": "solid-unknown" };
for (const row of OLSON_FERKUL_2012.rows) {
  for (const g of ["earth", "mars", "moon", "micro"] as GLevel[]) {
    PUBLISHED.push(pub({
      id: `PUB-OF2012:${row.material}:${g}`, investigation: "PUB-OLSON-FERKUL-2012", fuelClass: OF_FC[row.material], material: `${row.material} (${row.thickness})`,
      gravity: g, o2Pct: row.uloi[g], o2Basis: "limit-reported", pressureKPa: +(row.pressurePsia * PSIA).toFixed(2),
      flowCmS: g === "micro" ? 30 : null, flowRegime: g === "micro" ? "concurrent" : "natural-convection",
      flags: ["limit-value"], measures: { moc: { value: row.moc[g], unit: "% O₂", label: g === "earth" ? "MOC" : "MOC*" } },
      note: (g === "earth" ? "1-g upward limiting O₂ (ULOI)." : "Reduced-g limiting O₂ (ULOI*) from 5.18 s drop-tower tests; criteria differ from 1 g.") + " Flow regime shown is assumed from the test method (R3 does not state it).",
      source: { kind: "publication", ref: OLSON_FERKUL_2012.source.ref, page: "Table I", url: OLSON_FERKUL_2012.source.url },
    }));
  }
}

export const PLANNED: Run[] = [
  ...[37, 33, 29, 25].map((o2) => pub({
    id: `PLAN-FM2:2026:${o2}`, investigation: "PLAN-FM2", fuelClass: "solid-thin", material: "Fabric (2026 concept)", gravity: "moon",
    o2Pct: o2, pressureKPa: +(8.2 * PSIA).toFixed(1), flowCmS: null, flowRegime: "natural-convection", flags: ["conflicting-sources"],
    note: "Planned, not flown. 2026 concept condition set; the 2024 poster lists different conditions (21%/14.7 psia and 34%/8.2 psia).",
    source: { kind: "plan", ref: "Ferkul et al., LPSC 2026 slides (NTRS 20260001966)", url: ntrs("20260001966") },
  }, "T4_PLANNED")),
  ...[{ o2: 21, psia: 14.7 }, { o2: 34, psia: 8.2 }].map(({ o2, psia }) => pub({
    id: `PLAN-FM2:2024:${o2}`, investigation: "PLAN-FM2", fuelClass: "solid-thin", material: "SIBAL (2024 plan)", gravity: "moon",
    o2Pct: o2, pressureKPa: +(psia * PSIA).toFixed(1), flowCmS: null, flowRegime: "natural-convection", flags: ["conflicting-sources"],
    note: "Planned, not flown. 2024 poster condition set.",
    source: { kind: "plan", ref: "Zayac et al., 2024 poster (NTRS 20240015307)", url: ntrs("20240015307") },
  }, "T4_PLANNED")),
];

// ---------------------------------------------------------------- Pseudo-investigations for published groups
const pubInv = (id: string, acronym: string, title: string, tier: Investigation["tier"], scale: Investigation["scale"], url: string, platform: string): Investigation => ({
  id, acronym, title, tier, platform, hardware: null, pi: null, doi: null, license: null, landingUrl: url,
  startDate: null, endDate: null, objective: null, publicationsCount: 1, hasRunTable: false,
  runCount: [...PUBLISHED, ...PLANNED].filter((r) => r.investigation === id).length, summaryRowCount: 0, scale,
});
export const PUBLISHED_GROUPS: Investigation[] = [
  pubInv("PUB-SAFFIRE-IV-VI", "Saffire IV–VI", "Saffire IV–VI large-scale tests (published, not in PSI)", "T3_PUBLISHED", "large", S15.url, "Cygnus"),
  pubInv("PUB-BASS-II-LIMITS", "BASS-II limits", "BASS-II flammability-limit points (published)", "T3_PUBLISHED", "bench", ntrs("20210011385"), "ISS MSG / 1-g lab"),
  pubInv("PUB-OLSON-FERKUL-2012", "Olson & Ferkul 2012", "Drop-tower limiting O₂ at 1 g, Mars, Moon, 0 g (Table I)", "T3_PUBLISHED", "ground", ntrs("20130010991"), "Drop tower (5.18 s)"),
  pubInv("PUB-LUCI", "LUCI", "Lunar Combustion Investigation (preliminary)", "T3_PUBLISHED", "ground", ntrs("20250010653"), "Blue Origin New Shepard"),
  pubInv("PLAN-FM2", "FM2", "Flammability of Materials on the Moon (planned)", "T4_PLANNED", "bench", ntrs("20260001966"), "Lunar surface (planned)"),
];

// ---------------------------------------------------------------- Hazard map (DRAFT — lead-reviewed in production)
const H = (investigation: string, hazard: Hazard, match: HazardMapEntry["match"], measures: HazardMapEntry["measures"], rationale: string): HazardMapEntry => ({ investigation, hazard, match, measures, rationale });
export const HAZARD_MAP: HazardMapEntry[] = [
  H("PSI-25", "materials", "primary", 0.5, "Solid-fuel flammability limits vs O₂ and flow"),
  H("PSI-26", "materials", "primary", 0, "Solid-fuel burning; run table lists materials only"),
  H("PSI-98", "materials", "primary", 0.5, "Large-scale fabric burns"),
  H("PSI-99", "materials", "primary", 0.5, "Low-g flammability of 9 samples"),
  H("PSI-100", "materials", "primary", 0.5, "Large-scale fabric burns"),
  H("PSI-20", "materials", "secondary", 0, "Gas burner emulating condensed fuels (context only)"),
  H("PUB-SAFFIRE-IV-VI", "materials", "primary", 1, "Large-scale burns at exploration-like atmospheres; HRR, CO"),
  H("PUB-BASS-II-LIMITS", "materials", "primary", 0.5, "Limit points"),
  H("PUB-OLSON-FERKUL-2012", "materials", "primary", 0.5, "Limit points by gravity level"),
  H("PUB-LUCI", "materials", "primary", 0.5, "Lunar-g burns"),
  H("PSI-102", "smoke", "primary", 0.5, "Smoke from overheated materials; size results at investigation level only"),
  H("PSI-101", "smoke", "primary", 1, "Smoke particle size, wider matrix"),
  H("PSI-47", "smoke", "secondary", 0.5, "Particle-counter feasibility"),
  H("PUB-SAFFIRE-IV-VI", "smoke", "secondary", 1, "Alarm times, CO/CO₂ rise"),
  H("PSI-98", "smoke", "secondary", 0, "Large-scale burns"),
  H("PSI-69", "suppression", "primary", 1, "Inert-gas suppression of droplets (LOI)"),
  H("PSI-68", "suppression", "primary", 0, "Planned matrix only"),
  H("PSI-25", "suppression", "secondary", 0.5, "O₂ reduction by N₂ dilution"),
  H("PSI-26", "suppression", "secondary", 0, "N₂ suppression jets (per PSI text)"),
  H("PUB-SAFFIRE-IV-VI", "suppression", "secondary", 1, "Flow-off extinction attempts"),
  H("PSI-69", "liquid", "primary", 1, "Droplet combustion and extinction"),
  H("PSI-39", "liquid", "primary", 0.5, "Cool-flame droplet tests"),
  H("PSI-68", "liquid", "primary", 0, "Planned matrix only"),
  H("PSI-159", "liquid", "secondary", 1, "Gas-burner cool flames (context)"),
  H("PSI-10", "liquid", "secondary", 0.5, "Gas-burner flames (context)"),
];

export const HAZARDS: { id: Hazard; label: string; short: string }[] = [
  { id: "materials", label: "Material flammability", short: "Materials" },
  { id: "smoke", label: "Smoke & detection", short: "Smoke" },
  { id: "suppression", label: "Suppression", short: "Suppression" },
  { id: "liquid", label: "Liquid fuel & cool flames", short: "Liquid" },
];

// ---------------------------------------------------------------- Insight cards (DRAFT — none verified; production hides unverified cards)
export type Validity = "MEASURED" | "MODEL" | "EXTRAPOLATED";
export type Phase = "ignition" | "growth" | "detection" | "suppression" | "recovery";
export interface Insight { id: string; phase: Phase; hazards: Hazard[]; claim: string; value: string; conditions: string; validity: Validity; scope: string; notValidFor: string; source: { ref: string; url: string; page?: string }; verifiedBy: string | null }
export const INSIGHTS: Insight[] = [
  { id: "i-test1", phase: "ignition", hazards: ["materials"], claim: "The 1-g upward screening test can under-predict flammability in ventilated microgravity.", value: "13.5% vs 15.4% O₂", conditions: "BASS-II concurrent PMMA rods at stretch 8–12 s⁻¹ vs 1-g upward spread (+4 cm/s)", validity: "MEASURED", scope: "Cast PMMA rods, one geometry", notValidFor: "Other materials or geometries; partial gravity", source: { ref: "NASA/TM-20210011385", url: ntrs("20210011385") }, verifiedBy: null },
  { id: "i-ushape", phase: "growth", hazards: ["materials"], claim: "The flammability boundary is U-shaped in O₂ versus flow, with its minimum near spacecraft ventilation speeds.", value: "minimum near 5–10 cm/s-equivalent", conditions: "BASS-II rods and fabric; quench at very low flow, blowoff at high flow", validity: "MEASURED", scope: "PMMA rods and SIBAL fabric", notValidFor: "Untested materials (extrapolation)", source: { ref: "NASA/TM-20210011385", url: ntrs("20210011385") }, verifiedBy: null },
  { id: "i-alarm", phase: "detection", hazards: ["smoke", "materials"], claim: "Time to smoke alarm exceeded the time at which CO passed the 24-h limit in some large PMMA burns.", value: "1,037–1,603 s to alarm", conditions: "Saffire VI, 2 mg/m³ threshold, ~54 kPa, 29–30% O₂", validity: "MEASURED", scope: "One vehicle (17–19 m³), direct flow path to detector", notValidFor: "Well-mixed cabins or other detector placements", source: { ref: "ICES-2026-577", url: ntrs("20260001992") }, verifiedBy: null },
  { id: "i-same", phase: "detection", hazards: ["smoke"], claim: "The ISS smoke detector failed to alarm for Kapton smoke in half the SAME tests and for Teflon in two-thirds.", value: "1/2 Kapton · 2/3 Teflon", conditions: "Sub-ignition heating of 5 materials, 0–8 cm/s", validity: "MEASURED", scope: "Overheated materials below ignition", notValidFor: "Flaming fires; lunar gravity", source: { ref: "Fire detection white paper (NTRS 20210022143)", url: ntrs("20210022143") }, verifiedBy: null },
  { id: "i-flowoff", phase: "suppression", hazards: ["suppression", "materials"], claim: "Turning ventilation off did not reliably extinguish fires; a 5 cm/s, 300 s ramp-down before shut-off did in two tests.", value: "2-sided PMMA survived 15 s no-flow", conditions: "Saffire IV–V, ~100 and ~74 kPa", validity: "MEASURED", scope: "Three samples", notValidFor: "A general procedure for other fuels or vehicles", source: { ref: "ICES-2021-266", url: ntrs("20210011521") }, verifiedBy: null },
  { id: "i-loi", phase: "suppression", hazards: ["suppression", "liquid"], claim: "Limiting O₂ for droplet combustion is lower in microgravity, so inert-gas margins shrink.", value: "LOI 0.15 heptane · 0.12 methanol", conditions: "FLEX, O₂/N₂ at 1 atm", validity: "MEASURED", scope: "Two liquid fuels, droplets 1.5–5 mm", notValidFor: "Solid materials (extrapolation)", source: { ref: "Dietrich et al. 2014", url: "https://doi.org/10.1007/s12217-014-9372-2" }, verifiedBy: null },
  { id: "i-cool", phase: "recovery", hazards: ["liquid"], claim: "Large n-alkane droplets keep burning as invisible cool flames after the visible flame goes out.", value: "quasi-steady cool-flame regime", conditions: "FLEX/CFI droplets", validity: "MEASURED", scope: "n-alkane droplets", notValidFor: "Solid cabin materials", source: { ref: "Nayagam et al. (NTRS 20210022617)", url: ntrs("20210022617") }, verifiedBy: null },
  { id: "i-lunar", phase: "ignition", hazards: ["materials"], claim: "Microgravity and Earth results did not bound lunar behaviour for Mylar.", value: "Moon 15.6 < 0 g 17.0 < 1 g 21.2 % O₂", conditions: "Drop-tower centrifuge, 10.2 psia", validity: "MEASURED", scope: "3 materials, 5.18 s drops", notValidFor: "A general rule for all materials", source: { ref: "ICES-2012-3492, Table I", url: ntrs("20130010991") }, verifiedBy: null },
];

export const LIMITATIONS = [
  "Evidence distance measures coverage of test conditions, not flammability. Being close to a test does not mean a material behaves the same way.",
  "The axis scales (2 pts O₂, 25% pressure, 5 cm/s flow) are expert judgement; robustness to ½×–2× is shown.",
  "Tested configurations are narrow: mostly PMMA, SIBAL fabric, a few liquid fuels and gas burners.",
  "Partial-gravity evidence is three materials in 5.18 s drops plus one preliminary rotating flight.",
  "Published values differ between papers; all reported values are shown.",
  "“Nominal (stated)” pressures are not measurements.",
];
