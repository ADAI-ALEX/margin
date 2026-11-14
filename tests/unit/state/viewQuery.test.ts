/**
 * Atlas view-only URL params (lib/state/viewQuery.ts): optional, validated, round-trip, and they never
 * disturb the scenario contract (lib/state/scenarioQuery.ts).
 */
import { describe, it, expect } from "vitest";
import { DEFAULT_VIEW, VIEW_KEYS, parseViewQuery, viewToQuery } from "@/lib/state/viewQuery";
import { SCENARIO_KEYS, DEFAULT_SCENARIO, parseScenarioQuery, scenarioToQuery } from "@/lib/state/scenarioQuery";

const q = (s: string) => new URLSearchParams(s);

describe("view params", () => {
  it("absent params give the default view (old links open unchanged)", () => {
    expect(parseViewQuery(q("preset=ea&o2=34&p=56.5&u=20&g=moon&h=materials&pub=1"))).toEqual(DEFAULT_VIEW);
  });

  it("round-trips a selected run and the overview", () => {
    const v = { run: "PSI-25:r0001", view: "overview" as const };
    expect(parseViewQuery(q(viewToQuery(v, q(""))))).toEqual(v);
  });

  it("omits defaults when writing", () => {
    const out = q(viewToQuery(DEFAULT_VIEW, q("run=PSI-25:r0001&view=overview&o2=20")));
    expect(out.has("run")).toBe(false);
    expect(out.has("view")).toBe(false);
    expect(out.get("o2")).toBe("20");
  });

  it("rejects malformed or unknown runs and unknown views", () => {
    for (const bad of ["", "../etc", "<script>", "x".repeat(80), " PSI-25:r0001", "PSI-25:r0001;drop"]) {
      expect(parseViewQuery(q(`run=${encodeURIComponent(bad)}`)).run).toBeNull();
    }
    expect(parseViewQuery(q("run=PSI-25:r9999"), (id) => id === "PSI-25:r0001").run).toBeNull();
    expect(parseViewQuery(q("run=PSI-25:r0001"), (id) => id === "PSI-25:r0001").run).toBe("PSI-25:r0001");
    expect(parseViewQuery(q("view=jupiter")).view).toBe("field");
  });

  it("view keys and scenario keys are disjoint, and each writer preserves the other's keys", () => {
    for (const k of VIEW_KEYS) expect((SCENARIO_KEYS as readonly string[]).includes(k)).toBe(false);
    const withView = viewToQuery({ run: "PSI-25:r0001", view: "overview" }, q(""));
    const both = q(scenarioToQuery({ ...DEFAULT_SCENARIO, gravity: "moon" }, "ea", q(withView)));
    expect(both.get("run")).toBe("PSI-25:r0001");
    expect(both.get("view")).toBe("overview");
    expect(parseScenarioQuery(both).scenario.gravity).toBe("moon");
    const back = q(viewToQuery({ run: null, view: "field" }, both));
    expect(back.get("g")).toBe("moon");
    expect(back.get("preset")).toBe("ea");
  });
});
