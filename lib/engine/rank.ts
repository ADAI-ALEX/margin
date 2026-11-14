import type { Investigation, Run, Scenario, Hazard } from "@/lib/schema";
import { RANK_WEIGHTS, SCALE_SCORE, VERDICT_THRESHOLDS, type RankWeights } from "./constants";
import type { Evaluation } from "./verdict";

export type HazardMatch = "primary" | "secondary" | "none";
export interface HazardMapEntry { investigation: string; hazard: Hazard; match: HazardMatch; measures: 0 | 0.5 | 1; rationale: string }

export interface RankRow {
  investigation: Investigation;
  R: number;
  components: { P: number; H: number; S: number; C: number; M: number };
  contributions: { P: number; H: number; S: number; C: number; M: number };
  Dmin: number | null;
  comparableRuns: number;
  nearRuns: number;
  totalRuns: number;
  noComparable: boolean;
}

/** R = 100 × Σ wᵢ·componentᵢ, weights renormalized to sum to 1 (Kickoff §C.8). */
export function rank(investigations: Investigation[], runs: Run[], ev: Evaluation, s: Scenario, hazardMap: HazardMapEntry[], weights: RankWeights = RANK_WEIGHTS): RankRow[] {
  const wsum = weights.P + weights.H + weights.S + weights.C + weights.M || 1;
  const w = { P: weights.P / wsum, H: weights.H / wsum, S: weights.S / wsum, C: weights.C / wsum, M: weights.M / wsum };
  const byInv = new Map<string, { Dmin: number; n: number; near: number }>();
  for (const sc of ev.comparable) {
    if (sc.run.flags.includes("duplicate-row")) continue; // count distinct runs only
    const k = sc.run.investigation;
    const cur = byInv.get(k) ?? { Dmin: Infinity, n: 0, near: 0 };
    cur.Dmin = Math.min(cur.Dmin, sc.d.D); cur.n++;
    if (sc.d.D <= VERDICT_THRESHOLDS.near) cur.near++;
    byInv.set(k, cur);
  }
  const totals = new Map<string, number>();
  for (const r of runs) if (!r.flags.includes("duplicate-row")) totals.set(r.investigation, (totals.get(r.investigation) ?? 0) + 1);

  const rows: RankRow[] = [];
  for (const inv of investigations) {
    if (inv.tier === "T3_PUBLISHED" && !s.includePublished) continue;
    if (inv.tier === "T4_PLANNED") continue;
    const hm = hazardMap.find((h) => h.investigation === inv.id && h.hazard === s.hazard);
    const st = byInv.get(inv.id);
    const total = totals.get(inv.id) ?? 0;
    const components = {
      P: st ? Math.exp(-st.Dmin) : 0,
      H: hm?.match === "primary" ? 1 : hm?.match === "secondary" ? 0.5 : 0,
      S: SCALE_SCORE[inv.scale],
      C: st && total ? st.near / total : 0,
      M: hm?.measures ?? 0,
    };
    const contributions = { P: w.P * components.P, H: w.H * components.H, S: w.S * components.S, C: w.C * components.C, M: w.M * components.M };
    const R = 100 * (contributions.P + contributions.H + contributions.S + contributions.C + contributions.M);
    rows.push({ investigation: inv, R, components, contributions, Dmin: st ? st.Dmin : null, comparableRuns: st?.n ?? 0, nearRuns: st?.near ?? 0, totalRuns: total, noComparable: !st });
  }
  // Investigations with comparable evidence always rank above those ranked on metadata only (F-08).
  return rows.sort((a, b) => Number(a.noComparable) - Number(b.noComparable) || b.R - a.R || (a.Dmin ?? Infinity) - (b.Dmin ?? Infinity) || a.investigation.id.localeCompare(b.investigation.id));
}
