/**
 * Records the 30-second demo (docs/submission/demo-script-30s.md) from a running production build:
 * a real screen recording of the app driven by Playwright, with burned-in captions and a visible
 * pointer. Every number in a caption is read from the page as it renders, not typed in.
 *
 *   npm run build && npx next start -p 3100
 *   BASE=http://localhost:3100 FFMPEG=/path/to/ffmpeg node scripts/record-demo.mjs
 *
 * Output: public/demo/margin-demo-30s.mp4 (H.264, ≤ 28 s) and public/demo/margin-demo-poster.jpg.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BASE = process.env.BASE ?? "http://localhost:3100";
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const OUT = "public/demo";
const W = 1440, H = 900, MAX = 28;

const tmp = mkdtempSync(join(tmpdir(), "margin-demo-"));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, recordVideo: { dir: tmp, size: { width: W, height: H } } });
const t0 = Date.now();
await ctx.addInitScript(() => { try { localStorage.setItem("margin.welcome", "off"); } catch {} });
const page = await ctx.newPage();

const OVERLAY = `
  #demo-cap{position:fixed;left:50%;bottom:150px;pointer-events:none;transform:translateX(-50%);z-index:2147483646;max-width:1040px;padding:14px 24px;
    background:rgba(5,7,10,.9);border:1px solid #3a424b;border-radius:6px;color:#eef1f4;font:500 24px/1.35 "Albert Sans",system-ui,sans-serif;
    text-align:center;letter-spacing:-.005em;box-shadow:0 12px 40px rgba(0,0,0,.5);transition:opacity .25s}
  #demo-cap b{color:#9fe3ef;font-weight:600}
  #demo-card{position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;gap:18px;text-align:center;background:#05070a;color:#eef1f4;
    font-family:"Albert Sans",system-ui,sans-serif;transition:opacity .4s}
  #demo-card h1{font-size:88px;font-weight:200;letter-spacing:.32em;margin:0 0 0 .32em}
  #demo-card p{font-size:30px;font-weight:300;color:#acb4bd;margin:0;max-width:900px}
  #demo-card small{font-size:18px;color:#8b949e;letter-spacing:.16em;text-transform:uppercase}
  #demo-ptr{position:fixed;left:0;top:0;z-index:2147483645;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;
    border:2px solid #fff;background:rgba(255,255,255,.18);box-shadow:0 0 0 2px rgba(0,0,0,.4);pointer-events:none;
    transition:transform .45s cubic-bezier(.2,.7,.2,1)}
  #demo-ptr.tap{animation:tap .3s}
  @keyframes tap{50%{box-shadow:0 0 0 10px rgba(255,255,255,.25)}}`;

async function inject() {
  await page.evaluate((css) => {
    if (document.getElementById("demo-style")) return;
    const s = document.createElement("style"); s.id = "demo-style"; s.textContent = css; document.head.appendChild(s);
    const p = document.createElement("div"); p.id = "demo-ptr"; p.style.transform = "translate(720px,450px)"; document.body.appendChild(p);
  }, OVERLAY);
}
const caption = (html) => page.evaluate((h) => {
  let c = document.getElementById("demo-cap");
  if (!c) { c = document.createElement("div"); c.id = "demo-cap"; document.body.appendChild(c); }
  c.innerHTML = h;
}, html);
const card = (html) => page.evaluate((h) => {
  let c = document.getElementById("demo-card");
  if (!c) { c = document.createElement("div"); c.id = "demo-card"; document.body.appendChild(c); }
  c.style.opacity = "1"; c.innerHTML = h;
}, html);
const hideCard = () => page.evaluate(() => { const c = document.getElementById("demo-card"); if (c) { c.style.opacity = "0"; setTimeout(() => c.remove(), 450); } });
async function tap(locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error("demo: target not visible");
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.evaluate(([x, y]) => { const p = document.getElementById("demo-ptr"); p.style.transform = `translate(${x}px,${y}px)`; }, [x, y]);
  await page.waitForTimeout(500);
  await page.evaluate(() => { const p = document.getElementById("demo-ptr"); p.classList.remove("tap"); void p.offsetWidth; p.classList.add("tap"); });
  await locator.click();
}
const verdict = page.getByTestId("verdict");
async function readVerdict() {
  await page.waitForTimeout(250);
  const v = await verdict.getAttribute("data-verdict");
  const d = await verdict.getAttribute("data-d");
  return { v, D: d ? Number(d).toFixed(2) : null };
}

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForFunction(() => !document.documentElement.hasAttribute("data-pending"));
await inject();

// 0:00 title
await card(`<small>NASA Space Apps 2026 · Flame in Freefall</small><h1>MARGIN</h1><p>How close is NASA&rsquo;s fire evidence to the habitats we&rsquo;re about to fly?</p>`);
const tStart = (Date.now() - t0) / 1000;
await page.waitForTimeout(2400);
await hideCard();

// 0:03 the coverage gap
const gap = (await page.locator(".exp-card--gap").first().textContent()) ?? "";
const maxO2 = gap.match(/max tested ([\d.]+)%/i)?.[1], planned = gap.match(/planned ([\d.]+.[\d.]+)%/i)?.[1], nTests = gap.match(/(\d+) PSI solid/i)?.[1];
if (!maxO2 || !planned || !nTests) throw new Error(`demo: coverage-gap card not parsed: ${gap}`);
await caption(`NASA&rsquo;s space fire tests (PSI): <b>${nTests}</b> solid-material tests with recorded O₂ top out at <b>${maxO2}%</b>. Planned habitats: ${planned}%.`);
await page.waitForTimeout(3000);

// 0:07 Exploration Atmosphere
await tap(page.locator("select#atlas-preset"));
await page.locator("select#atlas-preset").selectOption("ea");
let r = await readVerdict();
await caption(`Exploration Atmosphere, 34% O₂ at 56.5 kPa: nearest PSI test is <b>${r.v}</b>, D ${r.D}.`);
await page.waitForTimeout(3000);

// 0:11 published evidence
await tap(page.getByRole("switch", { name: /Include published evidence/ }));
r = await readVerdict();
await caption(`Add published NASA results (Saffire): still <b>${r.v}</b> at 10 cm/s, D ${r.D}.`);
await page.waitForTimeout(3000);

// 0:15 flow sensitivity
await tap(page.getByRole("radio", { name: "20 centimetres per second", exact: true }));
r = await readVerdict();
await caption(`Assume 20 cm/s airflow, a different scenario: <b>${r.v}</b>, D ${r.D}. MARGIN shows the sensitivity; it does not pick the flow.`);
await page.waitForTimeout(3600);

// 0:19 the Moon
await tap(page.getByRole("radio", { name: "Lunar (0.165 g)", exact: true }));
r = await readVerdict();
await caption(`The Moon: PSI has <b>no</b> partial-gravity tests. Nothing is borrowed from other gravity levels.`);
await page.waitForTimeout(3000);

// 0:23 receipts
await tap(page.getByTestId("field-notes").locator("button.atlas-runlink").first());
await page.getByTestId("specimen-card").waitFor();
await caption(`Every number links to its source: NASA PSI table rows and NTRS papers.`);
await page.waitForTimeout(2800);

// 0:26 end
await card(`<h1>MARGIN</h1><p>Evidence proximity, not a safety rating.</p><small>margin-two-rho.vercel.app</small>`);
await page.waitForTimeout(2000);
const tEnd = (Date.now() - t0) / 1000;

await page.close();
await ctx.close();
await browser.close();

const webm = readdirSync(tmp).find((f) => f.endsWith(".webm"));
if (!webm) throw new Error("demo: no video recorded");
mkdirSync(OUT, { recursive: true });
const ss = Math.max(0, tStart - 0.1), dur = Math.min(MAX, tEnd - ss);
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-ss", ss.toFixed(2), "-i", join(tmp, webm), "-t", dur.toFixed(2),
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "slow", "-movflags", "+faststart", "-an", join(OUT, "margin-demo-30s.mp4")]);
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-ss", "9", "-i", join(OUT, "margin-demo-30s.mp4"), "-frames:v", "1", "-q:v", "4", join(OUT, "margin-demo-poster.jpg")]);
rmSync(tmp, { recursive: true, force: true });
console.log(`demo: ${dur.toFixed(1)} s → ${OUT}/margin-demo-30s.mp4`);
