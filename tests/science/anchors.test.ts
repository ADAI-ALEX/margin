/**
 * Real-data anchors (Kickoff §C.5 "expected behaviour", §H.4 last item), computed BY HAND from each
 * run's raw cells (PSI `original`) or from the curated T3 record, then compared with the engine.
 * T3 values are read from content/curated.ts at test time (another agent is verifying them), never typed here.
 */
import { describe, it, expect } from "vitest";
import { evaluate, flowSensitivity } from "@/lib/engine";
import { ALL_RUNS, PSI_RUNS } from "@/lib/data";
import { PRESETS, PUBLISHED } from "@/content/curated";
import type { Run, Scenario } from "@/lib/schema";
import { D, cell, verdictOf, kPaFromPsia1, MMHG, ATM } from "./hand";

const preset = (id: string) => PRESETS.find((p) => p.id === id)!;
const scen = (id: string, o: Partial<Scenario> = {}): Scenario => {
  const p = preset(id);
  return { o2Pct: p.o2Pct, pressureKPa: p.pressureKPa, flowCmS: p.flowCmS, gravity: "micro", hazard: "materials", materialClass: "any", includePublished: false, ...o };
};

/** Hand reading of a PSI solid run's axes from its raw cells (Kickoff §C.3 rules applied manually). */
function handSolid(r: Run): { o2: number | null; p: number | null; u: number | null } {
  const o = r.original;
  if (r.investigation === "PSI-25") return { o2: cell(o["Calibrated initial O2 % by vol"]), p: 101.325 /* nominal-stated (cabin) */, u: null /* uncalibrated fan display */ };
  if (r.investigation === "PSI-98") return { o2: cell(o["Percent O2"]), p: 101.325 /* nominal-stated (cabin) */, u: cell(o["Air Flow (cm/s)"]) };
  if (r.investigation === "PSI-99") return { o2: cell(o["Percent O2 (Note 1)"]), p: null /* not recorded, never inferred */, u: cell(o["Air Flow (cm/s)"]) };
  if (r.investigation === "PSI-100") return { o2: null, p: null, u: cell(o["Air Flow"]) };
  return { o2: null, p: null, u: null }; // BASS (PSI-26): material only
}
/** Hand D for a solid run vs a ventilated scenario; flow compared only when both are numeric (no quiescent solids exist). */
function handSolidD(r: Run, s: Scenario): number | null {
  const h = handSolid(r);
  if (h.o2 == null) return null; // not placeable
  return D(h.o2 - s.o2Pct, h.p == null ? null : h.p / s.pressureKPa, h.u == null || s.flowCmS == null ? null : h.u - s.flowCmS);
}
function argmin<T>(xs: T[], f: (x: T) => number | null): { best: T[]; D: number } {
  let m = Infinity; let best: T[] = [];
  for (const x of xs) { const d = f(x); if (d == null) continue; if (d < m - 1e-12) { m = d; best = [x]; } else if (Math.abs(d - m) <= 1e-12) best.push(x); }
  return { best, D: m };
}
const psiSolids = PSI_RUNS.filter((r) => /^PSI-(25|26|98|99|100)$/.test(r.investigation));
/** Published, tested (non-limit) solids in a gravity regime, read from content. */
const t3Solids = (g: Run["gravity"]) => PUBLISHED.filter((r) => r.gravity === g && r.fuelClass.startsWith("solid") && !r.flags.includes("limit-value"));
/** Hand D for a T3 record: forced-flow records compared on flow; natural-convection / unknown-speed records not. */
function handT3D(r: Run, s: Scenario): number | null {
  if (r.o2Pct == null) return null;
  const flowComparable = r.flowCmS != null && s.flowCmS != null && r.flowRegime !== "natural-convection" && r.flowRegime !== "quiescent";
  return D(r.o2Pct - s.o2Pct, r.pressureKPa == null ? null : r.pressureKPa / s.pressureKPa, flowComparable ? r.flowCmS! - s.flowCmS! : null);
}

describe("presets equal Kickoff §C.6 (psia × 6.894757)", () => {
  it("ISS / Artemis / EA", () => {
    expect(preset("iss").pressureKPa).toBe(kPaFromPsia1(14.7));
    expect(preset("artemis").pressureKPa).toBe(kPaFromPsia1(10.2));
    expect(preset("ea").pressureKPa).toBe(kPaFromPsia1(8.2));
    expect([preset("iss").o2Pct, preset("artemis").o2Pct, preset("ea").o2Pct]).toEqual([20.9, 26.5, 34]);
    for (const id of ["iss", "artemis", "ea"]) expect(preset(id).flowCmS).toBe(10);
  });
});

