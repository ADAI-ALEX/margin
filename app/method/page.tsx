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

const f2 = (x: number | null | undefined, d = 2) => (x == null || !Number.isFinite(x) ? "—" : x.toFixed(d));
const int = (x: number | undefined) => (x == null ? "—" : x.toLocaleString("en-GB"));

function Sec({ id, n, children }: { id: string; n: number; children: React.ReactNode }) {
  return <h2 id={id}><span className="doc-secno">{String(n).padStart(2, "0")}</span>{children}</h2>;
}

export default function MethodPage() {
  const ea = PRESETS.find((p) => p.id === "ea")!;
  const base: Scenario = { ...DEFAULT_SCENARIO, o2Pct: ea.o2Pct, pressureKPa: ea.pressureKPa, flowCmS: ea.flowCmS, gravity: ea.gravity };
  const flows = [null, 5, 10, 15, 20, 25, 30];
  const sensPub = flowSensitivity(ALL_RUNS, { ...base, includePublished: true }, flows);
  const sensPsi = flowSensitivity(ALL_RUNS, { ...base, includePublished: false }, flows);
  const fineXing = flowSensitivity(ALL_RUNS, { ...base, includePublished: true }, [5, 7.5, 10, 12.5, 15, 20, 25, 30]).crossings;
  const heroPub = evaluate(ALL_RUNS, { ...base, includePublished: true });
  const heroRobust = robustness(ALL_RUNS, { ...base, includePublished: true });
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

  return (
    <main id="main" className="doc">
      <nav className="doc-toc" aria-label="On this page">
        <span className="eyebrow">Method</span>
        <ol>{SECTIONS.map(([id, t]) => <li key={id}><a href={`#${id}`}>{t}</a></li>)}</ol>
      </nav>
      <article className="doc-body">
        <p className="eyebrow doc-kicker">How MARGIN works</p>
        <h1>Method</h1>
        <p className="doc-lede">
          MARGIN places NASA combustion test conditions and a crewed-cabin scenario in one condition space and measures how far the scenario is from the
          nearest comparable test. Every step below is deterministic: the same inputs always give the same numbers, and every number on this page is
          computed from the engine and data at build time.
        </p>

        <Sec id="what" n={1}>What D is, and is not</Sec>
        <div className="callout">
          <p><strong>D is a measure of evidence coverage.</strong> It answers one question: how far is this scenario from conditions NASA has actually tested, for this kind of fire question, in this gravity regime?</p>
        </div>
        <p>D is <strong>not</strong>:</p>
        <ul className="refuse">
          <li>a prediction of whether, or how, a fire would ignite, spread or go out;</li>
          <li>a safety score, a risk rating, or a margin of safety;</li>
          <li>a certification or qualification of any environment or material;</li>
          <li>proof that two test conditions are scientifically equivalent. A small D means a similar test exists, not that the outcome would be the same.</li>
        </ul>

        <Sec id="space" n={2}>Condition space and units</Sec>
        <p>Every test row and every scenario is described on the same axes: O₂ mole fraction (% by volume), total pressure (kPa), ventilation flow (cm/s), gravity regime, and fuel class. Units are converted with fixed constants:</p>
        <div className="doc-tablewrap" tabIndex={0} role="region" aria-label="Unit conversions"><table>
          <caption>Unit conversions (lib/engine/constants.ts)</caption>
          <thead><tr><th scope="col">From</th><th scope="col" className="n">kPa</th></tr></thead>
          <tbody>
            <tr><td>1 psia</td><td className="n">{UNIT.KPA_PER_PSIA}</td></tr>
            <tr><td>1 atm</td><td className="n">{UNIT.KPA_PER_ATM}</td></tr>
            <tr><td>1 bar</td><td className="n">{UNIT.KPA_PER_BAR}</td></tr>
            <tr><td>1 mmHg</td><td className="n">{UNIT.KPA_PER_MMHG}</td></tr>
            <tr><td>1 mbar</td><td className="n">{UNIT.KPA_PER_MBAR}</td></tr>
          </tbody>
        </table></div>
        <p>Each value keeps its <strong>basis</strong>: <em>measured</em>; <em>nominal (stated)</em> — a value the investigators state, not a measurement; <em>reported limit</em> — a threshold the authors inferred from a series of tests; or <em>not recorded</em>. The original cell text is kept beside every normalised value, with the conversion applied.</p>
        <p>Three rules prevent values being read as something they are not:</p>
        <ul>
          <li><strong>Missing values are never inferred.</strong> If a table does not record pressure, the run has no pressure. A nominal pressure is used only where the investigators state one.</li>
          <li><strong>Burner-fed oxidizer is not cabin O₂.</strong> In inverse-flame tests (ACME CFI-G and Flame Design) the O₂ fraction describes the gas fed through the burner into a fuel/diluent chamber. Those {int(counts.burnerFedOxidizerRuns)} runs are not placed on the ambient O₂ axis.</li>
          <li><strong>Reported limits are not tests.</strong> Published limiting-O₂ values are shown as separate marks and never used as the nearest evidence.</li>
        </ul>

        <Sec id="gate" n={3}>Comparability gate</Sec>
        <p>Before any distance is computed, a run must pass a gate. A gas-burner flame is never counted as evidence about cabin fabrics, and no distance is ever computed across gravity regimes.</p>
        <div className="doc-tablewrap" tabIndex={0} role="region" aria-label="Fuel classes counted as evidence"><table>
          <caption>Fuel classes counted as evidence, by question (lib/engine/gate.ts)</caption>
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
        </table></div>
        <ol className="doc-list">
          <li>Planned experiments are never evidence. Published results (not in PSI) count only when you include them.</li>
          <li>The material filter (thin / thick) narrows solid runs; unclassified solids stay in.</li>
          <li>A run with no recorded O₂ cannot be placed and is not compared. Otherwise a run matched on pressure alone could look deceptively close. This is why the smoke-detector tests (SAME, SAME-R), which record no O₂, give the verdict NONE rather than borrowing a verdict from flammability burns.</li>
          <li>Reported limit values are set aside as limits.</li>
          <li>A run tested in a different gravity regime is listed under that regime and never compared.</li>
        </ol>

        <Sec id="distance" n={4}>Evidence distance</Sec>
        <p>For a comparable run <em>r</em> and scenario <em>s</em>, each axis gap is divided by a scale, and D is the root of the sum of squares:</p>
        <code className="formula" tabIndex={0}>{`ΔO₂ = (O₂ᵣ − O₂ₛ) / ${SCALES.o2Pts}            percentage points
ΔP  = ln(Pᵣ / Pₛ) / ln ${SCALES.pressureRatio}        pressure, on a log scale
ΔU  = (Uᵣ − Uₛ) / ${SCALES.flowCmS}             cm/s, only if both flows are numeric

D = √( ${AXIS_WEIGHTS.o2}·ΔO₂² + ${AXIS_WEIGHTS.pressure}·ΔP² + ${AXIS_WEIGHTS.flow}·ΔU² )`}</code>
        <p>One unit of D is a {SCALES.o2Pts}-point O₂ difference, or a {Math.round((SCALES.pressureRatio - 1) * 100)}% pressure ratio, or a {SCALES.flowCmS} cm/s flow difference. The scales are expert judgement, chosen to be commensurate with published effect sizes:</p>
        <ul>
          <li><strong>{SCALES.o2Pts} points of O₂</strong> — the order of published gravity-induced shifts in limiting O₂: {mylar ? <>for {mylar.material.split(" ")[0]}, the Moon value sits {f2(mylar.uloi.earth - mylar.uloi.moon, 1)} points below 1 g</> : null} (Olson &amp; Ferkul, Table I), {bassGap != null && <> and {f2(bassGap, 1)} points separate the BASS-II 0 g and 1 g limits (BASS-II summary report)</>}.</li>
          <li><strong>×{SCALES.pressureRatio} pressure</strong> — on this scale, 10.2 psia versus 14.7 psia is {f2(issVsArtemisUnits, 1)} units.</li>
          <li><strong>{SCALES.flowCmS} cm/s flow</strong> — the BASS-II flammability boundary is U-shaped in flow, with its minimum at low ventilation speeds (BASS-II summary report).</li>
        </ul>
        <p><strong>Missing axes.</strong> If either side lacks an axis, that axis is left out and the match is labelled <em>partial</em> with the axes used. Leaving an axis out can only lower D, so MARGIN also reports the best <em>fully compared</em> test whenever the nearest is partial. Quiescent versus ventilated flow is a categorical mismatch: the flow gap is not computed and the mismatch is shown. Ties are broken complete-before-partial, then by run id.</p>

        <Sec id="verdicts" n={5}>Verdict classes</Sec>
        <div className="doc-tablewrap" tabIndex={0} role="region" aria-label="Verdict classes"><table>
          <caption>Classes of the nearest comparable test (boundaries inclusive)</caption>
          <thead><tr><th scope="col">Class</th><th scope="col">Condition</th><th scope="col">Reads as</th></tr></thead>
          <tbody>
            <tr><th scope="row">DIRECT</th><td className="n">D ≤ {VERDICT_THRESHOLDS.direct}</td><td>A comparable test lies within one scale unit on the compared axes.</td></tr>
            <tr><th scope="row">NEAR</th><td className="n">{VERDICT_THRESHOLDS.direct} &lt; D ≤ {VERDICT_THRESHOLDS.near}</td><td>Comparable tests are nearby but differ noticeably on at least one axis.</td></tr>
            <tr><th scope="row">DISTANT</th><td className="n">D &gt; {VERDICT_THRESHOLDS.near}</td><td>The nearest comparable test is far from the scenario.</td></tr>
            <tr><th scope="row">NONE</th><td>no comparable test</td><td>Nothing in this gravity regime passes the gate for this question.</td></tr>
          </tbody>
        </table></div>
        <div className="callout"><p>These are classes defined by MARGIN&rsquo;s method — the scales and thresholds above. They are not established scientific categories, and they say nothing about how a fire would behave.</p></div>

        <Sec id="robustness" n={6}>Robustness</Sec>
        <p>Because the scales are judgement, every verdict is recomputed with each of the three scales at {ROBUSTNESS_FACTORS.map((k) => (k === 0.5 ? "½×" : `${k}×`)).join(", ")} its default ({ROBUSTNESS_FACTORS.length}³ = {ROBUSTNESS_FACTORS.length ** 3} combinations; the pressure ratio is raised to the power of the factor). If all combinations agree, the verdict is labelled <em>robust</em>; otherwise <em>sensitive</em>, with the range of classes.</p>
        <p>Example — the Exploration Atmosphere ({ea.o2Pct}% O₂, {ea.pressureKPa} kPa, {ea.flowCmS} cm/s, {GRAVITY_LABEL[ea.gravity].toLowerCase()}, published evidence included): {heroRobust.robust ? "robust" : "sensitive"}, {Object.entries(heroRobust.verdicts).filter(([, n]) => n > 0).map(([v, n]) => `${v} ${n}`).join(" · ")} of {heroRobust.combos}; D spans {f2(heroRobust.Drange?.[0])}–{f2(heroRobust.Drange?.[1])}.</p>

        <Sec id="flow" n={7}>The flow assumption</Sec>
        <p>Ventilation flow is an input you choose. MARGIN&rsquo;s presets use {ea.flowCmS} cm/s. Because flow is one of the three axes, the assumed flow can move a verdict across a class boundary. The table shows how D for the Exploration Atmosphere changes with the assumed flow, with everything else fixed.</p>
        <div className="doc-tablewrap" tabIndex={0} role="region" aria-label="Flow sensitivity of the Exploration Atmosphere"><table>
          <caption>Exploration Atmosphere ({ea.o2Pct}% O₂, {ea.pressureKPa} kPa, microgravity, material flammability): D to the nearest comparable test by assumed flow</caption>
          <thead><tr><th scope="col">Assumed flow</th><th scope="col" className="n">D, PSI only</th><th scope="col">Class</th><th scope="col" className="n">D, with published</th><th scope="col">Class</th><th scope="col">Nearest (with published)</th></tr></thead>
          <tbody>
            {flows.map((u, i) => {
              const a = sensPsi.points[i], b = sensPub.points[i];
              return (
                <tr key={String(u)} className={u === ea.flowCmS ? "is-current" : ""}>
                  <th scope="row">{u == null ? "quiescent" : `${u} cm/s`}{u === ea.flowCmS ? " (preset)" : ""}</th>
                  <td className="n">{f2(a.D)}</td><td>{a.verdict}{a.partial ? " (partial)" : ""}</td>
                  <td className="n">{f2(b.D)}</td><td>{b.verdict}{b.partial ? " (partial)" : ""}</td>
                  <td className="src">{b.nearestId ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        <p>
          With published evidence, the class changes at {fineXing.map((c, i) => <span key={i}>{i ? " and " : ""}<span className="num">{c.flowCmS.toFixed(2)}</span> cm/s ({c.from} → {c.to})</span>)}.
          At the {ea.flowCmS} cm/s preset the verdict is <strong>{heroPub.verdict}</strong> with D = <span className="num">{f2(heroPub.nearest?.d.D)}</span>, just above the {VERDICT_THRESHOLDS.near} boundary.
          MARGIN keeps the preset at {ea.flowCmS} cm/s and shows this sensitivity rather than choosing a flow that produces a more favourable class. A NEAR result at 20 cm/s describes a different scenario; it does not correct the {ea.flowCmS} cm/s result.
        </p>

        <Sec id="gravity" n={8}>Gravity regimes</Sec>
        <p>Gravity is categorical: microgravity, lunar, Martian and Earth gravity are separate regimes. There is no gravity slider and no line, curve or estimate between regimes. Every PSI run in this snapshot was flown in microgravity; PSI holds {COUNTS.partialGravityRuns === 0 ? "no" : COUNTS.partialGravityRuns} partial-gravity combustion runs.</p>
        {mylar && <p>Why not interpolate? In NASA drop-tower tests of {mylar.material} at {mylar.pressurePsia} psia, the limiting O₂ at lunar gravity ({mylar.uloi.moon}%) was below both the 0 g value ({mylar.uloi.micro}%) and the 1 g value ({mylar.uloi.earth}%) — {OLSON_FERKUL_2012.source.ref}, {OLSON_FERKUL_2012.source.page}. Microgravity and Earth results did not bound lunar behaviour for this material, so MARGIN does not estimate any regime from the others.</p>}

        <Sec id="map" n={9}>The coverage map</Sec>
        <p>The shaded plane on the Atlas is D evaluated at every point of the O₂ × pressure window, with the scenario&rsquo;s flow, gravity, question and material held fixed. Dark shading is D ≤ {VERDICT_THRESHOLDS.direct}, light is D ≤ {VERDICT_THRESHOLDS.near}, hatching is further. Only runs with both O₂ and pressure recorded shape the map; runs lacking a pressure still count for the verdict as partial matches and are disclosed beneath the map. The dashed contours show where the {VERDICT_THRESHOLDS.near} boundary would sit if the O₂ and pressure scales were halved or doubled. It is a map of where tests exist, not a hazard map.</p>

        <Sec id="ranking" n={10}>Investigation ranking</Sec>
        <code className="formula" tabIndex={0}>{`R = 100 × ( ${RANK_WEIGHTS.P}·P + ${RANK_WEIGHTS.H}·H + ${RANK_WEIGHTS.S}·S + ${RANK_WEIGHTS.C}·C + ${RANK_WEIGHTS.M}·M )   (weights renormalised to sum to 1)`}</code>
        <dl className="defs">
          <dt>P · proximity</dt><dd>exp(−D<sub>min</sub>) over the investigation&rsquo;s comparable runs; 0 if none.</dd>
          <dt>H · question match</dt><dd>1 if the investigation primarily addresses the question, 0.5 if secondarily, else 0 (curated hazard map).</dd>
          <dt>S · scale</dt><dd>large-scale {SCALE_SCORE.large}, bench {SCALE_SCORE.bench}, ground {SCALE_SCORE.ground}.</dd>
          <dt>C · coverage</dt><dd>share of the investigation&rsquo;s runs within NEAR of the scenario.</dd>
          <dt>M · measurements</dt><dd>1 if an outcome plus a question-relevant metric is recorded, 0.5 if outcome only, else 0.</dd>
        </dl>
        <p>Investigations with at least one comparable run always rank above those with none; the latter are ranked on metadata only and labelled so. The weights can be changed in the interface.</p>

        <Sec id="quality" n={11}>Data quality</Sec>
        <p>
          PSI run tables fetched {SNAP.fetchedAt.slice(0, 10)}: <strong>{int(counts.totalRuns)}</strong> run rows ({int(counts.distinctRuns)} distinct; {int(counts.duplicateRows)} exact duplicates flagged and kept),
          plus {int(counts.totalSummaryRows)} summary rows that describe test series rather than single runs and are never treated as runs. {int(counts.placeable ?? counts.plottable)} runs record both O₂ and pressure and can be placed on the map.
          {counts.blankLinesIgnored ? <> The ACME CFI-G inverse-flame file contains {int(counts.blankLinesIgnored)} trailing blank lines, which are ignored.</> : null}
        </p>
        <div className="doc-tablewrap" tabIndex={0} role="region" aria-label="Flags carried by PSI runs"><table>
          <caption>Flags carried by PSI runs (a run can carry several)</caption>
          <thead><tr><th scope="col">Flag</th><th scope="col" className="n">Runs</th><th scope="col">Meaning</th></tr></thead>
          <tbody>{flagRows.map(([k, v]) => <tr key={k}><th scope="row"><code>{k}</code></th><td className="n">{int(v)}</td><td>{FLAG_TEXT[k] ?? ""}</td></tr>)}</tbody>
        </table></div>
        <div className="doc-tablewrap" tabIndex={0} role="region" aria-label="Experimental tables read from PSI"><table>
          <caption>Experimental tables read from PSI</caption>
          <thead><tr><th scope="col">Investigation</th><th scope="col">File</th><th scope="col">Kind</th><th scope="col" className="n">Rows</th><th scope="col" className="n">Kept</th></tr></thead>
          <tbody>{SNAP.tableStats.map((t) => <tr key={t.file}><td>{t.investigation}</td><td className="src">{t.file}</td><td>{t.kind}</td><td className="n">{t.dataRows}</td><td className="n">{t.kept}</td></tr>)}</tbody>
        </table></div>

        <Sec id="limits" n={12}>Limitations</Sec>
        <ul>{LIMITATIONS.map((l) => <li key={l}>{l}</li>)}</ul>

        <Sec id="refuse" n={13}>Claims MARGIN does not make</Sec>
        <ul className="refuse">
          <li>That any atmosphere, material or vehicle is acceptable, or not, for crewed use.</li>
          <li>That a scenario close to a test would behave like that test.</li>
          <li>That results at 0 g and 1 g bracket lunar or Martian behaviour.</li>
          <li>That a gas-burner or droplet flame says anything about cabin materials.</li>
          <li>That a planned experiment is evidence.</li>
          <li>Any flammability prediction for an untested material or condition.</li>
        </ul>

        <Sec id="repro" n={14}>Reproducibility</Sec>
        <p>The data pipeline (<code>pipeline/</code>) downloads the PSI combustion records and experimental tables once and writes a versioned snapshot; the app never calls NASA at run time. The engine (<code>lib/engine</code>) is pure TypeScript with unit and science tests, and the constants on this page are read from it directly. Every scenario is encoded in the page URL, so a shared link reproduces the same result. See <Link href="/sources">Sources</Link> for every reference.</p>
      </article>
    </main>
  );
}
