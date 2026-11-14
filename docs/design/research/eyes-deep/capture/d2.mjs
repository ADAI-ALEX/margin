import { LAUNCH, chromium, open, shot, measure, dom, startSampler, getSamples, compress } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const S = process.argv[2]; const M = {};
const b = await chromium.launch(LAUNCH);
const { p } = await open(b);
const sels = { story: "article.featured-stories-panel", detail: "article.content-panel-container", viewport: "#main-viewport", marsLbl: ".pioneer-label-div.mars", sunLbl: ".pioneer-label-div.sun", timeMenu: "nav.c-menu-container", breadcrumbLast: "nav.breadcrumb .container:last-child" };
await startSampler(p, sels, 6000);
await p.locator(".pioneer-label-div.mars").click();
M.selectMars = compress(await getSamples(p));
writeFileSync(`${S}/dom-mars-full.txt`, await dom(p, "#dynamic-ui", 14));
M.detail = await measure(p, { panel: "article.content-panel-container", tabGroup: ".tab-group", tabNav: "#tab-container", tabLi: "#tab-container li.selected", tabBtn: "#info-tab", tabBtn2: "#toolbox-tab", collapse: "button[aria-label='Collapse content panel']",
  overview: "#overview-block", title: "#overview-block .title", subtitle: "#overview-block .subtitle", h5: ".content-panel-container h5.title", copy: ".content-panel-container .copy", more: ".content-panel-container .more-button", relatedCard: ".related-story-block .story-container", relatedCardTitle: ".related-story-block .story-title > h2", relatedItem: "#content-related-list li.item", block: ".content-panel-container .content-block.description" });
// Escape check and other keys
await p.keyboard.press("Escape"); await p.waitForTimeout(800);
M.escape = { url: p.url(), detailCls: await p.evaluate(() => document.querySelector("article.content-panel-container")?.className) };
// collapse detail panel via its button, sample
await startSampler(p, sels, 2500);
await p.locator("button[aria-label='Collapse content panel']").click();
M.collapseDetail = compress(await getSamples(p));
await shot(p, "desktop-03d-detail-collapsed");
writeFileSync(`${S}/dom-detail-collapsed.txt`, await dom(p, "#dynamic-ui", 6));
// go home via breadcrumb
await startSampler(p, sels, 6000);
await p.locator("nav.breadcrumb .container.home").click();
M.goHome = compress(await getSamples(p));
M.homeUrl = p.url();
await p.waitForTimeout(1000);
// collapse story panel
await startSampler(p, sels, 2500);
await p.locator(".desktop-collapse-button").click();
M.collapseStory = compress(await getSamples(p));
await shot(p, "desktop-09-stories-collapsed");
writeFileSync(`${S}/dom-story-collapsed.txt`, await dom(p, "#dynamic-ui", 5));
M.storyCollapsed = await measure(p, { panel: "article.featured-stories-panel", header: ".featured-stories-header", btn: ".desktop-collapse-button", title: ".featured-stories-title" });
// expand again
await startSampler(p, sels, 2500);
await p.locator(".desktop-collapse-button").click();
M.expandStory = compress(await getSamples(p));
writeFileSync(`${S}/m-d2.json`, JSON.stringify(M, null, 1));
await b.close();