describe("Case 1 — Exploration Atmosphere, micro, materials, PSI only (expected DISTANT)", () => {
  const s = scen("ea");
  const e = evaluate(ALL_RUNS, s);
  const hand = argmin(psiSolids, (r) => handSolidD(r, s));
  it("hand: nearest is a Saffire-II run (22.1% O₂, 20 cm/s, pressure not recorded): √(((22.1−34)/2)² + ((20−10)/5)²) = √(35.4025+4) = 6.2771", () => {
    expect(hand.D).toBeCloseTo(Math.sqrt(5.95 ** 2 + 2 ** 2), 9);
    expect(hand.best.every((r) => r.investigation === "PSI-99")).toBe(true);
    expect(e.nearest!.d.D).toBeCloseTo(hand.D, 9);
    expect(hand.best.map((r) => r.id)).toContain(e.nearest!.run.id);
    expect(e.verdict).toBe("DISTANT");
    expect(e.nearest!.d.partialMatch).toBe(true); // pressure missing
  });
  it("hand: best COMPLETE match is Saffire-I S1 (21.5% first value of '21.5 - 21.7', nominal 101.325 kPa, 20 cm/s) = 7.065", () => {
    const expected = D(21.5 - 34, 101.325 / 56.5, 20 - 10); // √(39.0625 + 6.8516 + 4)
    expect(expected).toBeCloseTo(7.0649, 3);
    expect(e.nearestComplete!.run.investigation).toBe("PSI-98");
    expect(e.nearestComplete!.d.D).toBeCloseTo(expected, 9);
  });
  it("hand: highest-O₂ BASS-II run (22.2%, nominal 101.325 kPa) = √(34.81 + 6.8516) = 6.4546 — farther than Saffire-II only because Saffire-II has no pressure", () => {
    const bass = PSI_RUNS.filter((r) => r.investigation === "PSI-25" && cell(r.original["Calibrated initial O2 % by vol"]) === 22.2);
    expect(bass.length).toBeGreaterThan(0);
    expect(D(22.2 - 34, 101.325 / 56.5, null)).toBeCloseTo(6.4546, 3);
  });
});

describe("Case 2 — Exploration Atmosphere, micro, materials, WITH published (hero)", () => {
  const cands = t3Solids("micro");
  const at = (u: number) => { const s = scen("ea", { includePublished: true, flowCmS: u }); return { s, e: evaluate(ALL_RUNS, s), hand: argmin(cands, (r) => handT3D(r, s)) }; };
  it("u = 10 cm/s: engine nearest and D equal the hand argmin over T3 records (and beat every PSI run)", () => {
    const { e, hand } = at(10);
    expect(e.nearest!.d.D).toBeCloseTo(hand.D, 9);
    expect(hand.best.map((r) => r.id)).toContain(e.nearest!.run.id);
    expect(e.verdict).toBe(verdictOf(hand.D));
  });
  it("u = 10 cm/s: with the transcribed Saffire VI-2 record the hand result is DISTANT ≈ 2.51 (flow gap dominates)", () => {
    const vi2 = PUBLISHED.find((r) => r.id === "PUB-SAFFIRE:VI-2")!;
    const d10 = D(vi2.o2Pct! - 34, vi2.pressureKPa! / 56.5, vi2.flowCmS! - 10);
    // As transcribed today: (31−34)/2 = −1.5; ln(54.1/56.5)/ln1.25 = −0.1945; (20−10)/5 = 2 → 2.5076
    const { e } = at(10);
    expect(e.nearest!.run.id).toBe("PUB-SAFFIRE:VI-2");
    expect(e.nearest!.d.D).toBeCloseTo(d10, 9);
    expect(d10).toBeCloseTo(2.508, 2);
    expect(e.verdict).toBe("DISTANT");
    // The flow term is the largest of the three
    expect(Math.abs(e.nearest!.d.gaps.flow!)).toBeGreaterThan(Math.abs(e.nearest!.d.gaps.o2!));
  });
  it("u = 20 cm/s: NEAR ≈ 1.51 (flow gap 0)", () => {
    const vi2 = PUBLISHED.find((r) => r.id === "PUB-SAFFIRE:VI-2")!;
    const { e } = at(20);
    expect(e.nearest!.run.id).toBe("PUB-SAFFIRE:VI-2");
    expect(e.nearest!.d.D).toBeCloseTo(D(vi2.o2Pct! - 34, vi2.pressureKPa! / 56.5, vi2.flowCmS! - 20), 9);
    expect(e.nearest!.d.D).toBeCloseTo(1.513, 2);
    expect(e.verdict).toBe("NEAR");
  });
  it("flip point U* = U_run − 5·√(2.5² − dO₂² − dP²) ≈ 10.05 cm/s; engine agrees on both sides", () => {
    const vi2 = PUBLISHED.find((r) => r.id === "PUB-SAFFIRE:VI-2")!;
    const dO2 = (vi2.o2Pct! - 34) / 2, dP = Math.log(vi2.pressureKPa! / 56.5) / Math.log(1.25);
    const uStar = vi2.flowCmS! - 5 * Math.sqrt(2.5 ** 2 - dO2 ** 2 - dP ** 2);
    expect(uStar).toBeCloseTo(10.05, 1);
    expect(at(uStar - 0.01).e.verdict).toBe("DISTANT");
    expect(at(uStar + 0.01).e.verdict).toBe("NEAR");
    const fs = flowSensitivity(ALL_RUNS, scen("ea", { includePublished: true }));
    const c = fs.crossings.find((x) => x.from === "DISTANT" && x.to === "NEAR");
    expect(c).toBeTruthy();
    expect(c!.flowCmS).toBeCloseTo(uStar, 3);
  });
});

