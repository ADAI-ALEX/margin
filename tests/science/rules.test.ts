/**
 * Product rules that must hold in BOTH the code and the data (Kickoff §B.4, §C.3-6, §C.4, §C.5(a), §C.7, §H.8).
 * Each rule is checked exhaustively over a scenario grid on the real snapshot + curated content.
 */
import { describe, it, expect } from "vitest";
import { evaluate, distance, gate, distanceField, rank } from "@/lib/engine";
import { ALL_RUNS, PSI_RUNS, ALL_INVESTIGATIONS } from "@/lib/data";
import { PRESETS, PUBLISHED, PLANNED, HAZARD_MAP } from "@/content/curated";
import type { Scenario, Gravity, Hazard, MaterialClass } from "@/lib/schema";

const GRAVITIES: Gravity[] = ["micro", "moon", "mars", "earth"];
const HAZARDS: Hazard[] = ["materials", "smoke", "suppression", "liquid"];
const MCLASS: MaterialClass[] = ["any", "thin", "thick"];
const FLOWS: (number | null)[] = [null, 0, 10, 20];
const grid: Scenario[] = [];
for (const p of PRESETS) for (const g of GRAVITIES) for (const h of HAZARDS) for (const m of MCLASS) for (const pub of [false, true]) for (const u of FLOWS)
  grid.push({ o2Pct: p.o2Pct, pressureKPa: p.pressureKPa, flowCmS: u, gravity: g, hazard: h, materialClass: m, includePublished: pub });
const evals = grid.map((s) => ({ s, e: evaluate(ALL_RUNS, s) }));

describe("limits are never tests", () => {
  it("no limit-value record is ever comparable, nearest or nearestComplete", () => {
    for (const { e } of evals) {
      for (const c of e.comparable) expect(c.run.flags).not.toContain("limit-value");
      if (e.nearest) expect(e.nearest.run.flags).not.toContain("limit-value");
      if (e.nearestComplete) expect(e.nearestComplete.run.flags).not.toContain("limit-value");
    }
  });
  it("every curated limit-reported O₂ is flagged limit-value (so the gate catches it)", () => {
    for (const r of PUBLISHED) if (r.o2Basis === "limit-reported") expect(r.flags).toContain("limit-value");
  });
  it("a limit sitting exactly on the scenario does not colour the distance field or set the verdict", () => {
    const lim = PUBLISHED.find((r) => r.flags.includes("limit-value") && r.gravity === "moon" && r.o2Pct != null && r.pressureKPa != null)!;
    const s: Scenario = { o2Pct: lim.o2Pct!, pressureKPa: lim.pressureKPa!, flowCmS: lim.flowCmS, gravity: "moon", hazard: "materials", materialClass: "any", includePublished: true };
    const e = evaluate(ALL_RUNS, s);
    const limHit = e.limits.find((l) => l.run.id === lim.id)!;
    expect(limHit.d.D).toBeCloseTo(0, 12);
    expect(e.nearest?.run.id).not.toBe(lim.id);
    const f = distanceField(e, s, [s.o2Pct, s.o2Pct + 1], [s.pressureKPa, s.pressureKPa * 2], 2, 2);
    // node (0,0) is the scenario itself: the field there equals the nearest TESTED evidence, not the limit's 0
    expect(f.D[0]).toBeCloseTo(e.nearest ? e.nearest.d.D : Infinity, 5);
  });
  it("limits never enter the ranking's proximity (P) term", () => {
    const s: Scenario = { o2Pct: 21, pressureKPa: 70.3, flowCmS: null, gravity: "moon", hazard: "materials", materialClass: "any", includePublished: true };
    const rows = rank(ALL_INVESTIGATIONS, ALL_RUNS, evaluate(ALL_RUNS, s), s, HAZARD_MAP);
    const of = rows.find((r) => r.investigation.id === "PUB-OLSON-FERKUL-2012");
    if (of) { expect(of.components.P).toBe(0); expect(of.noComparable).toBe(true); }
  });
});

