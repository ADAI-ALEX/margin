import { LAUNCH, chromium, URL, shot, measure, dom, frames, startSampler, getSamples, compress } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const S = process.argv[2]; const M = {}; const only = process.argv[3] ? process.argv[3].split(",") : null;
const b = await chromium.launch(LAUNCH);
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const step = async (name, fn) => { if (only && !only.includes(name)) return;
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: UA }); const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 }); await p.locator(".story-block .story-container").first().waitFor({ timeout: 60000 }); await p.waitForTimeout(7000);
  try { await fn(p); } catch (e) { M[name + "_error"] = e.message.slice(0, 300); console.log(name, "ERR", e.message.slice(0, 300)); } await ctx.close(); };

await step("home", async (p) => {
  M.home = await measure(p, { sheet: "article.featured-stories-panel", card: ".story-block .story-container", cardTitle: ".story-block .story-title > h2", cardMeta: ".story-block .story-subtitle", collapse: ".mobile-collapse-button", menuBtn: "button.menu-btn", appTitle: "nav.breadcrumb h1", planetText: ".pioneer-label-div.planet:not(.hidden):not(.hiddenByLabelQuadtree) .text", scText: ".pioneer-label-div.spacecraft:not(.hidden):not(.hiddenByLabelQuadtree) .text", planetLabel: ".pioneer-label-div.planet:not(.hidden):not(.hiddenByLabelQuadtree)", scLabel: ".pioneer-label-div.spacecraft:not(.hidden):not(.hiddenByLabelQuadtree)" });
});
await step("collapse", async (p) => {
  await startSampler(p, { sheet: "article.featured-stories-panel", content: "article.featured-stories-panel #content-body", time: "nav.c-menu-container", rail: ".settings.vertical", viewport: "#main-viewport" }, 2500);
  await p.locator(".mobile-collapse-button").tap();
  M.collapse = compress(await getSamples(p));
  await shot(p, "mobile-09-stories-collapsed");
  writeFileSync(`${S}/dom-mobile-collapsed.txt`, await dom(p, "#dynamic-ui", 6));
  M.collapsed = await measure(p, { sheet: "article.featured-stories-panel", expand: ".mobile-collapse-button, .mobile-expand-button, [aria-label*='xpand featured']", time: "nav.time-controls", rate: "nav.time-controls h3.rate", knob: "nav.time-controls .knob", rail: ".settings.vertical", railToggle: "button[aria-label='show or hide settings']", railInfo: "button[aria-label='show info panel']", live: "nav.clock-shortcut .text" });
  // time rate
  await p.locator("button[aria-label='Increase time rate']").tap().catch(() => {}); await p.waitForTimeout(300);
  await p.locator("button[aria-label='Increase time rate']").tap().catch(() => {}); await p.waitForTimeout(1000);
  await shot(p, "mobile-08-time-rate-increased");
  M.timeAfterRate = await p.evaluate(() => document.querySelector("nav.time-controls h3.rate")?.innerText);
  // rail toggle -> layers
  await p.locator("button[aria-label='show or hide settings']").tap(); await p.waitForTimeout(1500);
  await shot(p, "mobile-05a-rail-open");
  M.railOpen = await measure(p, { rail: ".settings.vertical", info: "button[aria-label='show info panel']", layers: "button[aria-label='toggle layers']", overlay: ".settings .overlay-bg" });
  await p.locator("button[aria-label='toggle layers']").tap(); await p.waitForTimeout(1500);
  await shot(p, "mobile-05b-layers-open");
  M.layers = await measure(p, { panel: ".layer-panel", li: ".layer-panel .layers li", liText: ".layer-panel .layers li span.text" });
});
await step("select", async (p) => {
  await p.locator(".mobile-collapse-button").tap(); await p.waitForTimeout(1500);
  const mars = p.locator(".pioneer-label-div.mars");
  M.marsBox = await mars.boundingBox();
  await mars.tap(); await p.waitForTimeout(900); await shot(p, "mobile-03a-select-mars-immediate");
  await p.waitForTimeout(3500); await shot(p, "mobile-03b-select-mars-settled");
  M.marsUrl = p.url();
  writeFileSync(`${S}/dom-mobile-mars.txt`, await dom(p, "#dynamic-ui", 7));
  M.marsPanel = await measure(p, { panel: "article.content-panel-container", title: "#overview-block .title", h5: ".content-panel-container h5.title", copy: ".content-panel-container .copy", expand: ".content-panel-container .expand-btn-group button" });
});
await step("spacecraft", async (p) => {
  await p.locator(".mobile-collapse-button").tap(); await p.waitForTimeout(1500);
  const sc = p.locator(".pioneer-label-div.sc_parker_solar_probe");
  await sc.tap({ force: true }); await p.waitForTimeout(4500); await shot(p, "mobile-04-select-spacecraft-settled"); M.scUrl = p.url();
});
await step("menu", async (p) => {
  await p.locator("button.menu-btn").tap(); await p.waitForTimeout(1300);
  await shot(p, "mobile-06-menu-open");
  M.menu = await measure(p, { container: ".mega-menu .menu-container", block: ".mega-menu .block", blockTitle: ".mega-menu .block button.title", search: ".mega-menu .search", share: ".mega-menu .share-button" });
  await p.locator(".mega-menu .search-open, .mega-menu .search .mag-open, .mega-menu .search").first().tap(); await p.waitForTimeout(800);
  M.searchFocus = await p.evaluate(() => document.activeElement.tagName);
  await p.locator(".mega-menu .search input").fill("Mars").catch(async () => { await p.keyboard.type("Mars"); });
  await p.waitForTimeout(1200);
  await shot(p, "mobile-07-search-mars");
  M.search = await measure(p, { input: ".mega-menu .search input", entry: ".mega-menu .search .result-div", results: ".mega-menu .search .results" });
});
await step("story", async (p) => {
  await p.locator(".story-block .story-container").first().tap(); await p.waitForTimeout(5000);
  await shot(p, "mobile-10-story-open"); M.storyUrl = p.url();
  M.story = await measure(p, { h2: "#dynamic-ui h2", slide: ".carousel-container .slide .container" });
});
writeFileSync(`${S}/m-m1.json`, JSON.stringify(M, null, 1));
await b.close();
