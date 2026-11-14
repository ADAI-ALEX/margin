/**
 * The MARGIN mark: two iso-distance contours (DIRECT inside NEAR coverage of tested conditions)
 * and the user's scenario point outside them, joined by a dashed gap — the "margin" between
 * a scenario and the nearest evidence. Geometry is shared with app/icon.svg and the README banner.
 */
export const MARK_PATHS = {
  near: "M5 20.2C4.3 13.6 8.9 8.6 14.8 8.9c5.1.3 7.4 4.1 6.9 8.2-.6 4.9-5.2 8.6-10.4 8.3-3.7-.2-5.9-2.2-6.3-5.2Z",
  direct: "M9.2 19.1c-.4-3.3 1.9-5.8 4.8-5.6 2.5.2 3.6 2.2 3.3 4.2-.4 2.4-2.7 4.1-5.1 3.9-1.7-.1-2.8-1.2-3-2.5Z",
  gap: "M24.1 8.9 20.4 12.3",
  scenario: { cx: 25.6, cy: 7.6, r: 2.7 },
} as const;

export default function BrandMark({ size = 24, title }: { size?: number; title?: string }) {
  return (
    <svg className="site-mark" width={size} height={size} viewBox="0 0 32 32" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path d={MARK_PATHS.near} fill="rgba(92,200,214,0.14)" stroke="#5cc8d6" strokeWidth="1.6" />
      <path d={MARK_PATHS.direct} fill="#5cc8d6" fillOpacity="0.75" />
      <path d={MARK_PATHS.gap} stroke="#f0a53c" strokeWidth="1.5" strokeDasharray="1.6 1.7" strokeLinecap="round" />
      <circle {...MARK_PATHS.scenario} fill="#f0a53c" />
    </svg>
  );
}
