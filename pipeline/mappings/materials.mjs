// Material text -> fuel class. Reviewed lookup (Kickoff §C.3-8, [DECIDE] by lead).
//
// Basis: a solid is "thermally thin" when the whole thickness heats through during flame
// spread, "thermally thick" when only a surface layer does. R3 §2.1 cites a thin/thick
// transition of about 5.2 mm for PMMA in ambient air. MARGIN therefore uses:
//   * solid-thin  : SIBAL / cotton(-fiberglass) fabric, or any film/sheet with a stated
//                   thickness <= THIN_MAX_MM (0.2 mm). At that thickness a polymer film is
//                   thermally thin regardless of polymer, so the polymer name is not required.
//   * solid-thick : PMMA rods (smallest BASS-II rod is 1/4" = 6.35 mm), spheres and spherical
//                   sections (>= 1 cm), and PMMA sheets/slabs with stated thickness >= THICK_MIN_MM.
//   * solid-unknown: everything else, including PMMA with a stated thickness between 0.2 mm and
//                   5.2 mm (intermediate: neither criterion applies), slabs with no stated thickness,
//                   Nomex, Ultem, silicone, mixed samples, blank material cells, wax and candles.
// The Kickoff draft rule put the thick cut at 1 mm; the cited basis (5.2 mm) does not support
// that, so 1-5 mm PMMA is solid-unknown here. Change THICK_MIN_MM to 1 to restore the draft rule.
export const THIN_MAX_MM = 0.2;
export const THICK_MIN_MM = 5.2;

/** Material groups that are not cabin materials. They keep a solid fuel class (they are burning solids) but are labelled. */
export function materialGroupOf(text) {
  const m = (text || "").toLowerCase();
  if (/candle|wax|paraf+in/.test(m)) return "wax-candle";
  if (/soot\s*cleaning/.test(m)) return "maintenance";
  return null;
}

/** Thickness in mm stated inside the material text, or null. */
export function thicknessFromText(text) {
  const m = (text || "").toLowerCase();
  const micron = m.match(/(\d+(?:\.\d+)?)\s*micron/);
  if (micron) return parseFloat(micron[1]) / 1000;
  const mm = m.match(/(\d*\.?\d+)\s*mm\b(?:\s*(?:pmma\s*)?(?:film|thick))?/);
  if (mm && /(film|thick|slab|pmma)/.test(m)) return parseFloat(mm[1]);
  return null;
}

/**
 * @param {string|null} text material cell, verbatim
 * @param {number|null} thicknessMm thickness from a separate column (mm), if any
 * @returns {{ fuelClass: string, rule: string, thicknessMm: number|null }}
 */
export function classifyMaterial(text, thicknessMm = null) {
  const m = (text || "").toLowerCase().trim();
  if (!m) return { fuelClass: "solid-unknown", rule: "material cell blank in PSI table; not inferred", thicknessMm };
  if (materialGroupOf(m) === "maintenance") return { fuelClass: "none", rule: "maintenance operation, not a burn", thicknessMm: null };
  if (materialGroupOf(m) === "wax-candle") return { fuelClass: "solid-unknown", rule: "wax / candle: melting fuel, not a cabin material", thicknessMm: null };
  if (/&|\band\b/.test(m) && /pmma/.test(m) && /nomex/.test(m)) return { fuelClass: "solid-unknown", rule: "mixed sample", thicknessMm };
  if (/sibal|cotton/.test(m)) return { fuelClass: "solid-thin", rule: "fabric (SIBAL / cotton)", thicknessMm };
  if (/\brod\b/.test(m)) return { fuelClass: "solid-thick", rule: "rod (>= 6.35 mm diameter)", thicknessMm };
  if (/sphere|spherical/.test(m)) return { fuelClass: "solid-thick", rule: "sphere / spherical section", thicknessMm };
  const t = thicknessFromText(m) ?? thicknessMm;
  const sheet = /pmma|film|micron/.test(m);
  if (sheet && t != null) {
    if (t <= THIN_MAX_MM) return { fuelClass: "solid-thin", rule: `film/sheet ${t} mm <= ${THIN_MAX_MM} mm`, thicknessMm: t };
    if (/pmma/.test(m) && t >= THICK_MIN_MM) return { fuelClass: "solid-thick", rule: `PMMA ${t} mm >= ${THICK_MIN_MM} mm`, thicknessMm: t };
    return { fuelClass: "solid-unknown", rule: `intermediate thickness ${t} mm (between ${THIN_MAX_MM} and ${THICK_MIN_MM} mm)`, thicknessMm: t };
  }
  return { fuelClass: "solid-unknown", rule: "no rule applies (material or thickness not determinable from text)", thicknessMm: t };
}
