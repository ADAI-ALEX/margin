import { LAUNCH, chromium, open, shot, measure, dom, frames, startSampler, getSamples, compress } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const S = process.argv[2]; const M = {}; const only = process.argv[3] ? process.argv[3].split(",") : null;
const b = await chromium.launch(LAUNCH);
const step = async (name, fn) => { if (only && !only.includes(name)) return; const { ctx, p } = await open(b); try { await fn(p); } catch (e) { M[name + "_error"] = e.message.slice(0, 300); console.log(name, "ERR", e.message.slice(0, 300)); } await ctx.close(); };

await step("keyboard", async (p) => {
  const seq = [];
  for (let i = 1; i <= 24; i++) {
    await p.keyboard.press("Tab"); await p.waitForTimeout(250);
    const r = await p.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); const rc = e.getBoundingClientRect();
      return { tag: e.tagName.toLowerCase(), id: e.id || undefined, cls: (typeof e.className === "string" ? e.className : "").slice(0, 60), aria: e.getAttribute("aria-label"), text: (e.innerText || e.value || "").trim().slice(0, 40), box: [Math.round(rc.x), Math.round(rc.y), Math.round(rc.width), Math.round(rc.height)], outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, outlineOffset: s.outlineOffset, shadow: s.boxShadow, fv: e.matches(":focus-visible"), tabindex: e.getAttribute("tabindex") }; });
    seq.push(r);
    if (i === 3 || i === 8 || i === 14) await shot(p, `desktop-12-keyboard-tab${String(i).padStart(2, "0")}`);
  }
  M.tabSequence = seq;
  // Does Enter on a focused story card work? And are labels focusable?
  M.focusableCounts = await p.evaluate(() => ({ labelsTabbable: [...document.querySelectorAll(".pioneer-label-div")].filter(e => e.tabIndex >= 0).length, storyCardsTabbable: [...document.querySelectorAll(".story-container")].filter(e => e.tabIndex >= 0).length, buttons: document.querySelectorAll("button").length, roleButtonSpans: document.querySelectorAll("span.clickable").length, keydownAttrs: 0 }));
  // arrow keys on the canvas/home
  await p.mouse.click(900, 600); await p.waitForTimeout(500);
  const before = await p.evaluate(() => { const e = document.querySelector(".pioneer-label-div.sun"); const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)]; });
  for (const k of ["ArrowLeft", "ArrowUp", "w", "a", "+", "-"]) { await p.keyboard.down(k); await p.waitForTimeout(400); await p.keyboard.up(k); }
  await p.waitForTimeout(500);
  const after = await p.evaluate(() => { const e = document.querySelector(".pioneer-label-div.sun"); const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)]; });
  M.canvasKeys = { sunLabelBefore: before, sunLabelAfter: after, url: p.url() };
});

await step("tooltip", async (p) => {
  const btn = p.locator("button[aria-label='zoom in'], span[aria-label='zoom in']").first();
  await startSampler(p, { tip: ".tippy-box" }, 1500);
  await btn.hover();
  M.tooltipTimeline = compress(await getSamples(p));
  await p.waitForTimeout(300);
  M.tooltip = await measure(p, { box: ".tippy-box", content: ".tippy-content", root: "[data-tippy-root]" });
  M.tooltipAttrs = await p.evaluate(() => { const e = document.querySelector(".tippy-box"); return e && { placement: e.dataset.placement, animation: e.dataset.animation, theme: e.dataset.theme, dur: getComputedStyle(e).transitionDuration, role: e.getAttribute("role"), text: e.innerText }; });
  await shot(p, "desktop-05c-rail-tooltip-zoom");
  M.tooltipAll = {};
  for (const a of ["show info panel", "toggle layers", "zoom out", "toggle light modes", "toggle fullscreen", "show or hide settings"]) {
    await p.locator(`[aria-label='${a}']`).first().hover(); await p.waitForTimeout(700);
    M.tooltipAll[a] = await p.evaluate(() => [...document.querySelectorAll(".tippy-box")].map(e => e.innerText).join("|"));
  }
  // rail hover visual state on button
  M.railHoverIcon = await p.evaluate(() => { const sp = document.querySelector("button[aria-label='show or hide settings']"); return { opacity: getComputedStyle(sp).opacity, filter: getComputedStyle(sp).filter }; });
});

await step("labels", async (p) => {
  const count = () => p.evaluate(() => { const all = [...document.querySelectorAll(".pioneer-label-div")]; const on = all.filter(e => !e.classList.contains("hidden") && !e.classList.contains("hiddenByLabelQuadtree")); const inView = on.filter(e => { const r = e.getBoundingClientRect(); return r.x > 0 && r.x < innerWidth && r.y > 0 && r.y < innerHeight; });
    // overlap check among visible-in-view labels
    let overlaps = 0; const rs = inView.map(e => e.getBoundingClientRect()); for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], b = rs[j]; if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) overlaps++; }
    const culled = all.filter(e => e.classList.contains("hiddenByLabelQuadtree")).map(e => e.innerText.trim());
    return { total: all.length, shownInView: inView.map(e => e.innerText.trim()), culledByQuadtree: culled, overlapsAmongShown: overlaps }; });
  M.labels = { home: await count() };
  await p.mouse.move(900, 450);
  for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(150); }
  await p.waitForTimeout(1500);
  M.labels.zoomedOut = await count(); await shot(p, "desktop-13a-labels-zoomed-out");
  for (let i = 0; i < 14; i++) { await p.mouse.wheel(0, -300); await p.waitForTimeout(150); }
  await p.waitForTimeout(1500);
  M.labels.zoomedIn = await count(); await shot(p, "desktop-13b-labels-zoomed-in");
  // drag-rotate
  await p.mouse.move(900, 450); await p.mouse.down(); await p.mouse.move(700, 380, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(1500);
  M.labels.rotated = await count(); await shot(p, "desktop-13c-labels-rotated");
  // timeline of one culled label fade
  M.labelCss = await p.evaluate(() => { const e = document.querySelector(".pioneer-label-div.hiddenByLabelQuadtree"); if (!e) return null; const t = e.querySelector(".text"); return { label: getComputedStyle(e).transition, labelOpacity: getComputedStyle(e).opacity, text: getComputedStyle(t).transition, textOpacity: getComputedStyle(t).opacity, pe: getComputedStyle(e).pointerEvents }; });
});

writeFileSync(`${S}/m-d4.json`, JSON.stringify(M, null, 1));
await b.close();
