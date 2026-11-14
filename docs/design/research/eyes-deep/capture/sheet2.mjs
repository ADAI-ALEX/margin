// horizontal strip: frames scaled to given width each, with t labels
import { chromium } from "./lib.mjs";
import { readFileSync } from "node:fs";
const [out, cols, cellW, labels, ...files] = process.argv.slice(2);
const L = labels.split(",");
const imgs = files.map((f, i) => `<figure><img src="data:image/jpeg;base64,${readFileSync(f).toString("base64")}"><figcaption>${L[i] ?? ""}</figcaption></figure>`).join("");
const W = +cols * +cellW + (+cols + 1) * 4;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: W, height: 200 }, deviceScaleFactor: 1 });
await p.setContent(`<style>body{margin:0;padding:4px;background:#111;color:#ccc;font:12px/1.2 monospace;display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:4px}figure{margin:0}img{width:100%;display:block}</style>${imgs}`);
await p.screenshot({ path: out, fullPage: true, type: "jpeg", quality: 72 }); await b.close();