describe("burner-fed oxidizer O₂ is never on the ambient O₂ axis (F-05)", () => {
  const inverse = PSI_RUNS.filter((r) => /Inverse/.test(r.source.ref));
  it("all 274 inverse-flame runs (CFI-G 154 + Flame Design 120) carry burner-fed-oxidizer and o2Pct = null", () => {
    expect(inverse).toHaveLength(274);
    for (const r of inverse) {
      expect(r.flags).toContain("burner-fed-oxidizer"); expect(r.o2Pct).toBeNull();
      if (/^\d*\.?\d+$/.test(r.original["XO2"] ?? "")) expect(r.measures.oxidizerXO2.value).toBeCloseTo(parseFloat(r.original["XO2"]) * 100, 2);
    }
    expect(PSI_RUNS.filter((r) => r.flags.includes("burner-fed-oxidizer"))).toHaveLength(274);
  });
  it("no gas-burner run with an ambient O₂ above the normal-flame maximum (inverse 85% never leaks)", () => {
    const gb = PSI_RUNS.filter((r) => r.fuelClass === "gas-burner" && r.o2Pct != null);
    expect(Math.max(...gb.map((r) => r.o2Pct!))).toBeLessThanOrEqual(45);
  });
  it("no inverse-flame run is ever comparable", () => {
    for (const { e } of evals) for (const c of e.comparable) expect(c.run.flags).not.toContain("burner-fed-oxidizer");
  });
});

describe("missing cabin pressure is never inferred (§C.3-6, F-07)", () => {
  it("Saffire-II and Saffire-III pressure is null on every run", () => {
    for (const r of PSI_RUNS.filter((x) => x.investigation === "PSI-99" || x.investigation === "PSI-100")) {
      expect(r.pressureKPa).toBeNull(); expect(r.pressureBasis).toBe("unknown");
    }
  });
  it("imputed cabin pressure (nominal-stated with no pressure cell) exists only for BASS-II and Saffire-I", () => {
    const imputed = PSI_RUNS.filter((r) => r.pressureBasis === "nominal-stated" && !Object.keys(r.original).some((k) => /pressure|^p(init|final|mean)|approx p/i.test(k)));
    expect(new Set(imputed.map((r) => r.investigation))).toEqual(new Set(["PSI-25", "PSI-98"]));
  });
  it("source.quote is never a paraphrase: no PSI run carries a quote it cannot back", () => {
    for (const r of PSI_RUNS) expect(r.source.quote).toBeUndefined();
    for (const r of PSI_RUNS.filter((x) => x.pressureBasis === "nominal-stated" && /^PSI-(25|98)$/.test(x.investigation))) expect(r.note).toMatch(/Paraphrase, not a quote/);
  });
  it("every nominal-stated value carries the nominal-value flag (PSI and curated)", () => {
    for (const r of ALL_RUNS) if (r.pressureBasis === "nominal-stated" || r.o2Basis === "nominal-stated" || r.flowBasis === "nominal-stated") expect(r.flags).toContain("nominal-value");
  });
  it("no run claims 'measured' for a value absent from its original cells (§H.7)", () => {
    for (const r of PSI_RUNS) {
      const cells = Object.values(r.original).join(" ");
      if (r.o2Basis === "measured") expect(r.conversions.some((c) => c.field === "o2Pct") || cells.includes(String(r.o2Pct))).toBe(true);
      if (r.pressureBasis === "measured") expect(r.conversions.some((c) => c.field === "pressureKPa")).toBe(true);
      if (r.flowBasis === "measured") expect(cells).toMatch(new RegExp(`\\b${String(r.flowCmS).replace(".", "\\.")}\\b`));
    }
  });
});

describe("gravity: no cross-gravity distance, ever (§C.7, §H.8)", () => {
  it("distance() throws for every pair of different regimes", () => {
    const r = PSI_RUNS.find((x) => x.o2Pct != null)!;
    for (const g of GRAVITIES) for (const h of GRAVITIES) {
      const s: Scenario = { o2Pct: 21, pressureKPa: 100, flowCmS: 10, gravity: h, hazard: "materials", materialClass: "any", includePublished: true };
      if (g === h) expect(() => distance({ ...r, gravity: g }, s)).not.toThrow();
      else expect(() => distance({ ...r, gravity: g }, s)).toThrow();
    }
  });
  it("every comparable and every limit shares the scenario's regime; every T1 run is micro", () => {
    for (const { s, e } of evals) {
      for (const c of e.comparable) expect(c.run.gravity).toBe(s.gravity);
      for (const c of e.limits) expect(c.run.gravity).toBe(s.gravity);
      for (const r of e.otherGravity) expect(r.gravity).not.toBe(s.gravity);
    }
    for (const r of PSI_RUNS) expect(r.gravity).toBe("micro");
  });
  it("Moon / Mars PSI-only → zero comparable; Earth → only 1-g T3 records", () => {
    for (const { s, e } of evals) {
      if (s.gravity !== "micro") for (const c of e.comparable) expect(c.run.tier).toBe("T3_PUBLISHED");
      if ((s.gravity === "moon" || s.gravity === "mars") && !s.includePublished) expect(e.comparable).toHaveLength(0);
    }
  });
  it("gate() isolates regimes before distance() is reached", () => {
    const r = PSI_RUNS.find((x) => x.investigation === "PSI-25")!;
    expect(gate(r, { o2Pct: 21, pressureKPa: 100, flowCmS: 10, gravity: "moon", hazard: "materials", materialClass: "any", includePublished: false }).status).toBe("other-gravity");
  });
});

