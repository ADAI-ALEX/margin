import { defineConfig, devices } from "@playwright/test";

/**
 * MARGIN end-to-end tests (Kickoff Pack §H.10).
 *
 * Target: PLAYWRIGHT_BASE_URL (default http://localhost:3000). Locally this reuses the dev server
 * that is already running; in CI the e2e job builds, runs `next start` and sets the base URL.
 * Against production: PLAYWRIGHT_BASE_URL=https://<prod> npx playwright test --project=desktop
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(baseURL);

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The dev server compiles routes on first hit; keep parallelism modest so it is not swamped.
  workers: process.env.CI ? 2 : 3,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Deterministic, motion-free rendering; also covers the prefers-reduced-motion requirement.
    reducedMotion: "reduce",
    locale: "en-GB",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: isLocal
    ? {
        command: "npm run dev",
        // Probe the port, not a page: a route that 404s/500s mid-edit must not make Playwright start a second server.
        port: Number(new URL(baseURL).port || 80),
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
