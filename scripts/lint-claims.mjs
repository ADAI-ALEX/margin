#!/usr/bin/env node
/**
 * Banned-claims lint (Kickoff Pack §B.4, §H.12).
 *
 * MARGIN measures evidence proximity. It must never read as a fire prediction, a safety or risk
 * score, a certification, or a statement that two conditions are equivalent. This lint scans the
 * source text that reaches users and fails (exit 1) on wording that would make such a claim.
 *
 * Scope: app/**, components/**, content/**, lib/** (.ts .tsx .css .md .mdx .json),
 *        plus README.md and docs/submission/** (text we publish).
 * Comments are stripped before matching (they never render). Strings, JSX text and Markdown are kept.
 *
 * Negation: required disclaimers such as "Evidence proximity, not a safety rating" or
 * "Microgravity and Earth results did not bound lunar behaviour" are allowed. A match is treated as
 * negated when a negation word precedes it in the same sentence, or when it sits in a list whose
 * header is negated (e.g. "D is <strong>not</strong>:" followed by <li> items).
 *
 * Allow-list: scripts/claims-allowlist.json. Each entry needs file, text (a substring of the
 * offending line), rule id and a reason. Used for verbatim NASA quotations (e.g. "may not be
 * conservative for flammability in space", NASA/TM-20210011385).
 *
 * Usage: node scripts/lint-claims.mjs [--verbose] [--json] [paths…]
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const VERBOSE = args.includes("--verbose");
const JSON_OUT = args.includes("--json");
const explicit = args.filter((a) => !a.startsWith("--"));

const SCAN_DIRS = ["app", "components", "content", "lib", "docs/submission"];
const SCAN_FILES = ["README.md"];
const EXTS = new Set([".ts", ".tsx", ".css", ".md", ".mdx", ".json"]);
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", ".cache"]);

const NEGATION = /\b(not|never|no|nor|neither|without|cannot|can't|doesn't|does not|do not|did not|didn't|isn't|is not|refuses?|won't|rather than|instead of)\b/i;

/**
 * Rules. `negatable: false` means negation does not excuse the match.
 * `allowIn(file)` exempts whole files (e.g. the Method page may discuss interpolation).
 */
const RULES = [
  { id: "safe", re: /(?<![\w-])safe\b(?!-)/gi, why: "'safe' as a product judgement (B.4)", negatable: true },
  { id: "unsafe", re: /\bunsafe\b/gi, why: "'unsafe' as a product judgement (B.4)", negatable: true },
  { id: "conservative", re: /\bconservative\b/gi, why: "'conservative' as a verdict (B.4); allowed only in an allow-listed NASA quotation", negatable: false },
  { id: "risk-score", re: /\brisk[ -](score|index|rating|level)\b/gi, why: "risk score / index (B.4)", negatable: true },
  { id: "fire-risk", re: /\bfire[ -]risk\b/gi, why: "fire risk (index) (B.4)", negatable: true },
  { id: "safety-score", re: /\bsafe(ty)?[ -](zone|score|rating|index|margin|envelope)s?\b/gi, why: "safety zone/score/rating (B.4); only negated use is allowed", negatable: true },
  { id: "certify", re: /\bcertif(y|ied|ies)\b/gi, why: "certification claim (B.4)", negatable: true },
  // "under-predict" / "over-predict" describe a test method's bias (BASS-II, F5), not MARGIN predicting.
  { id: "predicts", re: /(?<!(under|over)-)\bpredict(s|ed|ing)?\s+(fire|flammab|ignition|burn)/gi, why: "prediction claim (B.4)", negatable: true },
  { id: "bound-lunar", re: /\bbound(s|ed|ing)?\s+(the\s+)?(lunar|moon|partial[- ]g)/gi, why: "claims 0 g / 1 g bound lunar behaviour (R3 §6, Olson & Ferkul Table I)", negatable: true },
  { id: "interpolate", re: /\binterpolat\w*/gi, why: "interpolation outside the Method page or an explicit 'we do not interpolate' (C.7)", negatable: true, allowIn: (f) => f.startsWith(`app${sep}method${sep}`) || f.startsWith("app/method/") },
  { id: "85-habitat", re: /\b85\s?%[^\n]*\bhabitat/gi, why: "CFI-G 85% O₂ gas-flame tests are not habitat evidence (B.4)", negatable: false },
  { id: "test1-safe", re: /\bTest 1\b[^\n]*\b(therefore|so)\s+safe\b/gi, why: "Test 1 … therefore safe (H.12)", negatable: false },
  { id: "efield-equiv", re: /\bE-FIELD\b[^\n]*\b(lunar|partial)[- ]g(ravity)?\s+(equivalent|reproduces)/gi, why: "E-FIELD as partial-g equivalent (H.12)", negatable: false },
  { id: "run-count-2700", re: /(?<![\d.])~?\s?2,?700(?![\d])/g, why: "wrong PSI run count; use data/generated/snapshot.json counts.totalRuns", negatable: false },
  { id: "gravity-slider", re: /\bgravity\s+slider\b/gi, why: "gravity slider (B.4)", negatable: true },
];

// ---------------------------------------------------------------- file discovery
function walk(dir, out) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(name))) out.push(p);
  }
  return out;
}

function targets() {
  if (explicit.length) return explicit.flatMap((p) => { const a = join(ROOT, p); return statSync(a).isDirectory() ? walk(a, []) : [a]; });
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d), []));
  for (const f of SCAN_FILES) if (existsSync(join(ROOT, f))) files.push(join(ROOT, f));
  return files;
}

