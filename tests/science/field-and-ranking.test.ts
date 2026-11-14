/**
 * Nearest-evidence distance field (lib/engine/field.ts) consistency with distance(), and the
 * investigation-ranking sanity assertions of Kickoff §C.8 on real data.
 */
import { describe, it, expect } from "vitest";
import { evaluate, distance, distanceField, rank } from "@/lib/engine";
import { ALL_RUNS, ALL_INVESTIGATIONS } from "@/lib/data";
import { PRESETS, HAZARD_MAP } from "@/content/curated";
import type { Scenario } from "@/lib/schema";

const preset = (id: string) => PRESETS.find((p) => p.id === id)!;
const scen = (id: string, o: Partial<Scenario> = {}): Scenario => {
  const p = preset(id);
  return { o2Pct: p.o2Pct, pressureKPa: p.pressureKPa, flowCmS: p.flowCmS, gravity: "micro", hazard: "materials", materialClass: "any", includePublished: false, ...o };
};
/** A 2×2 grid whose node (0,0) is exactly (o2, p). */
const fieldAt = (e: ReturnType<typeof evaluate>, s: Scenario, o2: number, p: number) => distanceField(e, s, [o2, o2 + 1], [p, p * 2], 2, 2).D[0];

describe("distanceField holds the scenario's flow fixed and is consistent with distance()", () => {
  const cases: [string, Scenario][] = [
    ["EA + published, 10 cm/s", scen("ea", { includePublished: true })],
    ["EA + published, 20 cm/s", scen("ea", { includePublished: true, flowCmS: 20 })],
    ["ISS PSI only", scen("iss")],
    ["ISS liquid (regime mismatch)", scen("iss", { hazard: "liquid" })],
    ["Artemis + published, quiescent", scen("artemis", { includePublished: true, flowCmS: null })],
  ];
  for (const [name, s] of cases) {
    it(`${name}: field at the scenario point = D of the nearest run that records both O₂ and pressure`, () => {
      const e = evaluate(ALL_RUNS, s);
      const placed = e.comparable.find((c) => c.run.pressureKPa != null)!;
      expect(fieldAt(e, s, s.o2Pct, s.pressureKPa)).toBeCloseTo(placed.d.D, 4); // Float32 storage
    });
    it(`${name}: per run, field at the run's own (O₂, P) = its flow term only = |ΔU|/5 or 0 when flow is not compared`, () => {
      const e = evaluate(ALL_RUNS, s);
      for (const sc of e.comparable.filter((c) => c.run.o2Pct != null && c.run.pressureKPa != null).slice(0, 200)) {
        const single = { ...e, comparable: [sc] };
        const expected = sc.d.axesUsed.includes("flow") ? Math.abs(sc.run.flowCmS! - (s.flowCmS ?? 0)) / 5 : 0;
        expect(fieldAt(single, s, sc.run.o2Pct!, sc.run.pressureKPa!)).toBeCloseTo(expected, 4);
        // and at the scenario point the single-run field reproduces distance() exactly
        expect(fieldAt(single, s, s.o2Pct, s.pressureKPa)).toBeCloseTo(distance(sc.run, s).D, 4);
      }
    });
  }
  it("field is never below 0 and is Infinity everywhere when nothing is comparable", () => {
    const s = scen("ea", { gravity: "moon" });
    const f = distanceField(evaluate(ALL_RUNS, s), s, [10, 40], [20, 200], 10, 8);
    expect(Array.from(f.D).every((x) => x === Infinity)).toBe(true);
    const s2 = scen("ea", { includePublished: true });
    expect(Array.from(distanceField(evaluate(ALL_RUNS, s2), s2, [10, 40], [20, 200], 10, 8).D).every((x) => x >= 0)).toBe(true);
  });
  // FINDING M-4 (methodology-review.md): a run that records O₂ but NOT pressure (Saffire-II, 9 runs) must not be
  // drawn as if it matched every pressure. Fixed in field.ts by the lead (runs lacking pressure are omitted and counted).
  it("M-4: a run without recorded pressure creates no coverage at an untested pressure", () => {
    const s = scen("ea", { flowCmS: 20 }); // Saffire-II flow = 20 → its flow term would be 0
    const e = evaluate(ALL_RUNS, s);
    expect(fieldAt(e, s, 22.1, 20)).toBeGreaterThan(2.5); // 22.1 % O₂ at 20 kPa: nothing tested near 20 kPa
    const f = distanceField(e, s, [20, 40], [20, 200], 4, 4);
    expect(f.omitted).toBe(e.comparable.filter((c) => c.run.pressureKPa == null).length);
    expect(f.omitted).toBe(9);
  });
  it("M-4 consequence: when the verdict's nearest run lacks pressure, the map at the scenario point is farther than the verdict D (UI must say so)", () => {
    const s = scen("ea"); // PSI only: nearest is Saffire-II (no pressure), D 6.28; map shows BASS-II 6.45
    const e = evaluate(ALL_RUNS, s);
    expect(e.nearest!.run.pressureKPa).toBeNull();
    expect(fieldAt(e, s, s.o2Pct, s.pressureKPa)).toBeGreaterThan(e.nearest!.d.D);
  });
});

