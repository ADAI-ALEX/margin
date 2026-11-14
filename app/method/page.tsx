import type { Metadata } from "next";
import Link from "next/link";
import {
  SCALES, AXIS_WEIGHTS, VERDICT_THRESHOLDS, RANK_WEIGHTS, SCALE_SCORE, ROBUSTNESS_FACTORS, UNIT,
  COMPARABLE_FUEL, CONTEXT_FUEL, evaluate, robustness, flowSensitivity,
} from "@/lib/engine";
import { ALL_RUNS, COUNTS, SNAP } from "@/lib/data";
import { HAZARDS, LIMITATIONS, OLSON_FERKUL_2012, PRESETS, PUBLISHED } from "@/content/curated";
import { FUEL_LABEL, GRAVITY_LABEL } from "@/lib/format";
import { DEFAULT_SCENARIO } from "@/lib/state/scenarioQuery";
import type { Scenario } from "@/lib/schema";
import { Breadcrumb, ChartFrame } from "@/components/ui/misc";
import { DocSection, DocTable, DocToc, Formula, Frac, Op, Sqrt, V } from "@/components/docs/doc";
import { buildIllustration } from "@/components/docs/illustrationData";
import DistanceIllustration from "@/components/docs/DistanceIllustration";
import "@/components/docs/docs.css";

export const metadata: Metadata = {
  title: "Method",
  description: "How MARGIN computes evidence distance, verdict classes, robustness and rankings — and what it refuses to claim.",
};

const SECTIONS = [
  ["what", "What D is, and is not"],
  ["space", "Condition space and units"],
  ["gate", "Comparability gate"],
  ["distance", "Evidence distance"],
  ["verdicts", "Verdict classes"],
  ["robustness", "Robustness"],
  ["flow", "The flow assumption"],
  ["gravity", "Gravity regimes"],
  ["map", "The coverage map"],
  ["ranking", "Investigation ranking"],
  ["quality", "Data quality"],
  ["limits", "Limitations"],
  ["refuse", "Claims MARGIN does not make"],
  ["repro", "Reproducibility"],
] as const;
const sec = (id: (typeof SECTIONS)[number][0]) => ({ id, n: SECTIONS.findIndex(([s]) => s === id) + 1, title: SECTIONS.find(([s]) => s === id)![1] });

const f2 = (x: number | null | undefined, d = 2) => (x == null || !Number.isFinite(x) ? "—" : x.toFixed(d));
const int = (x: number | undefined) => (x == null ? "—" : x.toLocaleString("en-GB"));
const factor = (k: number) => (k === 0.5 ? "½×" : `${k}×`);

