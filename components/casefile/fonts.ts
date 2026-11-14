import { Archivo, Archivo_Narrow, JetBrains_Mono } from "next/font/google";

/** Concept C type system: Archivo (headings), Archivo Narrow (dense labels), JetBrains Mono (figures). */
export const archivo = Archivo({ subsets: ["latin", "latin-ext"], variable: "--cf-font-head", display: "swap" });
export const archivoNarrow = Archivo_Narrow({ subsets: ["latin", "latin-ext"], variable: "--cf-font-narrow", display: "swap" });
export const jetbrainsMono = JetBrains_Mono({ subsets: ["latin", "latin-ext", "greek"], variable: "--cf-font-mono", display: "swap" });

export const fontVars = `${archivo.variable} ${archivoNarrow.variable} ${jetbrainsMono.variable}`;