describe("ranking sanity (Kickoff §C.8, §H.6) on real data", () => {
  const top = (s: Scenario, n: number) => rank(ALL_INVESTIGATIONS, ALL_RUNS, evaluate(ALL_RUNS, s), s, HAZARD_MAP).slice(0, n).map((r) => r.investigation.id);
  it("EA + materials + published: Saffire IV–VI in the top 3", () => {
    expect(top(scen("ea", { includePublished: true }), 3)).toContain("PUB-SAFFIRE-IV-VI");
  });
  // LEAD DECISION (2026-11-14, BUILD_LOG): Kickoff §C.8 asked for BASS-II in the top 3. On real data it is #4:
  // every PSI investigation is ≥ 6 units away (P = e^−D ≈ 0), so the order among them is set by the scale
  // component (Saffire large-scale 1.0 vs BASS-II bench 0.6). We do not tune weights to satisfy a sanity
  // expectation; the assertion is amended to what the method actually implies and that reason is tested.
  it("EA + materials + published: Saffire IV–VI is #1; BASS-II is top 4, behind only large-scale Saffire tests", () => {
    const s = scen("ea", { includePublished: true });
    const rows = rank(ALL_INVESTIGATIONS, ALL_RUNS, evaluate(ALL_RUNS, s), s, HAZARD_MAP);
    expect(rows[0].investigation.id).toBe("PUB-SAFFIRE-IV-VI");
    const iBass = rows.findIndex((r) => r.investigation.id === "PSI-25");
    expect(iBass).toBeLessThan(4);
    for (const r of rows.slice(1, iBass)) {
      expect(r.components.P).toBeLessThan(0.01);
      expect(r.investigation.scale).toBe("large");
    }
  });
  it("EA + materials + published: BASS-II is still above every investigation without comparable runs", () => {
    const rows = rank(ALL_INVESTIGATIONS, ALL_RUNS, evaluate(ALL_RUNS, scen("ea", { includePublished: true })), scen("ea", { includePublished: true }), HAZARD_MAP);
    const iBass = rows.findIndex((r) => r.investigation.id === "PSI-25");
    expect(rows.slice(0, iBass).every((r) => !r.noComparable)).toBe(true);
  });
  it("EA + materials (both toggles): CFI-G (PSI-159) and SPICE (PSI-107) not in the top 5", () => {
    for (const pub of [false, true]) {
      const t = top(scen("ea", { includePublished: pub }), 5);
      expect(t).not.toContain("PSI-159"); expect(t).not.toContain("PSI-107");
    }
  });
  it("liquid fuel: FLEX (PSI-69) is #1 for every preset and both toggles", () => {
    for (const id of ["iss", "artemis", "ea", "legacy"]) for (const pub of [false, true]) expect(top(scen(id, { hazard: "liquid", includePublished: pub }), 1)).toEqual(["PSI-69"]);
  });
  it("smoke & detection: SAME-R (PSI-101) or SAME (PSI-102) in the top 2 for every preset and both toggles", () => {
    for (const id of ["iss", "artemis", "ea", "legacy"]) for (const pub of [false, true]) {
      const t = top(scen(id, { hazard: "smoke", includePublished: pub }), 2);
      expect(t.includes("PSI-101") || t.includes("PSI-102")).toBe(true);
    }
  });
  it("investigations with comparable runs always rank above those without (F-08 fix)", () => {
    for (const id of ["iss", "artemis", "ea"]) for (const g of ["micro", "moon"] as const) for (const pub of [false, true]) {
      const s = scen(id, { gravity: g, includePublished: pub });
      const rows = rank(ALL_INVESTIGATIONS, ALL_RUNS, evaluate(ALL_RUNS, s), s, HAZARD_MAP);
      const firstNo = rows.findIndex((r) => r.noComparable);
      if (firstNo >= 0) expect(rows.slice(firstNo).every((r) => r.noComparable)).toBe(true);
    }
  });
});
