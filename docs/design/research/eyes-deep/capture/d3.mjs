import { LAUNCH, chromium, open, shot, measure, dom, frames, startSampler, getSamples, compress } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const S = process.argv[2]; const M = {}; const only = process.argv[3] ? process.argv[3].split(",") : null;
const b = await chromium.launch(LAUNCH);
const step = async (name, fn) => { if (only && !only.includes(name)) return; const { ctx, p } = await open(b); try { await fn(p); } catch (e) { M[name + "_error"] = e.message.slice(0, 300); console.log(name, "ERR", e.message.slice(0, 300)); } await ctx.close(); };

await step("detailseq", async (p) => {
  await p.locator(".pioneer-label-div.mars").click(); await p.waitForTimeout(4000);
  M.detailCollapseFrames = await frames(p, "desktop-11-detail-collapse-seq", 6, 80, () => p.locator("button[aria-label='Collapse content panel']").click());
  await p.waitForTimeout(1000);
  M.detailExpandFrames = await frames(p, "desktop-11b-detail-expand-seq", 6, 80, () => p.locator("button[aria-label='Expand content panel']").click());
});

await step("spacecraft", async (p) => {
  const sc = p.locator(".pioneer-label-div.sc_parker_solar_probe");
  await sc.hover(); await p.waitForTimeout(500);
  M.scHover = await measure(p, { label: ".pioneer-label-div.sc_parker_solar_probe", text: ".pioneer-label-div.sc_parker_solar_probe .text", icon: ".pioneer-label-div.sc_parker_solar_probe .icon" });
  await shot(p, "desktop-04a-hover-spacecraft");
  await sc.click(); await p.waitForTimeout(800); await shot(p, "desktop-04b-select-spacecraft-immediate");
  await p.waitForTimeout(4000); await shot(p, "desktop-04c-select-spacecraft-settled");
  M.scUrl = p.url();
  writeFileSync(`${S}/dom-sc.txt`, await dom(p, "article.content-panel-container", 14));
  M.scPanel = await measure(p, { title: "#overview-block .title", subtitle: "#overview-block .subtitle", h5: ".content-panel-container h5.title", copy: ".content-panel-container .copy", visibleLabels: ".pioneer-label-div:not(.hidden):not(.hiddenByLabelQuadtree) .text" });
});

