import { test as base, expect, type Page } from "@playwright/test";

/** Console messages that are dev-server noise rather than application errors. */
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[HMR\]/,
  /\[Fast Refresh\]/,
];

export interface PageErrors {
  console: string[];
  page: string[];
}

/**
 * `errors` collects console errors and uncaught page errors for the test's page.
 * Specs assert on it explicitly (so a failure names the route and the message).
 */
export const test = base.extend<{ errors: PageErrors }>({
  errors: async ({ page }, provide) => {
    const errors: PageErrors = { console: [], page: [] };
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
      errors.console.push(text);
    });
    page.on("pageerror", (err) => errors.page.push(`${err.name}: ${err.message}`));
    await provide(errors);
  },
});

export { expect };

/**
 * Scenario pages hydrate the URL in an effect and then write the canonical query back
 * (`?…o2=…&p=…`). Waiting for that write means the client is interactive and
 * subsequent clicks are not overwritten by hydration.
 */
export async function waitForScenarioHydration(page: Page) {
  await page.waitForLoadState("load");
  // The canonical query (finite o2/p, u numeric or "q", known g/h) only exists once the client has
  // parsed, clamped and re-serialised the scenario. A hostile URL is never canonical before that.
  await expect.poll(() => isCanonicalScenario(new URL(page.url()).searchParams), { message: "canonical scenario query written after hydration" }).toBe(true);
  // Let React attach handlers and the router initialise before the test clicks anything.
  await page.waitForLoadState("networkidle");
}

export function isCanonicalScenario(p: URLSearchParams) {
  const num = (k: string) => p.get(k) != null && p.get(k) !== "" && Number.isFinite(Number(p.get(k)));
  const u = p.get("u");
  return num("o2") && num("p") && (u === "q" || num("u")) &&
    ["micro", "moon", "mars", "earth"].includes(p.get("g") ?? "") &&
    ["materials", "smoke", "suppression", "liquid"].includes(p.get("h") ?? "");
}

export function params(page: Page) {
  return new URL(page.url()).searchParams;
}

/** Visible text of the page, with the site footer optionally excluded. */
export async function visibleText(page: Page, opts: { excludeFooter?: boolean } = {}) {
  return page.evaluate((excludeFooter) => {
    if (!excludeFooter) return document.body.innerText;
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("footer.site-footer").forEach((f) => f.remove());
    // innerText needs layout; fall back to textContent for the detached clone.
    return clone.textContent ?? "";
  }, opts.excludeFooter ?? false);
}

export async function hasHorizontalScroll(page: Page) {
  return page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return { scrollWidth: el.scrollWidth, innerWidth: window.innerWidth, overflow: el.scrollWidth > window.innerWidth + 1 };
  });
}
