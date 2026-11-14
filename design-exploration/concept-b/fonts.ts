import { Newsreader, Public_Sans, JetBrains_Mono } from "next/font/google";

/** ATLAS type: a book serif for headings + narrative, a grotesque for labels, a mono for figures. */
export const serif = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--atlas-serif", display: "swap", axes: ["opsz"] });
export const sans = Public_Sans({ subsets: ["latin"], variable: "--atlas-sans", display: "swap" });
export const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--atlas-mono", display: "swap" });

export const fontVars = `${serif.variable} ${sans.variable} ${mono.variable}`;
