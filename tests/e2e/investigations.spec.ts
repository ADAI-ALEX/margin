/**
 * Investigations ladder, compare tray and dossiers (Kickoff §B.1 P0-8, §B.2 P1-4).
 * Test hooks (data-testid) agreed with the frontend workstream:
 *   ladder, ladder-row[data-inv], pin-toggle, compare-tray, claim-ledger, provenance, flow-sensitivity,
 *   dossier[data-inv], fingerprint, run-table, dossier-chart
 */
import { test, expect, params, waitForScenarioHydration } from "./helpers/fixtures";
import { PSI_INVESTIGATIONS } from "./helpers/engine";

const SCENARIO = "preset=ea&o2=34&p=56.5&u=10&g=micro&h=materials&pub=1";

test.describe("investigations ladder", () => {
  test("ladder, claim ledger, provenance and flow sensitivity render", async ({ page, errors }) => {
    await page.goto(`/investigations?${SCENARIO}`);
    await waitForScenarioHydration(page);
    await expect(page.getByTestId("ladder")).toBeVisible();
    const rows = page.getByTestId("ladder-row");
    expect(await rows.count()).toBeGreaterThanOrEqual(5);
    // every row names its investigation
    for (const id of await rows.evaluateAll((els) => els.map((e) => e.getAttribute("data-inv")))) expect(id).toMatch(/^(PSI-\d+|PUB-|PLAN-)/);
    await expect(page.getByTestId("claim-ledger")).toBeVisible();
    await expect(page.getByTestId("flow-sensitivity")).toBeVisible();
    // provenance opens on demand from a run id in the claim ledger and shows the source link
    await page.getByTestId("claim-ledger").getByRole("button", { name: /^(PSI-\d+:|PUB-|PLAN-)/ }).first().click();
    const prov = page.getByTestId("provenance");
    await expect(prov).toBeVisible();
    await expect(prov.locator('a[href^="http"]').first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(prov).toBeHidden();
    await expect(page.getByText("Evidence proximity, not a safety rating.").first()).toBeVisible();
    expect(errors.page).toEqual([]);
    expect(errors.console).toEqual([]);
  });

  test("ranking sanity (Kickoff §C.8): EA + materials + published puts Saffire and BASS-II near the top, CFI-G/SPICE not in the top 5", async ({ page }) => {
    await page.goto(`/investigations?${SCENARIO}`);
    await waitForScenarioHydration(page);
    const ids = await page.getByTestId("ladder-row").evaluateAll((els) => els.map((e) => e.getAttribute("data-inv") ?? ""));
    const top5 = ids.slice(0, 5);
    expect(top5, "CFI-G (PSI-159) must not be in the top 5").not.toContain("PSI-159");
    expect(top5, "SPICE (PSI-107) must not be in the top 5").not.toContain("PSI-107");
    const top3 = ids.slice(0, 3);
    expect(top3.some((id) => /SAFFIRE|PSI-9[89]|PSI-100|PSI-25|BASS/i.test(id)), `top 3: ${top3.join(", ")}`).toBe(true);
  });

  test("pinning two investigations writes cmp= and a reload restores the tray", async ({ page, errors }) => {
    await page.goto(`/investigations?${SCENARIO}`);
    await waitForScenarioHydration(page);
    const rows = page.getByTestId("ladder-row");
    const a = (await rows.nth(0).getAttribute("data-inv"))!;
    const b = (await rows.nth(1).getAttribute("data-inv"))!;
    await rows.nth(0).getByTestId("pin-toggle").click();
    await rows.nth(1).getByTestId("pin-toggle").click();

    await expect.poll(() => params(page).get("cmp") ?? "").toContain(a);
    expect(params(page).get("cmp")).toContain(b);
    // the scenario survives alongside cmp
    expect(params(page).get("o2")).toBe("34");

    const tray = page.getByTestId("compare-tray");
    await expect(tray).toBeVisible();

    const before = new URL(page.url());
    await page.reload();
    await waitForScenarioHydration(page);
    expect(params(page).get("cmp")).toBe(before.searchParams.get("cmp"));
    await expect(page.getByTestId("compare-tray")).toBeVisible();
    // the pinned rows are still pinned
    for (const id of [a, b]) {
      const toggle = page.locator(`[data-testid="ladder-row"][data-inv="${id}"]`).getByTestId("pin-toggle");
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
    }
    expect(errors.page).toEqual([]);
  });
});

test.describe("dossiers", () => {
  for (const inv of PSI_INVESTIGATIONS) {
    test(`dossier ${inv.id} (${inv.acronym})`, async ({ page, errors }) => {
      const res = await page.goto(`/investigations/${inv.id}`);
      expect(res?.status()).toBe(200);
      const dossier = page.getByTestId("dossier");
      await expect(dossier).toBeVisible();
      await expect(dossier).toHaveAttribute("data-inv", inv.id);
      await expect(page.getByTestId("fingerprint")).toBeVisible();
      if (inv.hasRunTable) {
        await expect(page.getByTestId("run-table")).toBeVisible();
        expect(await page.getByTestId("run-table").locator("tbody tr").count()).toBeGreaterThan(0);
      } else {
        // investigations without a per-run table say so explicitly (P0-8); summary rows may be shown, labelled as such
        await expect(page.getByText(/summary rows only|not individual runs|no (experimental|run)[- ]table|not have a run table|no run-level|no per-run/i).first()).toBeVisible();
      }
      // PSI landing page / DOI is linked
      await expect(page.locator(`a[href*="psi.nasa.gov"], a[href*="doi.org/${inv.doi ?? "__none__"}"]`).first()).toBeVisible();
      expect(errors.page).toEqual([]);
      expect(errors.console).toEqual([]);
    });
  }

  // P0-8: one native chart for FLEX, CFI-G and BASS-II at minimum.
  for (const id of ["PSI-69", "PSI-159", "PSI-25"]) {
    test(`dossier chart ${id}`, async ({ page }) => {
      await page.goto(`/investigations/${id}`);
      const chart = page.getByTestId("dossier-chart").first();
      await expect(chart).toBeVisible();
      expect(await chart.locator("svg circle, svg rect, svg path, svg polygon").count()).toBeGreaterThan(0);
    });
  }
});
