/**
 * The explainer layer: the Guide page (/guide), the guided tour of the Atlas and the first-visit welcome.
 * The Guide's worked example must agree with the engine; every AI-generated illustration must carry its
 * on-screen label (competition rule); the tour must be keyboard-operable and leave the URL contract alone.
 */
import { test, expect, waitForScenarioHydration } from "./helpers/fixtures";
import { expectFor, presetScenario } from "./helpers/engine";

test.describe("guide page", () => {
  test("explains the tool, labels every illustration, and its numbers come from the engine", async ({ page, errors, request }) => {
    await page.goto("/guide");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("tested fire");
    await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Guide" })).toHaveAttribute("aria-current", "page");

    // four AI illustrations (hero + three story cards), each with a visible label
    await expect(page.locator(".g-ai")).toHaveCount(4);
    for (const label of await page.locator(".g-ai").all()) await expect(label).toHaveText(/AI-generated illustration/i);

    // worked example: the first three D values match the engine
    const worked = page.locator(".g-worked li");
    await expect(worked).toHaveCount(4);
    const cases = [presetScenario("ea"), presetScenario("ea", { includePublished: true }), presetScenario("ea", { includePublished: true, flowCmS: 20 })];
    for (const [i, sc] of cases.entries()) {
      const exp = expectFor(sc);
      await expect(worked.nth(i).locator(".g-verdict")).toHaveText(exp.verdict);
      await expect(worked.nth(i).locator(".g-worked-d")).toHaveText(`D ${exp.D!.toFixed(2)}`);
    }
    await expect(worked.nth(3).locator(".g-verdict")).toHaveText(expectFor(presetScenario("ea", { gravity: "moon" })).verdict);

    // the demo video and its poster are served
    for (const src of ["/demo/margin-demo-30s.mp4", "/demo/margin-demo-poster.jpg"]) {
      const res = await request.get(src);
      expect(res.status(), src).toBe(200);
    }
    await page.waitForLoadState("networkidle");
    expect(errors.page).toEqual([]);
    expect(errors.console).toEqual([]);
  });

  test("worked-example links open the matching Atlas view", async ({ page }) => {
    await page.goto("/guide");
    await page.locator(".g-worked li").nth(1).getByRole("link").click();
    await expect(page).toHaveURL(/[?&]preset=ea\b.*/);
    await waitForScenarioHydration(page);
    await expect(page.getByTestId("verdict")).toHaveAttribute("data-verdict", expectFor(presetScenario("ea", { includePublished: true })).verdict);
  });
});

test.describe("atlas tour", () => {
  test("opens from /?tour=1, steps with buttons and arrow keys, and Esc closes it", async ({ page, errors }) => {
    await page.goto("/?tour=1");
    const tour = page.getByTestId("tour");
    await expect(tour).toBeVisible();
    await expect(tour).toHaveAttribute("data-step", "welcome");
    // the one-shot parameter is removed; the scenario contract is untouched
    await expect.poll(() => new URL(page.url()).searchParams.has("tour")).toBe(false);

    await tour.getByRole("button", { name: "Next" }).click();
    await expect(tour).toHaveAttribute("data-step", "field");
    await page.keyboard.press("ArrowRight");
    await expect(tour).toHaveAttribute("data-step", "probe");
    await page.keyboard.press("ArrowLeft");
    await expect(tour).toHaveAttribute("data-step", "field");
    // keys inside the tour never reach the field (no zoom, no overview)
    await page.keyboard.press("o");
    await expect(page.getByTestId("gravity-sheets")).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(tour).toHaveCount(0);
    expect(errors.page).toEqual([]);
    expect(errors.console).toEqual([]);
  });

  test("walks every step to the end and then hides the welcome for good", async ({ page }) => {
    await page.goto("/");
    await waitForScenarioHydration(page);
    const welcome = page.getByRole("region", { name: "New to MARGIN?" });
    await expect(welcome).toBeVisible();
    await welcome.getByRole("button", { name: "Take the tour" }).click();
    const tour = page.getByTestId("tour");
    for (let i = 0; i < 7; i++) await tour.getByRole("button", { name: "Next" }).click();
    await expect(tour).toHaveAttribute("data-step", "tools");
    await tour.getByRole("button", { name: "Start exploring" }).click();
    await expect(tour).toHaveCount(0);
    await expect(welcome).toBeHidden();
    await page.reload();
    await waitForScenarioHydration(page);
    await expect(page.getByRole("region", { name: "New to MARGIN?" })).toBeHidden();
  });

  test("the welcome can be dismissed without the tour", async ({ page }) => {
    await page.goto("/");
    await waitForScenarioHydration(page);
    await page.getByRole("button", { name: "Dismiss the welcome" }).click();
    await expect(page.getByRole("region", { name: "New to MARGIN?" })).toBeHidden();
    await page.reload();
    await expect(page.getByRole("region", { name: "New to MARGIN?" })).toBeHidden();
  });

  test("the tool rail opens the tour and closing returns focus to it", async ({ page }, info) => {
    test.skip(info.project.name === "mobile", "the tool rail is a desktop/tablet instrument");
    await page.goto("/");
    await waitForScenarioHydration(page);
    const btn = page.getByRole("button", { name: "Take the tour" }).last();
    await btn.click();
    const tour = page.getByTestId("tour");
    await expect(tour).toBeVisible();
    await tour.getByRole("button", { name: "Close the tour" }).click();
    await expect(tour).toHaveCount(0);
    await expect(btn).toBeFocused();
  });
});
