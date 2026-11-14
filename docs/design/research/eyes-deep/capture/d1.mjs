import { LAUNCH, chromium, open, shot, measure, dom, frames } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const S = process.argv[2]; const M = {};
const b = await chromium.launch(LAUNCH);
const { p } = await open(b);
await shot(p, "desktop-01-home");
M.home = await measure(p, {
  storyPanel: "article.featured-stories-panel", storyHeader: ".featured-stories-title", collapseBtn: ".desktop-collapse-button",
  storyCard: ".story-block .story-container", storyCardTitle: ".story-block .story-title > h2", storyCardMeta: ".story-block .story-subtitle", storyIcon: ".story-block .story-icon",
  planetLabelText: ".pioneer-label-div.planet:not(.hidden):not(.hiddenByLabelQuadtree) .text", planetLabel: ".pioneer-label-div.planet:not(.hidden):not(.hiddenByLabelQuadtree)",
  sunLabelText: ".pioneer-label-div.sun .text",
  scLabelText: ".pioneer-label-div.spacecraft:not(.hidden):not(.hiddenByLabelQuadtree) .text", scLabel: ".pioneer-label-div.spacecraft:not(.hidden):not(.hiddenByLabelQuadtree)",
  culledLabelText: ".pioneer-label-div.hiddenByLabelQuadtree .text", culledLabel: ".pioneer-label-div.hiddenByLabelQuadtree",
  railWrap: ".settings.vertical", railInfo: "button[aria-label='show info panel']", railLayers: "button[aria-label='toggle layers']", railZoom: "button.zoom", railZoomIn: "span[aria-label='zoom in']",
  railLight: "button[aria-label='toggle light modes']", railFull: "button[aria-label='toggle fullscreen']", railToggle: "button[aria-label='show or hide settings']", railIconSpan: ".settings button span.icon-info",
  header: "header.header", appTitle: "nav.breadcrumb h1", menuBtn: "button.menu-btn", shareBtn: "button.share-button", searchIcon: ".search .mag-open", searchWrap: "div.search",
  timeNav: "nav.time-controls", timeRate: "nav.time-controls h3.rate", timeDate: "time.clock .date", timeTime: "time.clock .time", timeKnob: "nav.time-controls .knob", timeSlider: "#time-slider-input", timeSvgPath: "nav.time-controls svg path",
  rateDec: "button[aria-label='Decrease time rate']", rateInc: "button[aria-label='Increase time rate']", ratePause: "button[aria-label='Pause or play']", timeToggle: "button.item-toggle-btn", live: "nav.clock-shortcut .text.live", liveDot: "nav.clock-shortcut .icon-live",
  body: "body", html: "html",
});
// label counts
M.home.labelCounts = await p.evaluate(() => { const all = [...document.querySelectorAll(".pioneer-label-div")]; return { total: all.length, hidden: all.filter(e => e.classList.contains("hidden")).length, quadtree: all.filter(e => e.classList.contains("hiddenByLabelQuadtree")).length }; });
// hover Mars
const mars = p.locator(".pioneer-label-div.mars");
const before = await p.evaluate(() => { const e = document.querySelector(".pioneer-label-div.mars .text"); return getComputedStyle(e).opacity; });
await mars.hover(); await p.waitForTimeout(600);
await shot(p, "desktop-02-hover-mars");
M.hoverMars = { textOpacityBefore: before, after: await measure(p, { label: ".pioneer-label-div.mars", text: ".pioneer-label-div.mars .text", icon: ".pioneer-label-div.mars .icon" }), bodyClass: await p.evaluate(() => document.body.className), cursor: await p.evaluate(() => getComputedStyle(document.querySelector(".pioneer-label-div.mars")).cursor) };
// click Mars with frame sequence
const url0 = p.url();
M.selectMarsFrames = await frames(p, "desktop-03-select-mars-seq", 8, 300, () => mars.click());
await shot(p, "desktop-03a-select-mars-immediate");
await p.waitForTimeout(3000);
await shot(p, "desktop-03b-select-mars-settled");
M.selectMarsUrl = { before: url0, after: p.url() };
writeFileSync(`${S}/dom-mars.txt`, await dom(p, "#ui", 12));
M.marsPanel = await measure(p, { panel: "#panel-container", panelMain: "#panel-container .panel-main", panelSimple: "#panel-container .panel-simple", tabs: "#panel-container .tabs-container", tabBtn: "#panel-container .tabs-container > button", tabActive: "#panel-container .tabs-container > button.active",
  h1: "#panel-container h1", h2: "#panel-container h2", h3: "#panel-container h3", h4: "#panel-container h4", h5: "#panel-container h5", p: "#panel-container p", li: "#panel-container li", btn: "#panel-container button", breadcrumb: "nav.breadcrumb", breadcrumbItem: "nav.breadcrumb .container:not(.home)" });
// Escape
await p.keyboard.press("Escape"); await p.waitForTimeout(1500);
M.escapeOnMars = { url: p.url(), panelClass: await p.evaluate(() => document.querySelector("#panel-container")?.className) };
await shot(p, "desktop-03c-after-escape");
writeFileSync(`${S}/m-d1.json`, JSON.stringify(M, null, 1));
await b.close();
