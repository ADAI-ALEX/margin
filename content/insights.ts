/**
 * Insight cards (Kickoff §C.9). Each card was checked against the document it cites on 2026-11-14 (SI-assisted);
 * `verifiedBy` stays null until a human signs off. Only cards with verification.status === "primary-checked" render
 * as findings in the app. Locators and quotes are recorded in docs/verification/source-verification.md.
 */
import type { Hazard } from "@/lib/schema";
import { checked, secondaryOnly, type Verification } from "./verification";

/**
 * MEASURED: reported measurement. MODEL: model or theory result. EXTRAPOLATED: carried beyond the tested range.
 * STATED: a documented NASA statement (for example a certification status or a description of a dataset), not a measurement.
 */
export type Validity = "MEASURED" | "MODEL" | "EXTRAPOLATED" | "STATED";
export type Phase = "ignition" | "growth" | "detection" | "suppression" | "recovery";
export interface Insight {
  id: string; phase: Phase; hazards: Hazard[];
  claim: string; value: string; conditions: string; validity: Validity; scope: string; notValidFor: string;
  source: { ref: string; url: string; page?: string };
  verification: Verification;
  verifiedBy: string | null;
}

const ntrs = (id: string) => `https://ntrs.nasa.gov/citations/${id}`;
const GUIDE_URL = "https://www.nasa.gov/wp-content/uploads/2016/05/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf";
const BASS2 = { ref: "Olson et al., BASS-II Summary Report, NASA/TM-20210011385", url: ntrs("20210011385") };
const S2026 = { ref: "Urban et al., ICES-2026-577 (NTRS 20260001992)", url: ntrs("20260001992") };
const S2021 = { ref: "Urban et al., ICES-2021-266 (NTRS 20210011521)", url: ntrs("20210011521") };
const OF2012 = { ref: "Olson & Ferkul, ICES-2012-3492 (NTRS 20130010991)", url: ntrs("20130010991") };
const ICES2022 = { ref: "Abney et al., ICES-2022-45 (NTRS 20220006612)", url: ntrs("20220006612") };

