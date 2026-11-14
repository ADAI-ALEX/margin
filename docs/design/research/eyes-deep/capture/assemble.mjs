import { readFileSync, writeFileSync } from "node:fs";
const J = (f) => JSON.parse(readFileSync(f, "utf8"));
const d1 = J("m-d1.json"), d2 = J("m-d2.json"), d3 = J("m-d3.json"), d4 = J("m-d4.json"), d5 = J("m-d5.json"), m1 = J("m-m1.json"), css = J("css-rules.json");
const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === null || v === undefined || v === "" ? undefined : v)));
// strip noisy fields from measure() results
const slim = (grp) => { const out = {}; for (const [k, v] of Object.entries(grp || {})) { if (!v || !v.selector) { out[k] = v; continue; } if (v.found === false) { out[k] = { selector: v.selector, found: false }; continue; }
  const { cls, tDur, tEase, ...r } = v; if (r.transition === "all") delete r.transition; if (r.radius === "0px") delete r.radius; if (r.shadow === "none") delete r.shadow; if (r.backdrop === "none") delete r.backdrop; if (r.border === "none") delete r.border; if (r.bg === "rgba(0, 0, 0, 0)") delete r.bg; if (r.opacity === "1") delete r.opacity; if (r.padding === "0px") delete r.padding; if (r.tt === "none") delete r.tt; r.font = (r.font || "").split(",")[0].replace(/"/g, ""); out[k] = r; } return clean(out); };
// samples -> delta rows
const delta = (s) => { if (!s) return s; let prev = {}; const rows = s.changes.map((r) => { const d = { t: r.t }; for (const [k, v] of Object.entries(r)) { if (k === "t") continue; if (JSON.stringify(v) !== JSON.stringify(prev[k])) d[k] = v ? v.slice(0, 7).join("|") : null; } prev = r; return d; }); return { fps: s.fps, sampleCount: s.n, legend: "x|y|w|h|opacity|transform|visibility(H=hidden); only changed keys per row; t in ms after the action", rows }; };
const rel = /featured|story|content-panel|panel-container|layer-panel|mega-menu|menu-container|\.search|settings|tippy|pioneer-label|time-controls|c-menu|offset-right|main-viewport|knob|rate|clock-shortcut|toast|button\.icon-close/;
const out = {
  meta: { date: "2026-11-14", url: "https://eyes.nasa.gov/apps/solar-system/", browser: "Playwright 1.65 Chromium, channel 'chromium' (new headless), args --use-angle=metal --ignore-gpu-blocklist --enable-gpu; WebGL renderer 'ANGLE Metal Renderer: Apple M1 Pro'; rAF ~60 fps. Default headless shell rendered WebGL via SwiftShader at 2-13 fps and was only used for the first probe.", viewports: { desktop: "1440x900 dpr1", mobile: "390x844 dpr1 isMobile hasTouch, iOS Safari UA" }, notes: "Boxes are getBoundingClientRect in CSS px. Timelines are requestAnimationFrame samples of getBoundingClientRect + computed opacity/transform. Captures referenced by filename in this folder." },
  tokens: { rootCustomProperties: css.vars },
  desktop: {
    home: slim(Object.fromEntries(Object.entries(d1.home).filter(([k]) => k !== "labelCounts"))), homeLabelCounts: d1.home.labelCounts,
    hoverPlanetMars: { textOpacityBefore: d1.hoverMars.textOpacityBefore, ...slim(d1.hoverMars.after), cursor: d1.hoverMars.cursor, capture: "desktop-02-hover-mars.jpg" },
    hoverSpacecraftParker: { ...slim(d3.scHover), capture: "desktop-04a-hover-spacecraft.jpg" },
    selectMars: { urlBefore: d1.selectMarsUrl.before, urlAfter: d1.selectMarsUrl.after, camera: d5.cameraMars, captures: ["desktop-03-select-mars-seq-sheet.jpg", "desktop-03a-select-mars-immediate.jpg", "desktop-03b-select-mars-settled.jpg"], timeline: delta(d2.selectMars) },
    detailPanel: slim(d2.detail), detailPanelSpacecraft: { url: d3.scUrl, ...slim(d3.scPanel), captures: ["desktop-04b-select-spacecraft-immediate.jpg", "desktop-04c-select-spacecraft-settled.jpg"] },
    detailCollapse: { capture: "desktop-11-detail-collapse-seq-f0..f5.jpg (frames at t=0,82,162,241,322,403 ms)", timeline: delta(d2.collapseDetail) },
    detailExpandFrames: { capture: "desktop-11b-detail-expand-seq-sheet.jpg", frameTimesMs: d3.detailExpandFrames },
    goHomeViaBreadcrumb: { urlAfter: d2.homeUrl, timeline: delta(d2.goHome) },
    storyCollapse: { capture: "desktop-09-stories-collapsed.jpg", collapsedState: slim(d2.storyCollapsed), timeline: delta(d2.collapseStory) },
    storyExpand: { timeline: delta(d2.expandStory) },
    railTooltip: { attrs: d4.tooltipAttrs, box: slim(d4.tooltip), allTooltips: d4.tooltipAll, timeline: delta(d4.tooltipTimeline), railHover: { tooltipEls: d3.railHover.tooltipEls, buttonStyleOnHover: d3.railHoverStyle }, captures: ["desktop-05a-rail-hover-layers.jpg", "desktop-05c-rail-tooltip-zoom.jpg"] },
    layers: { ...slim(d3.layers), openTimeline: delta(d3.layersOpen), escapeResult: d3.layersEsc, capture: "desktop-05b-layers-open.jpg" },
    menu: { ...slim(d3.menu), mask: d3.menuMask, openTimeline: delta(d3.menuOpen), escapeResultClass: d3.menuEsc, capture: "desktop-06-menu-open.jpg" },
    search: { focusOnOpen: d3.searchFocus, empty: slim(d3.searchEmpty), withQuery: slim(d3.searchMars), arrowDown: d3.searchArrow, escape: d3.searchEsc, captures: ["desktop-07a-search-open.jpg", "desktop-07b-search-mars.jpg", "desktop-07c-search-arrowdown.jpg", "desktop-07d-search-after-escape.jpg"] },
    time: { hover: slim(d3.timeHover), afterThreeRateIncrements: d3.timeAfterRate, afterRateStyle: slim(d3.timeAfterRateStyle), whileDraggingKnob: d3.timeDragging, afterDragRelease: d3.timeAfterDrag, sliderArrowRight: d3.timeSliderArrow, captures: ["desktop-08a-time-hover.jpg", "desktop-08b-time-rate-increased.jpg", "desktop-08c-time-knob-dragging.jpg", "desktop-08d-time-after-drag.jpg"] },
    storyOpen: { ...d3.storyOpen, hoverCard: slim(d3.storyHover), panel: slim(d3.storyPanel), arrowRight: d3.storyArrow, escape: d3.storyEsc, captures: ["desktop-10a-story-card-hover.jpg", "desktop-10b-story-open-immediate.jpg", "desktop-10c-story-open-settled.jpg"] },
    escapeOnDetailPanel: d2.escape,
    keyboard: { tabSequenceFromLoad: d4.tabSequence, focusableCounts: d4.focusableCounts, canvasKeysArrowWASDPlusMinus: d4.canvasKeys, captures: ["desktop-12-keyboard-tab03.jpg (rail button focused: tooltip, no ring)", "desktop-12-keyboard-tab14.jpg (Menu focused, UA outline)"] },
    labelCollisions: { ...d4.labels, captures: ["desktop-01-home.jpg", "desktop-13a-labels-zoomed-out.jpg", "desktop-13b-labels-zoomed-in.jpg"] },
  },
  mobile: { ...Object.fromEntries(Object.entries(m1).map(([k, v]) => [k, v && v.changes ? delta(v) : (v && typeof v === "object" && Object.values(v).some((x) => x && x.selector) ? slim(v) : v)])),
    timeRate: { note: "rate buttons are hidden (opacity 0, visibility hidden) until the rate text is tapped (adds .touchactive); then two taps on + gave '5 SECS/S'", capture: "mobile-08-time-rate-increased.jpg" } },
  cssRules: { transitionsAndAnimations: css.rules.filter((r) => rel.test(r.sel)).map((r) => clean(r)), keyframes: css.kf.filter((k) => /fade|blink|pulse|flash/.test(k)).map((k) => k.replace(/\s+/g, " ").slice(0, 200)),
    sourceExtracts: {
      ".pioneer-label-div": "--secondaryFadeIn:.35; --secondaryFadeOut:.05; --primaryFadeIn:.75; --primaryFadeOut:.05; --hoverOpacity:1; font-size 14px (16px at >=1025x600); transition: opacity .25s ease-out; &.hidden,&.hiddenByLabelQuadtree{opacity:0;pointer-events:none;transition:opacity .75s ease-out; .icon,.text{opacity:var(--secondaryFadeOut);transition:opacity .75s,transform .75s ease-in-out}}; .icon,.text{opacity:var(--secondaryFadeIn);transition:opacity .25s,transform .25s ease-in-out}; &.planet{letter-spacing:.3em; .icon,.text{opacity:var(--primaryFadeIn)}}",
      ".content-panel-container": "background-color:var(--panelBg) (#181818); width:22rem; position:fixed; left:0; top:8em (>=1025x600); font-family:Inter,Metropolis; transition:'transform height .8s cubic-bezier(.2,.75,0,1) .2s' (invalid shorthand; computed transition is 'all 0s'; the measured collapse slide is script-driven)",
      ".story-block .story-container": "background:var(--grayDarkAlpha) (#25252799); border-radius:3px; margin:10px 0; padding:20px 20px 20px 25px; grid-template-columns:minmax(55%,auto) minmax(40px,100px); :hover{background:var(--horizontalHighlight)}",
      ".story-block .story-title>h2": "font-size:29px; font-weight:300; line-height:95%",
      ".story-block .story-subtitle": "letter-spacing:.6em; text-transform:uppercase (colour var(--spacecraft) #cd9745 measured)",
      ".settings": "transition:transform 1s ease-in-out; .active{animation:fade-in-bottom .5s ease-in-out}; .hidden{animation:fade-out-bottom 1s}; button{outline:0}; button span{opacity:.4}; .vertical .zoom{grid-template-rows:30px 2px 30px}; .container .content{row-gap:2px}",
      ".layer-panel": "background:var(--bgGradient); border-radius:3px; .layers li{opacity:.7;transition:opacity .2s ease-out} li.active,li:hover{opacity:1}",
      ".time-controller button:focus / .eyes-toggle input:focus / .carousel .navigation-button:focus": "outline:0",
      "#main-viewport": "transition-duration .5s ease-out-bezier; .offset-right #main-viewport{left:var(--offset-right) (12vw); transition-delay:.2s; transition-duration:.8s}",
    } },
};
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log((JSON.stringify(out).length / 1024).toFixed(0) + " KB");
