import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { evaluate, VERDICT_THRESHOLDS, SCALES } from "@/lib/engine";
import { ALL_RUNS, COUNTS, HEADLINE, PSI_INVESTIGATIONS, invById } from "@/lib/data";
import { PRESETS } from "@/content/curated";
import { DEFAULT_SCENARIO, scenarioToQuery } from "@/lib/state/scenarioQuery";
import type { Scenario } from "@/lib/schema";
import "@/components/guide/guide.css";

export const metadata: Metadata = {
  title: "Guide",
  description: "What MARGIN is, why it exists and how to use it, in plain words: the coverage gap in NASA's space fire tests, the evidence distance D, and how to read the Atlas.",
};

const f2 = (x: number | null | undefined) => (x == null || !Number.isFinite(x) ? "—" : x.toFixed(2));
const href = (s: Scenario, preset: string | null) => `/?${scenarioToQuery(s, preset)}`;

/** Callouts on the Atlas screenshot (percent of the image). */
const SPOTS: { n: number; x: number; y: number; title: string; text: string }[] = [
  { n: 1, x: 3.4, y: 10.5, title: "Expeditions", text: "Ready-made starting points: the coverage gap, five real or planned cabin atmospheres and six findings from NASA papers. One click sets up the whole view." },
  { n: 2, x: 3.4, y: 54.2, title: "Scenario", text: "Your cabin: pick a reference atmosphere or type oxygen and pressure, choose the fire question, the material and the assumed airflow, and whether to include published NASA results." },
  { n: 3, x: 31.5, y: 44.6, title: "NASA tests", text: "Every dot is one test run from the PSI archive, placed by its oxygen (across) and total pressure (up). Rings are results from NASA papers; triangles are cabin atmospheres." },
  { n: 4, x: 46.8, y: 61.8, title: "Coverage bands", text: "The bright band is everywhere within D 1 of a comparable test (DIRECT); the faint band within D 2.5 (NEAR). Outside them, the evidence is DISTANT." },
  { n: 5, x: 55.2, y: 57.0, title: "Your scenario", text: "The amber marker. Drag it, click anywhere on the field, or use the arrow keys; everything updates instantly." },
  { n: 6, x: 70.0, y: 19.4, title: "Verdict", text: "How close the nearest comparable NASA test is: the class word, the distance D, and below it the gaps on each axis and the source of the nearest test." },
  { n: 7, x: 33.2, y: 88.0, title: "Gravity regimes", text: "Microgravity, Moon, Mars and Earth are kept completely separate. Switching shows that regime's own evidence, which is often none." },
  { n: 8, x: 95.0, y: 66.0, title: "Tools", text: "Key, layers, zoom, the four-regime overview, fullscreen and share. Every view is a link you can send." },
];