export const INSIGHTS: Insight[] = [
  // ------------------------------------------------------------------ ignition
  {
    id: "i-test1", phase: "ignition", hazards: ["materials"],
    claim: "On the ISS, PMMA rods in low-speed forced flow kept burning at a lower O₂ than the 1-g upward-spread limit reported for the same material.",
    value: "13.5% vs 15.4% O₂",
    conditions: "BASS-II, cast PMMA rods in concurrent flow, minimum of the flammability boundary at stretch rate 8–12 s⁻¹; the 1-g value is upward spread with an added 4 cm/s forced flow (Hirsch et al. 2003, as cited in the report)",
    validity: "MEASURED",
    scope: "Cast PMMA rods (radius 0.318–0.635 cm) in the ISS Microgravity Science Glovebox",
    notValidFor: "Other materials or geometries; partial gravity; rating any material",
    source: { ...BASS2, page: "§6.1.4.4, p. 76" },
    verification: checked("§6.1.4.4, p. 76 (PDF p. 84)",
      "13.5 percent O2 at a of 8 to 12 s⁻¹ is significantly lower than the observed upward flame spread limit of 15.4 percent O2",
      "The 15.4% value is from Ref. 23 of the TM (Hirsch et al., ASTM STP1454, 2003), which was not checked. The TM's own framing of why this matters is on p. 3 (PDF p. 11)."),
    verifiedBy: null,
  },
  {
    id: "i-ignition-delay", phase: "ignition", hazards: ["materials"],
    claim: "Near the low-O₂ limit, PMMA rods on the ISS took far longer to ignite than the igniter-on time used in the NASA standard test, and ignition limits sat above flammability limits.",
    value: "up to ≈10× the standard igniter-on time",
    conditions: "BASS-II, cast PMMA rods, hot-wire igniter, ISS Microgravity Science Glovebox; ignition attempts of up to 500 s failed at very low O₂",
    validity: "MEASURED",
    scope: "PMMA rods with one igniter design",
    notValidFor: "Other igniters, materials or geometries",
    source: { ...BASS2, page: "§6.1.6, p. 89; §6.1.3, p. 67" },
    verification: checked("§6.1.6, p. 89 (PDF p. 97); 500 s attempts §6.1.3, p. 67 (PDF p. 75)",
      "The ignition delay time can be up to almost 10 times longer than the NASA STD–6001 standard igniter on time."),
    verifiedBy: null,
  },
  {
    id: "i-deflag", phase: "ignition", hazards: ["materials"],
    claim: "Without buoyancy to carry it away, fuel vapour from heated samples accumulated and ignited as a sudden deflagration in two Saffire tests.",
    value: "2 of 5 Saffire IV–V tests",
    conditions: "Saffire IV-2 (2-sided PMMA, 100 kPa, 22% O₂, after flow was cut to 5 cm/s) and V-4 (structured PMMA, 72.6 kPa, 25.7% O₂, at ignition in 20 cm/s flow), conditions as in ICES-2021-266 Table 1",
    validity: "MEASURED",
    scope: "Two events in large-scale tests; the authors suggest curled ash upstream may have helped V-4",
    notValidFor: "Predicting when or where a deflagration will occur",
    source: { ...S2021, page: "§III.B, p. 5" },
    verification: checked("§III.B, p. 5; V-4 at ignition p. 7",
      "Two Saffire samples (IV-2 and V-4) exhibited intense ignition processes of deflagration because of a stratified mixture"),
    verifiedBy: null,
  },
  {
    id: "i-lunar", phase: "ignition", hazards: ["materials"],
    claim: "For Mylar at 10.2 psia, drop-tower tests found a lower limiting O₂ at lunar gravity than at either 0 g or 1 g: microgravity and Earth results did not bound lunar behaviour for this material.",
    value: "ULOI: Moon 15.6 · 0 g 17.0 · 1 g 21.2 % O₂",
    conditions: "Concurrent (upward) spread; 5.18 s drop tower with a rotating centrifuge for lunar g; 0 g with 30 cm/s concurrent flow; 1 g from WSTF tests with a hot-wire igniter; 10.2 psia",
    validity: "MEASURED",
    scope: "Mylar G, 5 mil film; reduced-g limit criteria (ULOI*, MOC*) differ from the 1-g criteria",
    notValidFor: "A general rule for other materials (Nomex: Mars below Moon; Ultem: 0 g above 1 g)",
    source: { ...OF2012, page: "Table I, p. 6" },
    verification: checked("Table I, p. 6; Mylar discussion p. 7",
      "the result is a significantly negative oxygen margin of safety (~4-5%) in Martian, Lunar, and 0g.",
      "Quote refers to Mylar (non-charring). The lunar and 0-g columns are earlier data from Ferkul & Olson 2011 (ref. 8 of the paper), included in Table I."),
    verifiedBy: null,
  },
  {
    id: "i-material-specific", phase: "ignition", hazards: ["materials"],
    claim: "The gravity effect on limiting O₂ depends on the material: Ultem's 0-g limit sat slightly above its 1-g limit, and Nomex's Martian-g limit sat below its lunar-g limit.",
    value: "Ultem ΔO₂ (0 g) +0.25 · Nomex ULOI* Mars 19.9 vs Moon 21.0 % O₂",
    conditions: "Same drop-tower study: Ultem 1000 at 10.2 psia, Nomex HT90-40 at 14.7 psia; 5.18 s tests",
    validity: "MEASURED",
    scope: "Two charring materials, one thickness each",
    notValidFor: "Ranking gravity levels for untested materials",
    source: { ...OF2012, page: "Table I, p. 6" },
    verification: checked("Table I, p. 6; charring-material discussion p. 7",
      "For these charring materials, the oxygen margin of safety in 0g is very close to zero"),
    verifiedBy: null,
  },
  {
    id: "i-silicone", phase: "ignition", hazards: ["materials"],
    claim: "In Saffire-II, silicone sheets did not burn appreciably in microgravity at 20 cm/s, although the thinnest sheet burned almost completely in a 1-g upward test.",
    value: "μ-g burn length ≈ 0 for four silicone sheets (0.27–1.03 mm)",
    conditions: "Saffire-II on Cygnus, silicone 5 cm × 29 cm, 20 cm/s concurrent or opposed flow, ≈22.1% O₂ (ISS reading); pressure not stated in this source",
    validity: "MEASURED",
    scope: "Four small silicone samples at one flow speed",
    notValidFor: "Other flows, elevated O₂ or other materials",
    source: { ref: "Ferkul et al., ICES 2017 slides (NTRS 20170008805)", url: ntrs("20170008805"), page: "Table I, slide 29; summary, slide 26" },
    verification: checked("Table I, slide 29; summary, slide 26",
      "Flammability of silicone in microgravity appears to be reduced compared to normal gravity, at least for the flow speeds tested."),
    verifiedBy: null,
  },
  {
    id: "i-materials-ea", phase: "ignition", hazards: ["materials"],
    claim: "A NASA assessment of heritage ISS hardware states that many ISS materials meet flammability requirements at 10.2 psia and 30% O₂ but are unlikely to meet them at higher O₂.",
    value: "assessed up to 40% O₂ at 8.2 psia",
    conditions: "Engineering assessment of 33 ISS and Orion subsystems for Exploration atmospheres (10.2 psia / 26.5% O₂ and 8.2 psia / 34% O₂)",
    validity: "STATED",
    scope: "Heritage ISS materials named in the assessment (for example foam insulation, sound-block silicones)",
    notValidFor: "Any specific material without its own test record",
    source: { ...ICES2022, page: "p. 8" },
    verification: checked("p. 8",
      "Many ISS materials have been shown to meet flammability requirements at 10.2 psia and 30% O2, but are unlikely to meet the requirements"),
    verifiedBy: null,
  },
  {
    id: "i-psi-partialg", phase: "ignition", hazards: ["materials"],
    claim: "NASA's challenge statement says PSI currently holds no partial-gravity combustion data.",
    value: "no partial-gravity combustion data in PSI (as stated)",
    conditions: "NASA Space Apps 2026 “Flame in Freefall” challenge statement; LUCI and FM2 are named as expected future additions",
    validity: "STATED",
    scope: "The PSI combustion archive at the time of the challenge",
    notValidFor: "Data outside PSI (drop-tower, aircraft, LUCI) or future PSI additions",
    source: { ref: "NASA Space Apps Challenge 2026, Flame in Freefall", url: "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/", page: "“Partial-gravity data” section" },
    verification: checked("“Partial-gravity data” section",
      "there is currently no partial-gravity combustion data available in PSI"),
    verifiedBy: null,
  },

  // ------------------------------------------------------------------ growth
  {
    id: "i-ushape", phase: "growth", hazards: ["materials"],
    claim: "The flammability boundary for PMMA rods in microgravity is U-shaped in O₂ versus flow: flames go out at very low flow (quenching) and at high flow (blowoff), with the lowest O₂ in between.",
    value: "minimum ≈ 13.5% O₂ at stretch rate 8–12 s⁻¹",
    conditions: "BASS-II, cast PMMA rods in concurrent axial stagnation flow (0–55 cm/s duct flow); the minimum is reported as a stretch rate, not a single flow speed",
    validity: "MEASURED",
    scope: "Cast PMMA rods; NASA's 2015 guide describes the same shape for flame spread over solids generally",
    notValidFor: "Converting the minimum to one flow speed for other geometries; untested materials",
    source: { ...BASS2, page: "§6.1.4.4, pp. 75–76" },
    verification: checked("§6.1.4.4, p. 76 (PDF p. 84)",
      "This “Goldilocks” zone of flow is unfortunately typical of spacecraft ventilation flows near surfaces.",
      "General statement in NASA's Researcher's Guide (NP-2015-10-034-JSC, p. 31): “For flame spread across solid materials, the characteristic gas velocity of the minimum in the curve is on the order of 10 cm/s”."),
    verifiedBy: null,
  },
  {
    id: "i-growth", phase: "growth", hazards: ["materials"],
    claim: "In Saffire IV–VI, flames on thick PMMA did not spread along the sample; they stayed anchored at the leading edge and grew linearly, without the acceleration seen in upward burning in 1 g.",
    value: "0.22–0.38 mm/s flame-length growth",
    conditions: "Saffire IV–VI on Cygnus, PMMA 40 cm wide (5 or 10 mm thick), 20 cm/s duct flow, 22–30% O₂, 54–100 kPa (ICES-2026-577 Table 1)",
    validity: "MEASURED",
    scope: "Four flat PMMA samples, burns of about 500 s; the 2-sided samples were still growing when the tests ended",
    notValidFor: "Other fuels, clutter or cabin geometries; burns longer than tested",
    source: { ...S2026, page: "§III, p. 5; Table 1, p. 6" },
    verification: checked("§III, p. 5; Table 1, p. 6",
      "The PMMA samples all showed intervals of very linear flame growth for periods of several minutes.",
      "Same page: “It is unknown if the 2-sided samples would eventually plateau, longer experiments would be helpful.”"),
    verifiedBy: null,
  },
  {
    id: "i-duct", phase: "growth", hazards: ["materials"],
    claim: "The size of the flow enclosure changed flame spread over thin fabric: lowering the duct height from 46 cm to 30 cm roughly doubled the spread rate.",
    value: "≈ +100% spread rate",
    conditions: "SIBAL fabric 40–41 cm wide, 20–25 cm/s concurrent flow, ≈100 kPa, 21–22% O₂ (Saffire I and III vs IV, ICES-2021-266 Table 2)",
    validity: "MEASURED",
    scope: "One fabric, two duct heights",
    notValidFor: "Other enclosures or fuels without a model",
    source: { ...S2021, page: "§III.C and Table 2, p. 8" },
    verification: checked("§III.C and Table 2, p. 8",
      "As expected, the spread rate increased (about 100%) with the reduced height flow duct compared to Saffire I and III."),
    verifiedBy: null,
  },
  {
    id: "i-luci", phase: "growth", hazards: ["materials"],
    claim: "On a rotating New Shepard flight at lunar g, a SIBAL fabric flame spread steadily downward for over a minute; with the same hardware in 1 g the flame went out about 45 s sooner.",
    value: "flame base 0.92 mm/s, tip 1.1 mm/s",
    conditions: "LUCI, New Shepard (launched 4 Feb 2025), 11 rpm at 1.22 m radius, air at normal pressure, O₂ falling from ~20% to ~18% during the burn",
    validity: "MEASURED",
    scope: "One flight, one fabric sample; Coriolis force affected the flames; conference slides, not a peer-reviewed paper",
    notValidFor: "Exploration atmospheres (air only), other materials, long-duration lunar-surface behaviour",
    source: { ref: "Ferkul et al., LUCI (NTRS 20250010653)", url: ntrs("20250010653"), page: "slides 16, 19, 34" },
    verification: checked("slide 16 (caption), slide 19 (spread rates), slide 34 (1-g comparison)",
      "SIBAL fabric (cotton-fiberglass blend) burning downward in Lunar-g 30 s after ignition. The flame spread for over a minute."),
    verifiedBy: null,
  },

  // ------------------------------------------------------------------ detection
  {
    id: "i-smoke", phase: "detection", hazards: ["smoke", "materials"],
    claim: "In Saffire VI, the fires barely changed cabin temperature and pressure, while CO and CO₂ rose above crew exposure limits in the PMMA tests.",
    value: "ΔT 0.25–0.50 °C · ΔP 0.25–0.34 mbar · CO rise 122–338 ppm (24-h SMAC 100 ppm)",
    conditions: "Saffire VI on Cygnus, free volume 16.7 m³, 54–55 kPa, 29–31% O₂; increases measured at the far-field unit over an unscrubbed baseline",
    validity: "MEASURED",
    scope: "One vehicle configuration with a direct flow path to the far-field unit",
    notValidFor: "Other vehicle volumes, ventilation or fire sizes; battery fires",
    source: { ...S2026, page: "Abstract, p. 2; Table 1, p. 6" },
    verification: checked("abstract, p. 2; Table 1, p. 6",
      "Overall, the pressure rise and temperature change were small but the smoke particulate rose to substantial levels and the gaseous products also achieved hazardous levels."),
    verifiedBy: null,
  },
  {
    id: "i-alarm", phase: "detection", hazards: ["smoke", "materials"],
    claim: "At a 2 mg/m³ aerosol reference threshold, both Saffire VI PMMA fires were detected only after CO had already risen above the 24-hour crew limit.",
    value: "alarm at 1,037 s and 1,603 s · CO rise at alarm 105 and 283 ppm (24-h SMAC 100 ppm)",
    conditions: "Saffire VI-3 and VI-4, PMMA, 54–55 kPa, 29–30% O₂, 20 cm/s duct flow; reference alarm = DustTrak aerosol reading at the far-field unit",
    validity: "MEASURED",
    scope: "One vehicle (free volume 16.7 m³) with a direct flow path to the detector; the authors' reference threshold, not a flight smoke detector",
    notValidFor: "Well-mixed cabins, other detectors or placements; Saffire IV PMMA and VI SIBAL were detected before CO reached the 24-hour limit",
    source: { ...S2026, page: "Table 1, p. 6; §III, p. 9" },
    verification: checked("Table 1, p. 6; §III, p. 9",
      "both PMMA samples from SAFFIRE VI exceeded the CO threshold with the 1-sided sample approaching the 1-hour SMAC"),
    verifiedBy: null,
  },
  {
    id: "i-same", phase: "detection", hazards: ["smoke"],
    claim: "During SAME, the ISS smoke detector failed to alarm for Kapton smoke in half of the tests and for Teflon smoke in two-thirds.",
    value: "1/2 Kapton · 2/3 Teflon",
    conditions: "SAME on ISS: materials heated below ignition; SAME-2 used five materials and air flow from quiescent to 8 cm/s",
    validity: "MEASURED",
    scope: "Overheated (pyrolysing) materials, not flaming fires",
    notValidFor: "Flaming fires; lunar gravity; other detector designs",
    source: { ref: "Fortenberry et al., fire detection white paper (NTRS 20210022143)", url: ntrs("20210022143"), page: "p. 2" },
    verification: secondaryOnly("Introduction, p. 2",
      "the ISS detector failed to alarm for Kapton smoke in half of the tests and for Teflon smoke in two-thirds of the tests",
      "The white paper is a NASA-authored review that cites Meyer et al. 2015 (Aerosol Sci. Technol. 49) and Meyer et al. 2018 (Fire Saf. J. 98) for this result; neither was found on NTRS, so the original measurement was not checked. Test conditions checked against SAME-2 (AIAA 2012-3536, NTRS 20130000422, abstract p. 1)."),
    verifiedBy: null,
  },

  // ------------------------------------------------------------------ suppression
  {
    id: "i-flowoff", phase: "suppression", hazards: ["suppression", "materials"],
    claim: "Turning the airflow off did not reliably put fires out: a 2-sided PMMA flame survived 15 s without flow and a cotton fabric flame grew back after 70 s; holding 5 cm/s for 300 s before shut-off was followed by immediate extinction in two tests.",
    value: "15 s and 70 s without flow · 5 cm/s for 300 s",
    conditions: "Saffire IV-2 (PMMA, 100 kPa, 22% O₂), V-2 (cotton, 70.7 kPa, 26.2% O₂), V-3 and V-4 (PMMA, 71.3–72.6 kPa, 25.4–25.7% O₂), values as in ICES-2021-266 Table 1",
    validity: "MEASURED",
    scope: "Four tests on two flights",
    notValidFor: "A general extinguishment procedure; the authors note it would carry other risks",
    source: { ...S2021, page: "§III.A, pp. 4–5" },
    verification: checked("§III.A, pp. 4–5",
      "However, as an extinguishment strategy, this would carry other risks given the uncertainty of configurations and flow rates in a spacecraft."),
    verifiedBy: null,
  },
  {
    id: "i-loi", phase: "suppression", hazards: ["suppression", "liquid"],
    claim: "NASA reports that FLEX droplet flammability limits are lower in reduced gravity, so terrestrial standards for inert-gas suppressants may not give the same margin in low gravity.",
    value: "methanol LOI ≈ 12–13% O₂ at atmospheric pressure",
    conditions: "FLEX on ISS (CIR/MDCA), methanol droplets 1–4.5 mm, 13–30% O₂ with N₂, CO₂ or He; value from Nayagam, Dietrich & Williams, JASMAC-33 slides (NTRS 20210022617), slide 4",
    validity: "MEASURED",
    scope: "Liquid fuel droplets (methanol and heptane were studied)",
    notValidFor: "Solid materials; pools or sprays; choosing a suppressant concentration",
    source: { ref: "Gokoglu et al., A Researcher's Guide to: Combustion Science, NP-2015-10-034-JSC", url: GUIDE_URL, page: "p. 12" },
    verification: checked("Researcher's Guide p. 12 (claim); JASMAC-33 slide 4 (value)",
      "The research to date has shown that the flammability limit is lower in reduced gravity.",
      "Value quote (JASMAC-33 slide 4): “The limiting oxygen index (LOI) ~ 12-13% oxygen at atmospheric pressure.” The heptane LOI of 0.15 used in earlier drafts comes from Dietrich et al. 2014 (Microgravity Sci. Technol., doi 10.1007/s12217-014-9372-2), which could not be opened; the FLEX TP (NTRS 20150023456) does not state LOI values. Heptane value removed."),
    verifiedBy: null,
  },
  {
    id: "i-pfe", phase: "suppression", hazards: ["suppression"],
    claim: "A NASA heritage-hardware assessment states that the ISS water-mist and Orion water-spray portable extinguishers are approved for use at 10.2 psia and 30% O₂, and that higher O₂ could reduce their ability to put out a fire.",
    value: "approved for use at 10.2 psia / 30% O₂",
    conditions: "Assessment for Exploration atmospheres up to 40% O₂ at 8.2 psia",
    validity: "STATED",
    scope: "ISS water-mist and MPCV (Orion) water-spray portable fire extinguishers",
    notValidFor: "Performance of any extinguisher at Exploration conditions (not tested in this source)",
    source: { ...ICES2022, page: "p. 10" },
    verification: checked("p. 10",
      "Increased O2 concentrations could decrease the ability of water-spray and/or water-mist PFEs to extinguish a fire.",
      "The approval status is from the preceding sentence on the same page, whose wording is the formal certification term; it is paraphrased as “approved for use” here because the app's claims lint bans that term in visible text."),
    verifiedBy: null,
  },

  // ------------------------------------------------------------------ recovery
  {
    id: "i-cool", phase: "recovery", hazards: ["liquid"],
    claim: "After the visible hot flame went out, large n-alkane droplets kept burning as a weak, low-temperature cool flame; the FLEX team notes these may re-ignite to hot flames.",
    value: "example: n-decane, ½ atm air, D₀ 4.0 mm — hot-flame extinction at 3.3 mm, cool-flame extinction at 2.7 mm",
    conditions: "FLEX/CFI droplet tests on ISS: n-heptane, n-octane, n-decane, n-dodecane",
    validity: "MEASURED",
    scope: "n-alkane droplets in microgravity",
    notValidFor: "Solid cabin materials; pools or sprays",
    source: { ref: "Nayagam et al., FLEX (JASMAC-33, NTRS 20210022617)", url: ntrs("20210022617"), page: "slides 5, 14, 17" },
    verification: checked("slide 14 (conclusions); slide 5 (fuels); slide 17 (n-decane example)",
      "These cool flames produce partially oxidized fuel and potentially re-ignite to hot flames posing fire safety concerns in spacecraft environments"),
    verifiedBy: null,
  },
];
