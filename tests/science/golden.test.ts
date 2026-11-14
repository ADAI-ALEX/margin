/**
 * Synthetic golden tests (Kickoff §H.4, §H.5, §H.6), written independently of the engine's own
 * unit tests. Expected values are computed by hand (tests/science/hand.ts), never from the engine.
 */
import { describe, it, expect } from "vitest";
import { distance, classify, evaluate, robustness, rank, SCALES, AXIS_WEIGHTS, VERDICT_THRESHOLDS, RANK_WEIGHTS, ROBUSTNESS_FACTORS } from "@/lib/engine";
import type { Run, Scenario, Investigation } from "@/lib/schema";
import { D, K, verdictOf } from "./hand";

const run = (o: Partial<Run> = {}): Run => ({
  id: "t:1", investigation: "T", tier: "T1_PSI_RUN", fuelClass: "solid-thin", material: null, gravity: "micro",
  o2Pct: 21, o2Basis: "measured", pressureKPa: 100, pressureBasis: "measured", flowCmS: 10, flowBasis: "measured", flowRegime: "concurrent",
  outcome: null, measures: {}, original: {}, conversions: [], flags: [], source: { kind: "psi-table", ref: "t.csv", row: 1, url: "u" }, ...o,
});
const scen = (o: Partial<Scenario> = {}): Scenario => ({ o2Pct: 21, pressureKPa: 100, flowCmS: 10, gravity: "micro", hazard: "materials", materialClass: "any", includePublished: false, ...o });

describe("locked constants equal Kickoff §C.5 / §C.8", () => {
  it("scales, weights, thresholds, robustness factors", () => {
    expect(SCALES.o2Pts).toBe(K.o2Pts);
    expect(Math.log(SCALES.pressureRatio)).toBeCloseTo(K.lnR, 15);
    expect(SCALES.flowCmS).toBe(K.flow);
    expect(AXIS_WEIGHTS).toEqual({ o2: 1, pressure: 1, flow: 1 });
    expect(VERDICT_THRESHOLDS).toEqual({ direct: 1.0, near: 2.5 });
    expect(RANK_WEIGHTS).toEqual({ P: 0.4, H: 0.2, S: 0.15, C: 0.15, M: 0.1 });
    expect(RANK_WEIGHTS.P + RANK_WEIGHTS.H + RANK_WEIGHTS.S + RANK_WEIGHTS.C + RANK_WEIGHTS.M).toBeCloseTo(1, 12);
    expect([...ROBUSTNESS_FACTORS]).toEqual([0.5, 1, 2]);
  });
});

