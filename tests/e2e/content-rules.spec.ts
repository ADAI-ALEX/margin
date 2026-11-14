/**
 * Rendered-text and rendered-DOM rules (Kickoff §B.4, §C.7, §H.8, §H.12).
 * The static counterpart is scripts/lint-claims.mjs (source text); this checks what users see.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, visibleText } from "./helpers/fixtures";
import { ALL_INVESTIGATIONS } from "./helpers/engine";

const ROUTES = ["/", "/?preset=ea&g=moon&pub=1", "/investigations", "/investigations?g=moon&pub=1", "/method", "/sources",
  ...ALL_INVESTIGATIONS.slice(0, 3).map((i) => `/investigations/${i.id}`), "/investigations/PSI-159", "/investigations/PSI-25"];

/** Banned in visible text, case-insensitive. Rule ids match scripts/lint-claims.mjs (and its allow-list). */
const BANNED: { id: string; re: RegExp; why: string }[] = [
  { id: "safe", re: /(?<![\w-])safe\b(?!-)/i, why: "'safe' as a product judgement (B.4)" },
  { id: "unsafe", re: /\bunsafe\b/i, why: "'unsafe' as a product judgement (B.4)" },
  { id: "risk-score", re: /risk score/i, why: "risk score (B.4)" },
  { id: "fire-risk", re: /fire risk/i, why: "fire risk index (B.4)" },
  { id: "safety-score", re: /safety score/i, why: "safety score (B.4)" },
  { id: "certify", re: /certif(y|ied)\b/i, why: "certification claim (B.4)" },
  // "under-predict" / "over-predict" describe a test method's bias (BASS-II), not MARGIN predicting.
  { id: "predicts", re: /(?<!(under|over)-)predicts? (fire|flammab)/i, why: "prediction claim (B.4)" },
  { id: "run-count-2700", re: /\b2,?700\b/, why: "wrong PSI run count; use snapshot counts.totalRuns" },
];

/** Reviewed exceptions shared with the static lint (verbatim NASA quotations etc.). */
const ALLOW: { text: string; rule: string }[] = JSON.parse(readFileSync(join(process.cwd(), "scripts", "claims-allowlist.json"), "utf8")).entries;

/**
 * A disclaimer that negates the term is required wording, not a claim
 * (e.g. "It does not predict fire behaviour, … certify an environment", or a list under "D is not:").
 * Allowed when a negation precedes the match since the last full stop (at most 300 characters back).
 */
const NEGATION = /\b(not|never|no|nor|neither|without|cannot|can't|doesn't|does not|do not|did not|isn't|refuses?|won't)\b/i;
function sentenceBefore(text: string, idx: number) {
  const from = Math.max(0, idx - 300);
  const head = text.slice(from, idx);
  const cut = Math.max(head.lastIndexOf(". "), head.lastIndexOf(".\n"), head.lastIndexOf("? "), head.lastIndexOf("! "));
  return head.slice(cut >= 0 ? cut : 0);
}

for (const route of ROUTES) {
  test(`banned claims absent: ${route}`, async ({ page }, info) => {
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
    const text = await visibleText(page);
    const hits: string[] = [];
    const excused: string[] = [];
    for (const { id, re, why } of BANNED) {
      const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
      for (const m of text.matchAll(g)) {
        const ctx = text.slice(Math.max(0, m.index! - 80), m.index! + m[0].length + 40).replace(/\s+/g, " ");
        const wide = text.slice(Math.max(0, m.index! - 300), m.index! + 300);
        if (ALLOW.some((a) => a.rule === id && wide.includes(a.text))) excused.push(`allow-list: ${m[0]} … ${ctx}`);
        else if (NEGATION.test(sentenceBefore(text, m.index!))) excused.push(`negated: ${m[0]} (${why}) … ${ctx}`);
        else hits.push(`"${m[0]}" — ${why}\n    … ${ctx} …`);
      }
    }
    if (excused.length) await info.attach("excused-occurrences.txt", { body: excused.join("\n"), contentType: "text/plain" });
    expect(hits, `${route}: banned phrases in visible text`).toEqual([]);
  });
}

