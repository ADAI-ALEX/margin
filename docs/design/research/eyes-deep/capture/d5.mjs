import { LAUNCH, chromium, open, shot } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const S = process.argv[2]; const M = {};
const b = await chromium.launch(LAUNCH);
const { p } = await open(b);
await p.evaluate(() => { window.__mv = []; const t0 = performance.now(); const tick = () => { const t = performance.now() - t0; const row = { t: Math.round(t), labels: {} };
  for (const e of document.querySelectorAll(".pioneer-label-div")) { const r = e.getBoundingClientRect(); if (r.x > 0 && r.x < innerWidth && r.y > 0 && r.y < innerHeight) row.labels[e.className.split(" ")[2]] = [Math.round(r.x), Math.round(r.y)]; }
  const li = document.querySelector(".load-icon"); row.load = li ? getComputedStyle(li).opacity + "/" + getComputedStyle(li).display : null;
  const dp = document.querySelector("article.content-panel-container"); row.panel = dp ? getComputedStyle(dp).display : null;
  window.__mv.push(row); if (t < 6000) requestAnimationFrame(tick); else window.__mvDone = true; }; requestAnimationFrame(tick); });
await p.locator(".pioneer-label-div.mars").click();
await p.waitForFunction(() => window.__mvDone, null, { timeout: 20000 });
const rows = await p.evaluate(() => window.__mv);
// last time any common label moved
let firstMove = null, lastMove = null;
for (let i = 1; i < rows.length; i++) { const a = rows[i - 1].labels, c = rows[i].labels; let moved = false; for (const k of Object.keys(c)) if (a[k] && (Math.abs(a[k][0] - c[k][0]) > 1 || Math.abs(a[k][1] - c[k][1]) > 1)) moved = true; if (moved) { if (firstMove === null) firstMove = rows[i].t; lastMove = rows[i].t; } }
const loadChanges = []; let pl = null; for (const r of rows) if (r.load !== pl) { loadChanges.push([r.t, r.load]); pl = r.load; }
const panelChanges = []; let pp = undefined; for (const r of rows) if (r.panel !== pp) { panelChanges.push([r.t, r.panel]); pp = r.panel; }
M.cameraMars = { firstLabelMove: firstMove, lastLabelMove: lastMove, loadIcon: loadChanges, panelDisplay: panelChanges, labelsAtEnd: Object.keys(rows.at(-1).labels) };
writeFileSync(`${S}/m-d5.json`, JSON.stringify(M, null, 1)); console.log(JSON.stringify(M, null, 1));
await b.close();