export default function GuidePage() {
  const ea = PRESETS.find((p) => p.id === "ea")!;
  const artemis = PRESETS.find((p) => p.id === "artemis")!;
  const base: Scenario = { ...DEFAULT_SCENARIO, o2Pct: ea.o2Pct, pressureKPa: ea.pressureKPa, flowCmS: ea.flowCmS, gravity: "micro" };
  const steps: { s: Scenario; label: string; text: (near: string) => string }[] = [
    { s: { ...base, includePublished: false }, label: "PSI tests only", text: () => `The nearest PSI test is far away: no PSI solid-material test went above ${HEADLINE.maxSolidO2}% oxygen.` },
    { s: { ...base, includePublished: true }, label: "Add results from NASA papers", text: (near) => `The nearest evidence is now a ${near} result, just past the ${VERDICT_THRESHOLDS.near} line, so a small change in an assumption could change the class.` },
    { s: { ...base, includePublished: true, flowCmS: 20 }, label: "Assume faster airflow (20 cm/s)", text: () => "A different scenario, not a correction: MARGIN shows how much the answer depends on the airflow you assume, and does not pick one for you." },
    { s: { ...base, includePublished: false, gravity: "moon" }, label: "Move to the Moon", text: () => "PSI holds no combustion tests at lunar gravity, so there is nothing to compare. MARGIN never borrows evidence from another gravity level." },
  ];
  const worked = steps.map((st) => {
    const e = evaluate(ALL_RUNS, st.s);
    const near = e.nearest ? invById.get(e.nearest.run.investigation)?.acronym ?? "published" : "";
    return { ...st, e, line: st.text(near) };
  });

  return (
    <main id="main" className="guide">
      {/* ------------------------------------------------------------ hero */}
      <section className="g-hero" aria-labelledby="g-title">
        <Image src="/guide/orbit.jpg" alt="" fill priority sizes="100vw" className="g-hero-img" />
        <div className="g-hero-inner">
          <p className="g-kicker">Guide · about three minutes</p>
          <h1 id="g-title" className="g-title">Has anyone ever tested fire in air like this?</h1>
          <p className="g-lede">
            Before astronauts live in a new kind of cabin air, someone has to ask that question. MARGIN answers it from NASA&rsquo;s own
            test records: describe a cabin, and it finds the most similar tests NASA has run in space, tells you how far away they are,
            and links every number to where it came from.
          </p>
          <div className="g-cta">
            <Link className="g-btn g-btn--primary" href="/?tour=1">Take the interactive tour</Link>
            <a className="g-btn" href="#demo">Watch the 30-second demo ↓</a>
            <Link className="g-btn g-btn--quiet" href="/">Open the Atlas</Link>
          </div>
        </div>
        <span className="g-ai">AI-generated illustration</span>
      </section>

      {/* ------------------------------------------------------------ the demo, first */}
      <section className="g-watch" id="demo" aria-labelledby="g-demo">
        <div className="g-watch-head">
          <p className="g-kicker">Start here · 30 seconds, with sound</p>
          <h2 id="g-demo" className="g-h2">Watch MARGIN in 30 seconds</h2>
          <p className="g-p">A screen recording of the live site at margin.adai.systems: the coverage gap, the Exploration Atmosphere, published evidence, the airflow assumption and the Moon. Narration is AI-generated; captions are burned in.</p>
        </div>
        <video className="g-video" controls preload="metadata" playsInline poster="/demo/margin-demo-poster.jpg">
          <source src="/demo/margin-demo-30s.mp4" type="video/mp4" />
          <a href="/demo/margin-demo-30s.mp4">Download the 30-second demo (MP4)</a>
        </video>
      </section>

      <div className="g-body">
        {/* ------------------------------------------------------------ the problem */}
        <section className="g-sec" aria-labelledby="g-why">
          <p className="g-num">01</p>
          <h2 id="g-why" className="g-h2">The problem, in plain words</h2>
          <div className="g-story">
            <figure className="g-card">
              <div className="g-card-img"><Image src="/guide/flame-sphere.jpg" alt="Illustration: a small blue spherical flame in a sealed chamber" width={1400} height={1045} sizes="(max-width: 900px) 100vw, 33vw" /><span className="g-ai">AI-generated illustration</span></div>
              <figcaption>
                <h3 className="g-h3">Fire behaves differently in space</h3>
                <p>Without gravity, hot gas does not rise, so a flame cannot pull in fresh air the way it does on Earth. It becomes a dim blue ball, and whether it keeps burning depends on the oxygen level, the pressure and how fast the cabin air is moving.</p>
              </figcaption>
            </figure>
            <figure className="g-card">
              <div className="g-card-img"><Image src="/guide/sample-burn.jpg" alt="Illustration: a strip of fabric burning in an experiment frame inside a spacecraft" width={1400} height={1045} sizes="(max-width: 900px) 100vw, 33vw" /><span className="g-ai">AI-generated illustration</span></div>
              <figcaption>
                <h3 className="g-h3">So NASA tests it in orbit</h3>
                <p>For decades NASA has burned fuels and materials in space and logged the exact conditions. Its Physical Sciences Informatics (PSI) archive holds <strong>{COUNTS.totalRuns.toLocaleString("en-GB")}</strong> of these test runs from <strong>{PSI_INVESTIGATIONS.length}</strong> investigations.</p>
              </figcaption>
            </figure>
            <figure className="g-card">
              <div className="g-card-img"><Image src="/guide/habitat.jpg" alt="Illustration: the inside of a small lunar habitat with the Moon's surface through a window" width={1400} height={1045} sizes="(max-width: 900px) 100vw, 33vw" /><span className="g-ai">AI-generated illustration</span></div>
              <figcaption>
                <h3 className="g-h3">But future cabins will breathe different air</h3>
                <p>To make spacewalks quicker, Artemis habitats plan <strong>{artemis.o2Pct}%</strong> oxygen at lower pressure, and the Exploration Atmosphere <strong>{ea.o2Pct}%</strong>. The highest oxygen in any of PSI&rsquo;s {HEADLINE.solidRunsWithO2} solid-material tests is <strong>{HEADLINE.maxSolidO2}%</strong>. <strong>{HEADLINE.atOrAboveArtemis}</strong> of them reach the planned levels. That is the <em>coverage gap</em>.</p>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ------------------------------------------------------------ what it does */}
        <section className="g-sec" aria-labelledby="g-what">
          <p className="g-num">02</p>
          <h2 id="g-what" className="g-h2">What MARGIN does</h2>
          <p className="g-p g-p--lead">MARGIN is a search engine for evidence. It does not simulate fire. It looks up what NASA has actually tested and measures how close that comes to the cabin you describe.</p>
          <ol className="g-steps">
            <li><span className="g-step-n">1</span><div><h3 className="g-h3">Describe a cabin</h3><p>Oxygen (% by volume), total pressure, how fast the air moves, the gravity level (microgravity, Moon, Mars or Earth) and the fire question: does a material burn, does a fire alarm see the smoke, does a fuel droplet keep burning, and so on.</p></div></li>
            <li><span className="g-step-n">2</span><div><h3 className="g-h3">Keep only tests that count</h3><p>Only tests in the same gravity level that answer the same kind of question are compared. A burning droplet says nothing about whether a fabric ignites.</p></div></li>
            <li><span className="g-step-n">3</span><div><h3 className="g-h3">Measure the distance, D</h3><p>One step is <strong>{SCALES.o2Pts} percentage points</strong> of oxygen, or <strong>{Math.round((SCALES.pressureRatio - 1) * 100)}%</strong> more or less pressure, or <strong>{SCALES.flowCmS} cm/s</strong> of airflow. Steps on the three axes combine like distance on a map: D&nbsp;=&nbsp;√(oxygen steps² + pressure steps² + airflow steps²).</p></div></li>
            <li><span className="g-step-n">4</span><div><h3 className="g-h3">Give a verdict, with the receipts</h3><p>The nearest comparable test sets the verdict. Every test links back to its row in the NASA table or the page of the NASA paper, with a short quote.</p></div></li>
          </ol>

          <figure className="g-scale" aria-labelledby="g-scale-cap">
            <div className="g-scale-bar" aria-hidden="true">
              <span className="g-scale-z g-scale-z--direct" style={{ flexGrow: VERDICT_THRESHOLDS.direct }}>DIRECT</span>
              <span className="g-scale-z g-scale-z--near" style={{ flexGrow: VERDICT_THRESHOLDS.near - VERDICT_THRESHOLDS.direct }}>NEAR</span>
              <span className="g-scale-z g-scale-z--distant" style={{ flexGrow: 5 - VERDICT_THRESHOLDS.near }}>DISTANT</span>
            </div>
            <div className="g-scale-ticks" aria-hidden="true"><span>D 0</span><span style={{ left: `${(VERDICT_THRESHOLDS.direct / 5) * 100}%` }}>{VERDICT_THRESHOLDS.direct}</span><span style={{ left: `${(VERDICT_THRESHOLDS.near / 5) * 100}%` }}>{VERDICT_THRESHOLDS.near}</span><span style={{ left: "100%" }}>5+</span></div>
            <figcaption id="g-scale-cap" className="g-scale-legend">
              <dl>
                <div><dt>DIRECT</dt><dd>D ≤ {VERDICT_THRESHOLDS.direct}: NASA has tested conditions within about one step of yours.</dd></div>
                <div><dt>NEAR</dt><dd>D ≤ {VERDICT_THRESHOLDS.near}: the closest tests are a few steps away.</dd></div>
                <div><dt>DISTANT</dt><dd>D &gt; {VERDICT_THRESHOLDS.near}: the nearest test is far from your scenario.</dd></div>
                <div><dt>NONE</dt><dd>No comparable test at all at that gravity level.</dd></div>
              </dl>
            </figcaption>
          </figure>
          <p className="g-note"><strong>Evidence proximity, not a safety rating.</strong> DISTANT does not mean dangerous and DIRECT does not mean safe. They say how much NASA test evidence sits near your scenario, nothing more.</p>
        </section>

        {/* ------------------------------------------------------------ worked example */}
        <section className="g-sec" aria-labelledby="g-example">
          <p className="g-num">03</p>
          <h2 id="g-example" className="g-h2">A worked example</h2>
          <p className="g-p">The Exploration Atmosphere, planned for pressurised rovers and lunar bases: <strong>{ea.o2Pct}% oxygen at {ea.pressureKPa} kPa</strong> ({ea.pressurePsia} psia), with air moving at {ea.flowCmS} cm/s. Each line is computed live by the same engine the Atlas uses; open any of them to see it.</p>
          <ol className="g-worked">
            {worked.map((w, i) => (
              <li key={w.label}>
                <span className="g-worked-n">{i + 1}</span>
                <div className="g-worked-main">
                  <p className="g-worked-label">{w.label}</p>
                  <p className="g-worked-line"><span className={`g-verdict g-verdict--${w.e.verdict.toLowerCase()}`}>{w.e.verdict}</span> {w.line}</p>
                </div>
                <Link className="g-worked-go" href={href(w.s, "ea")}>
                  {w.e.nearest && Number.isFinite(w.e.nearest.d.D) ? <span className="g-worked-d">D {f2(w.e.nearest.d.D)}</span> : null}
                  <span>Open<span className="sr-only"> “{w.label}” in the Atlas</span> →</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* ------------------------------------------------------------ reading the atlas */}
        <section className="g-sec" aria-labelledby="g-read">
          <p className="g-num">04</p>
          <h2 id="g-read" className="g-h2">Reading the Atlas</h2>
          <p className="g-p">The Atlas is the main screen. This is the worked example with NASA papers included. The numbers match the list below.</p>
          <figure className="g-shot">
            <div className="g-shot-frame">
              <Image src="/guide/atlas.jpg" alt="The MARGIN Atlas showing the Exploration Atmosphere in microgravity, with numbered callouts" width={1600} height={1000} sizes="(max-width: 1240px) 100vw, 1180px" />
              {SPOTS.map((p) => <span key={p.n} className="g-spot" style={{ left: `${p.x}%`, top: `${p.y}%` }} aria-hidden="true">{p.n}</span>)}
            </div>
            <figcaption className="g-shot-cap">Screenshot of the live app (not an illustration).</figcaption>
          </figure>
          <ol className="g-spots">
            {SPOTS.map((p) => <li key={p.n}><span className="g-spot g-spot--inline" aria-hidden="true">{p.n}</span><div><h3 className="g-h3">{p.title}</h3><p>{p.text}</p></div></li>)}
          </ol>
          <div className="g-try">
            <p><strong>The quickest way in:</strong> take the tour. It walks through these parts on the live Atlas in under a minute.</p>
            <Link className="g-btn g-btn--primary" href="/?tour=1">Start the tour</Link>
          </div>
        </section>

        {/* ------------------------------------------------------------ other pages and limits */}
        <section className="g-sec" aria-labelledby="g-more">
          <p className="g-num">05</p>
          <h2 id="g-more" className="g-h2">The rest of the app</h2>
          <div className="g-links">
            <Link href="/investigations" className="g-link"><span className="g-link-t">Investigations</span><span className="g-link-d">All {PSI_INVESTIGATIONS.length} NASA PSI combustion investigations, ranked by how relevant they are to your scenario, with side-by-side comparison and a ledger of findings.</span></Link>
            <Link href="/method" className="g-link"><span className="g-link-t">Method</span><span className="g-link-d">The exact formulas, units and thresholds, the robustness check and every limitation, for anyone who wants to check the maths.</span></Link>
            <Link href="/sources" className="g-link"><span className="g-link-t">Sources</span><span className="g-link-d">Every dataset and paper, how each published value was checked, licences, and how AI was used to build MARGIN.</span></Link>
          </div>
          <h3 className="g-h3 g-h3--sp">What MARGIN will not tell you</h3>
          <ul className="g-list">
            <li>Whether a cabin is safe. It measures how close the evidence is, not how dangerous anything is.</li>
            <li>What a fire would do. It never predicts or simulates flames.</li>
            <li>Anything in between gravity levels. Moon, Mars and microgravity results are never mixed or interpolated.</li>
            <li>Numbers without a source. Anything not traced to a NASA table row or paper page is not shown.</li>
          </ul>
        </section>

        {/* ------------------------------------------------------------ glossary */}
        <section className="g-sec" aria-labelledby="g-words">
          <p className="g-num">06</p>
          <h2 id="g-words" className="g-h2">Words you will see</h2>
          <dl className="g-gloss">
            <div><dt>PSI</dt><dd>NASA&rsquo;s Physical Sciences Informatics archive: the public record of experiments flown in space, including the combustion test tables MARGIN reads.</dd></div>
            <div><dt>O₂ %</dt><dd>Oxygen as a share of the cabin air by volume. Earth&rsquo;s air is 20.9%.</dd></div>
            <div><dt>kPa, psia</dt><dd>Total cabin pressure. Sea level is 101.3 kPa (14.7 psia); lower-pressure cabins add oxygen to stay breathable.</dd></div>
            <div><dt>Flow, cm/s</dt><dd>How fast the air moves past a burning sample. In microgravity it matters a lot, because nothing else brings in fresh oxygen. &ldquo;Quiescent&rdquo; means still air.</dd></div>
            <div><dt>Microgravity, µg</dt><dd>The near-weightlessness of orbit. Moon: 0.165 g. Mars: 0.38 g. Earth: 1 g.</dd></div>
            <div><dt>D</dt><dd>The evidence distance: how many steps separate a NASA test&rsquo;s conditions from yours.</dd></div>
            <div><dt>Partial match</dt><dd>A test that did not record one of the three conditions (often airflow). It is compared on the others and labelled.</dd></div>
            <div><dt>Published evidence</dt><dd>Results from NASA papers that are not in the PSI tables, such as the Saffire experiments. Off by default; switch them on in the Scenario panel.</dd></div>
            <div><dt>Reported limit</dt><dd>A threshold a paper reports (for example the lowest oxygen at which a material burned), not a tested condition.</dd></div>
          </dl>
        </section>

        <section className="g-end" aria-label="Get started">
          <h2 className="g-h2">Ready?</h2>
          <div className="g-cta">
            <Link className="g-btn g-btn--primary" href="/?tour=1">Take the tour</Link>
            <Link className="g-btn" href={href({ ...base, includePublished: true }, "ea")}>Open the worked example</Link>
            <Link className="g-btn g-btn--quiet" href="/">Open the Atlas</Link>
          </div>
          <p className="g-fine">The four illustrations on this page and the demo&rsquo;s voiceover are AI-generated and labelled as such. Every chart, number and screenshot comes from the app and its NASA data.</p>
        </section>
      </div>
    </main>
  );
}