await step("layers", async (p) => {
  const btn = p.locator("button[aria-label='toggle layers']");
  await btn.hover(); await p.waitForTimeout(1200);
  await shot(p, "desktop-05a-rail-hover-layers");
  M.railHover = { title: await btn.getAttribute("title"), tooltipEls: await p.evaluate(() => [...document.querySelectorAll("[role=tooltip], .tooltip, [class*=tooltip]")].filter(e => e.getBoundingClientRect().width > 0).map(e => ({ cls: e.className, t: e.innerText.slice(0, 40) }))), btn: await measure(p, { b: "button[aria-label='toggle layers']", icon: "button[aria-label='toggle layers']" }) };
  M.railHoverStyle = await p.evaluate(() => { const e = document.querySelector("button[aria-label='toggle layers']"); const s = getComputedStyle(e); const sp = getComputedStyle(e, "::after"); return { bg: s.backgroundColor, bgImg: s.backgroundImage.slice(0, 80), opacity: s.opacity, filter: s.filter, cursor: s.cursor, after: sp.content }; });
  await startSampler(p, { lp: ".layer-panel" }, 1500);
  await btn.click();
  M.layersOpen = compress(await getSamples(p));
  await p.waitForTimeout(600);
  await shot(p, "desktop-05b-layers-open");
  writeFileSync(`${S}/dom-layers.txt`, await dom(p, ".layer-panel", 10));
  M.layers = await measure(p, { panel: ".layer-panel", header: ".layer-panel .header", title: ".layer-panel .header h3, .layer-panel .header span, .layer-panel .header", li: ".layer-panel .layers li", liActive: ".layer-panel .layers li.active", liText: ".layer-panel .layers li span:not(.checkbox)", checkbox: ".layer-panel .layers li span.checkbox", close: ".layer-panel button, .layer-panel .icon-close" });
  await p.keyboard.press("Escape"); await p.waitForTimeout(800);
  M.layersEsc = await p.evaluate(() => { const e = document.querySelector(".layer-panel"); return e ? { cls: e.className, visible: e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none" } : "gone"; });
});

await step("menu", async (p) => {
  await startSampler(p, { menu: ".mega-menu .menu-container", wrap: ".mega-menu .content-wrapper" }, 1800);
  await p.locator("button.menu-btn").click();
  M.menuOpen = compress(await getSamples(p));
  await shot(p, "desktop-06-menu-open");
  M.menu = await measure(p, { container: ".mega-menu .menu-container", wrap: ".mega-menu .content-wrapper", header: ".mega-menu .menu-header", blockTitle: ".mega-menu .block button.title", link: ".mega-menu .link-container", linkText: ".mega-menu .link-container *", azLink: ".mega-menu .az-link", close: ".mega-menu .close-button" });
  M.menuMask = await p.evaluate(() => { const s = getComputedStyle(document.querySelector(".mega-menu .content-wrapper")); return { mask: s.webkitMaskImage || s.maskImage, maskSize: s.webkitMaskSize || s.maskSize }; });
  await p.keyboard.press("Escape"); await p.waitForTimeout(1000);
  M.menuEsc = await p.evaluate(() => document.querySelector(".mega-menu .menu-container").className);
  await shot(p, "desktop-06b-menu-after-escape");
});

await step("search", async (p) => {
  await startSampler(p, { search: "div.search", input: "div.search input" }, 1500);
  await p.locator(".search .mag-open").click();
  M.searchOpen = compress(await getSamples(p));
  await p.waitForTimeout(500);
  await shot(p, "desktop-07a-search-open");
  M.searchFocus = await p.evaluate(() => ({ tag: document.activeElement.tagName, cls: document.activeElement.className, ph: document.activeElement.placeholder }));
  writeFileSync(`${S}/dom-search-open.txt`, await dom(p, "div.search", 10));
  M.searchEmpty = await measure(p, { wrap: "div.search", bar: "div.search .bar", input: "div.search input", featured: "div.search .featured", featuredLi: "div.search .featured li", info: "div.search span.search-info", cover: "div.search .cover", close: "div.search .mag-close, div.search .icon-close" });
  await p.keyboard.type("Mars", { delay: 60 }); await p.waitForTimeout(1200);
  await shot(p, "desktop-07b-search-mars");
  writeFileSync(`${S}/dom-search-mars.txt`, await dom(p, "div.search", 12));
  M.searchMars = await measure(p, { results: "div.search .results", entry: "div.search .result-div, div.search .results li", entryText: "div.search .results .entries *" });
  M.searchResultsText = await p.evaluate(() => document.querySelector("div.search .results")?.innerText.slice(0, 300));
  await p.keyboard.press("ArrowDown"); await p.waitForTimeout(300);
  M.searchArrow = await p.evaluate(() => ({ active: document.activeElement.tagName + "." + document.activeElement.className, highlighted: [...document.querySelectorAll("div.search .active, div.search .selected, div.search .highlighted, div.search .focused")].map(e => e.className + ":" + e.innerText.slice(0, 30)) }));
  await shot(p, "desktop-07c-search-arrowdown");
  await p.keyboard.press("Escape"); await p.waitForTimeout(1000);
  M.searchEsc = await p.evaluate(() => ({ cls: document.querySelector("div.search").className, val: document.querySelector("div.search input")?.value, active: document.activeElement.tagName }));
  await shot(p, "desktop-07d-search-after-escape");
});

await step("time", async (p) => {
  const nav = p.locator("nav.time-controls"); await nav.hover(); await p.waitForTimeout(800);
  await shot(p, "desktop-08a-time-hover");
  M.timeHover = await measure(p, { rate: "nav.time-controls h3.rate", rateControls: "nav.time-controls .rate-controls", inc: "button[aria-label='Increase time rate']", dec: "button[aria-label='Decrease time rate']", pause: "button[aria-label='Pause or play']", knob: "nav.time-controls .knob", slider: "#time-slider-input" });
  for (let i = 0; i < 3; i++) { await p.locator("button[aria-label='Increase time rate']").click(); await p.waitForTimeout(250); }
  await p.waitForTimeout(800);
  await shot(p, "desktop-08b-time-rate-increased");
  M.timeAfterRate = await p.evaluate(() => ({ rate: document.querySelector("nav.time-controls h3.rate").innerText, live: document.querySelector("nav.clock-shortcut")?.innerText, liveCls: document.querySelector("nav.clock-shortcut")?.className, navCls: document.querySelector("nav.time-controls").className }));
  M.timeAfterRateStyle = await measure(p, { rate: "nav.time-controls h3.rate", live: "nav.clock-shortcut .text", liveIcon: "nav.clock-shortcut .icon" });
  // drag knob
  const k = await p.locator("nav.time-controls .knob").boundingBox();
  await p.mouse.move(k.x + k.width / 2, k.y + k.height / 2); await p.mouse.down();
  for (let i = 1; i <= 10; i++) { await p.mouse.move(k.x + k.width / 2 + i * 12, k.y + k.height / 2 - i * 1.5); await p.waitForTimeout(40); }
  await p.waitForTimeout(400);
  await shot(p, "desktop-08c-time-knob-dragging");
  M.timeDragging = await p.evaluate(() => ({ rate: document.querySelector("nav.time-controls h3.rate").innerText, date: document.querySelector("time.clock").innerText.replace(/\n/g, " "), knob: document.querySelector("nav.time-controls .knob").getBoundingClientRect().x, slider: document.querySelector("#time-slider-input").value, sliderMin: document.querySelector("#time-slider-input").min, sliderMax: document.querySelector("#time-slider-input").max, step: document.querySelector("#time-slider-input").step }));
  await p.mouse.up(); await p.waitForTimeout(1000);
  M.timeAfterDrag = await p.evaluate(() => ({ rate: document.querySelector("nav.time-controls h3.rate").innerText, knob: Math.round(document.querySelector("nav.time-controls .knob").getBoundingClientRect().x), live: document.querySelector("nav.clock-shortcut")?.innerText, slider: document.querySelector("#time-slider-input").value }));
  await shot(p, "desktop-08d-time-after-drag");
  // keyboard on slider
  await p.locator("#time-slider-input").focus(); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(500);
  M.timeSliderArrow = await p.evaluate(() => ({ active: document.activeElement.id, rate: document.querySelector("nav.time-controls h3.rate").innerText, slider: document.querySelector("#time-slider-input").value, ariaValue: document.querySelector("#time-slider-input").getAttribute("aria-valuetext"), aria: document.querySelector("#time-slider-input").getAttribute("aria-label"), label: document.querySelector("label.knob")?.getAttribute("for") }));
});

await step("story", async (p) => {
  await p.locator(".story-block .story-container").first().hover(); await p.waitForTimeout(500);
  await shot(p, "desktop-10a-story-card-hover");
  M.storyHover = await measure(p, { card: ".story-block .story-container", ext: ".story-block .story-container .icon-external" });
  const t = await p.locator(".story-block .story-container").first().innerText();
  await p.locator(".story-block .story-container").first().click(); await p.waitForTimeout(1200);
  await shot(p, "desktop-10b-story-open-immediate");
  await p.waitForTimeout(4000);
  await shot(p, "desktop-10c-story-open-settled");
  M.storyOpen = { card: t, url: p.url() };
  writeFileSync(`${S}/dom-story-open.txt`, await dom(p, "#dynamic-ui", 9));
  M.storyPanel = await measure(p, { overlay: ".overlay-container .overlay.active", storyPanel: "#panel-container, .story-panel, article.content-panel", h1: "#dynamic-ui h1", h2: "#dynamic-ui h2", h3: "#dynamic-ui h3", h4: "#dynamic-ui h4", p: "#dynamic-ui p", btn: "#dynamic-ui button.next, #dynamic-ui .navigation-button", carousel: ".carousel-container", slide: ".carousel-container .slide .container" });
  await p.keyboard.press("ArrowRight"); await p.waitForTimeout(1500);
  M.storyArrow = { url: p.url() };
  await shot(p, "desktop-10d-story-after-arrowright");
  await p.keyboard.press("Escape"); await p.waitForTimeout(1000); M.storyEsc = { url: p.url() };
});

writeFileSync(`${S}/m-d3${only ? "-" + only.join("_") : ""}.json`, JSON.stringify(M, null, 1));
await b.close();
