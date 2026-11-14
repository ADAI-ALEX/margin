// Visual QA capture: every primary route at four widths (first screen) + full-page desktop.
// Usage: node scripts/capture-routes.mjs <baseUrl> <outDir>
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const [, , base = "http://localhost:3000", out = "docs/design/qa/after"] = process.argv;
mkdirSync(out, { recursive: true });
const routes = [
  ["atlas", "/?preset=ea&pub=1"],
  ["atlas-moon", "/?preset=ea&pub=1&g=moon"],
  ["investigations", "/investigations?preset=ea&pub=1&cmp=PUB-SAFFIRE-IV-VI,PSI-25"],
  ["dossier", "/investigations/PSI-25"],
  ["method", "/method"],
  ["sources", "/sources"],
];
const widths = [[1440, 900], [1280, 800], [768, 1024], [390, 844]];
const b = await chromium.launch();
const report = [];
for (const [w, h] of widths) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
  for (const [name, path] of routes) {
    await p.goto(base + path, { waitUntil: "networkidle" });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/${name}-${w}.jpg`, type: "jpeg", quality: 72 });
    if (w === 1440) await p.screenshot({ path: `${out}/${name}-${w}-full.jpg`, type: "jpeg", quality: 60, fullPage: true });
    const ov = await p.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
    report.push({ w, name, overflowPx: ov, errors: errs.splice(0) });
  }
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(report.filter((r) => r.overflowPx > 1 || r.errors.length)));
console.log("captured", report.length, "views to", out);