describe("distance — golden values (§H.4)", () => {
  const cases: [string, Partial<Run>, Partial<Scenario>, number][] = [
    ["identical", {}, {}, 0],
    ["ΔO₂ +2", { o2Pct: 23 }, {}, 1],
    ["ΔO₂ −2", { o2Pct: 19 }, {}, 1],
    ["P ×1.25", { pressureKPa: 125 }, {}, 1],
    ["P ÷1.25", { pressureKPa: 80 }, {}, 1],
    ["ΔU +5", { flowCmS: 15 }, {}, 1],
    ["ΔU −5", { flowCmS: 5 }, {}, 1],
    ["ΔO₂ 2 and P ×1.25", { o2Pct: 23, pressureKPa: 125 }, {}, Math.SQRT2],
    ["all three one unit", { o2Pct: 23, pressureKPa: 125, flowCmS: 15 }, {}, Math.sqrt(3)],
    // Exploration Atmosphere vs a 31% / 54.1 kPa / 20 cm/s run, written out by hand:
    // dO2 = (31−34)/2 = −1.5; dP = ln(54.1/56.5)/ln 1.25 = −0.19452; dU = (20−10)/5 = 2 → √(2.25+0.03784+4) = 2.50756
    ["EA vs 31/54.1/20", { o2Pct: 31, pressureKPa: 54.1, flowCmS: 20 }, { o2Pct: 34, pressureKPa: 56.5, flowCmS: 10 }, 2.507556],
  ];
  for (const [name, r, s, expected] of cases) {
    it(name, () => {
      const got = distance(run(r), scen(s)).D;
      expect(got).toBeCloseTo(expected, 5);
      expect(got).toBeCloseTo(D((r.o2Pct ?? 21) - (s.o2Pct ?? 21), (r.pressureKPa ?? 100) / (s.pressureKPa ?? 100), (r.flowCmS ?? 10) - (s.flowCmS ?? 10)), 12);
    });
  }
  it("is symmetric in sign and independent of which side is larger", () => {
    const a = distance(run({ o2Pct: 25, pressureKPa: 70 }), scen()).D;
    const b = distance(run(), scen({ o2Pct: 25, pressureKPa: 70 })).D;
    expect(a).toBeCloseTo(b, 12);
  });
  it("weights: wO₂ = 4 with ΔO₂ = 2 → D = 2", () => {
    expect(distance(run({ o2Pct: 23 }), scen(), SCALES, { o2: 4, pressure: 1, flow: 1 }).D).toBeCloseTo(2, 12);
  });
  it("weights: wP = 0 removes the pressure term but still reports the axis as used", () => {
    const d = distance(run({ pressureKPa: 200 }), scen(), SCALES, { o2: 1, pressure: 0, flow: 1 });
    expect(d.D).toBe(0);
    expect(d.axesUsed).toContain("pressure");
  });
  it("scales: doubling the O₂ scale halves the O₂ gap", () => {
    expect(distance(run({ o2Pct: 25 }), scen(), { ...SCALES, o2Pts: 4 }).D).toBeCloseTo(1, 12);
  });
  it("raw deltas are physical (run − scenario)", () => {
    const d = distance(run({ o2Pct: 24, pressureKPa: 50, flowCmS: 20 }), scen());
    expect(d.raw.o2Pts).toBeCloseTo(3, 12);
    expect(d.raw.pressurePct).toBeCloseTo(-50, 12);
    expect(d.raw.flowCmS).toBeCloseTo(10, 12);
  });
});

