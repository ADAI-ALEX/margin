import { describe, it, expect } from "vitest";
import { evaluate, distance, classify, robustness, rank } from "@/lib/engine";
import { ALL_RUNS, ALL_INVESTIGATIONS } from "@/lib/data";
import { PRESETS, HAZARD_MAP } from "@/content/curated";
import type { Run, Scenario } from "@/lib/schema";

const base: Run = { id: "x", investigation: "X", tier: "T1_PSI_RUN", fuelClass: "solid-thin", material: null, gravity: "micro", o2Pct: 21, o2Basis: "measured", pressureKPa: 100, pressureBasis: "measured", flowCmS: 10, flowBasis: "measured", flowRegime: "concurrent", outcome: null, measures: {}, original: {}, conversions: [], flags: [], source: { kind: "psi-table", ref: "", url: "" } };
const s0: Scenario = { o2Pct: 21, pressureKPa: 100, flowCmS: 10, gravity: "micro", hazard: "materials", materialClass: "any", includePublished: false };

describe("golden distances (Kickoff §H.4)", () => {
  it("identical → 0", () => expect(distance(base, s0).D).toBe(0));
  it("ΔO2 2 → 1", () => expect(distance({ ...base, o2Pct: 23 }, s0).D).toBeCloseTo(1, 9));
  it("P ×1.25 → 1", () => expect(distance({ ...base, pressureKPa: 125 }, s0).D).toBeCloseTo(1, 9));
  it("ΔU 5 → 1", () => expect(distance({ ...base, flowCmS: 15 }, s0).D).toBeCloseTo(1, 9));
  it("√2", () => expect(distance({ ...base, o2Pct: 23, pressureKPa: 125 }, s0).D).toBeCloseTo(Math.SQRT2, 9));
  it("quiescent vs ventilated", () => { const d = distance({ ...base, flowCmS: 0, flowRegime: "quiescent" }, s0); expect(d.flags).toContain("flow-regime-mismatch"); expect(d.axesUsed).not.toContain("flow"); });
  it("thresholds", () => { expect(classify(1)).toBe("DIRECT"); expect(classify(1.0000001)).toBe("NEAR"); expect(classify(2.5)).toBe("NEAR"); expect(classify(2.5000001)).toBe("DISTANT"); expect(classify(null)).toBe("NONE"); });
  it("refuses cross-gravity", () => expect(() => distance({ ...base, gravity: "moon" }, s0)).toThrow());
});

describe("real-data anchors (directional, Kickoff §C.5)", () => {
  const ea = PRESETS.find((p) => p.id === "ea")!;
  const iss = PRESETS.find((p) => p.id === "iss")!;
  const sc = (p: typeof ea, extra: Partial<Scenario> = {}): Scenario => ({ ...s0, o2Pct: p.o2Pct, pressureKPa: p.pressureKPa, flowCmS: p.flowCmS, ...extra });
  it("prints anchors", () => {
    const rows: Record<string, unknown>[] = [];
    for (const [name, s] of [
      ["ISS psi", sc(iss)], ["EA psi u10", sc(ea)], ["EA pub u10", sc(ea, { includePublished: true })],
      ["EA psi u20", sc(ea, { flowCmS: 20 })], ["EA pub u20", sc(ea, { flowCmS: 20, includePublished: true })],
      ["Artemis pub u10", sc(PRESETS.find((p) => p.id === "artemis")!, { includePublished: true })],
      ["EA moon psi", sc(ea, { gravity: "moon" })], ["EA moon pub", sc(ea, { gravity: "moon", includePublished: true })],
      ["liquid ISS", sc(iss, { hazard: "liquid" })], ["smoke ISS", sc(iss, { hazard: "smoke" })],
    ] as [string, Scenario][]) {
      const e = evaluate(ALL_RUNS, s); const r = robustness(ALL_RUNS, s);
      const rk = rank(ALL_INVESTIGATIONS, ALL_RUNS, e, s, HAZARD_MAP).slice(0, 4).map((x) => `${x.investigation.acronym}:${x.R.toFixed(0)}`);
      rows.push({ name, verdict: e.verdict, D: e.nearest?.d.D.toFixed(3), nearest: e.nearest?.run.id, axes: e.nearest?.d.axesUsed.join("+"), robust: r.robust ? "robust" : `${r.range.join("–")}`, comparable: e.comparable.length, top: rk.join(" ") });
    }
    console.table(rows);
    expect(rows.length).toBe(10);
  });
  it("ISS PSI-only is DIRECT", () => expect(evaluate(ALL_RUNS, sc(iss)).verdict).toBe("DIRECT"));
  it("EA PSI-only is DISTANT", () => expect(evaluate(ALL_RUNS, sc(ea)).verdict).toBe("DISTANT"));
  it("Moon PSI-only is NONE", () => expect(evaluate(ALL_RUNS, sc(ea, { gravity: "moon" })).verdict).toBe("NONE"));
});
