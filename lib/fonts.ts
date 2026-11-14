import { Albert_Sans, IBM_Plex_Mono } from "next/font/google";

/**
 * MARGIN type system (both SIL OFL 1.1, self-hosted by next/font; see docs/design/DESIGN_SYSTEM.md):
 * - Albert Sans (variable 100–900): every piece of interface and reading text. Light (300) at large
 *   sizes, 600 with wide tracking for uppercase labels, tabular figures for numbers.
 * - IBM Plex Mono: run ids, file names, source locators and values inside data tables only.
 */
export const sans = Albert_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });
export const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const fontVars = `${sans.variable} ${mono.variable}`;
