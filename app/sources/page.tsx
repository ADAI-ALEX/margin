import type { Metadata } from "next";
import Link from "next/link";
import type { Run } from "@/lib/schema";
import * as Curated from "@/content/curated";
import { PSI_INVESTIGATIONS, SNAP, COUNTS } from "@/lib/data";
import { GRAVITY_SHORT, TIER_LABEL, basisLabel } from "@/lib/format";
import "@/components/docs/docs.css";

export const metadata: Metadata = {
  title: "Sources",
  description: "Every data source and reference behind MARGIN, how each published value was checked, licences, and SI (AI) use.",
};

type Reference = { id: string; short: string; citation: string; url: string; ntrs?: string; doi?: string; kind: string; accessed?: string; usedFor?: string[]; terms?: string };
type Verification = { status?: string; locator?: string | null; quote?: string | null; checkedBy?: string; checkedAt?: string };

const C = Curated as unknown as Record<string, unknown>;
const REFS = (Array.isArray(C.REFERENCES) ? (C.REFERENCES as Reference[]) : null);
const PSI_ATTRIBUTION = typeof C.PSI_ATTRIBUTION === "string" ? (C.PSI_ATTRIBUTION as string) : null;

const SECTIONS = [
  ["data", "NASA data and attribution"],
  ["psi", "PSI investigations"],
  ["published", "Published values"],
  ["insights", "Findings"],
  ["references", "References"],
  ["software", "Software and fonts"],
  ["si", "SI (AI) use"],
  ["licences", "Licences"],
] as const;

function Sec({ id, n, children }: { id: string; n: number; children: React.ReactNode }) {
  return <h2 id={id}><span className="doc-secno">{String(n).padStart(2, "0")}</span>{children}</h2>;
}
const valueOf = (r: Run) => [
  r.o2Pct != null ? `${r.o2Pct}% O₂` : null,
  r.pressureKPa != null ? `${r.pressureKPa} kPa` : null,
  r.flowCmS != null ? `${r.flowCmS} cm/s` : r.flowRegime !== "unknown" ? r.flowRegime.replace("-", " ") : null,
].filter(Boolean).join(" · ");

