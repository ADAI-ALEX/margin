import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

/**
 * MARGIN type system (all SIL OFL 1.1, self-hosted by next/font):
 * - Archivo, expanded width axis — wordmark, page titles, large numerals only.
 * - IBM Plex Sans — every piece of interface and reading text.
 * - IBM Plex Mono — measurements, ids, file names and other technical values only.
 */
export const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display", display: "swap" });
export const sans = IBM_Plex_Sans({ subsets: ["latin", "greek"], variable: "--font-sans", display: "swap" });
export const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const fontVars = `${display.variable} ${sans.variable} ${mono.variable}`;
