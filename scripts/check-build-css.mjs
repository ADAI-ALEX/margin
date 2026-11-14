/**
 * Post-build guard: the compiled CSS must carry the design tokens from the current app/globals.css.
 * A stale build cache once shipped an old globals.css next to new components (unstyled production
 * site); this fails the build instead of deploying it.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync("app/globals.css", "utf8");
const tokens = ["--canvas", "--text", "--ev", "--scenario"].map((name) => {
  const m = src.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
  if (!m) throw new Error(`check-build-css: ${name} not found in app/globals.css`);
  return `${name}:${m[1].toLowerCase()}`;
});

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".css")) files.push(p);
  }
})(".next/static");

const css = files.map((f) => readFileSync(f, "utf8").toLowerCase()).join("\n");
const missing = tokens.filter((t) => !css.includes(t));
if (!files.length || missing.length) {
  console.error(`check-build-css: built CSS (${files.length} files) is missing ${missing.join(", ") || "everything"}; the build is stale.`);
  process.exit(1);
}
console.log(`check-build-css: ${tokens.length} design tokens present in ${files.length} CSS files.`);