export default function SourcesPage() {
  const published = [...Curated.PUBLISHED, ...Curated.PLANNED];
  const checked = published.filter((r) => !r.flags.includes("unverified-transcription"));
  const insights = Curated.INSIGHTS as (typeof Curated.INSIGHTS[number] & { verification?: Verification })[];
  const insightChecked = insights.filter((i) => i.verification?.status === "primary-checked").length;
  const fetched = SNAP.fetchedAt.slice(0, 10);
  const fallbackRefs: Reference[] = Array.from(
    new Map(published.map((r) => [r.source.url, { id: r.source.url, short: r.source.ref, citation: r.source.ref, url: r.source.url, kind: r.source.kind }])).values(),
  );
  const refs = REFS ?? fallbackRefs;

  return (
    <main id="main" className="doc">
      <nav className="doc-toc" aria-label="On this page">
        <span className="eyebrow">Sources</span>
        <ol>{SECTIONS.map(([id, t]) => <li key={id}><a href={`#${id}`}>{t}</a></li>)}</ol>
      </nav>
      <article className="doc-body">
        <p className="eyebrow doc-kicker">Where every number comes from</p>
        <h1>Sources</h1>
        <p className="doc-lede">
          MARGIN uses {COUNTS.totalRuns.toLocaleString("en-GB")} run rows from NASA&rsquo;s Physical Sciences Informatics (PSI) archive, fetched {fetched}, and {Curated.PUBLISHED.length} values
          transcribed from published NASA papers that are not in PSI. Each value links to its source; published values show the page or table they came from and whether
          they have been checked against that primary source.
        </p>

        <Sec id="data" n={1}>NASA data and attribution</Sec>
        <p>{PSI_ATTRIBUTION ?? "Data: NASA Physical Sciences Informatics (PSI). Licence as stated on each PSI record; most combustion records state CC0. Published values are cited from the NASA Technical Reports Server and the papers listed below."}</p>
        <p>NASA data is used under the terms each source states. Use of NASA data does not imply endorsement by NASA. MARGIN uses no NASA logos, insignia or mission patches. The app makes no calls to NASA at run time: the PSI tables were downloaded once by <code>pipeline/fetch-psi.mjs</code> and normalised into a versioned snapshot.</p>
        <p>The data licences are separate from the licence of MARGIN&rsquo;s own code (Apache-2.0, <a href="#licences">below</a>).</p>

        <Sec id="psi" n={2}>PSI investigations</Sec>
        <div className="doc-tablewrap" tabIndex={0} role="region" aria-label="PSI investigations"><table>
          <caption>The {PSI_INVESTIGATIONS.length} PSI combustion investigation records read by MARGIN</caption>
          <thead><tr><th scope="col">Accession</th><th scope="col">Investigation</th><th scope="col" className="n">Run rows</th><th scope="col">DOI</th><th scope="col">Licence (as stated by PSI)</th></tr></thead>
          <tbody>
            {PSI_INVESTIGATIONS.map((i) => (
              <tr key={i.id}>
                <td><Link href={`/investigations/${i.id}`}>{i.id}</Link></td>
                <td>{i.acronym !== i.id ? <strong>{i.acronym}</strong> : null} {i.title}</td>
                <td className="n">{i.runCount || (i.summaryRowCount ? `— (${i.summaryRowCount} summary)` : "—")}</td>
                <td className="src">{i.doi ? <a href={`https://doi.org/${i.doi}`} target="_blank" rel="noreferrer">{i.doi}</a> : "—"}</td>
                <td className="src">{i.license ?? "not stated in PSI record"}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <p className="src">PSI portal: <a href="https://psi.nasa.gov/" target="_blank" rel="noreferrer">psi.nasa.gov</a>. Each run in MARGIN keeps the CSV file name and 1-based row number it came from.</p>

        <Sec id="published" n={3}>Published values</Sec>
        <p>
          {checked.length === published.length
            ? <>All {published.length} published or planned values have been checked against their primary source (SI-assisted; human sign-off pending), each with its page or table and a short verbatim quote.</>
            : <>{checked.length} of {published.length} published or planned values have been checked against their primary source; the rest are labelled as not yet checked wherever they appear.</>}
          Reported limits are thresholds inferred by the authors, not tested conditions. Planned experiments are never counted as evidence.
        </p>
        <div className="doc-tablewrap" tabIndex={0} role="region" aria-label="Published values"><table>
          <caption>Values transcribed from publications (not in PSI)</caption>
          <thead><tr><th scope="col">Record</th><th scope="col">Material</th><th scope="col">g</th><th scope="col">Conditions</th><th scope="col">Basis</th><th scope="col">Source and locator</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {published.map((r) => {
              const unchecked = r.flags.includes("unverified-transcription");
              return (
                <tr key={r.id}>
                  <td className="src">{r.id}<br /><span className="muted">{TIER_LABEL[r.tier]}</span></td>
                  <td>{r.material ?? "—"}</td>
                  <td>{GRAVITY_SHORT[r.gravity]}</td>
                  <td className="src">{valueOf(r)}</td>
                  <td className="src">O₂ {basisLabel(r.o2Basis)}; P {basisLabel(r.pressureBasis)}</td>
                  <td className="src"><a href={r.source.url} target="_blank" rel="noreferrer">{r.source.ref}</a>{r.source.page ? `, ${r.source.page}` : ""}{r.source.quote ? <><br /><q>{r.source.quote}</q></> : null}</td>
                  <td>
                    <span className="claim" data-kind={r.tier === "T4_PLANNED" ? "PLANNED" : unchecked ? "DRAFT" : r.flags.includes("limit-value") ? "REPORTED LIMIT" : "PUBLISHED"}>
                      {r.tier === "T4_PLANNED" ? "planned" : unchecked ? "not yet checked" : r.flags.includes("limit-value") ? "limit · checked" : "checked"}
                    </span>
                    {r.flags.includes("conflicting-sources") && <><br /><span className="muted">sources disagree</span></>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>

        <Sec id="insights" n={4}>Findings</Sec>
        <p>{insightChecked} of {insights.length} findings have been checked against their primary source and are shown in the app. The others stay hidden until checked.</p>
        <div className="doc-tablewrap" tabIndex={0} role="region" aria-label="Findings and verification status"><table>
          <caption>Findings and their verification status</caption>
          <thead><tr><th scope="col">Finding</th><th scope="col">Validity</th><th scope="col">Source</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {insights.map((i) => (
              <tr key={i.id}>
                <td>{i.claim}<br /><span className="src">{i.value} · {i.conditions}</span></td>
                <td className="src">{i.validity}</td>
                <td className="src"><a href={i.source.url} target="_blank" rel="noreferrer">{i.source.ref}</a>{i.verification?.locator ? `, ${i.verification.locator}` : ""}{i.verification?.quote ? <><br /><q>{i.verification.quote}</q></> : null}</td>
                <td className="src">{i.verification?.status === "primary-checked" ? "checked against primary source; human sign-off pending" : i.verification?.status ?? "not yet checked"}</td>
              </tr>
            ))}
          </tbody>
        </table></div>

        <Sec id="references" n={5}>References</Sec>
        <ol className="ref-list">
          {refs.map((r) => (
            <li key={r.id}>
              {r.citation} <a href={r.url} target="_blank" rel="noreferrer">↗</a>
              <div className="ref-meta">
                {[r.ntrs ? `NTRS ${r.ntrs}` : null, r.doi ? `doi ${r.doi}` : null, r.accessed ? `accessed ${r.accessed}` : null, r.terms ? `terms: ${r.terms}` : null].filter(Boolean).join(" · ")}
                {r.usedFor?.length ? <> · used for: {r.usedFor.join("; ")}</> : null}
              </div>
            </li>
          ))}
        </ol>

        <Sec id="software" n={6}>Software and fonts</Sec>
        <p>Built with Next.js and React (MIT), d3-scale, d3-array, d3-shape and d3-contour (ISC), and zod (MIT). Typefaces: Newsreader, Public Sans and JetBrains Mono, all under the SIL Open Font License 1.1, self-hosted through <code>next/font</code>. The full list is in the repository&rsquo;s NOTICE file. No images are generated by AI, and no NASA imagery is used.</p>

        <Sec id="si" n={7}>SI (AI) use</Sec>
        <p>
          MARGIN was created by Alex de Gentile for NASA Space Apps 2026. AI (SI) tools assisted its development, which the competition rules require us to disclose.
          SI was used for research, writing code and tests, reviewing the method, and checking published values against their primary sources. Every scientific value
          shown is traced to a source listed on this page, and values not yet checked against their primary source are labelled as such. The running app uses no AI:
          every result is computed by deterministic code from the bundled data.
        </p>

        <Sec id="licences" n={8}>Licences</Sec>
        <dl className="defs">
          <dt>MARGIN code</dt><dd>Apache License 2.0.</dd>
          <dt>NASA PSI data</dt><dd>As stated on each PSI record (see the table above); not relicensed by MARGIN.</dd>
          <dt>Published values</dt><dd>Short factual values and quotations of ≤ 25 words, cited to their sources; the papers themselves are linked, not redistributed.</dd>
          <dt>Fonts</dt><dd>SIL Open Font License 1.1.</dd>
        </dl>
      </article>
    </main>
  );
}