describe("tiers (§C.4)", () => {
  it("T4 planned is never evidence, context, limit or other-gravity", () => {
    expect(PLANNED.length).toBeGreaterThan(0);
    for (const { e } of evals) {
      for (const c of [...e.comparable, ...e.limits]) expect(c.run.tier).not.toBe("T4_PLANNED");
      for (const r of [...e.context, ...e.otherGravity]) expect(r.tier).not.toBe("T4_PLANNED");
    }
  });
  it("a planned run placed exactly on the scenario still gives NONE", () => {
    const pl = PLANNED[0];
    const s: Scenario = { o2Pct: pl.o2Pct!, pressureKPa: pl.pressureKPa!, flowCmS: null, gravity: pl.gravity, hazard: "materials", materialClass: "any", includePublished: true };
    expect(evaluate(PLANNED, s).verdict).toBe("NONE");
  });
  it("T3 appears only when includePublished is on", () => {
    for (const { s, e } of evals) if (!s.includePublished) {
      for (const c of [...e.comparable, ...e.limits]) expect(c.run.tier).toBe("T1_PSI_RUN");
      for (const r of [...e.context, ...e.otherGravity]) expect(r.tier).toBe("T1_PSI_RUN");
    }
  });
  it("ranking never lists a T4 group, and lists T3 groups only with published on", () => {
    for (const pub of [false, true]) {
      const s: Scenario = { o2Pct: 34, pressureKPa: 56.5, flowCmS: 10, gravity: "micro", hazard: "materials", materialClass: "any", includePublished: pub };
      const rows = rank(ALL_INVESTIGATIONS, ALL_RUNS, evaluate(ALL_RUNS, s), s, HAZARD_MAP);
      expect(rows.some((r) => r.investigation.tier === "T4_PLANNED")).toBe(false);
      expect(rows.some((r) => r.investigation.tier === "T3_PUBLISHED")).toBe(pub);
    }
  });
});

describe("hazard gate (§C.5(a))", () => {
  it("smoke: comparable runs are smoke-source or solids with alarm data — never a plain T1 solid burn", () => {
    for (const { s, e } of evals) if (s.hazard === "smoke") for (const c of e.comparable) {
      expect(c.run.fuelClass === "smoke-source" || (c.run.fuelClass.startsWith("solid") && !!c.run.measures.alarm)).toBe(true);
    }
  });
  it("smoke PSI-only is NONE for every preset, flow and regime; SAME/SAME-R are excluded as 'not placeable', not as irrelevant", () => {
    for (const { s, e } of evals) if (s.hazard === "smoke" && !s.includePublished) expect(e.verdict).toBe("NONE");
    const same = PSI_RUNS.find((r) => r.investigation === "PSI-101")!;
    expect(gate(same, grid[0] && { ...grid[0], hazard: "smoke", gravity: "micro" }).status).toBe("excluded");
    expect((gate(same, { ...grid[0], hazard: "smoke", gravity: "micro" }) as { reason: string }).reason).toMatch(/O₂/);
  });
  it("materials: only solid classes are comparable; gas burners are not even context", () => {
    for (const { s, e } of evals) if (s.hazard === "materials") {
      for (const c of e.comparable) expect(c.run.fuelClass.startsWith("solid")).toBe(true);
      for (const r of e.context) expect(r.fuelClass).not.toBe("gas-burner");
    }
  });
  it("liquid: only liquid droplets comparable", () => {
    for (const { s, e } of evals) if (s.hazard === "liquid") for (const c of e.comparable) expect(c.run.fuelClass).toBe("liquid-droplet");
  });
  it("material class narrowing: thin excludes thick, thick excludes thin, unknown stays", () => {
    for (const { s, e } of evals) {
      if (s.materialClass === "thin") for (const c of e.comparable) expect(c.run.fuelClass).not.toBe("solid-thick");
      if (s.materialClass === "thick") for (const c of e.comparable) expect(c.run.fuelClass).not.toBe("solid-thin");
    }
  });
  it("no run without ambient O₂ is ever comparable", () => {
    for (const { e } of evals) for (const c of e.comparable) expect(c.run.o2Pct).not.toBeNull();
  });
});