// ---------------------------------------------------------------- comment stripping (keeps line numbers)
function stripComments(src, ext) {
  if (ext === ".md" || ext === ".mdx" || ext === ".json") {
    return ext === ".json" ? src : src.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
  }
  // Block comments (/* */, including JSX {/* */}) → spaces, preserving newlines.
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  if (ext === ".css") return out;
  // Line comments: `//` not preceded by ':' (URLs) and not inside a quote on the same line (heuristic).
  out = out.split("\n").map((line) => {
    let inS = null;
    for (let i = 0; i < line.length - 1; i++) {
      const c = line[i];
      if (inS) { if (c === "\\") { i++; continue; } if (c === inS) inS = null; continue; }
      if (c === '"' || c === "'" || c === "`") { inS = c; continue; }
      if (c === "/" && line[i + 1] === "/" && line[i - 1] !== ":") return line.slice(0, i);
    }
    return line;
  }).join("\n");
  return out;
}

// ---------------------------------------------------------------- negation context
/**
 * Text from the last sentence boundary up to the match; JSX/HTML tags are transparent.
 * A sentence wrapped over several source lines is followed back up to 3 lines.
 */
function sentenceBefore(lines, i, idx) {
  let head = lines[i].slice(0, idx);
  for (let k = i - 1; k >= Math.max(0, i - 3); k--) {
    if (/[.?!:;{}()\[\],>]\s*$|^\s*$/.test(lines[k])) break; // stop at sentence ends, code punctuation and closing tags
    if (/[.?!]\s/.test(head)) break;
    head = `${lines[k]} ${head}`;
  }
  const s = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "), head.lastIndexOf("! "));
  return head.slice(s >= 0 ? s : 0).replace(/<[^>]*>/g, " ");
}

/** If line i is inside a list (<ul>/<ol> or Markdown bullets), return the list header text. */
function listHeader(lines, i) {
  // JSX/HTML lists
  for (let k = i; k >= Math.max(0, i - 20); k--) {
    if (k < i && /<\/(ul|ol)>/.test(lines[k])) break;
    if (/<(ul|ol)\b/.test(lines[k])) return [lines[k], lines[k - 1] ?? "", lines[k - 2] ?? ""].join(" ");
  }
  // Markdown bullets
  if (/^\s*([-*+]|\d+\.)\s/.test(lines[i])) {
    for (let k = i - 1; k >= Math.max(0, i - 20); k--) {
      if (/^\s*([-*+]|\d+\.)\s/.test(lines[k])) continue;
      if (lines[k].trim() === "") continue;
      return lines[k];
    }
  }
  return "";
}

const isNegatedHeader = (h) => NEGATION.test(h.replace(/<[^>]*>/g, " ")) || /\brefuse\b/.test(h);

// ---------------------------------------------------------------- allow-list
const ALLOW_PATH = join(ROOT, "scripts", "claims-allowlist.json");
const allow = existsSync(ALLOW_PATH) ? JSON.parse(readFileSync(ALLOW_PATH, "utf8")).entries ?? [] : [];
for (const e of allow) {
  if (!e.file || !e.text || !e.rule || !e.reason) {
    console.error(`claims-allowlist.json: every entry needs file, text, rule and reason: ${JSON.stringify(e)}`);
    process.exit(2);
  }
}
const allowUsed = new Set();

// ---------------------------------------------------------------- scan
const violations = [];
const excused = [];
for (const abs of targets()) {
  const rel = relative(ROOT, abs).split(sep).join("/");
  const ext = extname(abs);
  const raw = readFileSync(abs, "utf8");
  const lines = stripComments(raw, ext).split("\n");
  const rawLines = raw.split("\n");
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      for (const m of line.matchAll(rule.re)) {
        const hit = { file: rel, line: i + 1, col: m.index + 1, rule: rule.id, match: m[0], why: rule.why, text: rawLines[i].trim().slice(0, 200) };
        const al = allow.findIndex((e) => e.file === rel && e.rule === rule.id && rawLines[i].includes(e.text));
        if (al >= 0) { allowUsed.add(al); excused.push({ ...hit, by: `allow-list: ${allow[al].reason}` }); continue; }
        if (rule.allowIn?.(rel)) { excused.push({ ...hit, by: "file exempt" }); continue; }
        if (rule.negatable) {
          if (NEGATION.test(sentenceBefore(lines, i, m.index))) { excused.push({ ...hit, by: "negated in sentence" }); continue; }
          const h = listHeader(lines, i);
          if (h && isNegatedHeader(h)) { excused.push({ ...hit, by: "negated list header" }); continue; }
        }
        violations.push(hit);
      }
    }
  });
}

const stale = allow.filter((_, i) => !allowUsed.has(i));

if (JSON_OUT) {
  console.log(JSON.stringify({ violations, excused, staleAllowlistEntries: stale }, null, 2));
} else {
  for (const v of violations) console.log(`${v.file}:${v.line}:${v.col}  [${v.rule}] "${v.match}" — ${v.why}\n    ${v.text}`);
  if (VERBOSE) for (const e of excused) console.log(`ok  ${e.file}:${e.line}  [${e.rule}] "${e.match}" (${e.by})`);
  for (const s of stale) console.log(`warning: unused allow-list entry ${s.file} [${s.rule}] "${s.text}"`);
  console.log(violations.length ? `\nlint:claims — ${violations.length} violation(s).` : `lint:claims — clean (${excused.length} negated/allow-listed occurrence(s); --verbose to list).`);
}
process.exit(violations.length ? 1 : 0);
