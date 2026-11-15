import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
export { chromium };
export const URL = "https://eyes.nasa.gov/apps/solar-system/";
export const OUT = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");
export async function open(b, { w = 1440, h = 900, mobile = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.getByText("Featured").first().waitFor({ timeout: 60000 });
  await p.waitForTimeout(7000);
  return { ctx, p };
}
export const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 78 });
// measure first matching visible element for each selector
export async function measure(p, sels) {
  return p.evaluate((sels) => {
    const res = {};
    for (const [key, sel] of Object.entries(sels)) {
      const els = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.x < innerWidth && r.y < innerHeight && r.x > -r.width; });
      const el = els[0];
      if (!el) { res[key] = { selector: sel, found: false }; continue; }
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      res[key] = { selector: sel, count: els.length, box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        text: (el.innerText || "").trim().slice(0, 60),
        bg: s.backgroundColor, bgImage: s.backgroundImage !== "none" ? s.backgroundImage.slice(0, 120) : undefined, opacity: s.opacity, backdrop: s.backdropFilter || s.webkitBackdropFilter,
        border: s.borderTopWidth !== "0px" ? `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}` : (s.borderLeftWidth !== "0px" ? `L ${s.borderLeftWidth} ${s.borderLeftStyle} ${s.borderLeftColor}` : "none"),
        radius: s.borderRadius, shadow: s.boxShadow, padding: s.padding,
        font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, ls: s.letterSpacing, lh: s.lineHeight, color: s.color, tt: s.textTransform,
        transition: s.transition, tDur: s.transitionDuration, tEase: s.transitionTimingFunction, anim: s.animationName !== "none" ? `${s.animationName} ${s.animationDuration} ${s.animationTimingFunction}` : undefined,
        transform: s.transform !== "none" ? s.transform : undefined, aria: el.getAttribute("aria-label"), title: el.getAttribute("title"), role: el.getAttribute("role"), tag: el.tagName.toLowerCase(), cls: el.className && el.className.baseVal === undefined ? el.className : undefined };
    }
    return res;
  }, sels);
}
export async function dom(p, rootSel = "body", depth = 8) {
  return p.evaluate(([rootSel, depth]) => {
    const out = []; const root = document.querySelector(rootSel); if (!root) return "no root " + rootSel;
    const walk = (el, d) => { if (d > depth) return; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (cs.display === "none") return;
      const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(" ").slice(0, 50);
      if (r.width > 0) out.push(`${"  ".repeat(d)}${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : ""} [${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)}]${el.getAttribute("aria-label") ? " aria=" + el.getAttribute("aria-label") : ""}${txt ? ' "' + txt + '"' : ""}`);
      for (const c of el.children) walk(c, d + 1); };
    walk(root, 0); return out.join("\n");
  }, [rootSel, depth]);
}
export async function frames(p, prefix, n = 6, gap = 80, action) {
  const t0 = Date.now(); const ts = [];
  const pr = action ? action() : null;
  for (let i = 0; i < n; i++) { const due = t0 + i * gap; const w = due - Date.now(); if (w > 0) await p.waitForTimeout(w); ts.push(Date.now() - t0); await p.screenshot({ path: `${OUT}/${prefix}-f${i}.jpg`, type: "jpeg", quality: 60 }); }
  if (pr) await pr;
  return ts;
}
export async function startSampler(p, sels, ms = 3000) {
  await p.evaluate(([sels, ms]) => {
    window.__samples = []; const t0 = performance.now();
    const tick = () => { const t = performance.now() - t0; const row = { t: Math.round(t) };
      for (const [k, sel] of Object.entries(sels)) { const e = document.querySelector(sel); if (!e) { row[k] = null; continue; } const r = e.getBoundingClientRect(), s = getComputedStyle(e); row[k] = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), +(+s.opacity).toFixed(2), s.transform === "none" ? "" : s.transform, s.visibility === "hidden" ? "H" : "", s.display === "none" ? "N" : ""]; }
      window.__samples.push(row); if (t < ms) requestAnimationFrame(tick); else window.__samplerDone = true; };
    window.__samplerDone = false; requestAnimationFrame(tick);
  }, [sels, ms]);
}
export async function getSamples(p) { await p.waitForFunction(() => window.__samplerDone, null, { timeout: 30000 }); return p.evaluate(() => window.__samples); }
// compress samples: keep rows where any value changed
export function compress(rows) { const out = []; let prev = ""; for (const r of rows) { const { t, ...rest } = r; const k = JSON.stringify(rest); if (k !== prev) { out.push(r); prev = k; } } return { n: rows.length, fps: +(rows.length / (rows.at(-1).t / 1000)).toFixed(1), changes: out }; }
export const LAUNCH = { channel: "chromium", args: ["--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu"] };
