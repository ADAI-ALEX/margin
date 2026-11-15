/**
 * The 30-second demo (docs/submission/demo-script-30s.md), recorded from the live site and edited in
 * one pass: a real screen recording of https://margin.adai.systems driven by Playwright (pointer glides
 * and clicks on screen), smooth punch-in zooms on what each beat is about, burned-in captions whose
 * numbers are read from the page, the narration in scripts/demo/voice/ placed on its beats, and a music
 * bed and interface sounds synthesised in code (scripts/demo/synth_audio.py).
 *
 *   FFMPEG=/path/to/ffmpeg PYTHON=/path/to/python-with-numpy node scripts/record-demo.mjs
 *   (BASE=http://localhost:3100 records a local production build instead)
 *
 * Output: public/demo/margin-demo-30s.mp4 (1920×1080 at 30 fps, H.264 + AAC, −16 LUFS, < 30 s) and
 * public/demo/margin-demo-poster.jpg.
 */
import { chromium } from "playwright";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BASE = process.env.BASE ?? "https://margin.adai.systems";
const HOST = "margin.adai.systems";
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const PYTHON = process.env.PYTHON ?? "python3";
const OUT = "public/demo";
const LIMIT = 29.8;          // hard ceiling (the competition limit is 30 s)
const VW = 1440, VH = 810;   // recorded viewport (16:9), scaled to 1920×1080
const W = 1920, H = 1080;

const VOICE = JSON.parse(readFileSync("scripts/demo/voice/lines.json", "utf8")).lines;
const voDur = (beat) => VOICE.find((l) => l.beat === beat).seconds;
const LOGO = readFileSync("app/icon.svg", "utf8");
const LOGO_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO).toString("base64")}`;

const tmp = mkdtempSync(join(tmpdir(), "margin-demo-"));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, recordVideo: { dir: tmp, size: { width: VW, height: VH } } });
const t0 = Date.now();
await ctx.addInitScript(() => { try { localStorage.setItem("margin.welcome", "off"); } catch {} });
const page = await ctx.newPage();

// ---------------------------------------------------------------- timeline marks
let tStart = 0;
const now = () => (Date.now() - t0) / 1000 - tStart;
const marks = [];
const mark = (name, data = {}) => marks.push({ name, t: now(), ...data });
const sleep = (s) => page.waitForTimeout(Math.max(0, Math.round(s * 1000)));

// ---------------------------------------------------------------- in-page overlay: pointer and title card
const CSS = `
  #demo-ptr{position:fixed;left:0;top:0;z-index:2147483646;width:26px;height:26px;pointer-events:none;will-change:transform;
    filter:drop-shadow(0 2px 3px rgba(0,0,0,.55))}
  #demo-ptr .ring{position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;border:2px solid rgba(159,227,239,.9);opacity:0;transform:scale(.4)}
  #demo-ptr.tap .ring{animation:ring .45s ease-out}
  @keyframes ring{0%{opacity:.95;transform:scale(.4)}100%{opacity:0;transform:scale(1.6)}}
  #demo-card{position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;justify-items:center;text-align:center;
    background:radial-gradient(60% 55% at 50% 46%,rgba(86,198,220,.12),transparent 70%),#05070a;color:#eef1f4;font-family:var(--font-ui),system-ui,sans-serif;
    transition:opacity .5s cubic-bezier(.2,.7,.2,1)}
  #demo-card .brand{display:flex;align-items:center;gap:26px}
  #demo-card .brand img{width:76px;height:76px;filter:drop-shadow(0 0 26px rgba(86,198,220,.35))}
  #demo-card .brand span{font-size:74px;font-weight:300;letter-spacing:.3em;margin-right:-.3em}
  #demo-card p{margin:30px 0 0;font-size:28px;font-weight:300;color:#acb4bd;max-width:900px;line-height:1.35}
  #demo-card small{margin-top:26px;font-size:15px;color:#8b949e;letter-spacing:.18em;text-transform:uppercase}
  #demo-card small b{color:#9fe3ef;font-weight:500;letter-spacing:.06em;text-transform:none;font-size:17px}`;