describe("missing / incomplete values (§C.5 missing axes, §H.4, §H.7)", () => {
  it("missing pressure → O₂ + flow only, partial match", () => {
    const d = distance(run({ pressureKPa: null, o2Pct: 23, flowCmS: 15 }), scen());
    expect(d.axesUsed).toEqual(["o2", "flow"]);
    expect(d.partialMatch).toBe(true);
    expect(d.D).toBeCloseTo(D(2, null, 5), 12);
  });
  it("pressure ≤ 0 on a run is treated as missing, not as a number", () => {
    expect(distance(run({ pressureKPa: 0 }), scen()).axesUsed).not.toContain("pressure");
  });
  it("null flow with unknown regime → O₂ + pressure only, no mismatch flag", () => {
    const d = distance(run({ flowCmS: null, flowRegime: "unknown" }), scen());
    expect(d.axesUsed).toEqual(["o2", "pressure"]);
    expect(d.flags).toEqual([]);
  });
  it("quiescent run (flow 0) vs ventilated scenario → flow excluded + flow-regime-mismatch", () => {
    const d = distance(run({ flowCmS: 0, flowRegime: "quiescent" }), scen({ flowCmS: 10 }));
    expect(d.flags).toContain("flow-regime-mismatch");
    expect(d.axesUsed).not.toContain("flow");
    expect(d.partialMatch).toBe(true);
  });
  it("quiescent regime with null speed (pipeline F-14 form) behaves exactly like flow 0", () => {
    const a = distance(run({ flowCmS: 0, flowRegime: "quiescent" }), scen({ flowCmS: 10, o2Pct: 22 }));
    const b = distance(run({ flowCmS: null, flowRegime: "quiescent" }), scen({ flowCmS: 10, o2Pct: 22 }));
    expect(b.D).toBe(a.D); expect(b.flags).toEqual(a.flags); expect(b.axesUsed).toEqual(a.axesUsed);
    const c = distance(run({ flowCmS: null, flowRegime: "quiescent" }), scen({ flowCmS: null }));
    expect(c.axesUsed).toEqual(["o2", "pressure", "flow"]);
    expect(c.D).toBe(0);
  });
  it("ventilated run vs quiescent scenario → mismatch", () => {
    const d = distance(run({ flowCmS: 20 }), scen({ flowCmS: null }));
    expect(d.flags).toContain("flow-regime-mismatch");
    expect(d.axesUsed).not.toContain("flow");
  });
  it("scenario flow 0 counts as quiescent", () => {
    expect(distance(run({ flowCmS: 0, flowRegime: "quiescent" }), scen({ flowCmS: 0 })).axesUsed).toContain("flow");
  });
  it("natural-convection run vs ventilated scenario → mismatch (buoyant flow ≠ forced flow)", () => {
    const d = distance(run({ gravity: "moon", flowCmS: null, flowRegime: "natural-convection" }), scen({ gravity: "moon" }));
    expect(d.flags).toContain("flow-regime-mismatch");
  });
  it("no axes at all → D = Infinity and evaluate() drops it", () => {
    const r = run({ o2Pct: null, pressureKPa: null, flowCmS: null });
    expect(distance(r, scen()).D).toBe(Infinity);
    expect(evaluate([r], scen()).verdict).toBe("NONE");
  });
  it("tie-break: at equal D a complete match sorts before a partial match", () => {
    const complete = run({ id: "b:complete", o2Pct: 23 });              // D = 1 on 3 axes
    const partial = run({ id: "a:partial", o2Pct: 23, flowCmS: null }); // D = 1 on 2 axes, id sorts first
    const e = evaluate([partial, complete], scen());
    expect(e.nearest!.run.id).toBe("b:complete");
  });
  it("PARTIAL MATCH CAN LOOK CLOSER: a 2-axis match beats every 3-axis match (the optimistic missing-axis rule)", () => {
    const partial = run({ id: "p", flowCmS: null });        // matches O₂ and P exactly, flow unknown
    const complete = run({ id: "c", o2Pct: 21.5 });         // 0.5 pt off on O₂, flow equal
    const e = evaluate([partial, complete], scen({ flowCmS: 30 })); // complete run's flow gap = 4 units
    expect(e.nearest!.run.id).toBe("p");
    expect(e.nearest!.d.D).toBe(0);
    expect(e.verdict).toBe("DIRECT");
    expect(e.nearestComplete!.run.id).toBe("c");
    expect(e.nearestComplete!.d.D).toBeCloseTo(D(0.5, 1, -20), 12);
    expect(verdictOf(e.nearestComplete!.d.D)).toBe("DISTANT");
  });
});

describe("classify thresholds (§H.5) — inclusive with tolerance", () => {
  it("boundaries", () => {
    expect(classify(0)).toBe("DIRECT");
    expect(classify(1.0)).toBe("DIRECT");
    expect(classify(1.0000000000000002)).toBe("DIRECT"); // float noise above an exact 1.0
    expect(classify(1.0000001)).toBe("NEAR");
    expect(classify(2.5)).toBe("NEAR");
    expect(classify(2.5000000000000004)).toBe("NEAR");
    expect(classify(2.5000001)).toBe("DISTANT");
    expect(classify(1e6)).toBe("DISTANT");
    expect(classify(null)).toBe("NONE");
    expect(classify(Infinity)).toBe("NONE");
    expect(classify(NaN)).toBe("NONE");
  });
  it("an exactly constructed D = 1 (P × 1.25) is DIRECT and D = 2.5 (ΔO₂ 5) is NEAR", () => {
    expect(evaluate([run({ pressureKPa: 125 })], scen()).verdict).toBe("DIRECT");
    expect(evaluate([run({ o2Pct: 26 })], scen()).verdict).toBe("NEAR");
  });
});