for (const route of ["/", "/investigations"]) {
  test(`disclaimer present in the main content: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    // must appear outside the global footer too (verdict card / claim ledger, P0-6)
    const main = await visibleText(page, { excludeFooter: true });
    expect(main).toContain("Evidence proximity, not a safety rating");
  });
}

test.describe("gravity is categorical", () => {
  for (const route of ["/", "/investigations"]) {
    test(`no gravity slider, gravity is a 4-option radiogroup: ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      // no range input may control gravity
      const ranges = await page.locator('input[type="range"]').evaluateAll((els) =>
        els.map((el) => {
          const id = el.id;
          const lab = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent ?? "" : "";
          const by = (el.getAttribute("aria-labelledby") ?? "").split(/\s+/).map((x) => document.getElementById(x)?.textContent ?? "").join(" ");
          return [el.getAttribute("name"), el.getAttribute("aria-label"), lab, by, el.closest("label")?.textContent].join(" ");
        }));
      for (const name of ranges) expect(name, "a range input must not control gravity").not.toMatch(/gravit|\bg[- ]?level|lunar|moon|mars/i);

      // the gravity control is a radiogroup whose options are exactly the four regimes
      const groups = page.getByRole("radiogroup").filter({ has: page.getByRole("radio", { name: /Lunar|Moon/ }) });
      expect(await groups.count()).toBeGreaterThanOrEqual(1);
      const first = groups.first();
      expect(await first.getByRole("radio").count()).toBe(4);
    });
  }

  test("gravity radiogroup is operable by arrow keys", async ({ page }) => {
    await page.goto("/?preset=iss");
    await expect.poll(() => new URL(page.url()).searchParams.has("o2")).toBe(true);
    const micro = page.getByRole("radio", { name: "Microgravity", exact: true });
    await micro.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Lunar (0.165 g)", exact: true })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: "Lunar (0.165 g)", exact: true })).toBeFocused();
    await expect.poll(() => new URL(page.url()).searchParams.get("g")).toBe("moon");
  });

  for (const route of ["/?preset=ea&g=moon&pub=1", "/investigations?preset=ea&g=moon&pub=1"]) {
    test(`partial-gravity plot is points only: ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      expect(await page.locator("[data-connector]").count(), "no data-connector elements anywhere").toBe(0);

      // the Olson & Ferkul Table I dot plot(s)
      const plots = page.locator('svg[role="img"][aria-label*="ULOI"]');
      expect(await plots.count(), "partial-g dot plot rendered").toBeGreaterThanOrEqual(1);
      const report = await plots.evaluateAll((svgs) =>
        svgs.map((svg) => {
          const paths = svg.querySelectorAll("path, polyline").length;
          // a connector between g-levels would be a non-vertical line longer than a tick
          const connectors = Array.from(svg.querySelectorAll("line")).filter((l) => {
            const x1 = +l.getAttribute("x1")!, x2 = +l.getAttribute("x2")!, y1 = +l.getAttribute("y1")!, y2 = +l.getAttribute("y2")!;
            return Math.abs(x2 - x1) > 0.5 && Math.hypot(x2 - x1, y2 - y1) > 8;
          }).length;
          const marks = svg.querySelectorAll("circle, rect:not([class*='Sel']):not([class*='sel']), polygon").length;
          return { paths, connectors, marks };
        }));
      for (const r of report) {
        expect(r.paths, "no <path>/<polyline> in the partial-g plot").toBe(0);
        expect(r.connectors, "no line connecting gravity levels").toBe(0);
        // Olson & Ferkul Table I: 3 materials × 4 g-levels = 12 points
        expect(r.marks).toBeGreaterThanOrEqual(12);
      }
    });
  }
});

test("no NASA insignia images are served", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const srcs = await page.locator("img, image, link[rel*='icon']").evaluateAll((els) =>
    els.map((e) => e.getAttribute("src") ?? e.getAttribute("href") ?? e.getAttribute("xlink:href") ?? ""));
  for (const s of srcs) expect(s).not.toMatch(/nasa|meatball|worm|insignia|logo/i);
});