const ARROW = `<svg width="26" height="26" viewBox="0 0 26 26"><path d="M3 2 L3 21 L8.2 16.4 L11.6 24 L15 22.5 L11.7 15 L18.5 15 Z" fill="#fff" stroke="#05070a" stroke-width="1.6" stroke-linejoin="round"/></svg><span class="ring"></span>`;
let ptr = { x: VW * 0.55, y: VH * 0.62 };
const inject = () => page.evaluate(([css, arrow, p]) => {
  if (!document.getElementById("demo-style")) {
    const s = document.createElement("style"); s.id = "demo-style"; s.textContent = css; document.head.appendChild(s);
  }
  if (!document.getElementById("demo-ptr")) {
    const d = document.createElement("div"); d.id = "demo-ptr"; d.innerHTML = arrow; d.style.transform = `translate(${p.x}px,${p.y}px)`; document.body.appendChild(d);
  }
}, [CSS, ARROW, ptr]);

/** Glide the pointer to an element (or a box), with a swish matched to the distance; returns the box. */
async function glide(target, at = { fx: 0.5, fy: 0.5 }) {
  const b = typeof target.boundingBox === "function" ? await target.boundingBox() : target;
  if (!b) throw new Error("demo: glide target not visible");
  const to = { x: b.x + b.width * at.fx, y: b.y + b.height * at.fy };
  const dist = Math.hypot(to.x - ptr.x, to.y - ptr.y);
  const dur = Math.min(0.7, Math.max(0.32, 0.26 + dist / 2400));
  await inject();
  await page.evaluate(([x, y, d]) => {
    const el = document.getElementById("demo-ptr");
    el.style.transition = `transform ${d}s cubic-bezier(.45,.05,.25,1)`;
    el.style.transform = `translate(${x}px,${y}px)`;
  }, [to.x, to.y, dur]);
  mark("swish", { dur, dist });
  ptr = to;
  await sleep(dur + 0.05);
  return b;
}
async function click(locator) {
  await glide(locator);
  await page.evaluate(() => { const el = document.getElementById("demo-ptr"); el.classList.remove("tap"); void el.offsetWidth; el.classList.add("tap"); });
  mark("click");
  await locator.click();
}

// ---------------------------------------------------------------- zoom (applied in post) and captions
let zoomOpen = null;
const zooms = [];
async function zoomOn(boxes, zmax = 1.3) {
  const bs = (await Promise.all(boxes.map((b) => (typeof b.boundingBox === "function" ? b.boundingBox() : b)))).filter(Boolean);
  const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y));
  const x1 = Math.max(...bs.map((b) => b.x + b.width)), y1 = Math.max(...bs.map((b) => b.y + b.height));
  const z = Math.max(1.06, Math.min(zmax, 0.86 / Math.max((x1 - x0) / VW, (y1 - y0) / VH)));
  const cx = ((x0 + x1) / 2) / VW, cy = ((y0 + y1) / 2) / VH;
  zoomOpen = { a: now(), z, cx: Math.min(1 - 0.5 / z, Math.max(0.5 / z, cx)), cy: Math.min(1 - 0.5 / z, Math.max(0.5 / z, cy)) };
}
function unzoom() { if (zoomOpen) { zooms.push({ ...zoomOpen, b: now() }); zoomOpen = null; } }
const captions = [];
function caption(html) {
  const t = now();
  if (captions.length && captions.at(-1).b == null) captions.at(-1).b = t;
  captions.push({ html, a: t, b: null });
}
const verdict = page.getByTestId("verdict");
async function readVerdict() {
  await sleep(0.18);
  const d = await verdict.getAttribute("data-d");
  return { v: await verdict.getAttribute("data-verdict"), D: d ? Number(d).toFixed(2) : null };
}
const vo = (beat) => mark("vo", { beat });

// ---------------------------------------------------------------- the take
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForFunction(() => !document.documentElement.hasAttribute("data-pending"));
await inject();
await page.evaluate((logo) => {
  const c = document.createElement("div"); c.id = "demo-card";
  c.innerHTML = `<div class="brand"><img src="${logo}" alt=""><span>MARGIN</span></div>
    <p>How close is NASA&rsquo;s fire evidence to the air future crews will breathe?</p>
    <small>NASA Space Apps 2026 · Flame in Freefall · <b>margin.adai.systems</b></small>`;
  document.body.appendChild(c);
}, LOGO_URI);
await sleep(0.3);
tStart = (Date.now() - t0) / 1000;