describe("robustness (§C.5 P1, §H.5)", () => {
  it("enumerates exactly 27 combinations: every (o₂, p, flow) factor in {½,1,2}³ once", () => {
    const r = robustness([run({ o2Pct: 30 })], scen());
    expect(r.combos).toBe(27);
    expect(r.cells).toHaveLength(27);
    const keys = new Set(r.cells.map((c) => `${c.o2},${c.pressure},${c.flow}`));
    expect(keys.size).toBe(27);
    for (const a of [0.5, 1, 2]) for (const b of [0.5, 1, 2]) for (const c of [0.5, 1, 2]) expect(keys.has(`${a},${b},${c}`)).toBe(true);
    expect(Object.values(r.verdicts).reduce((x, y) => x + y, 0)).toBe(27);
  });
  it("each cell's D is the hand-computed D at those scales", () => {
    const rr = run({ o2Pct: 24, pressureKPa: 80, flowCmS: 15 });
    const r = robustness([rr], scen());
    for (const c of r.cells) {
      const expected = Math.sqrt((3 / (2 * c.o2)) ** 2 + (Math.log(0.8) / (c.pressure * Math.log(1.25))) ** 2 + (5 / (5 * c.flow)) ** 2);
      expect(c.D!).toBeCloseTo(expected, 10);
    }
  });
  it("far from thresholds → Robust", () => {
    expect(robustness([run({ o2Pct: 21.1 })], scen()).robust).toBe(true); // D = 0.05; even ½× scales give 0.1
    expect(robustness([run({ o2Pct: 60 })], scen()).robust).toBe(true);   // D = 19.5; 2× scales give 9.75
  });
  it("D ≈ 1.05 → Sensitive, with verdict range DIRECT–NEAR", () => {
    const r = robustness([run({ o2Pct: 23.1 })], scen()); // D = 1.05
    expect(r.robust).toBe(false);
    expect(r.range).toEqual(["DIRECT", "NEAR"]);
  });
  it("NONE everywhere → robust NONE, Drange null", () => {
    const r = robustness([run({ gravity: "moon" })], scen());
    expect(r.verdicts.NONE).toBe(27); expect(r.robust).toBe(true); expect(r.Drange).toBeNull();
  });
});

describe("scenario parameter changes (monotonicity sanity)", () => {
  const r0 = run({ o2Pct: 22, pressureKPa: 101.325, flowCmS: 20 });
  it("moving scenario O₂ toward the run never increases that run's D", () => {
    let prev = Infinity;
    for (let o2 = 34; o2 >= 22; o2 -= 0.5) {
      const d = distance(r0, scen({ o2Pct: o2, pressureKPa: 56.5 })).D;
      expect(d).toBeLessThanOrEqual(prev + 1e-12); prev = d;
    }
  });
  it("moving scenario pressure toward the run never increases that run's D", () => {
    let prev = Infinity;
    for (let p = 30; p <= 101.325; p += 5) {
      const d = distance(r0, scen({ o2Pct: 30, pressureKPa: p })).D;
      expect(d).toBeLessThanOrEqual(prev + 1e-12); prev = d;
    }
  });
  it("moving scenario flow toward the run never increases that run's D", () => {
    let prev = Infinity;
    for (let u = 2; u <= 20; u += 1) {
      const d = distance(r0, scen({ flowCmS: u })).D;
      expect(d).toBeLessThanOrEqual(prev + 1e-12); prev = d;
    }
  });
  it("adding a run can never increase the nearest D (nearest is a minimum)", () => {
    const s = scen({ o2Pct: 30 });
    const a = evaluate([r0], s).nearest!.d.D;
    const b = evaluate([r0, run({ id: "t:2", o2Pct: 28 })], s).nearest!.d.D;
    expect(b).toBeLessThanOrEqual(a);
  });
});

