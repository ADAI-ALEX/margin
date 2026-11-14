/**
 * Scenario ⇄ URL query encoding (lib/state/scenarioQuery.ts).
 * A shared link must always reproduce the same scenario, and hostile or malformed
 * parameters must be clamped or ignored, never crash the page or poison the engine.
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_SCENARIO, LIMITS, SCENARIO_KEYS, GRAVITIES, HAZARD_IDS, MATERIAL_CLASSES,
  clampScenario, parseScenarioQuery, scenarioOnlyQuery, scenarioToQuery,
} from "@/lib/state/scenarioQuery";
import type { Scenario } from "@/lib/schema";

const q = (s: string) => new URLSearchParams(s);
/** Parse a query and apply it the way useMargin does: defaults ⊕ parsed, then clamp. */
const resolve = (s: string): Scenario => clampScenario({ ...DEFAULT_SCENARIO, ...parseScenarioQuery(q(s)).scenario });

const EA: Scenario = { o2Pct: 34, pressureKPa: 56.5, flowCmS: 20, gravity: "moon", hazard: "materials", materialClass: "thin", includePublished: true };

describe("round-trip", () => {
  it("serialise → parse reproduces the scenario exactly", () => {
    const out = parseScenarioQuery(q(scenarioToQuery(EA, "ea")));
    expect(out.preset).toBe("ea");
    expect(out.scenario).toEqual(EA);
  });

  it("round-trips every gravity, hazard and material class", () => {
    for (const gravity of GRAVITIES) for (const hazard of HAZARD_IDS) for (const materialClass of MATERIAL_CLASSES) {
      const s: Scenario = { ...DEFAULT_SCENARIO, gravity, hazard, materialClass };
      expect(resolve(scenarioToQuery(s, null))).toEqual(s);
    }
  });

  it("round-trips the default scenario (pub omitted means off)", () => {
    const str = scenarioToQuery(DEFAULT_SCENARIO, "iss");
    expect(q(str).has("pub")).toBe(false);
    expect(q(str).has("m")).toBe(false); // materialClass "any" is the default and is omitted
    expect(resolve(str)).toEqual(DEFAULT_SCENARIO);
  });

  it("rounds to 2 decimals so URLs stay short and stable", () => {
    const str = scenarioToQuery({ ...EA, o2Pct: 33.33333333, pressureKPa: 56.536, flowCmS: 7.005 }, null);
    expect(q(str).get("o2")).toBe("33.33");
    expect(q(str).get("p")).toBe("56.54");
    expect(Number(q(str).get("u"))).toBeCloseTo(7.0, 1);
  });

  it("serialises a null preset by omitting the key", () => {
    expect(q(scenarioToQuery(EA, null)).has("preset")).toBe(false);
  });

  it("the full hero-flow URL parses as documented", () => {
    const out = parseScenarioQuery(q("preset=ea&o2=34&p=56.5&u=20&g=moon&h=materials&pub=1"));
    expect(out.preset).toBe("ea");
    expect(out.scenario).toEqual({ o2Pct: 34, pressureKPa: 56.5, flowCmS: 20, gravity: "moon", hazard: "materials", includePublished: true });
  });
});

describe("preset-only URL", () => {
  it("yields a preset and an empty scenario (the preset supplies the values)", () => {
    const out = parseScenarioQuery(q("preset=ea"));
    expect(out.preset).toBe("ea");
    expect(out.scenario).toEqual({});
  });

  it("an empty query yields nothing", () => {
    expect(parseScenarioQuery(q(""))).toEqual({ scenario: {}, preset: undefined });
  });
});