// Pacing: each move starts during the tail of the previous line; each line starts once the previous line
// has ended (plus a breath) and its own action has landed.
let voEnd = 0;
const until = (t) => sleep(t - now());
async function say(beat, breath = 0.3) {
  await until(voEnd + breath);
  vo(beat);
  voEnd = now() + voDur(beat);
}
const LEAD = 0.55;

// 1. title
await sleep(0.3); await say("title", 0);
await until(voEnd - 0.25);
mark("transition");
await page.evaluate(() => { const c = document.getElementById("demo-card"); c.style.opacity = "0"; setTimeout(() => c.remove(), 550); });

// 2. the coverage gap: every dot is a test; they stop at 22.2 % O₂
const gapCard = (await page.locator(".exp-card--gap").first().textContent()) ?? "";
const maxO2 = gapCard.match(/max tested ([\d.]+)%/i)?.[1], planned = gapCard.match(/planned ([\d.]+.[\d.]+)%/i)?.[1], nTests = gapCard.match(/(\d+) PSI solid/i)?.[1];
if (!maxO2 || !planned || !nTests) throw new Error(`demo: coverage-gap card not parsed: ${gapCard}`);
await say("gap", 0.35);
caption(`NASA&rsquo;s ${nTests} space fire tests on solid materials top out at <b>${maxO2}% O₂</b> · planned habitats: <b>${planned}%</b>`);
const gapNotes = page.locator(".fld-gap-notes").first();
const frame = page.locator(".fld-frame").first();
await glide(gapNotes, { fx: 0.3, fy: 0.5 });
await zoomOn([gapNotes, frame], 1.22);
await until(voEnd - LEAD - 0.1);
unzoom();

// 3. Exploration Atmosphere
const preset = page.locator("select#atlas-preset");
await click(preset);
await preset.selectOption("ea");
let r = await readVerdict();
await say("ea");
caption(`Exploration Atmosphere · 34% O₂ at 56.5 kPa → nearest test <b>${r.v}</b> · D ${r.D}`);
await zoomOn([page.locator("[data-role='probe']"), verdict], 1.3);
await until(voEnd - LEAD - 0.1);
unzoom();

// 4. published evidence (the line describes the action, so it starts with the move)
await say("pub");
await click(page.getByRole("switch", { name: /Include published evidence/ }));
r = await readVerdict();
caption(`+ published NASA results (Saffire) → still <b>${r.v}</b> · D ${r.D}`);
await until(voEnd - LEAD);

// 5. airflow
await click(page.getByRole("radio", { name: "20 centimetres per second", exact: true }));
r = await readVerdict();
await say("flow");
caption(`Assume 20 cm/s airflow → <b>${r.v}</b> · D ${r.D} · a different scenario, not a correction`);
await zoomOn([page.locator("[data-role='probe']"), verdict], 1.3);
await until(voEnd - LEAD - 0.1);
unzoom();

// 6. the Moon
await click(page.getByRole("radio", { name: "Lunar (0.165 g)", exact: true }));
await readVerdict();
await say("moon");
caption(`The Moon: <b>no PSI tests</b> · nothing is borrowed from other gravity levels`);
await until(voEnd - LEAD);

// 7. the source of the nearest test
await click(page.getByTestId("field-notes").locator("button.atlas-runlink").first());
const spec = page.getByTestId("specimen-card");
await spec.waitFor();
await say("src");
caption(`Every number links to its source: the PSI table row or the NASA paper`);
await zoomOn([spec], 1.35);
await until(voEnd + 0.15);
unzoom();

// 8. Investigations
mark("transition");
await click(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Investigations" }));
await page.getByTestId("ladder-row").first().waitFor();
await inject();
const nInv = await page.getByTestId("ladder-row").filter({ hasText: /PSI-\d/ }).count();
await say("inv");
caption(`Investigations: all <b>${nInv}</b> NASA PSI combustion studies, ranked for your scenario`);
await page.getByTestId("ladder").evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 150, behavior: "smooth" }));
await sleep(0.75);
await glide(page.getByTestId("ladder-row").nth(1), { fx: 0.3, fy: 0.5 });
await until(voEnd - LEAD - 0.1);

