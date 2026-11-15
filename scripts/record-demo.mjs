/**
 * Records the 30-second demo (docs/submission/demo-script-30s.md) from the live site: a real screen
 * recording of the app driven by Playwright, framed in a browser window (tab with the MARGIN favicon,
 * address bar on margin.adai.systems), with burned-in captions, a visible pointer, the AI voiceover
 * (scripts/demo/narration.flac, Higgsfield Seed Audio) placed on the beats it describes, and a music bed
 * and interface sounds synthesised from code (scripts/demo/synth_audio.py). Caption numbers are read
 * from the page as it renders.
 *
 *   FFMPEG=/path/to/ffmpeg PYTHON=/path/to/python-with-numpy node scripts/record-demo.mjs
 *   (BASE=http://localhost:3100 to record a local production build instead of the live site)
 *
 * Output: public/demo/margin-demo-30s.mp4 (1920×1080, H.264 + AAC, ≤ 29 s) and margin-demo-poster.jpg.
 */
import { chromium } from "playwright";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BASE = process.env.BASE ?? "https://margin.adai.systems";
const HOST = "margin.adai.systems";
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const PYTHON = process.env.PYTHON ?? "python3";
const OUT = "public/demo";
const MAX = 29;
// The page is recorded at 1440×744 CSS px and scaled 4/3 (lanczos) into a 1920×992 content area under an 88 px browser frame.
const VW = 1440, VH = 744, CW = 1920, CH = 992, CHROME = 88;

/** Phrases in narration.flac (seconds; found with ffmpeg silencedetect) and the beat each belongs to. */
const VO = [
  { beat: "title", from: 0.35, to: 3.68, lead: 0.45 },  // How close is NASA's fire evidence to the air we'll breathe?
  { beat: "gap", from: 4.15, to: 7.3, lead: 0.3 },      // Its space tests stop at twenty-two percent oxygen.
  { beat: "ea", from: 8.24, to: 10.5, lead: 0.25 },     // Future habitats plan thirty-four.
  { beat: "pub", from: 10.74, to: 11.66, lead: 0.2 },   // Add results,
  { beat: "flow", from: 11.88, to: 14.36, lead: 0.2 },  // change the airflow: MARGIN shows the shift.
  { beat: "moon", from: 14.62, to: 15.2, lead: 0.2 },   // The Moon?
  { beat: "moon", from: 15.61, to: 16.54, lead: 1.05 }, // No tests.
  { beat: "src", from: 17.26, to: 19.1, lead: 0.2 },    // Every number, sourced.
];