export default function MethodPage() {
  const ea = PRESETS.find((p) => p.id === "ea")!;
  const base: Scenario = { ...DEFAULT_SCENARIO, o2Pct: ea.o2Pct, pressureKPa: ea.pressureKPa, flowCmS: ea.flowCmS, gravity: ea.gravity };
  const flows = [null, 5, 10, 15, 20, 25, 30];
  const sensPub = flowSensitivity(ALL_RUNS, { ...base, includePublished: true }, flows);
  const sensPsi = flowSensitivity(ALL_RUNS, { ...base, includePublished: false }, flows);
  const fineXing = flowSensitivity(ALL_RUNS, { ...base, includePublished: true }, [5, 7.5, 10, 12.5, 15, 20, 25, 30]).crossings;
  const heroPub = evaluate(ALL_RUNS, { ...base, includePublished: true });
  const heroRobust = robustness(ALL_RUNS, { ...base, includePublished: true });
  const ill = buildIllustration(ALL_RUNS, { ...base, includePublished: true });
  const mylar = OLSON_FERKUL_2012.rows.find((r) => r.material.startsWith("Mylar"));
  const lnR = Math.log(SCALES.pressureRatio);
  const bassMicro = PUBLISHED.find((r) => r.id === "PUB-BASS2:micro-min")?.o2Pct;
  const bass1g = PUBLISHED.find((r) => r.id === "PUB-BASS2:1g-upward")?.o2Pct;
  const bassGap = bassMicro != null && bass1g != null ? bass1g - bassMicro : null;
  const issVsArtemisUnits = Math.log(14.7 / 10.2) / lnR;
  const counts = COUNTS;
  const flagRows = Object.entries(counts.byFlag ?? {}).sort((a, b) => b[1] - a[1]);
  const FLAG_TEXT: Record<string, string> = {
    missing: "A value is absent in the source table (left empty, never filled in).",
    "assumed-value": "A value set by a documented rule rather than read from a cell (e.g. flow 0 for quiescent droplet and burner tests).",
    approximate: "The source gives a range or an approximate value; the first value is used.",
    "suspect-unit": "The column's unit label looks inconsistent with its values; kept but not used for distance.",
    "nominal-value": "Pressure is a nominal value stated by the investigators, not a measurement.",
    "burner-fed-oxidizer": "Inverse flame: the O₂ value is the burner-fed oxidizer stream, not the ambient atmosphere, so it is not placed on the O₂ axis.",
    "ambiguous-unit": "The source unit is ambiguous (e.g. uncalibrated fan setting), so the value is not converted.",
    "text-parsed": "The value was parsed from text in the cell (e.g. \"1 atm\").",
    "duplicate-row": "An exact duplicate of another row in the same table; kept and counted, flagged.",
    "out-of-range": "A value outside physical range (e.g. final O₂ above initial); never used.",
    "derived-value": "The investigators derived this value from another measurement (e.g. O₂ from CO₂ production).",
    "unverified-transcription": "A value whose supporting statement has not yet been checked against its primary source.",
    "limit-value": "A reported flammability limit (a threshold inferred from a test series), not a tested condition.",
    "conflicting-sources": "Sources disagree; the primary table value is used and the alternatives are shown.",
    sentinel: "A placeholder such as −999 in the source.",
  };
  const vt = VERDICT_THRESHOLDS;
  const scaleSpan = vt.near * 2; // display extent of the class scale (DISTANT drawn to twice the NEAR bound)

  return (
    <main id="main" className="ui-page doc">
      <header className="ui-page-head doc-head">
        <Breadcrumb items={[{ label: "Atlas", href: "/" }, { label: "Method" }]} />
        <p className="ui-label doc-kicker">How MARGIN works</p>
        <h1 className="ui-page-title">Method</h1>
        <p className="ui-page-lede">
          MARGIN places NASA combustion test conditions and a crewed-cabin scenario in one condition space and measures how far the scenario is from the
          nearest comparable test. Every step below is deterministic: the same inputs always give the same numbers, and every number on this page is
          computed from the engine and data at build time.
        </p>
        <p className="doc-head-meta">
          <span>Constants from <code className="mono">lib/engine</code></span>
          <span className="num">PSI snapshot {SNAP.fetchedAt.slice(0, 10)}</span>
          <span className="num">{int(counts.totalRuns)} run rows</span>
        </p>
      </header>

      <div className="doc-layout">
        <DocToc sections={SECTIONS} />
        <article className="doc-body">

          <DocSection {...sec("what")}>
            <p className="doc-statement"><strong>D is a measure of evidence coverage.</strong> It answers one question: how far is this scenario from conditions NASA has actually tested, for this kind of fire question, in this gravity regime?</p>
            <p>D is <strong>not</strong>:</p>
            <ul className="doc-refuse">
              <li>a prediction of whether, or how, a fire would ignite, spread or go out;</li>
              <li>a safety score, a risk rating, or a margin of safety;</li>
              <li>a certification or qualification of any environment or material;</li>
              <li>proof that two test conditions are scientifically equivalent. A small D means a similar test exists, not that the outcome would be the same.</li>
            </ul>
          </DocSection>

          <DocSection {...sec("space")}>
            <p>Every test row and every scenario is described on the same axes: O₂ mole fraction (% by volume), total pressure (kPa), ventilation flow (cm/s), gravity regime, and fuel class. Units are converted with fixed constants:</p>
            <DocTable label="Unit conversions" caption={<>Unit conversions (<code className="mono">lib/engine/constants.ts</code>)</>} className="doc-table--narrow">
              <thead><tr><th scope="col">From</th><th scope="col" className="is-num">kPa</th></tr></thead>
              <tbody>
                <tr><th scope="row">1 psia</th><td className="is-num">{UNIT.KPA_PER_PSIA}</td></tr>
                <tr><th scope="row">1 atm</th><td className="is-num">{UNIT.KPA_PER_ATM}</td></tr>
                <tr><th scope="row">1 bar</th><td className="is-num">{UNIT.KPA_PER_BAR}</td></tr>
                <tr><th scope="row">1 mmHg</th><td className="is-num">{UNIT.KPA_PER_MMHG}</td></tr>
                <tr><th scope="row">1 mbar</th><td className="is-num">{UNIT.KPA_PER_MBAR}</td></tr>
              </tbody>
            </DocTable>
            <p>Each value keeps its <strong>basis</strong>: <em>measured</em>; <em>nominal (stated)</em> — a value the investigators state, not a measurement; <em>reported limit</em> — a threshold the authors inferred from a series of tests; or <em>not recorded</em>. The original cell text is kept beside every normalised value, with the conversion applied.</p>
            <p>Three rules prevent values being read as something they are not:</p>
            <ul className="doc-rules">
              <li><strong>Missing values are never inferred.</strong> If a table does not record pressure, the run has no pressure. A nominal pressure is used only where the investigators state one.</li>
              <li><strong>Burner-fed oxidizer is not cabin O₂.</strong> In inverse-flame tests (ACME CFI-G and Flame Design) the O₂ fraction describes the gas fed through the burner into a fuel/diluent chamber. Those {int(counts.burnerFedOxidizerRuns)} runs are not placed on the ambient O₂ axis.</li>
              <li><strong>Reported limits are not tests.</strong> Published limiting-O₂ values are shown as separate marks and never used as the nearest evidence.</li>
            </ul>
          </DocSection>

          <DocSection {...sec("gate")}>
            <p>Before any distance is computed, a run must pass a gate. A gas-burner flame is never counted as evidence about cabin fabrics, and no distance is ever computed across gravity regimes.</p>
            <DocTable label="Fuel classes counted as evidence" caption={<>Fuel classes counted as evidence, by question (<code className="mono">lib/engine/gate.ts</code>)</>}>
              <thead><tr><th scope="col">Question</th><th scope="col">Comparable</th><th scope="col">Context only (never sets the verdict)</th></tr></thead>
              <tbody>
                {HAZARDS.map((h) => (
                  <tr key={h.id}>
                    <th scope="row">{h.label}</th>
                    <td>{COMPARABLE_FUEL[h.id].map((f) => FUEL_LABEL[f]).join(", ")}{h.id === "smoke" ? " — solids only when they carry smoke or alarm measurements" : ""}</td>
                    <td>{CONTEXT_FUEL[h.id].length ? CONTEXT_FUEL[h.id].map((f) => FUEL_LABEL[f]).join(", ") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </DocTable>
            <ol className="doc-steps">
              <li>Planned experiments are never evidence. Published results (not in PSI) count only when you include them.</li>
              <li>The material filter (thin / thick) narrows solid runs; unclassified solids stay in.</li>
              <li>A run with no recorded O₂ cannot be placed and is not compared. Otherwise a run matched on pressure alone could look deceptively close. This is why the smoke-detector tests (SAME, SAME-R), which record no O₂, give the verdict NONE rather than borrowing a verdict from flammability burns.</li>
              <li>Reported limit values are set aside as limits.</li>
              <li>A run tested in a different gravity regime is listed under that regime and never compared.</li>
            </ol>
          </DocSection>

          <DocSection {...sec("distance")}>
            <p>For a comparable run <em>r</em> and scenario <em>s</em>, each axis gap is divided by a scale, and D is the root of the sum of squares:</p>
            <Formula
              label="Evidence distance"
              lines={[
                { key: "D", main: true, content: <><V>D</V><Op>=</Op><Sqrt><V s="O₂">w</V><Op>·</Op><V>ΔO₂</V><sup>2</sup><Op>+</Op><V s="P">w</V><Op>·</Op><V>ΔP</V><sup>2</sup><Op>+</Op><V s="U">w</V><Op>·</Op><V>ΔU</V><sup>2</sup></Sqrt></> },
                { key: "o2", content: <><V>ΔO₂</V><Op>=</Op><Frac num={<><V s="r">O₂</V><Op>−</Op><V s="s">O₂</V></>} den={<span className="num">{SCALES.o2Pts}</span>} /></> },
                { key: "p", content: <><V>ΔP</V><Op>=</Op><Frac num={<>ln(<V s="r">P</V> / <V s="s">P</V>)</>} den={<>ln <span className="num">{SCALES.pressureRatio}</span></>} /></> },
                { key: "u", content: <><V>ΔU</V><Op>=</Op><Frac num={<><V s="r">U</V><Op>−</Op><V s="s">U</V></>} den={<span className="num">{SCALES.flowCmS}</span>} /></> },
              ]}
              symbols={[
                { key: "D", term: <V>D</V>, def: <>evidence distance from the scenario to one comparable run, in scale units (dimensionless)</> },
                { key: "rs", term: <><V>r</V>, <V>s</V></>, def: <>a comparable run (a tested condition) and the scenario</> },
                { key: "o2", term: <V>O₂</V>, def: <>O₂ mole fraction, % by volume; its gap is in percentage points, divided by the O₂ scale of <span className="num">{SCALES.o2Pts}</span> points</> },
                { key: "p", term: <V>P</V>, def: <>total pressure, kPa; compared as a ratio on a log scale, one unit being a pressure ratio of <span className="num">×{SCALES.pressureRatio}</span></> },
                { key: "u", term: <V>U</V>, def: <>ventilation flow, cm/s, divided by the flow scale of <span className="num">{SCALES.flowCmS}</span> cm/s; compared only if both flows are numeric</> },
                { key: "gaps", term: <><V>ΔO₂</V>, <V>ΔP</V>, <V>ΔU</V></>, def: <>signed axis gaps in scale units (run minus scenario)</> },
                { key: "w", term: <><V s="O₂">w</V>, <V s="P">w</V>, <V s="U">w</V></>, def: <>axis weights: <span className="num">{AXIS_WEIGHTS.o2}</span>, <span className="num">{AXIS_WEIGHTS.pressure}</span> and <span className="num">{AXIS_WEIGHTS.flow}</span></> },
              ]}
              note={<>The D of a scenario is the smallest D over the comparable runs in its gravity regime.</>}
            />
            <p>One unit of D is a {SCALES.o2Pts}-point O₂ difference, or a {Math.round((SCALES.pressureRatio - 1) * 100)}% pressure ratio, or a {SCALES.flowCmS} cm/s flow difference. The scales are expert judgement, chosen to be commensurate with published effect sizes:</p>
            <ul className="doc-rules">
              <li><strong>{SCALES.o2Pts} points of O₂</strong> — the order of published gravity-induced shifts in limiting O₂: {mylar ? <>for {mylar.material.split(" ")[0]}, the Moon value sits {f2(mylar.uloi.earth - mylar.uloi.moon, 1)} points below 1 g</> : null} (Olson &amp; Ferkul, Table I), {bassGap != null && <> and {f2(bassGap, 1)} points separate the BASS-II 0 g and 1 g limits (BASS-II summary report)</>}.</li>
              <li><strong>×{SCALES.pressureRatio} pressure</strong> — on this scale, 10.2 psia versus 14.7 psia is {f2(issVsArtemisUnits, 1)} units.</li>
              <li><strong>{SCALES.flowCmS} cm/s flow</strong> — the BASS-II flammability boundary is U-shaped in flow, with its minimum at low ventilation speeds (BASS-II summary report).</li>
            </ul>
            <p><strong>Missing axes.</strong> If either side lacks an axis, that axis is left out and the match is labelled <em>partial</em> with the axes used. Leaving an axis out can only lower D, so MARGIN also reports the best <em>fully compared</em> test whenever the nearest is partial. Quiescent versus ventilated flow is a categorical mismatch: the flow gap is not computed and the mismatch is shown. Ties are broken complete-before-partial, then by run id.</p>
            {ill && (
              <ChartFrame
                className="doc-figure"
                id="distance-illustration"
                title="Illustration of the method, not data"
                definition={<>The D ≤ {vt.direct} and D ≤ {vt.near} regions around one example test, drawn by the engine on the O₂ × pressure plane, with all three scales at {ROBUSTNESS_FACTORS.map(factor).join(", ")} their defaults. Change the scales or the probe&rsquo;s flow to see how the regions and the probe&rsquo;s D respond.</>}
                source={<>Example test: <span className="mono">{ill.test.id}</span>{ill.test.material ? <> ({ill.test.material})</> : null}, {ill.test.o2}% O₂, {ill.test.p} kPa, {ill.test.flow ?? "—"} cm/s, microgravity, the nearest comparable test to the Exploration Atmosphere with published evidence included. Probe at the Exploration Atmosphere&rsquo;s {ill.probe.o2}% O₂ and {ill.probe.p} kPa. Computed with <code className="mono">evaluate</code>, <code className="mono">distance</code> and <code className="mono">distanceField</code> from <code className="mono">lib/engine</code>. One test only: the Atlas map uses every comparable run. Not a hazard map.</>}
              >
                <DistanceIllustration data={ill} />
              </ChartFrame>
            )}
          </DocSection>

          <DocSection {...sec("verdicts")}>
            <figure className="doc-scale" aria-labelledby="doc-scale-cap">
              <div className="doc-scale-bar" style={{ gridTemplateColumns: `${vt.direct}fr ${vt.near - vt.direct}fr ${scaleSpan - vt.near}fr` }} aria-hidden="true">
                <span className="doc-scale-seg doc-scale-seg--direct">DIRECT</span>
                <span className="doc-scale-seg doc-scale-seg--near">NEAR</span>
                <span className="doc-scale-seg doc-scale-seg--distant">DISTANT</span>
              </div>
              <div className="doc-scale-ticks" aria-hidden="true">
                <span className="num" style={{ left: "0%" }}>0</span>
                <span className="num" style={{ left: `${(vt.direct / scaleSpan) * 100}%` }}>{vt.direct}</span>
                <span className="num" style={{ left: `${(vt.near / scaleSpan) * 100}%` }}>{vt.near}</span>
                <span className="doc-scale-axis" style={{ right: "0%" }}>D →</span>
              </div>
              <figcaption id="doc-scale-cap" className="doc-scale-cap">
                Classes on the D axis: DIRECT up to {vt.direct}, NEAR up to {vt.near}, DISTANT beyond. NONE sits off the axis: no comparable test exists.
              </figcaption>
            </figure>
            <DocTable label="Verdict classes" caption="Classes of the nearest comparable test (boundaries inclusive)">
              <thead><tr><th scope="col">Class</th><th scope="col">Condition</th><th scope="col">Reads as</th></tr></thead>
              <tbody>
                <tr><th scope="row" className="doc-class">DIRECT</th><td className="num doc-nowrap">D ≤ {vt.direct}</td><td>A comparable test lies within one scale unit on the compared axes.</td></tr>
                <tr><th scope="row" className="doc-class">NEAR</th><td className="num doc-nowrap">{vt.direct} &lt; D ≤ {vt.near}</td><td>Comparable tests are nearby but differ noticeably on at least one axis.</td></tr>
                <tr><th scope="row" className="doc-class">DISTANT</th><td className="num doc-nowrap">D &gt; {vt.near}</td><td>The nearest comparable test is far from the scenario.</td></tr>
                <tr><th scope="row" className="doc-class">NONE</th><td>no comparable test</td><td>Nothing in this gravity regime passes the gate for this question.</td></tr>
              </tbody>
            </DocTable>
            <p className="doc-note">These are classes defined by MARGIN&rsquo;s method — the scales and thresholds above. They are not established scientific categories, and they say nothing about how a fire would behave.</p>
          </DocSection>

          <DocSection {...sec("robustness")}>
            <p>Because the scales are judgement, every verdict is recomputed with each of the three scales at {ROBUSTNESS_FACTORS.map(factor).join(", ")} its default ({ROBUSTNESS_FACTORS.length}³ = {ROBUSTNESS_FACTORS.length ** 3} combinations; the pressure ratio is raised to the power of the factor). If all combinations agree, the verdict is labelled <em>robust</em>; otherwise <em>sensitive</em>, with the range of classes.</p>
            <p className="doc-example">
              <span className="ui-label">Example</span>
              <span>The Exploration Atmosphere ({ea.o2Pct}% O₂, {ea.pressureKPa} kPa, {ea.flowCmS} cm/s, {GRAVITY_LABEL[ea.gravity].toLowerCase()}, published evidence included): <strong>{heroRobust.robust ? "robust" : "sensitive"}</strong>, <span className="num">{Object.entries(heroRobust.verdicts).filter(([, n]) => n > 0).map(([v, n]) => `${v} ${n}`).join(" · ")}</span> of <span className="num">{heroRobust.combos}</span>; D spans <span className="num">{f2(heroRobust.Drange?.[0])}–{f2(heroRobust.Drange?.[1])}</span>.</span>
            </p>
          </DocSection>

          <DocSection {...sec("flow")}>
            <p>Ventilation flow is an input you choose. MARGIN&rsquo;s presets use {ea.flowCmS} cm/s. Because flow is one of the three axes, the assumed flow can move a verdict across a class boundary. The table shows how D for the Exploration Atmosphere changes with the assumed flow, with everything else fixed.</p>
            <DocTable label="Flow sensitivity of the Exploration Atmosphere" caption={<>Exploration Atmosphere ({ea.o2Pct}% O₂, {ea.pressureKPa} kPa, microgravity, material flammability): D to the nearest comparable test by assumed flow</>}>
              <thead><tr><th scope="col">Assumed flow</th><th scope="col" className="is-num">D, PSI only</th><th scope="col">Class</th><th scope="col" className="is-num">D, with published</th><th scope="col">Class</th><th scope="col">Nearest (with published)</th></tr></thead>
              <tbody>
                {flows.map((u, i) => {
                  const a = sensPsi.points[i], b = sensPub.points[i];
                  return (
                    <tr key={String(u)} className={u === ea.flowCmS ? "doc-row-current" : undefined}>
                      <th scope="row" className="doc-nowrap">{u == null ? "quiescent" : `${u} cm/s`}{u === ea.flowCmS ? " (preset)" : ""}</th>
                      <td className="is-num">{f2(a.D)}</td><td className="doc-nowrap">{a.verdict}{a.partial ? " (partial)" : ""}</td>
                      <td className="is-num">{f2(b.D)}</td><td className="doc-nowrap">{b.verdict}{b.partial ? " (partial)" : ""}</td>
                      <td className="mono doc-nowrap">{b.nearestId ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </DocTable>
            <p>
              With published evidence, the class changes at {fineXing.map((c, i) => <span key={i}>{i ? " and " : ""}<span className="num">{c.flowCmS.toFixed(2)}</span> cm/s ({c.from} → {c.to})</span>)}.
              At the {ea.flowCmS} cm/s preset the verdict is <strong>{heroPub.verdict}</strong> with D = <span className="num">{f2(heroPub.nearest?.d.D)}</span>, just above the {vt.near} boundary.
              MARGIN keeps the preset at {ea.flowCmS} cm/s and shows this sensitivity rather than choosing a flow that produces a more favourable class. A NEAR result at 20 cm/s describes a different scenario; it does not correct the {ea.flowCmS} cm/s result.
            </p>
          </DocSection>

          <DocSection {...sec("gravity")}>
            <p>Gravity is categorical: microgravity, lunar, Martian and Earth gravity are separate regimes. There is no gravity slider and no line, curve or estimate between regimes. Every PSI run in this snapshot was flown in microgravity; PSI holds {COUNTS.partialGravityRuns === 0 ? "no" : COUNTS.partialGravityRuns} partial-gravity combustion runs.</p>
            {mylar && <p>Why not interpolate? In NASA drop-tower tests of {mylar.material} at {mylar.pressurePsia} psia, the limiting O₂ at lunar gravity ({mylar.uloi.moon}%) was below both the 0 g value ({mylar.uloi.micro}%) and the 1 g value ({mylar.uloi.earth}%) — {OLSON_FERKUL_2012.source.ref}, {OLSON_FERKUL_2012.source.page}. Microgravity and Earth results did not bound lunar behaviour for this material, so MARGIN does not estimate any regime from the others.</p>}
          </DocSection>

          <DocSection {...sec("map")}>
            <p>The shaded plane on the Atlas is D evaluated at every point of the O₂ × pressure window, with the scenario&rsquo;s flow, gravity, question and material held fixed. Dark shading is D ≤ {vt.direct}, light is D ≤ {vt.near}, hatching is further. Only runs with both O₂ and pressure recorded shape the map; runs lacking a pressure still count for the verdict as partial matches and are disclosed beneath the map. The dashed contours show where the {vt.near} boundary would sit if the O₂ and pressure scales were halved or doubled. It is a map of where tests exist, not a hazard map.</p>
          </DocSection>

          <DocSection {...sec("ranking")}>
            <Formula
              label="Investigation ranking"
              lines={[
                { key: "R", main: true, content: <><V>R</V><Op>=</Op><span className="num">100</span><Op>×</Op>( <span className="num">{RANK_WEIGHTS.P}</span><Op>·</Op><V>P</V><Op>+</Op><span className="num">{RANK_WEIGHTS.H}</span><Op>·</Op><V>H</V><Op>+</Op><span className="num">{RANK_WEIGHTS.S}</span><Op>·</Op><V>S</V><Op>+</Op><span className="num">{RANK_WEIGHTS.C}</span><Op>·</Op><V>C</V><Op>+</Op><span className="num">{RANK_WEIGHTS.M}</span><Op>·</Op><V>M</V> )</> },
              ]}
              symbols={[
                { key: "R", term: <V>R</V>, def: <>rank score of an investigation for the scenario, 0–100 (weights renormalised to sum to 1)</> },
                { key: "P", term: <><V>P</V> · proximity</>, def: <>exp(−D<sub>min</sub>) over the investigation&rsquo;s comparable runs; 0 if none.</> },
                { key: "H", term: <><V>H</V> · question match</>, def: <>1 if the investigation primarily addresses the question, 0.5 if secondarily, else 0 (curated hazard map).</> },
                { key: "S", term: <><V>S</V> · scale</>, def: <>large-scale {SCALE_SCORE.large}, bench {SCALE_SCORE.bench}, ground {SCALE_SCORE.ground}.</> },
                { key: "C", term: <><V>C</V> · coverage</>, def: <>share of the investigation&rsquo;s runs within NEAR of the scenario.</> },
                { key: "M", term: <><V>M</V> · measurements</>, def: <>1 if an outcome plus a question-relevant metric is recorded, 0.5 if outcome only, else 0.</> },
              ]}
            />
            <p>Investigations with at least one comparable run always rank above those with none; the latter are ranked on metadata only and labelled so. The weights can be changed in the interface.</p>
          </DocSection>

          <DocSection {...sec("quality")}>
            <p>
              PSI run tables fetched {SNAP.fetchedAt.slice(0, 10)}: <strong>{int(counts.totalRuns)}</strong> run rows ({int(counts.distinctRuns)} distinct; {int(counts.duplicateRows)} exact duplicates flagged and kept),
              plus {int(counts.totalSummaryRows)} summary rows that describe test series rather than single runs and are never treated as runs. {int(counts.placeable ?? counts.plottable)} runs record both O₂ and pressure and can be placed on the map.
              {counts.blankLinesIgnored ? <> The ACME CFI-G inverse-flame file contains {int(counts.blankLinesIgnored)} trailing blank lines, which are ignored.</> : null}
            </p>
            <DocTable label="Flags carried by PSI runs" caption="Flags carried by PSI runs (a run can carry several)">
              <thead><tr><th scope="col">Flag</th><th scope="col" className="is-num">Runs</th><th scope="col">Meaning</th></tr></thead>
              <tbody>{flagRows.map(([k, v]) => <tr key={k}><th scope="row" className="mono doc-nowrap">{k}</th><td className="is-num">{int(v)}</td><td>{FLAG_TEXT[k] ?? ""}</td></tr>)}</tbody>
            </DocTable>
            <DocTable label="Experimental tables read from PSI" caption="Experimental tables read from PSI">
              <thead><tr><th scope="col">Investigation</th><th scope="col">File</th><th scope="col">Kind</th><th scope="col" className="is-num">Rows</th><th scope="col" className="is-num">Kept</th></tr></thead>
              <tbody>{SNAP.tableStats.map((t) => <tr key={t.file}><td className="doc-nowrap">{t.investigation}</td><td className="mono">{t.file}</td><td>{t.kind}</td><td className="is-num">{t.dataRows}</td><td className="is-num">{t.kept}</td></tr>)}</tbody>
            </DocTable>
          </DocSection>

          <DocSection {...sec("limits")}>
            <ul className="doc-rules">{LIMITATIONS.map((l) => <li key={l}>{l}</li>)}</ul>
          </DocSection>

          <DocSection {...sec("refuse")}>
            <ul className="doc-refuse">
              <li>That any atmosphere, material or vehicle is acceptable, or not, for crewed use.</li>
              <li>That a scenario close to a test would behave like that test.</li>
              <li>That results at 0 g and 1 g bracket lunar or Martian behaviour.</li>
              <li>That a gas-burner or droplet flame says anything about cabin materials.</li>
              <li>That a planned experiment is evidence.</li>
              <li>Any flammability prediction for an untested material or condition.</li>
            </ul>
          </DocSection>

          <DocSection {...sec("repro")}>
            <p>The data pipeline (<code className="mono">pipeline/</code>) downloads the PSI combustion records and experimental tables once and writes a versioned snapshot; the app never calls NASA at run time. The engine (<code className="mono">lib/engine</code>) is pure TypeScript with unit and science tests, and the constants on this page are read from it directly. Every scenario is encoded in the page URL, so a shared link reproduces the same result. See <Link href="/sources">Sources</Link> for every reference.</p>
          </DocSection>
        </article>
      </div>
    </main>
  );
}
