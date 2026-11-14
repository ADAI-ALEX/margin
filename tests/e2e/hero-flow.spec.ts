/**
 * The 30-second demo path on the Atlas (Kickoff §H.10, docs/submission/demo-script-30s.md).
 * Expected verdicts and D values come from the engine itself (helpers/engine.ts), so this
 * spec follows the data; the "demo narrative" assertions fail loudly if the data drifts
 * away from what the demo script says.
 */
import { test, expect, params, waitForScenarioHydration } from "./helpers/fixtures";
import { expectFor, presetScenario } from "./helpers/engine";

const EA_PSI = presetScenario("ea");
const EA_PUB = presetScenario("ea", { includePublished: true });
const EA_PUB_20 = presetScenario("ea", { includePublished: true, flowCmS: 20 });
const EA_MOON_PUB = presetScenario("ea", { includePublished: true, flowCmS: 20, gravity: "moon" });
const EA_MOON_PSI = presetScenario("ea", { includePublished: false, flowCmS: 20, gravity: "moon" });

/** data-d is written with toFixed(3). */
const D_TOL = 0.0011;

test.describe("hero flow (demo path)", () => {
  test("oracle: the engine still supports the demo narrative", () => {
    // If any of these fail, the demo script and submission text must be updated before recording.
    expect(expectFor(EA_PSI).verdict, "EA, PSI only, 10 cm/s").toBe("DISTANT");
    expect(expectFor(EA_PUB).verdict, "EA + published, 10 cm/s").toBe("DISTANT");
    expect(expectFor(EA_PUB).D!, "EA + published D (demo says 2.51)").toBeCloseTo(2.51, 2);
    expect(expectFor(EA_PUB_20).verdict, "EA + published, 20 cm/s").toBe("NEAR");
    expect(expectFor(EA_MOON_PSI).verdict, "EA, Moon, PSI only").toBe("NONE");
    expect(expectFor(EA_MOON_PUB).verdict, "EA, Moon, + published").toBe("DISTANT");
  });

  test("EA → DISTANT → published → flow 20 → Moon → specimen source", async ({ page, errors }) => {
    const verdict = page.getByTestId("verdict");
    const expectVerdict = async (exp: ReturnType<typeof expectFor>, label: string) => {
      await expect(verdict, label).toHaveAttribute("data-verdict", exp.verdict);
      if (exp.D == null) {
        await expect(verdict, `${label}: no D`).toHaveAttribute("data-d", "");
      } else {
        const d = Number(await verdict.getAttribute("data-d"));
        expect(Math.abs(d - exp.D), `${label}: data-d ${d} vs engine ${exp.D}`).toBeLessThanOrEqual(D_TOL);
      }
      // a partial match (an axis not compared) must be qualified on the verdict card
      await expect(page.getByTestId("verdict-qualifier"), `${label}: partial-match qualifier`).toHaveCount(exp.partial ? 1 : 0);
    };

    await page.goto("/");
    await waitForScenarioHydration(page);
    await expect(page.getByText("Evidence proximity, not a safety rating.").first()).toBeVisible();

    // 1. Exploration Atmosphere landmark
    await page.locator("select#atlas-preset").selectOption("ea");
    await expect.poll(() => params(page).get("preset")).toBe("ea");
    expect(params(page).get("o2")).toBe(String(EA_PSI.o2Pct));
    expect(params(page).get("p")).toBe(String(+EA_PSI.pressureKPa.toFixed(2)));
    expect(params(page).get("g")).toBe("micro");
    expect(params(page).has("pub")).toBe(false);
    await expectVerdict(expectFor(EA_PSI), "EA, PSI only");

    // 2. Include published evidence: still DISTANT at 10 cm/s
    const pub = page.getByRole("switch", { name: /Include published evidence/ });
    await pub.click();
    await expect(pub).toHaveAttribute("aria-checked", "true");
    await expect.poll(() => params(page).get("pub")).toBe("1");
    expect(params(page).get("u")).toBe("10");
    await expectVerdict(expectFor(EA_PUB), "EA + published, 10 cm/s");

    // 3. Flow 20 cm/s: a different scenario, not a correction
    await page.getByRole("radio", { name: "20 centimetres per second", exact: true }).click();
    await expect.poll(() => params(page).get("u")).toBe("20");
    await expectVerdict(expectFor(EA_PUB_20), "EA + published, 20 cm/s");

    // 4. Gravity: Moon
    await page.getByRole("radio", { name: "Lunar (0.165 g)", exact: true }).click();
    await expect.poll(() => params(page).get("g")).toBe("moon");
    await expectVerdict(expectFor(EA_MOON_PUB), "Moon + published");

    // the Moon plate in the regimes overview is the selected regime and shows no PSI tests
    // (redesign: the four regime plates moved from an always-visible strip into the overview, opened from the field tools)
    await page.getByRole("button", { name: "Regimes overview" }).click();
    await expect.poll(() => params(page).get("view")).toBe("overview");
    const sheets = page.getByTestId("gravity-sheets");
    await expect(sheets.getByRole("radio")).toHaveCount(4);
    const moonSheet = sheets.getByRole("radio", { name: /^Lunar \(0\.165 g\):/ });
    await expect(moonSheet).toHaveAttribute("aria-checked", "true");
    await expect(moonSheet).toContainText("No PSI tests");
    // Esc returns to the field; the scenario is untouched
    await page.keyboard.press("Escape");
    await expect(sheets).toHaveCount(0);
    expect(params(page).get("g")).toBe("moon");
    await expect(page.getByRole("heading", { name: /Partial gravity/ })).toBeVisible();

    // PSI-only at the Moon: NONE (toggle off, check, toggle back on)
    await pub.click();
    await expect.poll(() => params(page).has("pub")).toBe(false);
    await expectVerdict(expectFor(EA_MOON_PSI), "Moon, PSI only");
    await pub.click();
    await expect.poll(() => params(page).get("pub")).toBe("1");
    await expectVerdict(expectFor(EA_MOON_PUB), "Moon + published (again)");

    // 5. Nearest-test link → specimen card with a source link
    await page.getByTestId("field-notes").locator("button.atlas-runlink").first().click();
    const card = page.getByTestId("specimen-card");
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-run", expectFor(EA_MOON_PUB).nearestId!);
    const src = card.locator('a[href^="http"]').first();
    await expect(src).toBeVisible();
    expect(await src.getAttribute("href")).toMatch(/^https:\/\/(ntrs\.nasa\.gov|psi\.nasa\.gov|doi\.org)\//);

    // the final URL reproduces the whole state
    const p = params(page);
    expect({ o2: p.get("o2"), u: p.get("u"), g: p.get("g"), pub: p.get("pub"), h: p.get("h") })
      .toEqual({ o2: "34", u: "20", g: "moon", pub: "1", h: "materials" });

    expect(errors.page, "page errors").toEqual([]);
    expect(errors.console, "console errors").toEqual([]);
  });
});
