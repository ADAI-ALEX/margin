/**
 * The MARGIN mark, derived from the product's own geometry: two iso-distance contours of tested conditions
 * (DIRECT filled inside NEAR) and the user's scenario probe outside them, joined by a dashed gap: the margin
 * between a scenario and the nearest evidence. One geometry for the header, favicon (app/icon.svg), README
 * banner and OG image (docs/assets/branding/margin-mark.svg). Colours come from tokens via site.css.
 */
export const MARK_PATHS = {
  near: "M5 20.2C4.3 13.6 8.9 8.6 14.8 8.9c5.1.3 7.4 4.1 6.9 8.2-.6 4.9-5.2 8.6-10.4 8.3-3.7-.2-5.9-2.2-6.3-5.2Z",
  direct: "M9.2 19.1c-.4-3.3 1.9-5.8 4.8-5.6 2.5.2 3.6 2.2 3.3 4.2-.4 2.4-2.7 4.1-5.1 3.9-1.7-.1-2.8-1.2-3-2.5Z",
  gap: "M24.1 8.9 20.4 12.3",
  scenario: { cx: 25.6, cy: 7.6, r: 2.7 },
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
