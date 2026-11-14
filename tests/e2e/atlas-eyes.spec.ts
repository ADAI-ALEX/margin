/**
 * The redesigned Atlas (docs/design/DESIGN_SYSTEM.md): run selection and the run inspector, the regimes
 * overview (four separate plates, four radios), view-only URL params, Esc/focus behaviour, expeditions,
 * and no horizontal overflow in the new views. Expected values come from the engine (helpers/engine.ts).
 */
import { test, expect, params, waitForScenarioHydration, hasHorizontalScroll } from "./helpers/fixtures";
import { expectFor, presetScenario } from "./helpers/engine";

const EA_PUB = presetScenario("ea", { includePublished: true });
const EA_MOON_PUB = presetScenario("ea", { includePublished: true, gravity: "moon" });

test.describe("Atlas: run inspection", () => {
  test("selecting the nearest run opens the inspector on that run, writes run=, and Esc closes it and returns focus", async ({ page, errors }) => {
    await page.goto("/?preset=ea&pub=1");
    await waitForScenarioHydration(page);
    const exp = expectFor(EA_PUB);
    const link = page.getByTestId("field-notes").locator("button.atlas-runlink").first();
    await link.click();
    const card = page.getByTestId("specimen-card");
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-run", exp.nearestId!);
    await expect.poll(() => params(page).get("run")).toBe(exp.nearestId);
    // the inspector shows the computed distance to the scenario and a source link
    await expect(card.getByText(/Against your scenario/)).toBeVisible();
    await expect(card.locator('a[href^="http"]').first()).toBeVisible();
    // the scenario is untouched by a selection
    expect(params(page).get("o2")).toBe(String(EA_PUB.o2Pct));

    await page.keyboard.press("Escape");
    await expect(card).toHaveCount(0);
    await expect.poll(() => params(page).has("run")).toBe(false);
    // focus returns to the control that opened the inspector
    await expect(page.locator(`[data-runlink="${exp.nearestId}"]`).first()).toBeFocused();
    expect(errors.page).toEqual([]);
    expect(errors.console).toEqual([]);
  });

  test("a shared link with run= opens the inspector on that run; an unknown run id is ignored", async ({ page }) => {
    const id = expectFor(EA_MOON_PUB).nearestId!;
    await page.goto(`/?preset=ea&g=moon&pub=1&run=${encodeURIComponent(id)}`);
    await waitForScenarioHydration(page);
    await expect(page.getByTestId("specimen-card")).toHaveAttribute("data-run", id);
    await page.goto("/?preset=ea&run=PSI-99999:r0001");
    await waitForScenarioHydration(page);
    await expect(page.getByTestId("specimen-card")).toHaveCount(0);
    await expect.poll(() => params(page).has("run")).toBe(false);
  });
});

test.describe("Atlas: regimes overview", () => {
  test("shows four separate plates as a four-radio group; arrows select, Enter opens; view= round-trips", async ({ page, errors }) => {
    await page.goto("/?preset=ea&pub=1");
    await waitForScenarioHydration(page);
    await page.getByRole("button", { name: "Regimes overview" }).click();
    await expect.poll(() => params(page).get("view")).toBe("overview");
    const sheets = page.getByTestId("gravity-sheets");
    const radios = sheets.getByRole("radio");
    await expect(radios).toHaveCount(4);
    for (const [i, name] of ["Microgravity", "Lunar (0.165 g)", "Martian (0.38 g)", "Earth (1 g)"].entries()) {
      await expect(radios.nth(i)).toHaveAccessibleName(new RegExp(`^${name.replace(/[()]/g, "\\$&")}:`));
    }
    // plates are separate elements (no shared svg, nothing drawn between them)
    expect(await sheets.locator(".ov-plate svg").count()).toBe(4);
    expect(await page.locator("[data-connector]").count()).toBe(0);

    // reload keeps the overview
    await page.reload();
    await waitForScenarioHydration(page);
    await expect(page.getByTestId("gravity-sheets")).toBeVisible();

    const micro = page.getByTestId("gravity-sheets").getByRole("radio", { name: /^Microgravity:/ });
    await micro.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => params(page).get("g")).toBe("moon");
    await expect(page.getByTestId("gravity-sheets").getByRole("radio", { name: /^Lunar \(0\.165 g\):/ })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("gravity-sheets")).toHaveCount(0);
    await expect.poll(() => params(page).has("view")).toBe(false);
    expect(params(page).get("g")).toBe("moon");
    await expect(page.getByTestId("coverage-map")).toBeVisible();
    expect(errors.page).toEqual([]);
    expect(errors.console).toEqual([]);
  });

  test("an old shared link (no view params) opens the single field exactly as before", async ({ page }) => {
    await page.goto("/?preset=ea&o2=34&p=56.5&u=20&g=moon&h=materials&pub=1");
    await waitForScenarioHydration(page);
    await expect(page.getByTestId("coverage-map")).toBeVisible();
    await expect(page.getByTestId("gravity-sheets")).toHaveCount(0);
    await expect(page.getByTestId("specimen-card")).toHaveCount(0);
    const p = params(page);
    expect(p.has("view")).toBe(false);
    expect(p.has("run")).toBe(false);
  });
});

test.describe("Atlas: expeditions", () => {
  test("an expedition card sets a complete URL state and is keyboard-operable", async ({ page }) => {
    await page.goto("/?preset=iss");
    await waitForScenarioHydration(page);
    const card = page.getByRole("button", { name: /Mylar at lunar gravity/ });
    await card.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => params(page).get("g")).toBe("moon");
    const p = params(page);
    expect([p.get("preset"), p.get("pub"), p.get("h")]).toEqual(["artemis", "1", "materials"]);
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("verdict")).toHaveAttribute("data-verdict", expectFor(presetScenario("artemis", { gravity: "moon", includePublished: true })).verdict);
  });
});

test.describe("Atlas: Esc and focus", () => {
  test("Esc closes a tool-rail popover and returns focus to its button", async ({ page }, info) => {
    test.skip(info.project.name === "mobile", "the tool rail is a desktop/tablet instrument");
    await page.goto("/");
    await waitForScenarioHydration(page);
    const layers = page.getByRole("button", { name: "Layers" });
    await layers.click();
    await expect(page.getByRole("dialog", { name: "Layers" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Layers" })).toHaveCount(0);
    await expect(layers).toBeFocused();
  });

  test("command search opens with Ctrl+K, finds local data, and Esc returns focus to the trigger", async ({ page }) => {
    await page.goto("/");
    await waitForScenarioHydration(page);
    const trigger = page.getByRole("button", { name: /^Search/ });
    await trigger.click();
    const box = page.getByRole("combobox", { name: /Search investigations/ });
    await expect(box).toBeFocused();
    await box.fill("BASS");
    await expect(page.getByRole("listbox", { name: "Results" }).getByRole("option").first()).toContainText(/BASS/);
    await page.keyboard.press("Escape");
    await expect(box).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("combobox", { name: /Search investigations/ })).toBeFocused();
  });
});

test.describe("Atlas: no horizontal overflow in the new views", () => {
  for (const route of ["/?preset=ea&pub=1&view=overview", `/?preset=ea&pub=1&run=${encodeURIComponent(expectFor(EA_PUB).nearestId!)}`, "/?preset=artemis&g=mars"]) {
    test(`no horizontal scroll: ${route}`, async ({ page }) => {
      await page.goto(route);
      await waitForScenarioHydration(page);
      const s = await hasHorizontalScroll(page);
      expect(s.overflow, `scrollWidth ${s.scrollWidth} > innerWidth ${s.innerWidth}`).toBe(false);
    });
  }
});
