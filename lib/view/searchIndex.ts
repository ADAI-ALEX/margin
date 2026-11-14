/**
 * Command-search index over local data only (investigations, reference atmospheres, source-checked
 * findings, runs). Loaded with a dynamic import when the search opens, so the PSI snapshot is not part
 * of the header bundle.
 */
import { ALL_INVESTIGATIONS, ALL_RUNS, invById } from "@/lib/data";
import { ATMOSPHERES, INSIGHTS } from "@/content/curated";
import { GRAVITY_LABEL, TIER_LABEL, fmt } from "@/lib/format";
import { findingHref } from "./expeditions";

export type SearchKind = "atmosphere" | "investigation" | "finding" | "run";
export interface SearchEntry {
  kind: SearchKind;
  id: string;
  title: string;
  meta: string;
  /** Lower-case haystack. */
  hay: string;
  /** Where to go when not handled in place. */
  href: string;
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/₂/g, "2");

function build(): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const a of ATMOSPHERES) {
    if (a.offChart) continue;
    const meta = `${a.o2Pct}% O₂ · ${a.pressureKPa} kPa (${a.pressurePsia} psia)${a.note?.toLowerCase().startsWith("assumed") ? " · assumed" : ""}`;
    out.push({ kind: "atmosphere", id: a.id, title: a.label, meta, hay: norm(`${a.label} ${a.short} ${meta} atmosphere preset landmark`), href: `/?preset=${a.id}` });
  }
  for (const inv of ALL_INVESTIGATIONS) {
    const meta = [inv.id, inv.tier === "T3_PUBLISHED" ? "published group" : inv.tier === "T4_PLANNED" ? "planned" : "PSI record", inv.platform].filter(Boolean).join(" · ");
    out.push({ kind: "investigation", id: inv.id, title: inv.acronym === inv.title ? inv.acronym : `${inv.acronym}: ${inv.title}`, meta, hay: norm(`${inv.acronym} ${inv.title} ${inv.id} ${inv.platform ?? ""} ${inv.pi ?? ""}`), href: `/investigations/${inv.id}` });
  }
  for (const i of INSIGHTS) {
    if (i.verification.status !== "primary-checked") continue;
    out.push({ kind: "finding", id: i.id, title: i.claim, meta: `${i.validity} · ${i.source.ref}`, hay: norm(`${i.claim} ${i.value} ${i.conditions} ${i.source.ref} finding`), href: findingHref(i) });
  }
  for (const r of ALL_RUNS) {
    if (r.flags.includes("duplicate-row")) continue;
    const inv = invById.get(r.investigation);
    const title = `${inv?.acronym ?? r.investigation} · ${r.source.row != null ? `row ${r.source.row}` : r.id.split(":").slice(1).join(" · ")}`;
    const meta = [r.id, TIER_LABEL[r.tier], r.material?.replace(/\s+/g, " ").trim(), r.o2Pct != null ? `${fmt(r.o2Pct)}% O₂` : null, r.pressureKPa != null ? `${fmt(r.pressureKPa)} kPa` : null, GRAVITY_LABEL[r.gravity]].filter(Boolean).join(" · ");
    // Opens the Atlas in the run's own regime with the run inspected (published runs need published evidence on).
    const href = `/?g=${r.gravity}${r.tier === "T3_PUBLISHED" ? "&pub=1" : ""}&run=${encodeURIComponent(r.id)}`;
    out.push({ kind: "run", id: r.id, title, meta, hay: norm(`${title} ${meta}`), href });
  }
  return out;
}

let cache: SearchEntry[] | null = null;
export function index() { return (cache ??= build()); }

const KIND_ORDER: Record<SearchKind, number> = { atmosphere: 0, investigation: 1, finding: 2, run: 3 };

/** All query words must match; earlier kinds and title matches rank first. */
export function search(query: string, limit = 24): SearchEntry[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  const all = index();
  if (!words.length) return all.filter((e) => e.kind !== "run").slice(0, limit);
  const hits: { e: SearchEntry; score: number }[] = [];
  for (const e of all) {
    if (!words.every((w) => e.hay.includes(w))) continue;
    const t = norm(e.title);
    const score = KIND_ORDER[e.kind] * 10 - (words.every((w) => t.includes(w)) ? 5 : 0) - (t.startsWith(words[0]) ? 3 : 0);
    hits.push({ e, score });
  }
  return hits.sort((a, b) => a.score - b.score).slice(0, limit).map((h) => h.e);
}
