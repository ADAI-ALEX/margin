import { chromium } from "./lib.mjs";
import { readFileSync } from "node:fs";
const [q, ...files] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 1 });
for (const f of files) {
  await p.setContent(`<style>body{margin:0}img{display:block}</style><img src="data:image/jpeg;base64,${readFileSync(f).toString("base64")}">`);
  const { w, h } = await p.evaluate(async () => { const i = document.querySelector("img"); await i.decode(); return { w: i.naturalWidth, h: i.naturalHeight }; });
  await p.setViewportSize({ width: w, height: h });
  await p.screenshot({ path: f, type: "jpeg", quality: +q });
}
await b.close();