// 9. the Guide, and out
await click(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Guide" }));
mark("transition");
await page.getByRole("heading", { level: 1 }).waitFor();
await inject();
await say("end", 0.25);
caption(`Evidence proximity, not a safety rating · <b>${HOST}</b>`);
if (voEnd > LIMIT - 0.2) throw new Error(`demo: the narration overruns (${voEnd.toFixed(2)} s); tighten the pacing`);
await until(Math.min(LIMIT - 0.15, voEnd + 1.7));
const dur = Math.min(LIMIT, now());
captions.at(-1).b = dur;

await page.close();
await ctx.close();

// ---------------------------------------------------------------- caption plates (site typeface, transparent)
const cp = await browser.newPage({ viewport: { width: W, height: 400 } });
await cp.goto(`${BASE}/method`, { waitUntil: "networkidle" });
for (const [i, c] of captions.entries()) {
  await cp.evaluate((html) => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.innerHTML = `<div id="cap" style="display:inline-block;position:fixed;left:50%;top:40px;transform:translateX(-50%);max-width:1360px;
      padding:16px 30px;border-radius:9px;background:rgba(5,7,10,.88);border:1px solid #3a424b;box-shadow:0 14px 44px rgba(0,0,0,.5);
      color:#eef1f4;font:500 30px/1.32 var(--font-ui),system-ui,sans-serif;text-align:center;white-space:nowrap">${html}</div>
      <style>#cap b{color:#9fe3ef;font-weight:600}</style>`;
  }, c.html);
  await cp.locator("#cap").screenshot({ path: join(tmp, `cap${i}.png`), omitBackground: true });
}
await browser.close();

// ---------------------------------------------------------------- edit
const webm = readdirSync(tmp).find((f) => f.endsWith(".webm"));
if (!webm) throw new Error("demo: no video recorded");
execFileSync(PYTHON, ["scripts/demo/synth_audio.py", tmp, String(Math.ceil(dur) + 1)], { stdio: "inherit" });

// zoom expressions: smooth in (0.55 s) and out (0.45 s) for each window
const num = (x) => x.toFixed(4);
const S = (a, b) => `(st(0,clip(min((it-${num(a)})/0.55,(${num(b)}-it)/0.45),0,1))*0+ld(0)*ld(0)*(3-2*ld(0)))`;
const Z = `1${zooms.map((k) => `+${num(k.z - 1)}*${S(k.a, k.b)}`).join("")}`;
const CX = `(0.5${zooms.map((k) => `+${num(k.cx - 0.5)}*${S(k.a, k.b)}`).join("")})`;
const CY = `(0.5${zooms.map((k) => `+${num(k.cy - 0.5)}*${S(k.a, k.b)}`).join("")})`;

const inputs = ["-ss", tStart.toFixed(3), "-i", join(tmp, webm), "-i", join(tmp, "music.wav")];
let n = 2;
const f = [];
f.push(`[0:v]setpts=PTS-STARTPTS,fps=30,scale=3840:2160:flags=lanczos,zoompan=z='${Z}':x='clip(${CX}*iw-iw/zoom/2,0,iw-iw/zoom)':y='clip(${CY}*ih-ih/zoom/2,0,ih-ih/zoom)':d=1:s=${W}x${H}:fps=30,setsar=1[v0]`);
let vLabel = "v0";
captions.forEach((c, i) => {
  inputs.push("-loop", "1", "-framerate", "30", "-t", dur.toFixed(2), "-i", join(tmp, `cap${i}.png`));
  const a = c.a, b = Math.min(c.b, dur);
  f.push(`[${n}:v]format=rgba,fade=t=in:st=${num(a)}:d=0.2:alpha=1,fade=t=out:st=${num(Math.max(a + 0.2, b - 0.2))}:d=0.2:alpha=1[c${i}]`);
  f.push(`[${vLabel}][c${i}]overlay=x=(W-w)/2:y=H-h-150:shortest=1[v${i + 1}]`);
  vLabel = `v${i + 1}`;
  n++;
});
f.push(`[${vLabel}]format=yuv420p[v]`);

