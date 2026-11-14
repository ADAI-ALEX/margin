/**
 * Verification record shared by insight cards, atmosphere presets and the verification log.
 *
 * status:
 *  - "primary-checked": the value or claim was found in the document that reports it (the investigators' own
 *    paper, report, slide deck or NASA statement), and `quote` is copied from that document.
 *  - "secondary-only": found only in a review that cites another paper for it; the original was not reachable.
 *  - "unverified": no source checked (for example an assumption made by design).
 *  - "contradicted": the primary source disagrees with the value.
 *
 * Quotes are verbatim excerpts of at most 25 words. Subscripts and superscripts typeset in the PDF are written with
 * Unicode (O₂, s⁻¹); all other characters follow the PDF text layer.
 */
export interface Verification {
  status: "primary-checked" | "secondary-only" | "unverified" | "contradicted";
  checkedAt: string; // ISO date
  checkedBy: string;
  locator: string | null;
  quote: string | null; // verbatim, ≤25 words
  notes?: string;
}

export const CHECKED_AT = "2026-11-14";
export const CHECKED_BY = "SI-assisted source check (Claude) — human sign-off pending";

export const checked = (locator: string, quote: string | null, notes?: string): Verification => ({
  status: "primary-checked", checkedAt: CHECKED_AT, checkedBy: CHECKED_BY, locator, quote, ...(notes ? { notes } : {}),
});
export const secondaryOnly = (locator: string, quote: string | null, notes: string): Verification => ({
  status: "secondary-only", checkedAt: CHECKED_AT, checkedBy: CHECKED_BY, locator, quote, notes,
});
export const unverified = (notes: string): Verification => ({
  status: "unverified", checkedAt: CHECKED_AT, checkedBy: CHECKED_BY, locator: null, quote: null, notes,
});
