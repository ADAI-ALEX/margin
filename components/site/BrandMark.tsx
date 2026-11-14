/**
 * The MARGIN mark, derived from the product's own geometry: two iso-distance contours of tested conditions
 * (DIRECT filled inside NEAR) and the user's scenario probe outside them, joined by a dashed gap: the margin
 * between a scenario and the nearest evidence. One geometry for the header, favicon (app/icon.svg), README
 * banner and OG image (docs/assets/branding/margin-mark.svg). Colours come from tokens via site.css.
 */
export const MARK_PATHS = {
  near: "M1.88 22.49C0.94 13.64 7.11 6.94 15.01 7.35c6.83 0.40 9.92 5.49 9.25 10.99 -0.80 6.57 -6.97 11.52 -13.94 11.12 -4.96 -0.27 -7.91 -2.95 -8.44 -6.97Z",
  direct: "M7.51 21.01c-0.54 -4.42 2.55 -7.77 6.43 -7.50 3.35 0.27 4.82 2.95 4.42 5.63 -0.54 3.22 -3.62 5.49 -6.83 5.23 -2.28 -0.13 -3.75 -1.61 -4.02 -3.35Z",
  gap: "M25.4 7 22.5 9.7",
  scenario: { cx: 27.8, cy: 4.7, r: 3.1 },
} as const;

/** Hex values used where CSS variables cannot reach (favicon, README banner, OG image). Keep in sync with app/globals.css. */
export const MARK_COLORS = { ev: "#56c6dc", scenario: "#f2a93b", canvas: "#05070a" } as const;

export default function BrandMark({ size = 24, title }: { size?: number; title?: string }) {
  return (
    <svg className="site-mark" width={size} height={size} viewBox="0 0 32 32" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path d={MARK_PATHS.near} className="site-mark-near" />
      <path d={MARK_PATHS.direct} className="site-mark-direct" />
      <path d={MARK_PATHS.gap} className="site-mark-gap" />
      <circle {...MARK_PATHS.scenario} className="site-mark-probe" />
    </svg>
  );
}
