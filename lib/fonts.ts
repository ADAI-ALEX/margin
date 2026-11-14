import { Newsreader, Public_Sans, JetBrains_Mono } from "next/font/google";

/** MARGIN type: a book serif for headings and narrative, a grotesque for labels, a mono for figures. All SIL OFL 1.1. */
export const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", display: "swap", axes: ["opsz"] });
export const sans = Public_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
export const mono = JetBrains_Mono({ subsets: ["latin", "greek"], variable: "--font-mono", display: "swap" });

export const fontVars = `${serif.variable} ${sans.variable} ${mono.variable}`;
