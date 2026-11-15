/**
 * Inline stroke icons (16 px grid, 1.5 px strokes, currentColor). Decorative: the control that holds an
 * icon always carries its own accessible name.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = ({ size = 16, ...rest }: P) => ({
  width: size, height: size, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false, ...rest,
});

export const IconSearch = (p: P) => <svg {...base(p)}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" /></svg>;
export const IconShare = (p: P) => <svg {...base(p)}><path d="M6.5 9.5 13 3M9 3h4v4" /><path d="M12 9.5V13H3V4h3.5" /></svg>;
export const IconMenu = (p: P) => <svg {...base(p)}><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" /></svg>;
export const IconClose = (p: P) => <svg {...base(p)}><path d="m4 4 8 8M12 4l-8 8" /></svg>;
/** A question mark in a circle: the guided tour. */
export const IconHelp = (p: P) => <svg {...base(p)}><circle cx="8" cy="8" r="6" /><path d="M6.3 6.2a1.8 1.8 0 0 1 3.5.5c0 1.2-1.8 1.5-1.8 2.6M8 11.2v.01" /></svg>;
export const IconInfo = (p: P) => <svg {...base(p)}><circle cx="8" cy="8" r="6" /><path d="M8 7.2V11M8 5v.01" /></svg>;
export const IconLayers = (p: P) => <svg {...base(p)}><path d="M8 2.5 14 5.5 8 8.5 2 5.5Z" /><path d="m2 8.5 6 3 6-3M2 11.2l6 3 6-3" /></svg>;
export const IconPlus = (p: P) => <svg {...base(p)}><path d="M8 3v10M3 8h10" /></svg>;
export const IconMinus = (p: P) => <svg {...base(p)}><path d="M3 8h10" /></svg>;
export const IconReset = (p: P) => <svg {...base(p)}><rect x="2.5" y="2.5" width="11" height="11" rx="1" /><path d="M8 5.5v5M5.5 8h5" opacity="0.6" /></svg>;
export const IconFullscreen = (p: P) => <svg {...base(p)}><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" /></svg>;
export const IconExitFullscreen = (p: P) => <svg {...base(p)}><path d="M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5" /></svg>;
/** Four separate plates: the regimes overview. */
export const IconPlates = (p: P) => <svg {...base(p)}><rect x="2" y="2" width="5" height="5" rx="0.5" /><rect x="9" y="2" width="5" height="5" rx="0.5" /><rect x="2" y="9" width="5" height="5" rx="0.5" /><rect x="9" y="9" width="5" height="5" rx="0.5" /></svg>;
export const IconKey = (p: P) => <svg {...base(p)}><circle cx="4" cy="4.5" r="1.4" /><path d="M7.5 4.5h6M7.5 8h6M7.5 11.5h6" /><path d="M2.6 9.2 4 6.8l1.4 2.4Z" /><circle cx="4" cy="11.5" r="1.4" strokeDasharray="1.2 1" /></svg>;
export const IconChevronLeft = (p: P) => <svg {...base(p)}><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>;
export const IconChevronRight = (p: P) => <svg {...base(p)}><path d="M6 3.5 10.5 8 6 12.5" /></svg>;
export const IconChevronDown = (p: P) => <svg {...base(p)}><path d="M3.5 6 8 10.5 12.5 6" /></svg>;
export const IconChevronUp = (p: P) => <svg {...base(p)}><path d="M3.5 10 8 5.5l4.5 4.5" /></svg>;
export const IconCollapse = (p: P) => <svg {...base(p)}><path d="M8 3.5 3.5 8 8 12.5M12.5 3.5 8 8l4.5 4.5" /></svg>;
export const IconExpand = (p: P) => <svg {...base(p)}><path d="M8 3.5 12.5 8 8 12.5M3.5 3.5 8 8l-4.5 4.5" /></svg>;
export const IconExternal = (p: P) => <svg {...base(p)}><path d="M6.5 3H3v10h10V9.5M9 3h4v4M13 3 7.5 8.5" /></svg>;
export const IconTarget = (p: P) => <svg {...base(p)}><circle cx="8" cy="8" r="4.5" /><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" /></svg>;
export const IconGithub = ({ size = 16, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden focusable={false} {...rest}>
    <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);