describe("Case 3 — ISS, micro, materials, PSI only (expected DIRECT)", () => {
  const s = scen("iss");
  const e = evaluate(ALL_RUNS, s);
  it("hand: BASS-II 20.9% at nominal 101.325 kPa vs 101.4 kPa → |ln(101.325/101.4)|/ln1.25 = 0.00332 (O₂ + pressure only)", () => {
    const hand = argmin(psiSolids, (r) => handSolidD(r, s));
    expect(hand.D).toBeCloseTo(Math.abs(Math.log(101.325 / 101.4)) / Math.log(1.25), 9);
    expect(hand.best.every((r) => r.investigation === "PSI-25")).toBe(true);
    expect(e.nearest!.d.D).toBeCloseTo(hand.D, 9);
    expect(e.nearest!.d.axesUsed).toEqual(["o2", "pressure"]);
    expect(e.verdict).toBe("DIRECT");
  });
  it("hand: best complete match Saffire-I S1 — (21.5−20.9)/2 = 0.3, P 0.0033, flow (20−10)/5 = 2 → 2.0224 NEAR", () => {
    expect(e.nearestComplete!.d.D).toBeCloseTo(D(21.5 - 20.9, 101.325 / 101.4, 10), 9);
    expect(verdictOf(e.nearestComplete!.d.D)).toBe("NEAR");
  });
});

describe("Case 4 — any preset at Moon gravity, materials", () => {
  it("PSI only → NONE: no PSI run is in the lunar regime", () => {
    for (const id of ["iss", "artemis", "ea"]) {
      const e = evaluate(ALL_RUNS, scen(id, { gravity: "moon" }));
      expect(e.verdict).toBe("NONE");
      expect(e.comparable).toHaveLength(0);
      expect(e.otherGravity.length).toBeGreaterThan(0);
    }
  });
  it("with published → nearest equals the hand argmin over lunar T3 tested records (limits excluded); EA is DISTANT", () => {
    const s = scen("ea", { gravity: "moon", includePublished: true });
    const e = evaluate(ALL_RUNS, s);
    const hand = argmin(t3Solids("moon"), (r) => handT3D(r, s));
    expect(Number.isFinite(hand.D)).toBe(true);
    expect(e.nearest!.d.D).toBeCloseTo(hand.D, 9);
    expect(e.nearest!.run.flags).not.toContain("limit-value");
    expect(e.verdict).toBe("DISTANT");
  });
});

