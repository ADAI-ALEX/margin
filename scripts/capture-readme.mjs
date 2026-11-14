// Captures the README screenshots of the running app at 2× device scale.
// usage: node scripts/capture-readme.mjs [baseUrl=http://localhost:3000] [outDir=docs/assets/screenshots]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "docs/assets/screenshots";
mkdirSync(out, { recursive: true });

const SHOTS = [
  { name: "atlas-hero", url: "/?preset=ea&pub=1", w: 1440, h: 900 },
  { name: "atlas-regimes-overview", url: "/?preset=ea&pub=1&u=20&view=overview", w: 1440, h: 900 },
  { name: "atlas-moon-partial-gravity", url: "/?preset=ea&g=moon&pub=1&u=20", w: 1440, h: 900 },
  { name: "atlas-run-inspector", url: "/?preset=ea&pub=1", w: 1440, h: 900, act: async (p) => { await p.getByTestId("field-notes").locator("button.atlas-runlink").first().click(); } },
  { name: "investigations-compare", url: "/investigations?preset=ea&o2=34&p=56.5&u=10&g=micro&h=materials&pub=1", w: 1440, h: 900, act: async (p) => {
    const rows = p.getByTestId("ladder-row");
    await rows.nth(0).getByTestId("pin-toggle").click();
    await rows.nth(1).getByTestId("pin-toggle").click();
  } },
  { name: "investigations-provenance", url: "/investigations?preset=ea&o2=34&p=56.5&u=10&g=micro&h=materials&pub=1", w: 1440, h: 900, act: async (p) => {
    const ledger = p.getByTestId("claim-ledger");
    await ledger.scrollIntoViewIfNeeded();
    await ledger.getByRole("button", { name: /^(PSI-\d+:|PUB-|PLAN-)/ }).first().click();
  } },
  { name: "dossier-bass-ii", url: "/investigations/PSI-25", w: 1440, h: 900 },
  { name: "method", url: "/method", w: 1440, h: 900 },
  { name: "atlas-mobile", url: "/?preset=ea&pub=1", w: 390, h: 844 },
];

const browser = await chromium.launch();
for (const s of SHOTS) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(base + s.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  if (s.act) { await s.act(page); await page.waitForTimeout(600); }
  await page.mouse.move(0, s.h - 1);
  await page.screenshot({ path: `${out}/${s.name}.png` });
  console.log(`${out}/${s.name}.png`);
  await ctx.close();
}
await browser.close();
