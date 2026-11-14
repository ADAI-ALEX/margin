/**
 * Every source the app cites, for the Sources page. Checked 2026-11-14 (SI-assisted; human sign-off pending).
 * `terms` repeats what the source itself states (for NTRS documents: the NTRS record's copyright field), or "not stated".
 */
export interface Reference {
  id: string;
  short: string;
  citation: string; // authors, title, venue, year
  url: string;
  ntrs?: string;
  doi?: string;
  kind: "psi" | "ntrs" | "journal" | "standard" | "challenge";
  accessed: string;
  usedFor: string[];
  terms: string;
}

const ACCESSED = "2026-11-14";
const ntrs = (id: string) => `https://ntrs.nasa.gov/citations/${id}`;
const NTRS_TERMS = (field: string) => `NTRS record copyright field: ${field}`;

export const REFERENCES: Reference[] = [
  {
    id: "psi", short: "NASA PSI", kind: "psi", url: "https://psi.nasa.gov/", accessed: ACCESSED,
    citation: "NASA Biological and Physical Sciences Division, Physical Sciences Informatics (PSI) data repository, combustion science investigation records and experimental tables.",
    usedFor: ["All T1 run rows (PSI experimental tables)", "Investigation metadata and DOIs (prefix 10.60555)"],
    terms: "Licence as stated on each PSI investigation record: CC0-1.0 (Creative Commons Zero v1.0 Universal) on PSI-20, -21, -22, -23, -25, -26, -39, -47, -68, -69, -98, -99, -100, -101, -102, -106, -107 and -159 (checked through the PSI record API on 2026-11-14). PSI-10 (ACME/Flame Design): not stated in PSI record (licence field empty).",
  },
  {
    id: "challenge-2026", short: "Space Apps 2026 challenge", kind: "challenge", url: "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/", accessed: ACCESSED,
    citation: "NASA Space Apps Challenge 2026, “Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data”, challenge statement, 2026.",
    usedFor: ["Statement that PSI holds no partial-gravity combustion data", "Spacesuit atmosphere (100% O₂, 4.3 psi)"],
    terms: "not stated",
  },
  {
    id: "nasa-guide-2015", short: "Researcher’s Guide: Combustion Science (2015)", kind: "ntrs", accessed: ACCESSED,
    url: "https://www.nasa.gov/wp-content/uploads/2016/05/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
    citation: "Gokoglu, S. A., Dietrich, D. L., Stocker, D. P., Ferkul, P. V., Olson, S. L., Hicks, M. C., “A Researcher’s Guide to: Combustion Science”, NASA ISS Program Science Office, NP-2015-10-034-JSC, 2015.",
    usedFor: ["U-shaped flammability boundary near spacecraft ventilation speeds (p. 31)", "FLEX: limits lower in reduced gravity, inert-gas margin (p. 12)"],
    terms: "not stated",
  },
  {
    id: "bass2-tm", short: "BASS-II Summary Report (2021)", kind: "ntrs", ntrs: "20210011385", url: ntrs("20210011385"), accessed: ACCESSED,
    citation: "Olson, S. L., Ferkul, P. V., Bhattacharjee, S., Miller, F. J., Fernandez-Pello, C., Link, S., T’ien, J. S., Wichman, I., “Burning and Suppression of Solids–II (BASS–II) Summary Report”, NASA/TM-20210011385, NASA Glenn Research Center, 2021.",
    usedFor: ["BASS-II limit points 13.5% and 15.4% O₂", "Ignition delay near the limit", "Cabin-pressure statements (V4)"],
    terms: NTRS_TERMS("GOV_PERMITTED"),
  },
  {
    id: "olson-ferkul-2012", short: "Olson & Ferkul, ICES-2012-3492", kind: "ntrs", ntrs: "20130010991", doi: "10.2514/6.2012-3492", url: ntrs("20130010991"), accessed: ACCESSED,
    citation: "Olson, S. L., Ferkul, P. V., “Evaluating Material Flammability in Microgravity and Martian Gravity Compared to the NASA Standard Normal Gravity Test”, 42nd International Conference on Environmental Systems, AIAA 2012-3492, 2012.",
    usedFor: ["Table I: limiting O₂ at 1 g, Mars, Moon and 0 g for Mylar G, Ultem 1000 and Nomex HT90-40", "Legacy 30% O₂ / 10.2 psia test atmosphere"],
    terms: NTRS_TERMS("PUBLIC_USE_PERMITTED"),
  },
  {
    id: "saffire-ices2026", short: "Urban et al., ICES-2026-577", kind: "ntrs", ntrs: "20260001992", url: ntrs("20260001992"), accessed: ACCESSED,
    citation: "Urban, D. L., Ruff, G. A., Ferkul, P., Easton, J., Owens, J., Olson, S., Fortenberry, C., Graf, J., et al., “Heat and Smoke Emission from Tests on the SAFFIRE IV-VI Experiments”, 55th International Conference on Environmental Systems, ICES-2026-577, 2026.",
    usedFor: ["Saffire IV–VI per-test conditions and results (Table 1) — primary table for the seven Saffire runs", "Time to alarm and CO at alarm", "Linear flame growth on thick PMMA"],
    terms: NTRS_TERMS("MAY_INCLUDE_COPYRIGHT_MATERIAL"),
  },
  {
    id: "saffire-ices2021", short: "Urban et al., ICES-2021-266", kind: "ntrs", ntrs: "20210011521", url: ntrs("20210011521"), accessed: ACCESSED,
    citation: "Urban, D. L., Ruff, G. A., Ferkul, P., Easton, J., Owens, J., Olson, S., Meyer, M., Fortenberry, C., et al., “Fire Safety Implications of Preliminary Results from Saffire IV and V Experiments on Large Scale Spacecraft Fires”, 50th International Conference on Environmental Systems, ICES-2021-266, 2021.",
    usedFor: ["Alternative O₂, pressure and flow direction for Saffire IV–V (Table 1)", "Delayed extinguishment after flow-off", "Stratified-vapour deflagrations", "Duct-height effect on thin-fuel spread", "Saffire I–III test pressure (Table 2)"],
    terms: NTRS_TERMS("MAY_INCLUDE_COPYRIGHT_MATERIAL"),
  },
  {
    id: "saffire-ices2024", short: "Urban et al., ICES-2024-365", kind: "ntrs", ntrs: "20240002981", url: ntrs("20240002981"), accessed: ACCESSED,
    citation: "Urban, D. L., Ruff, G. A., Ferkul, P., Easton, J., Johnston, M., Owens, J., Olson, S., Fortenberry, C., et al., “Preliminary Results from the Saffire VI Experiment”, 53rd International Conference on Environmental Systems, ICES-2024-365, 2024.",
    usedFor: ["Alternative O₂, pressure, flow direction and peak heat release for Saffire VI (Tables 1 and 2)"],
    terms: NTRS_TERMS("MAY_INCLUDE_COPYRIGHT_MATERIAL"),
  },
  {
    id: "saffire-ices2017", short: "Ferkul et al., ICES 2017 slides", kind: "ntrs", ntrs: "20170008805", url: ntrs("20170008805"), accessed: ACCESSED,
    citation: "Ferkul, P., Olson, S., Urban, D. L., Ruff, G. A., Easton, J., T’ien, J. S., Liao, Y.-T. T., Fernandez-Pello, A. C., et al., “Results of Large-Scale Spacecraft Flammability Tests”, presentation, International Conference on Environmental Systems, 2017.",
    usedFor: ["Saffire-II silicone burn results (Table I, slide 29)", "Saffire I–II O₂ from ISS readings (cabin-pressure question V4)"],
    terms: NTRS_TERMS("PUBLIC_USE_PERMITTED"),
  },
  {
    id: "luci-2025", short: "Ferkul et al., LUCI (ASGSR 2025)", kind: "ntrs", ntrs: "20250010653", url: ntrs("20250010653"), accessed: ACCESSED,
    citation: "Ferkul, P. V., Johnston, M. C., Kralik, N., Liao, Y.-T., “Lunar Combustion Investigation: Flammability Results from a Rotating Sounding Rocket”, presentation, American Society for Gravitational and Space Research annual meeting, 2025.",
    usedFor: ["LUCI SIBAL and PMMA spread rates at lunar g", "O₂ fall during the PMMA burn", "Coriolis caveat"],
    terms: NTRS_TERMS("GOV_PERMITTED"),
  },
  {
    id: "fm2-lpsc2026", short: "Ferkul et al., FM2 (LPSC 2026)", kind: "ntrs", ntrs: "20260001966", url: ntrs("20260001966"), accessed: ACCESSED,
    citation: "Ferkul, P., Kralik, N., Liao, Y.-T., Johnston, M., “Material Flammability at Lunar and Martian Gravity”, presentation, 57th Lunar and Planetary Science Conference, 2026.",
    usedFor: ["FM2 planned condition set (37/33/29/25% O₂ at 8.2 psia)", "Exploration Atmosphere 8.2 psia / 34% O₂ for HLS, habitat and rover", "Spacesuit 100% O₂, 4.3 psia"],
    terms: NTRS_TERMS("GOV_PERMITTED"),
  },
  {
    id: "fm2-poster2024", short: "Zayac et al., FM2 poster (2024)", kind: "ntrs", ntrs: "20240015307", url: ntrs("20240015307"), accessed: ACCESSED,
    citation: "Zayac, J., Johnston, M., Ruff, G., Ferkul, P., “Flammability of Materials on the Moon”, poster, American Society for Gravitational and Space Research annual meeting, 2024.",
    usedFor: ["Earlier FM2 plan (21% O₂ / 14.7 psia and 34% O₂ / 8.2 psia)"],
    terms: NTRS_TERMS("GOV_PERMITTED"),
  },
  {
    id: "detection-whitepaper", short: "Fortenberry et al., fire detection white paper", kind: "ntrs", ntrs: "20210022143", url: ntrs("20210022143"), accessed: ACCESSED,
    citation: "Fortenberry, C., Wang, X., Cleary, T., Easton, J., Berger, G., Meyer, M., “Research Questions and Challenges for Improved Spacecraft Fire Detection”, white paper for the NASEM Decadal Survey on Biological and Physical Sciences Research in Space 2023–2032, 2021.",
    usedFor: ["SAME: ISS detector missed Kapton smoke in half and Teflon smoke in two-thirds of tests (review statement)"],
    terms: NTRS_TERMS("MAY_INCLUDE_COPYRIGHT_MATERIAL"),
  },
  {
    id: "same2-2012", short: "Urban et al., SAME-2 (AIAA 2012-3536)", kind: "ntrs", ntrs: "20130000422", doi: "10.2514/6.2012-3536", url: ntrs("20130000422"), accessed: ACCESSED,
    citation: "Urban, D. L., Ruff, G. A., Greenberg, P. S., Fischer, D., Meyer, M., Mulholland, G., Yuan, Z.-G., Bryg, V., et al., “Particle Morphology and Size Results from the Smoke Aerosol Measurement Experiment-2”, 42nd International Conference on Environmental Systems, AIAA 2012-3536, 2012.",
    usedFor: ["SAME-2 test conditions: five materials heated below ignition, flow quiescent to 8 cm/s"],
    terms: NTRS_TERMS("PUBLIC_USE_PERMITTED"),
  },
  {
    id: "flex-jasmac33", short: "Nayagam et al., FLEX (JASMAC-33)", kind: "ntrs", ntrs: "20210022617", url: ntrs("20210022617"), accessed: ACCESSED,
    citation: "Nayagam, V., Dietrich, D. L., Williams, F. A., “Isolated Single Droplet Combustion: FLEX Experiments onboard the International Space Station”, presentation, 33rd Academic Lecture Meeting of the Japan Society of Microgravity Application (JASMAC-33), 2021.",
    usedFor: ["Methanol limiting oxygen index ≈12–13% at atmospheric pressure", "Quasi-steady cool flames and re-ignition concern"],
    terms: NTRS_TERMS("PUBLIC_USE_PERMITTED"),
  },
  {
    id: "flex-tp2015", short: "Dietrich et al., FLEX results TP (2015)", kind: "ntrs", ntrs: "20150023456", url: ntrs("20150023456"), accessed: ACCESSED,
    citation: "Dietrich, D. L., Ferkul, P. V., Bryg, V. M., Nayagam, M. V., Hicks, M. C., Williams, F. A., Dryer, F. L., Shaw, B. D., et al., “Detailed Results from the Flame Extinguishment Experiment (FLEX) March 2009 to December 2011”, NASA/TP-2015-216046, 2015.",
    usedFor: ["FLEX test matrices (checked; the report does not state LOI values)"],
    terms: NTRS_TERMS("PUBLIC_USE_PERMITTED"),
  },
  {
    id: "heritage-ices2022", short: "Abney et al., ICES-2022-45", kind: "ntrs", ntrs: "20220006612", url: ntrs("20220006612"), accessed: ACCESSED,
    citation: "Abney, M. B., Bagdigian, R. M., Hopkins, C., Knox, J. C., Pedley, M. D., Macatangay, A. V., Cagle, H. A., “Evaluation of Heritage Hardware for Use in Cabin Environments with Reduced Pressure and Increased Oxygen Concentration”, 51st International Conference on Environmental Systems, ICES-2022-45, 2022.",
    usedFor: ["HEO-DM-1006 Exploration Atmosphere (8.2 psia, O₂ ≥ 33.7%)", "Portable extinguishers approved for use at 10.2 psia / 30% O₂", "Materials acceptable at 30% / 10.2 psia but unlikely at higher O₂", "ISS cabin ~14.7 psia / ~21% O₂"],
    terms: NTRS_TERMS("MAY_INCLUDE_COPYRIGHT_MATERIAL"),
  },
  {
    id: "artemis-hab-2022", short: "Kessler et al., Artemis Deep Space Habitation", kind: "ntrs", ntrs: "20220000245", url: ntrs("20220000245"), accessed: ACCESSED,
    citation: "Kessler, P., Prater, T., Nickens, T., Harris, D., “Artemis Deep Space Habitation: Enabling a Sustained Human Presence on the Moon and Beyond”, IEEE Aerospace Conference, 2022.",
    usedFor: ["Artemis surface habitat nominal atmosphere (10.2 psia, 26.5% O₂)"],
    terms: NTRS_TERMS("MAY_INCLUDE_COPYRIGHT_MATERIAL"),
  },
  {
    id: "norcross-2013", short: "Norcross et al., NASA/TM-2013-217377", kind: "ntrs", ntrs: "20130013505", url: ntrs("20130013505"), accessed: ACCESSED,
    citation: "Norcross, J., Norsk, P., Law, J., Arias, D., Conkin, J., Perchonok, M., Menon, A., Huff, J., et al., “Effects of the 8 psia / 32% O2 Atmosphere on the Human in the Spaceflight Environment”, NASA/TM-2013-217377, 2013.",
    usedFor: ["Exploration Atmosphere updated to 8.2 psia / 34% O₂"],
    terms: NTRS_TERMS("PUBLIC_USE_PERMITTED"),
  },
  {
    id: "nasa-std-6001b", short: "NASA-STD-6001B w/Change 2", kind: "standard", accessed: ACCESSED,
    url: "https://standards.nasa.gov/sites/default/files/standards/NASA/B-w/CHANGE-2/2/NASA-STD-6001B-w-Change-2_Admin-Change.pdf",
    citation: "NASA, “Flammability, Offgassing, and Compatibility Requirements and Test Procedures”, NASA-STD-6001B w/Change 2, 2016.",
    usedFor: ["Ambient conditions 20.9% O₂, 101.4 kPa (14.7 psia) used for the ISS preset"],
    terms: "Approved for public release; distribution is unlimited (as stated on each page)",
  },
];

/** One-paragraph data attribution. Kept separate from MARGIN's own code licence. */
export const PSI_ATTRIBUTION =
  "Data: NASA Physical Sciences Informatics (PSI), combustion science investigation records and experimental tables, downloaded from psi.nasa.gov. " +
  "Each PSI record states its own licence: the records MARGIN uses state CC0-1.0, except PSI-10 (ACME/Flame Design), whose licence is not stated in the PSI record. " +
  "Published values that are not in PSI are quoted from NASA Technical Reports Server (NTRS) documents and the other sources listed on this page, under the terms each states. " +
  "MARGIN is not endorsed by NASA and uses no NASA logos or insignia. These data terms are separate from the licence of MARGIN’s own code (Apache-2.0).";
