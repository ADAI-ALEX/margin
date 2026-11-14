/**
 * Shareable URL state (Kickoff §B.1 P0-4, §H.10): a link reproduces the scenario,
 * hostile parameters never crash the page, and the scenario survives navigation.
 */
import { test, expect, params, waitForScenarioHydration } from "./helpers/fixtures";
import { expectFor, presetScenario } from "./helpers/engine";

const SHARED = "/?preset=ea&o2=34&p=56.5&u=20&g=moon&h=materials&pub=1";

test.describe("URL state", () => {
  test("a shared link reproduces controls and verdict", async ({ page, errors }) => {
    await page.goto(SHARED);
    await waitForScenarioHydration(page);

    await expect(page.getByRole("radio", { name: "20 centimetres per second", exact: true })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: "Lunar (0.165 g)", exact: true })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("switch", { name: /Include published evidence/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("select#atlas-q")).toHaveValue("materials");
    await expect(page.locator("select#atlas-preset")).toHaveValue("ea");

    const exp = expectFor(presetScenario("ea", { flowCmS: 20, gravity: "moon", includePublished: true }));
    const verdict = page.getByTestId("verdict");
    await expect(verdict).toHaveAttribute("data-verdict", exp.verdict);
    expect(Math.abs(Number(await verdict.getAttribute("data-d")) - exp.D!)).toBeLessThanOrEqual(0.0011);

    // the canonical query written back keeps every value
    const p = params(page);
    expect([p.get("o2"), p.get("p"), p.get("u"), p.get("g"), p.get("h"), p.get("pub")]).toEqual(["34", "56.5", "20", "moon", "materials", "1"]);

    // reload reproduces it
    await page.reload();
    await waitForScenarioHydration(page);
    await expect(verdict).toHaveAttribute("data-verdict", exp.verdict);
    await expect(page.getByRole("radio", { name: "Lunar (0.165 g)", exact: true })).toHaveAttribute("aria-checked", "true");

    expect(errors.page).toEqual([]);
    expect(errors.console).toEqual([]);
  });

  test("a preset-only link applies the preset values", async ({ page }) => {
    await page.goto("/?preset=ea");
    await waitForScenarioHydration(page);
    const p = params(page);
    const ea = presetScenario("ea");
    expect(Number(p.get("o2"))).toBe(ea.o2Pct);
    expect(Number(p.get("p"))).toBeCloseTo(ea.pressureKPa, 2);
    await expect(page.getByTestId("verdict")).toHaveAttribute("data-verdict", expectFor(ea).verdict);
  });

  const HOSTILE = [
    "/?o2=-5&p=0&u=-3",
    "/?o2=NaN&p=Infinity&u=abc",
    "/?p=1e9&o2=1e308",
    "/?g=jupiter&h=%3Cscript%3Ealert(1)%3C%2Fscript%3E&m=thickest&pub=yes",
    `/?preset=${"x".repeat(200)}`,
    "/?preset=..%2F..%2Fetc&u=q",
    "/?o2=&p=&u=&g=&h=&m=&pub=",
  ];
  for (const url of HOSTILE) {
    test(`hostile params do not crash: ${url.slice(0, 60)}`, async ({ page, errors }) => {
      const res = await page.goto(url);
      expect(res?.status()).toBe(200);
      await waitForScenarioHydration(page);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.getByTestId("verdict")).toHaveAttribute("data-verdict", /^(DIRECT|NEAR|DISTANT|NONE)$/);
      const p = params(page);
      const o2 = Number(p.get("o2")), pk = Number(p.get("p"));
      expect(o2).toBeGreaterThan(0);
      expect(o2).toBeLessThanOrEqual(100);
      expect(pk).toBeGreaterThan(0);
      expect(["micro", "moon", "mars", "earth"]).toContain(p.get("g"));
      const u = p.get("u");
      expect(u === "q" || Number(u) >= 0).toBe(true);
      expect(await page.locator("body").innerText()).not.toContain("<script>");
      expect(errors.page).toEqual([]);
    });
  }

  test("the header link to Investigations carries the scenario, and the page shows it", async ({ page, errors }) => {
    await page.goto(SHARED);
    await waitForScenarioHydration(page);
    const nav = page.getByRole("navigation", { name: "Primary" });
    const link = nav.getByRole("link", { name: "Investigations" });
    await expect(link).toHaveAttribute("href", /^\/investigations\?.*g=moon/);
    const href = (await link.getAttribute("href"))!;
    const carried = new URL(href, "http://x").searchParams;
    expect([carried.get("o2"), carried.get("p"), carried.get("u"), carried.get("g"), carried.get("pub")]).toEqual(["34", "56.5", "20", "moon", "1"]);

    await link.click();
    await expect(page).toHaveURL(/\/investigations\?/);
    await waitForScenarioHydration(page);
    const p = params(page);
    expect([p.get("o2"), p.get("p"), p.get("u"), p.get("g"), p.get("pub")]).toEqual(["34", "56.5", "20", "moon", "1"]);

    // The Investigations page reflects the same scenario in its controls.
    await expect(page.getByRole("radio", { name: /Lunar|Moon/ }).and(page.locator('[aria-checked="true"]')).first()).toBeVisible();
    await expect(page.getByRole("switch").first()).toBeChecked();

    // ...and the Atlas link carries it back.
    const back = page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Atlas" });
    await expect(back).toHaveAttribute("href", /g=moon/);
    expect(errors.page).toEqual([]);
  });
});
