/**
 * Every route renders (Kickoff §H.10): HTTP 200, an <h1>, no console or page errors,
 * and no horizontal scroll (the mobile project runs at 390 px).
 */
import { test, expect, hasHorizontalScroll } from "./helpers/fixtures";
import { ALL_INVESTIGATIONS } from "./helpers/engine";

const STATIC_ROUTES = ["/", "/investigations", "/method", "/sources", "/guide"];
const DOSSIERS = ALL_INVESTIGATIONS.map((i) => `/investigations/${encodeURIComponent(i.id)}`);

for (const route of [...STATIC_ROUTES, ...DOSSIERS]) {
  test(`route ${route}`, async ({ page, errors }) => {
    const res = await page.goto(route, { waitUntil: "load" });
    expect(res?.status(), `${route} status`).toBe(200);
    await expect(page.locator("h1").first(), `${route} has an h1`).toBeVisible();
    await page.waitForLoadState("networkidle");

    const scroll = await hasHorizontalScroll(page);
    expect(scroll.overflow, `${route}: scrollWidth ${scroll.scrollWidth} > innerWidth ${scroll.innerWidth}`).toBe(false);

    expect(errors.page, `${route} page errors`).toEqual([]);
    expect(errors.console, `${route} console errors`).toEqual([]);
  });
}

test("unknown dossier id is not found, not a crash", async ({ page, errors }, info) => {
  const res = await page.goto("/investigations/PSI-99999");
  await page.waitForLoadState("networkidle");
  if (res?.status() !== 404) {
    // Cache Components + Suspense streams the shell before notFound() runs, so the status can be 200
    // ("soft 404"). Accept it only if the page says so and is not indexable.
    info.annotations.push({ type: "soft-404", description: `HTTP ${res?.status()} for an unknown id` });
    await expect(page).toHaveTitle(/not (be )?found|404/i);
    expect(await page.locator('meta[name="robots"][content*="noindex"]').count()).toBeGreaterThan(0);
  }
  await expect(page.getByTestId("dossier")).toHaveCount(0);
  expect(errors.page).toEqual([]);
});
