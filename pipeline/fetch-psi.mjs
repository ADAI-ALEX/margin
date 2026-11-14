// Prototype-only PSI snapshot fetcher (design exploration).
// Pulls the 24 combustion-science investigation records and every file listed
// in each record's experimentalTable[] from NASA PSI's public JSON backend.
// The production pipeline (pipeline/, WS1) supersedes this script.
// Usage: node pipeline/fetch-psi.mjs
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, ".cache", "raw");
const BASE = "https://psi.nasa.gov/geode-py/ws";
const UA = { "User-Agent": "MARGIN-hackathon-build" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, { timeout = 120_000, tries = 3, as = "text" } = {}) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeout) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return as === "buf" ? Buffer.from(await res.arrayBuffer()) : await res.text();
    } catch (e) {
      console.error(`  attempt ${i} failed for ${url.slice(0, 120)}: ${e.message}`);
      if (i === tries) throw e;
      await sleep(2000 * 2 ** i);
    }
  }
}
const exists = (p) => access(p).then(() => true, () => false);

await mkdir(OUT, { recursive: true });
const searchPath = path.join(OUT, "search.json");
let search;
if (await exists(searchPath)) search = JSON.parse(await readFile(searchPath, "utf8"));
else {
  search = JSON.parse(await get(`${BASE}/repo/search?term=&from=0&size=100&ffield=Research%20Area&fvalue=combustion%20science`));
  await writeFile(searchPath, JSON.stringify(search));
}
const ids = search.hits.hits.map((h) => h._source.Accession);
console.log(`search: ${ids.length} accessions`);

const manifest = [];
for (const id of ids) {
  const recPath = path.join(OUT, `${id}.record.json`);
  let rec;
  if (await exists(recPath)) rec = JSON.parse(await readFile(recPath, "utf8"));
  else {
    const t0 = Date.now();
    rec = JSON.parse(await get(`${BASE}/repo/investigations/${id}`));
    // Drop the bulky file-delta lists; keep metadata.
    const slim = { ...rec };
    for (const k of ["added", "modified", "removed"]) if (Array.isArray(slim[k])) { slim[`${k}Count`] = slim[k].length; delete slim[k]; }
    await writeFile(recPath, JSON.stringify(slim));
    rec = slim;
    console.log(`${id}: record ${(Date.now() - t0) / 1000}s`);
    await sleep(2000);
  }
  const tables = (rec.experimentalTable || []).map((t) => (typeof t === "string" ? t : t.file_name || t.fileName || t.name || t.key)).filter(Boolean);
  for (const fname of tables) {
    const base = path.basename(fname);
    const fpath = path.join(OUT, base);
    if (!(await exists(fpath))) {
      const signed = (await get(`${BASE}/studies/${id}/download?file=${encodeURIComponent(base)}&redirect=false`)).trim().replace(/^"|"$/g, "");
      const buf = await get(signed, { as: "buf" });
      await writeFile(fpath, buf);
      console.log(`${id}: ${base} ${buf.length} B`);
      await sleep(2000);
    }
    manifest.push({ id, file: base, fetchedAt: new Date().toISOString() });
  }
  if (!tables.length) manifest.push({ id, file: null, raw: JSON.stringify(rec.experimentalTable ?? null).slice(0, 200) });
}
await writeFile(path.join(OUT, "manifest.json"), JSON.stringify({ fetchedAt: new Date().toISOString(), manifest }, null, 1));
console.log("done", manifest.length);