describe("ranking arithmetic (§C.8, §H.6)", () => {
  const inv = (id: string, scale: Investigation["scale"]): Investigation => ({ id, acronym: id, title: id, tier: "T2_PSI_RECORD", platform: null, hardware: null, pi: null, doi: null, license: null, landingUrl: "", startDate: null, endDate: null, objective: null, publicationsCount: 0, hasRunTable: true, runCount: 0, summaryRowCount: 0, scale });
  const runs = [run({ id: "A:1", investigation: "A", o2Pct: 23 }), run({ id: "A:2", investigation: "A", o2Pct: 30 }), run({ id: "B:1", investigation: "B", o2Pct: 21 })];
  const invs = [inv("A", "large"), inv("B", "bench"), inv("C", "ground")];
  const hm = [
    { investigation: "A", hazard: "materials" as const, match: "primary" as const, measures: 1 as const, rationale: "" },
    { investigation: "B", hazard: "materials" as const, match: "secondary" as const, measures: 0.5 as const, rationale: "" },
    { investigation: "C", hazard: "materials" as const, match: "primary" as const, measures: 1 as const, rationale: "" },
  ];
  const s = scen();
  const ev = evaluate(runs, s);
  it("R = 100 × Σ wᵢ·componentᵢ, components by hand", () => {
    const rows = rank(invs, runs, ev, s, hm);
    const A = rows.find((r) => r.investigation.id === "A")!;
    // A: Dmin = 1 (23% run), P = e^-1; H = 1; S = 1; C = 1 near of 2 runs = 0.5; M = 1
    expect(A.components.P).toBeCloseTo(Math.exp(-1), 12);
    expect(A.components.C).toBeCloseTo(0.5, 12);
    expect(A.R).toBeCloseTo(100 * (0.4 * Math.exp(-1) + 0.2 + 0.15 + 0.15 * 0.5 + 0.1), 10);
    const B = rows.find((r) => r.investigation.id === "B")!;
    expect(B.R).toBeCloseTo(100 * (0.4 * 1 + 0.2 * 0.5 + 0.15 * 0.6 + 0.15 * 1 + 0.1 * 0.5), 10);
    for (const r of rows) {
      expect(r.R).toBeGreaterThanOrEqual(0); expect(r.R).toBeLessThanOrEqual(100);
      for (const v of Object.values(r.components)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    }
  });
  it("no comparable runs → P = C = 0, labelled, ranked below every investigation with comparable runs", () => {
    const rows = rank(invs, runs, ev, s, hm);
    const C = rows.find((r) => r.investigation.id === "C")!;
    expect(C.noComparable).toBe(true); expect(C.components.P).toBe(0); expect(C.components.C).toBe(0);
    expect(C.R).toBeCloseTo(100 * (0.2 + 0.15 * 0.4 + 0.1), 10); // still ranks on H, S, M
    expect(rows[rows.length - 1].investigation.id).toBe("C");
  });
  it("renormalises weights: scaling all weights by k changes nothing; a single non-zero weight gives 100 × that component", () => {
    const base = rank(invs, runs, ev, s, hm).map((r) => r.R);
    const scaled = rank(invs, runs, ev, s, hm, { P: 4, H: 2, S: 1.5, C: 1.5, M: 1 }).map((r) => r.R);
    base.forEach((v, i) => expect(scaled[i]).toBeCloseTo(v, 10));
    const onlyP = rank(invs, runs, ev, s, hm, { P: 7, H: 0, S: 0, C: 0, M: 0 });
    for (const r of onlyP) expect(r.R).toBeCloseTo(100 * r.components.P, 10);
    const allZero = rank(invs, runs, ev, s, hm, { P: 0, H: 0, S: 0, C: 0, M: 0 });
    for (const r of allZero) expect(Number.isFinite(r.R)).toBe(true);
  });
  it("ties are broken deterministically by D_min then accession", () => {
    const twin = [run({ id: "Y:1", investigation: "Y", o2Pct: 23 }), run({ id: "X:1", investigation: "X", o2Pct: 23 })];
    const rows = rank([inv("Y", "bench"), inv("X", "bench")], twin, evaluate(twin, s), s, []);
    expect(rows.map((r) => r.investigation.id)).toEqual(["X", "Y"]);
  });
});