describe("hostile and malformed values", () => {
  it("o2=-5 clamps to the lower O₂ limit", () => {
    expect(resolve("o2=-5").o2Pct).toBe(LIMITS.o2[0]);
  });
  it("o2=500 clamps to 100%", () => {
    expect(resolve("o2=500").o2Pct).toBe(100);
  });
  it("p=0 clamps to the lower pressure limit (never 0, so log(P) stays finite)", () => {
    const p = resolve("p=0").pressureKPa;
    expect(p).toBe(LIMITS.pressureKPa[0]);
    expect(Number.isFinite(Math.log(p))).toBe(true);
  });
  it("p=1e9 clamps to the upper pressure limit", () => {
    expect(resolve("p=1e9").pressureKPa).toBe(LIMITS.pressureKPa[1]);
  });
  it("u=-3 clamps to 0 cm/s", () => {
    expect(resolve("u=-3").flowCmS).toBe(0);
  });
  it("u=1e6 clamps to the upper flow limit", () => {
    expect(resolve("u=1e6").flowCmS).toBe(LIMITS.flowCmS[1]);
  });
  it.each(["NaN", "Infinity", "-Infinity", "abc", "", "  ", "1,5", "0x"])("non-numeric o2/p/u %j are ignored (defaults kept)", (v) => {
    const enc = encodeURIComponent(v);
    const out = parseScenarioQuery(q(`o2=${enc}&p=${enc}&u=${enc}`));
    expect(out.scenario.o2Pct).toBeUndefined();
    expect(out.scenario.pressureKPa).toBeUndefined();
    expect(out.scenario.flowCmS).toBeUndefined();
    expect(resolve(`o2=${enc}&p=${enc}&u=${enc}`)).toEqual(DEFAULT_SCENARIO);
  });
  it("clampScenario replaces non-finite numbers with defaults", () => {
    const s = clampScenario({ ...DEFAULT_SCENARIO, o2Pct: NaN, pressureKPa: Infinity, flowCmS: -Infinity });
    expect(s.o2Pct).toBe(DEFAULT_SCENARIO.o2Pct);
    expect(s.pressureKPa).toBe(DEFAULT_SCENARIO.pressureKPa);
    expect(s.flowCmS).toBe(0);
  });
  it("junk g / h / m values are ignored", () => {
    const out = parseScenarioQuery(q("g=jupiter&h=<script>&m=thickest"));
    expect(out.scenario).toEqual({});
  });
  it("enum matching is case-sensitive (Moon is not moon)", () => {
    expect(parseScenarioQuery(q("g=Moon")).scenario.gravity).toBeUndefined();
  });
  it("an overlong preset is rejected", () => {
    expect(parseScenarioQuery(q(`preset=${"a".repeat(25)}`)).preset).toBeUndefined();
    expect(parseScenarioQuery(q(`preset=${"a".repeat(24)}`)).preset).toBe("a".repeat(24));
  });
  it("a preset with illegal characters is rejected", () => {
    for (const bad of ["EA", "e a", "ea;drop", "../ea", "<b>", "ea%00"]) {
      expect(parseScenarioQuery(q(`preset=${encodeURIComponent(bad)}`)).preset).toBeUndefined();
    }
  });
  it("an unknown but well-formed preset id is passed through (useMargin ignores it)", () => {
    expect(parseScenarioQuery(q("preset=atlantis")).preset).toBe("atlantis");
  });
  it("duplicate keys use the first value", () => {
    expect(parseScenarioQuery(q("o2=30&o2=99")).scenario.o2Pct).toBe(30);
  });
  it("a resolved hostile scenario is always physically meaningful", () => {
    const s = resolve("o2=-1e308&p=-7&u=-0.0001&g=x&h=y&m=z&pub=yes");
    expect(s.o2Pct).toBeGreaterThan(0);
    expect(s.o2Pct).toBeLessThanOrEqual(100);
    expect(s.pressureKPa).toBeGreaterThan(0);
    expect(s.flowCmS).toBeGreaterThanOrEqual(0);
    expect(s.includePublished).toBe(false);
  });
});

describe("quiescent flow (u=q)", () => {
  it("parses u=q as null (quiescent)", () => {
    expect(parseScenarioQuery(q("u=q")).scenario.flowCmS).toBeNull();
  });
  it("serialises null flow as u=q and round-trips", () => {
    const s: Scenario = { ...EA, flowCmS: null };
    const str = scenarioToQuery(s, null);
    expect(q(str).get("u")).toBe("q");
    expect(resolve(str).flowCmS).toBeNull();
  });
  it("clampScenario leaves null flow as null", () => {
    expect(clampScenario({ ...DEFAULT_SCENARIO, flowCmS: null }).flowCmS).toBeNull();
  });
  it("u=Q (upper case) is not quiescent and is ignored", () => {
    expect(parseScenarioQuery(q("u=Q")).scenario.flowCmS).toBeUndefined();
  });
});

describe("published-evidence flag (pub)", () => {
  it("pub=1 → on, pub=0 → off", () => {
    expect(parseScenarioQuery(q("pub=1")).scenario.includePublished).toBe(true);
    expect(parseScenarioQuery(q("pub=0")).scenario.includePublished).toBe(false);
  });
  it("other pub values are ignored", () => {
    for (const v of ["true", "yes", "2", "", "01"]) expect(parseScenarioQuery(q(`pub=${v}`)).scenario.includePublished).toBeUndefined();
  });
  it("serialises pub=1 only when on", () => {
    expect(q(scenarioToQuery({ ...EA, includePublished: true }, null)).get("pub")).toBe("1");
    expect(q(scenarioToQuery({ ...EA, includePublished: false }, null)).has("pub")).toBe(false);
  });
});

describe("non-scenario params are preserved", () => {
  it("keeps cmp and run from the base query", () => {
    const base = q("cmp=PSI-25,PSI-69&run=PSI-25:r0001&o2=1&g=earth");
    const out = q(scenarioToQuery(EA, "ea", base));
    expect(out.get("cmp")).toBe("PSI-25,PSI-69");
    expect(out.get("run")).toBe("PSI-25:r0001");
  });
  it("scenario keys in the base are overwritten by the scenario, not duplicated", () => {
    const base = q("o2=1&p=2&u=3&g=earth&h=smoke&m=thick&pub=1&preset=iss");
    const out = q(scenarioToQuery({ ...EA, includePublished: false, materialClass: "any" }, "ea", base));
    for (const k of SCENARIO_KEYS) expect(out.getAll(k).length).toBeLessThanOrEqual(1);
    expect(out.get("o2")).toBe("34");
    expect(out.get("g")).toBe("moon");
    expect(out.get("preset")).toBe("ea");
    expect(out.has("pub")).toBe(false); // stale pub=1 must not survive
    expect(out.has("m")).toBe(false);   // stale m=thick must not survive
  });
  it("a base without scenario keys contributes nothing to the scenario", () => {
    const str = scenarioToQuery(EA, "ea", q("cmp=PSI-25"));
    expect(parseScenarioQuery(q(str)).scenario).toEqual(EA);
  });
  it("scenarioOnlyQuery never carries page params", () => {
    const str = scenarioOnlyQuery(EA, "ea");
    expect(q(str).has("cmp")).toBe(false);
    expect(parseScenarioQuery(q(str)).scenario).toEqual(EA);
  });
});