const voLabels = [];
for (const m of marks.filter((x) => x.name === "vo")) {
  inputs.push("-i", `scripts/demo/voice/${m.beat}.flac`);
  const ms = Math.round(m.t * 1000);
  f.push(`[${n}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[vo${n}]`);
  voLabels.push(`[vo${n}]`);
  n++;
}
f.push(`${voLabels.join("")}amix=inputs=${voLabels.length}:normalize=0,highpass=f=70,equalizer=f=3200:t=q:w=1.2:g=2,acompressor=threshold=-20dB:ratio=2.5:attack=5:release=150:makeup=2,apad=whole_dur=${dur.toFixed(2)},asplit=2[voOut][voKey]`);
f.push(`[1:a]volume=0.34,afade=t=in:d=1.0,afade=t=out:st=${num(dur - 1.4)}:d=1.4[mus]`);
f.push(`[mus][voKey]sidechaincompress=threshold=0.02:ratio=7:attack=40:release=450[duck]`);
const sfx = [];
for (const m of marks) {
  let file, vol, shift = 0;
  if (m.name === "click") { file = "click.wav"; vol = 0.42; }
  else if (m.name === "swish") {
    const ms = Math.min(700, Math.max(300, Math.round(m.dur * 10) * 100));
    file = `swish${ms}.wav`; vol = Math.min(0.32, 0.12 + m.dist / 4500);
  } else if (m.name === "transition") { file = "transition.wav"; vol = 0.4; shift = 0.15; }
  else continue;
  inputs.push("-i", join(tmp, file));
  const ms = Math.max(0, Math.round((m.t - shift) * 1000));
  f.push(`[${n}:a]volume=${vol.toFixed(3)},adelay=${ms}|${ms}[s${n}]`);
  sfx.push(`[s${n}]`);
  n++;
}
f.push(`[voOut][duck]${sfx.join("")}amix=inputs=${2 + sfx.length}:normalize=0,atrim=0:${dur.toFixed(2)}[a]`);

mkdirSync(OUT, { recursive: true });
const raw = join(tmp, "raw.mov");
execFileSync(FFMPEG, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", f.join(";"), "-map", "[v]", "-map", "[a]", "-t", dur.toFixed(2),
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "slow", "-c:a", "pcm_s16le", "-ar", "48000", raw], { maxBuffer: 1 << 26 });
const meter = spawnSync(FFMPEG, ["-hide_banner", "-i", raw, "-vn", "-af", "ebur128=framelog=quiet", "-f", "null", "-"], { encoding: "utf8" });
const measured = Number(/I:\s+(-?[\d.]+) LUFS/.exec(meter.stderr)?.[1]);
if (!Number.isFinite(measured)) throw new Error("demo: loudness not measured");
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", raw, "-c:v", "copy", "-af", `volume=${(-16 - measured).toFixed(2)}dB,alimiter=limit=0.84:level=false`,
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart",
  // SI disclosure carried in the file itself (competition rule: AI audio is acknowledged in text and metadata)
  "-metadata", "title=MARGIN demo (NASA Space Apps 2026, Flame in Freefall)",
  "-metadata", "comment=SI disclosure: the narration is AI-generated speech (Kokoro v1.0, open-weight text-to-speech, voice af_heart) reading a script written by the author. The picture is a screen recording of https://margin.adai.systems; its final shot shows the Guide page with an AI-generated illustration (Higgsfield), labelled on screen. Music and interface sounds are synthesised in code. See docs/compliance/si-usage-log.md at https://github.com/ADAI-ALEX/margin",
  "-metadata", "description=Narration: AI-generated voice (Kokoro text-to-speech). Picture: screen recording of margin.adai.systems.",
  join(OUT, "margin-demo-30s.mp4")]);
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-ss", "10.5", "-i", join(OUT, "margin-demo-30s.mp4"), "-frames:v", "1", "-q:v", "2", join(OUT, "margin-demo-poster.jpg")]);
const beats = marks.filter((m) => m.name === "vo").map((m) => `${m.beat}@${m.t.toFixed(1)}`);
console.log(`demo: ${dur.toFixed(2)} s, ${zooms.length} zooms, ${captions.length} captions → ${OUT}/margin-demo-30s.mp4`, beats.join(" "));
rmSync(tmp, { recursive: true, force: true });