const LOGO = readFileSync("app/icon.svg", "utf8");
const LOGO_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO).toString("base64")}`;
const tmp = mkdtempSync(join(tmpdir(), "margin-demo-"));
const browser = await chromium.launch();

// ---------------------------------------------------------------- browser frame (static image)
{
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.setContent(`<!doctype html><html><body style="margin:0;background:#05070a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="height:42px;background:#16191d;display:flex;align-items:flex-end;padding-left:84px;position:relative">
    <span style="position:absolute;left:18px;top:15px;display:flex;gap:8px">${["#ff5f57", "#febc2e", "#28c840"].map((c) => `<i style="width:12px;height:12px;border-radius:50%;background:${c};display:block"></i>`).join("")}</span>
    <div style="height:34px;width:300px;background:#262b31;border-radius:10px 10px 0 0;display:flex;align-items:center;gap:10px;padding:0 14px;color:#e8eaed;font-size:13px">
      <img src="${LOGO_URI}" width="16" height="16"><span style="flex:1;white-space:nowrap;overflow:hidden">MARGIN · How close is the evidence?</span><span style="color:#9aa0a6">✕</span></div>
    <span style="color:#9aa0a6;font-size:18px;margin:0 0 8px 12px">+</span>
    <span style="position:absolute;right:20px;top:13px;color:#9aa0a6;font-size:12px;letter-spacing:.08em">AI VOICEOVER (HIGGSFIELD)</span>
  </div>
  <div style="height:46px;background:#262b31;display:flex;align-items:center;gap:18px;padding:0 18px;color:#9aa0a6;font-size:17px;border-bottom:1px solid #000">
    <span>←</span><span>→</span><span>↻</span>
    <div style="flex:1;height:32px;border-radius:16px;background:#16191d;display:flex;align-items:center;gap:10px;padding:0 16px;color:#e8eaed;font-size:15px">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#9aa0a6" stroke-width="1.6"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>
      <span>${HOST}</span></div>
  </div></body></html>`);
  await p.screenshot({ path: join(tmp, "frame.png") });
  await p.close();
}

// ---------------------------------------------------------------- the recording
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, recordVideo: { dir: tmp, size: { width: VW, height: VH } } });
const t0 = Date.now();
await ctx.addInitScript(() => { try { localStorage.setItem("margin.welcome", "off"); } catch {} });
const page = await ctx.newPage();
const marks = [];
let tStart = 0;
const now = () => (Date.now() - t0) / 1000 - tStart;
const mark = (name) => marks.push({ name, t: now() });

const OVERLAY = `
  #demo-cap{position:fixed;left:50%;bottom:132px;pointer-events:none;transform:translateX(-50%);z-index:2147483646;max-width:980px;padding:12px 22px;
    background:rgba(5,7,10,.9);border:1px solid #3a424b;border-radius:6px;color:#eef1f4;font:500 21px/1.35 "Albert Sans",system-ui,sans-serif;
    text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.5)}
  #demo-cap b{color:#9fe3ef;font-weight:600}
  #demo-card{position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;justify-items:center;gap:16px;text-align:center;
    background:radial-gradient(70% 60% at 50% 45%,rgba(86,198,220,.10),transparent 70%),#05070a;color:#eef1f4;font-family:"Albert Sans",system-ui,sans-serif;transition:opacity .45s}
  #demo-card img{width:84px;height:84px;margin-bottom:4px;filter:drop-shadow(0 0 24px rgba(86,198,220,.35))}
  #demo-card h1{font-size:76px;font-weight:200;letter-spacing:.32em;margin:0 0 0 .32em}
  #demo-card p{font-size:27px;font-weight:300;color:#acb4bd;margin:0;max-width:860px}
  #demo-card small{font-size:15px;color:#8b949e;letter-spacing:.16em;text-transform:uppercase}
  #demo-card .url{font-size:22px;color:#9fe3ef;letter-spacing:.04em;text-transform:none}
  #demo-ptr{position:fixed;left:0;top:0;z-index:2147483645;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;
    border:2px solid #fff;background:rgba(255,255,255,.18);box-shadow:0 0 0 2px rgba(0,0,0,.4);pointer-events:none;transition:transform .45s cubic-bezier(.2,.7,.2,1)}
  #demo-ptr.tap{animation:tap .3s}
  @keyframes tap{50%{box-shadow:0 0 0 10px rgba(255,255,255,.25)}}`;

const inject = () => page.evaluate((css) => {
  if (document.getElementById("demo-style")) return;
  const s = document.createElement("style"); s.id = "demo-style"; s.textContent = css; document.head.appendChild(s);
  const p = document.createElement("div"); p.id = "demo-ptr"; p.style.transform = "translate(720px,372px)"; document.body.appendChild(p);
}, OVERLAY);
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
const hideCard = () => page.evaluate(() => { const c = document.getElementById("demo-card"); if (c) { c.style.opacity = "0"; setTimeout(() => c.remove(), 500); } });
async function tap(locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error("demo: target not visible");
  await page.evaluate(([x, y]) => { document.getElementById("demo-ptr").style.transform = `translate(${x}px,${y}px)`; }, [b.x + b.width / 2, b.y + b.height / 2]);
  await page.waitForTimeout(480);
  await page.evaluate(() => { const p = document.getElementById("demo-ptr"); p.classList.remove("tap"); void p.offsetWidth; p.classList.add("tap"); });
  mark("click");
  await locator.click();
}
const verdict = page.getByTestId("verdict");
async function readVerdict() {
  await page.waitForTimeout(200);
  const d = await verdict.getAttribute("data-d");
  return { v: await verdict.getAttribute("data-verdict"), D: d ? Number(d).toFixed(2) : null };
}

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForFunction(() => !document.documentElement.hasAttribute("data-pending"));
await inject();

// title
await card(`<img src="${LOGO_URI}" alt=""><small>NASA Space Apps 2026 · Flame in Freefall</small><h1>MARGIN</h1><p>How close is NASA&rsquo;s fire evidence to the air future crews will breathe?</p>`);
tStart = (Date.now() - t0) / 1000;
mark("whoosh"); mark("title");
await page.waitForTimeout(3750);

// the coverage gap
await hideCard(); mark("whoosh");
const gap = (await page.locator(".exp-card--gap").first().textContent()) ?? "";
const maxO2 = gap.match(/max tested ([\d.]+)%/i)?.[1], planned = gap.match(/planned ([\d.]+.[\d.]+)%/i)?.[1], nTests = gap.match(/(\d+) PSI solid/i)?.[1];
if (!maxO2 || !planned || !nTests) throw new Error(`demo: coverage-gap card not parsed: ${gap}`);
await caption(`NASA&rsquo;s ${nTests} space fire tests on solid materials top out at <b>${maxO2}% O₂</b>. Planned habitats: ${planned}%.`);
mark("gap");
await page.waitForTimeout(3450);

// Exploration Atmosphere
await tap(page.locator("select#atlas-preset"));
await page.locator("select#atlas-preset").selectOption("ea");
let r = await readVerdict();
mark("ea"); mark("chime");
await caption(`Exploration Atmosphere, 34% O₂ at 56.5 kPa: nearest test <b>${r.v}</b>, D ${r.D}`);
await page.waitForTimeout(2700);

// published evidence
await tap(page.getByRole("switch", { name: /Include published evidence/ }));
r = await readVerdict();
mark("pub");
await caption(`+ published NASA results (Saffire): still <b>${r.v}</b>, D ${r.D}`);
await page.waitForTimeout(1500);

// flow
await tap(page.getByRole("radio", { name: "20 centimetres per second", exact: true }));
r = await readVerdict();
mark("flow"); mark("chime");
await caption(`Assume 20 cm/s airflow: <b>${r.v}</b>, D ${r.D} · a different scenario, not a correction`);
await page.waitForTimeout(2850);

// the Moon
await tap(page.getByRole("radio", { name: "Lunar (0.165 g)", exact: true }));
await readVerdict();
mark("moon");
await caption(`The Moon: <b>no</b> PSI tests. Nothing is borrowed from other gravity levels.`);
await page.waitForTimeout(2350);

// receipts
await tap(page.getByTestId("field-notes").locator("button.atlas-runlink").first());
await page.getByTestId("specimen-card").waitFor();
mark("src");
await caption(`Every number links to its NASA source.`);
await page.waitForTimeout(2300);

// end
await card(`<img src="${LOGO_URI}" alt=""><h1>MARGIN</h1><p>Evidence proximity, not a safety rating.</p><small class="url">${HOST}</small><small style="font-size:12px;margin-top:10px">Voiceover AI-generated (Higgsfield) · music and sounds synthesised in code</small>`);
mark("whoosh"); mark("end");
await page.waitForTimeout(2700);
const tEnd = now();

await page.close();
await ctx.close();
await browser.close();

// ---------------------------------------------------------------- edit: frame + audio
const webm = readdirSync(tmp).find((f) => f.endsWith(".webm"));
if (!webm) throw new Error("demo: no video recorded");
const dur = Math.min(MAX, tEnd);
const ss = tStart;
writeFileSync(join(tmp, "marks.json"), JSON.stringify(marks, null, 1));
execFileSync(PYTHON, ["scripts/demo/synth_audio.py", tmp, String(Math.ceil(dur) + 1)], { stdio: "inherit" });

const at = (name, n = 0) => marks.filter((m) => m.name === name)[n]?.t;
const inputs = ["-ss", ss.toFixed(3), "-i", join(tmp, webm), "-loop", "1", "-i", join(tmp, "frame.png"), "-i", "scripts/demo/narration.flac", "-i", join(tmp, "music.wav")];
const sfx = [...marks.filter((m) => ["click", "whoosh", "chime"].includes(m.name))];
for (const m of sfx) inputs.push("-i", join(tmp, `${m.name}.wav`));
const f = [];
f.push(`[0:v]scale=${CW}:${CH}:flags=lanczos,setsar=1[pg]`);
f.push(`[1:v][pg]overlay=0:${CHROME}:shortest=1,format=yuv420p,fps=30[v]`);
const voLabels = [];
VO.forEach((p, i) => {
  const t = at(p.beat);
  if (t == null) throw new Error(`demo: no mark for ${p.beat}`);
  const ms = Math.round((t + p.lead) * 1000);
  f.push(`[2:a]atrim=${p.from}:${p.to},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=${(p.to - p.from - 0.06).toFixed(2)}:d=0.06,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[vo${i}]`);
  voLabels.push(`[vo${i}]`);
});
f.push(`${voLabels.join("")}amix=inputs=${voLabels.length}:normalize=0,volume=3.2,highpass=f=80,acompressor=threshold=-22dB:ratio=3:attack=5:release=120:makeup=2.5[vo]`);
f.push(`[vo]apad=whole_dur=${dur.toFixed(2)},asplit=2[voOut][voKey]`);
f.push(`[3:a]volume=0.4,afade=t=out:st=${(dur - 1.6).toFixed(2)}:d=1.6[mus]`);
f.push(`[mus][voKey]sidechaincompress=threshold=0.02:ratio=8:attack=30:release=500[duck]`);
const sfxLabels = sfx.map((m, i) => {
  const ms = Math.max(0, Math.round(m.t * 1000) - (m.name === "whoosh" ? 250 : 0));
  const vol = m.name === "click" ? 0.3 : m.name === "whoosh" ? 0.5 : 0.35;
  f.push(`[${4 + i}:a]volume=${vol},adelay=${ms}|${ms}[s${i}]`);
  return `[s${i}]`;
});
f.push(`[voOut][duck]${sfxLabels.join("")}amix=inputs=${2 + sfxLabels.length}:normalize=0,atrim=0:${dur.toFixed(2)}[a]`);

// pass 1: picture + raw mix; pass 2: one fixed gain to −16 LUFS integrated, then a peak limiter (no dynamic levelling)
mkdirSync(OUT, { recursive: true });
execFileSync(FFMPEG, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", f.join(";"), "-map", "[v]", "-map", "[a]", "-t", dur.toFixed(2),
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", "-preset", "slow", "-c:a", "pcm_s16le", "-ar", "48000", join(tmp, "raw.mov")]);
let measured;
{
  const r = spawnSync(FFMPEG, ["-hide_banner", "-i", join(tmp, "raw.mov"), "-vn", "-af", "ebur128=framelog=quiet", "-f", "null", "-"], { encoding: "utf8" });
  measured = Number(/I:\s+(-?[\d.]+) LUFS/.exec(r.stderr)?.[1]);
  if (!Number.isFinite(measured)) throw new Error("demo: loudness not measured");
}
const gain = (-16 - measured).toFixed(2);
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", join(tmp, "raw.mov"), "-c:v", "copy", "-af", `volume=${gain}dB,alimiter=limit=0.84:level=false`,
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", join(OUT, "margin-demo-30s.mp4")]);
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-ss", "9.5", "-i", join(OUT, "margin-demo-30s.mp4"), "-frames:v", "1", "-q:v", "3", join(OUT, "margin-demo-poster.jpg")]);
console.log(`demo: ${dur.toFixed(1)} s → ${OUT}/margin-demo-30s.mp4`, JSON.stringify(marks.filter((m) => m.name !== "click" && m.name !== "whoosh" && m.name !== "chime").map((m) => `${m.name}@${m.t.toFixed(1)}`)));
rmSync(tmp, { recursive: true, force: true });
