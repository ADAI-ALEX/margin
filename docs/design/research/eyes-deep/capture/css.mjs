import { chromium, open } from "./lib.mjs";
import { writeFileSync } from "node:fs";
const b = await chromium.launch();
const { p } = await open(b);
const r = await p.evaluate(async () => {
  const rules = [], kf = [], sheets = [];
  const take = (list, href) => { for (const rule of list) {
    if (rule.cssRules && !rule.selectorText && rule.type !== 7) take(rule.cssRules, href);
    if (rule.type === 7) kf.push(rule.cssText.slice(0, 300));
    if (rule.style && rule.selectorText) { const t = rule.style.transition || rule.style.transitionDuration || rule.style.animation || rule.style.animationName; if (t) rules.push({ sel: rule.selectorText.slice(0, 160), transition: rule.style.transition, dur: rule.style.transitionDuration, ease: rule.style.transitionTimingFunction, anim: rule.style.animation }); }
  } };
  for (const sh of document.styleSheets) { try { sheets.push(sh.href); take(sh.cssRules, sh.href); } catch (e) { sheets.push("BLOCKED " + sh.href); } }
  // also root custom props
  const rootStyle = getComputedStyle(document.documentElement); const vars = {};
  for (const sh of document.styleSheets) { try { for (const rule of sh.cssRules) if (rule.selectorText === ":root" && rule.style) for (const n of rule.style) if (n.startsWith("--")) vars[n] = rule.style.getPropertyValue(n).trim(); } catch {} }
  return { sheets, rules, kf, vars };
});
writeFileSync(process.argv[2] + "/css-rules.json", JSON.stringify(r, null, 1));
console.log(r.sheets, r.rules.length, r.kf.length, Object.keys(r.vars).length);
await b.close();
