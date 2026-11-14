// Design research: capture reference sites (desktop + mobile) and measure type, colour and layout.
// Usage: node scripts/capture-references.mjs docs/design/research
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const out = process.argv[2];
const only = process.argv[3] ? new Set(process.argv[3].split(",")) : null;
const refs = [
  ["linear-home", "https://linear.app/"],
  ["linear-refresh", "https://linear.app/now/behind-the-latest-design-refresh"],
  ["owid-home", "https://ourworldindata.org/"],
  ["owid-entry-redesign", "https://ourworldindata.org/owid-entry-redesign"],
  ["owid-grapher", "https://ourworldindata.org/grapher/co2-emissions-per-capita"],
  ["nasa-eyes", "https://science.nasa.gov/eyes/"],
  ["jpl-d2d", "https://www.datavis.caltech.edu/"],
  ["jpl-d2d-projects", "https://d2d.caltech.edu/"],
  ["nasa-eyes-app", "https://eyes.nasa.gov/apps/solar-system/"],
  ["nasa-svs", "https://science.nasa.gov/sciact-team/scientific-visualization-studio/"],
];
const b = await chromium.launch();
const results = {};
for (const [name, url] of refs.filter(([n]) => !only || only.has(n))) {
  for (const [tag, w, h, mobile] of [["desktop", 1440, 900, false], ["mobile", 390, 844, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, userAgent: mobile ? undefined : undefined });
    const p = await ctx.newPage();
    try {
      await p.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await p.waitForTimeout(3500);
      await p.screenshot({ path: `${out}/${name}-${tag}.jpg`, type: "jpeg", quality: 70 });
      if (tag === "desktop") {
        await p.evaluate(() => window.scrollTo(0, innerHeight * 1.2)); await p.waitForTimeout(1200);
        await p.screenshot({ path: `${out}/${name}-${tag}-scroll.jpg`, type: "jpeg", quality: 70 });
        results[name] = await p.evaluate(() => {
          const cs = (el) => el ? getComputedStyle(el) : null;
          const pick = (el) => { const s = cs(el); return s && { font: s.fontFamily.split(",")[0].replace(/"/g, ""), size: s.fontSize, weight: s.fontWeight, lh: s.lineHeight, ls: s.letterSpacing, color: s.color, bg: s.backgroundColor }; };
          const fams = new Map();
          for (const el of document.querySelectorAll("body *")) { if (!el.childNodes.length || el.children.length > 3) continue; const f = getComputedStyle(el).fontFamily.split(",")[0].replace(/"/g, "").trim(); fams.set(f, (fams.get(f) || 0) + 1); }
          const colors = new Map();
          for (const el of Array.from(document.querySelectorAll("body *")).slice(0, 4000)) { const c = getComputedStyle(el).color; colors.set(c, (colors.get(c) || 0) + 1); }
          const nav = document.querySelector("header, nav");
          return {
            title: document.title,
            body: pick(document.body), html_bg: cs(document.documentElement).backgroundColor,
            h1: pick(document.querySelector("h1")), h2: pick(document.querySelector("h2")), p: pick(document.querySelector("main p, p")),
            a: pick(document.querySelector("main a, a")), button: pick(document.querySelector("button")),
            navHeight: nav ? Math.round(nav.getBoundingClientRect().height) : null,
            fonts: [...fams.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
            textColors: [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
            svgCount: document.querySelectorAll("svg").length, canvasCount: document.querySelectorAll("canvas").length,
            radius: Array.from(document.querySelectorAll("button, a, input, [class*=card], [class*=Card]")).slice(0, 80).map((e) => getComputedStyle(e).borderRadius).filter((r) => r !== "0px").slice(0, 8),
          };
        });
      }
    } catch (e) { results[name + "-" + tag + "-error"] = String(e).slice(0, 200); }
    await ctx.close();
  }
}
await b.close();
const file = `${out}/measurements${only ? "-extra" : ""}.json`;
writeFileSync(file, JSON.stringify(results, null, 1));
console.log(Object.keys(results).join("\n"));
