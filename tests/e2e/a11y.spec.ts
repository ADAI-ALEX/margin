/**
 * Automated accessibility (axe-core, WCAG 2 A + AA). Fails on serious or critical violations;
 * moderate/minor ones are attached to the report so they stay visible. No rules are disabled.
 */
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./helpers/fixtures";

const ROUTES = ["/", "/?preset=ea&g=moon&pub=1", "/investigations", "/method", "/sources", "/guide", "/?tour=1", "/investigations/PSI-25"];

for (const route of ROUTES) {
  test(`axe ${route}`, async ({ page }, info) => {
    const res = await page.goto(route);
    expect(res?.status(), `${route} status`).toBe(200);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const fmt = (v: (typeof results.violations)[number]) =>
      `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? "" : "s"})\n` +
      v.nodes.slice(0, 5).map((n) => `    ${n.target.join(" ")}\n      ${n.failureSummary?.split("\n").join("\n      ")}`).join("\n");

    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const other = results.violations.filter((v) => !blocking.includes(v));
    if (other.length) await info.attach("axe-non-blocking.txt", { body: other.map(fmt).join("\n\n"), contentType: "text/plain" });

    expect(blocking.length, `${route}: serious/critical axe violations\n\n${blocking.map(fmt).join("\n\n")}`).toBe(0);
  });
}