describe("Case 5 — liquid fuel, ISS, micro (quiescent droplets vs ventilated scenario)", () => {
  const s = scen("iss", { hazard: "liquid" });
  const e = evaluate(ALL_RUNS, s);
  /** Hand: FLEX pressure mmHg × 0.133322; CFI "n atm" × 101.325; O₂ mole fraction × 100; flow not compared (regime mismatch). */
  const handLiquid = (r: Run): number | null => {
    const o = r.original;
    if (r.investigation === "PSI-69") {
      const mm = cell(o["Ambient pressure; mmHg"]); const x = cell(o["O initial ambient composition; mole fraction"]);
      if (x == null || !(x > 0)) return null;
      return D(x * 100 - s.o2Pct, mm != null && mm > 0 ? (mm * MMHG) / s.pressureKPa : null, null);
    }
    if (r.investigation === "PSI-39") {
      const atm = cell(o["Pressure"]); const x = cell(o["Oxygen"]);
      if (x == null) return null;
      return D(x * 100 - s.o2Pct, atm != null ? (atm * ATM) / s.pressureKPa : null, null);
    }
    return null;
  };
  it("nearest is a FLEX run; engine D equals the hand D to 1e-4 (pipeline rounds kPa to 3 dp)", () => {
    const hand = argmin(PSI_RUNS.filter((r) => r.fuelClass === "liquid-droplet"), handLiquid);
    expect(e.nearest!.run.investigation).toBe("PSI-69");
    expect(e.nearest!.d.D).toBeCloseTo(hand.D, 4);
    expect(handLiquid(e.nearest!.run)!).toBeCloseTo(hand.D, 4);
    expect(e.verdict).toBe(verdictOf(hand.D));
  });
  it("every liquid comparison is a flow-regime mismatch (flow never compared) — the verdict is O₂ + pressure only", () => {
    expect(e.comparable.length).toBeGreaterThan(0);
    for (const c of e.comparable) { expect(c.d.flags).toContain("flow-regime-mismatch"); expect(c.d.axesUsed).not.toContain("flow"); }
    expect(e.nearestComplete).toBeNull();
  });
  it("a quiescent liquid scenario compares flow (0 gap) and gives the same D", () => {
    const q = evaluate(ALL_RUNS, { ...s, flowCmS: null });
    expect(q.nearest!.d.axesUsed).toEqual(["o2", "pressure", "flow"]);
    expect(q.nearest!.d.D).toBeCloseTo(e.nearest!.d.D, 12);
  });
});

describe("Case 6 — Artemis, micro, materials", () => {
  it("PSI only, u = 10: hand argmin is BASS-II 22.2% @ nominal 101.325 → √(((22.2−26.5)/2)² + (ln(101.325/70.3)/ln1.25)²) = 2.703 DISTANT", () => {
    const s = scen("artemis");
    const e = evaluate(ALL_RUNS, s);
    const hand = argmin(psiSolids, (r) => handSolidD(r, s));
    expect(hand.D).toBeCloseTo(D(22.2 - 26.5, 101.325 / 70.3, null), 9);
    expect(e.nearest!.d.D).toBeCloseTo(hand.D, 9);
    expect(e.verdict).toBe("DISTANT");
  });
  it("PSI only, u = 20: the nearest becomes a Saffire-II run with NO pressure → √(2.2² + 0) = 2.20 NEAR (missing axis makes it closer)", () => {
    const s = scen("artemis", { flowCmS: 20 });
    const e = evaluate(ALL_RUNS, s);
    expect(e.nearest!.run.investigation).toBe("PSI-99");
    expect(e.nearest!.d.D).toBeCloseTo(D(22.1 - 26.5, null, 0), 9);
    expect(e.verdict).toBe("NEAR");
    // the same run with an ISS-like cabin pressure would be DISTANT — disclosed, not inferred
    expect(verdictOf(D(22.1 - 26.5, 101.325 / 70.3, 0))).toBe("DISTANT");
  });
  it("with published, u = 10: engine equals hand argmin over T3", () => {
    const s = scen("artemis", { includePublished: true });
    const e = evaluate(ALL_RUNS, s);
    const hand = argmin(t3Solids("micro"), (r) => handT3D(r, s));
    expect(e.nearest!.d.D).toBeCloseTo(hand.D, 9);
    expect(e.verdict).toBe(verdictOf(hand.D));
  });
});

describe("Case 7 — smoke & detection never gets a verdict from non-smoke tests", () => {
  it("ISS / EA, PSI only → NONE; SAME and SAME-R are excluded because no O₂ is recorded", () => {
    for (const id of ["iss", "artemis", "ea"]) {
      const e = evaluate(ALL_RUNS, scen(id, { hazard: "smoke" }));
      expect(e.verdict).toBe("NONE");
      expect(e.nearest).toBeNull();
    }
    const smoke = PSI_RUNS.filter((r) => r.fuelClass === "smoke-source");
    expect(smoke.length).toBe(117);
    expect(smoke.every((r) => r.o2Pct == null)).toBe(true);
  });
  it("with published, every comparable run is a T3 record carrying an alarm measurement", () => {
    const e = evaluate(ALL_RUNS, scen("iss", { hazard: "smoke", includePublished: true }));
    for (const c of e.comparable) { expect(c.run.tier).toBe("T3_PUBLISHED"); expect(c.run.measures.alarm).toBeTruthy(); }
  });
});
