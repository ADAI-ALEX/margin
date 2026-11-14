import type { Metadata } from "next";
import Link from "next/link";
import type { Run } from "@/lib/schema";
import * as Curated from "@/content/curated";
import type { Verification } from "@/content/verification";
import { PSI_INVESTIGATIONS, SNAP, COUNTS } from "@/lib/data";
import { GRAVITY_SHORT, TIER_LABEL, basisLabel } from "@/lib/format";
import { Breadcrumb } from "@/components/ui/misc";
import { DocSection, DocTable, DocToc } from "@/components/docs/doc";
import "@/components/docs/docs.css";

export const metadata: Metadata = {
  title: "Sources",
  description: "Every data source and reference behind MARGIN, how each published value was checked, licences, and SI (AI) use.",
};

const SECTIONS = [
  ["data", "NASA data and attribution"],
  ["psi", "PSI investigations"],
  ["published", "Published values"],
  ["atmospheres", "Reference atmospheres"],
  ["insights", "Findings"],
  ["references", "References"],
  ["software", "Software and fonts"],
  ["si", "SI (AI) use"],
  ["licences", "Licences"],
] as const;
const sec = (id: (typeof SECTIONS)[number][0]) => ({ id, n: SECTIONS.findIndex(([s]) => s === id) + 1, title: SECTIONS.find(([s]) => s === id)![1] });

const STATUS_LABEL: Record<Verification["status"], string> = {
  "primary-checked": "checked against primary source; human sign-off pending",
  "secondary-only": "secondary source only (the original was not reachable)",
  unverified: "not yet checked",
  contradicted: "contradicted by the primary source",
};

const valueOf = (r: Run) => [
  r.o2Pct != null ? `${r.o2Pct}% O₂` : null,
  r.pressureKPa != null ? `${r.pressureKPa} kPa` : null,
  r.flowCmS != null ? `${r.flowCmS} cm/s` : r.flowRegime !== "unknown" ? r.flowRegime.replace("-", " ") : null,
].filter(Boolean).join(" · ");

/** Fonts and packages that ship with the site (licences from each package's own metadata; see NOTICE). */
const TYPEFACES = [
  { name: "Albert Sans", use: "All interface and reading text", licence: "SIL Open Font License 1.1" },
  { name: "IBM Plex Mono", use: "Run ids, file names, source locators", licence: "SIL Open Font License 1.1" },
];
const PACKAGES = [
  { name: "Next.js", use: "Framework and static rendering", licence: "MIT" },
  { name: "React, React DOM", use: "Interface", licence: "MIT" },
  { name: "d3-scale, d3-array, d3-shape, d3-contour", use: "Scales, contours of the evidence field", licence: "ISC" },
  { name: "zod", use: "Data validation", licence: "MIT" },
];

export default function SourcesPage() {
  const published = [...Curated.PUBLISHED, ...Curated.PLANNED];
  const checked = published.filter((r) => !r.flags.includes("unverified-transcription"));
  const insights = Curated.INSIGHTS;
  const insightChecked = insights.filter((i) => i.verification.status === "primary-checked").length;
  const atmospheres = Curated.ATMOSPHERES.map((a) => ({ a, v: Curated.ATMOSPHERE_VERIFICATION[a.id] }));
  const fetched = SNAP.fetchedAt.slice(0, 10);
  const refs = Curated.REFERENCES;

  return (
    <main id="main" className="ui-page doc">
      <header className="ui-page-head doc-head">
        <Breadcrumb items={[{ label: "Atlas", href: "/" }, { label: "Sources" }]} />
        <p className="ui-label doc-kicker">Where every number comes from</p>
        <h1 className="ui-page-title">Sources</h1>
        <p className="ui-page-lede">
          MARGIN uses {COUNTS.totalRuns.toLocaleString("en-GB")} run rows from NASA&rsquo;s Physical Sciences Informatics (PSI) archive, fetched {fetched}, and {Curated.PUBLISHED.length} values
          transcribed from published NASA papers that are not in PSI. Each value links to its source; published values show the page or table they came from and whether
          they have been checked against that primary source.
        </p>
        <p className="doc-head-meta">
          <span className="num">{PSI_INVESTIGATIONS.length} PSI records</span>
          <span className="num">{refs.length} references</span>
          <span className="num">Snapshot {fetched}</span>
        </p>
      </header>

      <div className="doc-layout">
        <DocToc sections={SECTIONS} />
        <article className="doc-body">

          <DocSection {...sec("data")}>
            <p className="doc-attribution">{Curated.PSI_ATTRIBUTION}</p>
            <p>NASA data is used under the terms each source states. Use of NASA data does not imply endorsement by NASA. MARGIN uses no NASA logos, insignia or mission patches. The app makes no calls to NASA at run time: the PSI tables were downloaded once by <code className="mono">pipeline/fetch-psi.mjs</code> and normalised into a versioned snapshot.</p>
            <p>The data licences are separate from the licence of MARGIN&rsquo;s own code (Apache-2.0, <a href="#licences">below</a>).</p>
          </DocSection>

          <DocSection {...sec("psi")}>
            <DocTable label="PSI investigations" caption={<>The {PSI_INVESTIGATIONS.length} PSI combustion investigation records read by MARGIN</>}>
              <thead><tr><th scope="col">Accession</th><th scope="col">Investigation</th><th scope="col" className="is-num">Run rows</th><th scope="col">DOI</th><th scope="col">Licence (as stated by PSI)</th></tr></thead>
              <tbody>
                {PSI_INVESTIGATIONS.map((i) => (
                  <tr key={i.id}>
                    <td className="mono doc-nowrap"><Link href={`/investigations/${i.id}`}>{i.id}</Link></td>
                    <td className="doc-cell-wide">{i.acronym !== i.id ? <strong>{i.acronym}</strong> : null} {i.title}</td>
                    <td className="is-num doc-nowrap">{i.runCount || (i.summaryRowCount ? `— (${i.summaryRowCount} summary)` : "—")}</td>
                    <td className="mono doc-nowrap">{i.doi ? <a href={`https://doi.org/${i.doi}`} target="_blank" rel="noreferrer">{i.doi}</a> : "—"}</td>
                    <td className={i.license ? "doc-nowrap" : "doc-caution-text"}>{i.license ?? "not stated in PSI record"}</td>
                  </tr>
                ))}
              </tbody>
            </DocTable>
            <p className="doc-small">PSI portal: <a href="https://psi.nasa.gov/" target="_blank" rel="noreferrer">psi.nasa.gov</a>. Each run in MARGIN keeps the CSV file name and 1-based row number it came from.</p>
          </DocSection>

          <DocSection {...sec("published")}>
            <p>
              {checked.length === published.length
                ? <>All {published.length} published or planned values have been checked against their primary source (SI-assisted; human sign-off pending), each with its page or table and a short verbatim quote.</>
                : <>{checked.length} of {published.length} published or planned values have been checked against their primary source; the rest are labelled as not yet checked wherever they appear.</>}
              {" "}Reported limits are thresholds inferred by the authors, not tested conditions. Planned experiments are never counted as evidence.
            </p>
            <DocTable label="Published values" caption="Values transcribed from publications (not in PSI)">
              <thead><tr><th scope="col">Record</th><th scope="col">Material</th><th scope="col">g</th><th scope="col">Conditions and basis</th><th scope="col">Source and locator</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {published.map((r) => {
                  const unchecked = r.flags.includes("unverified-transcription");
                  return (
                    <tr key={r.id}>
                      <td className="doc-cell-id"><span className="mono">{r.id.split(":").map((part, k) => <span key={k}>{k ? <>:<wbr /></> : null}{part}</span>)}</span><br /><span className="doc-sub">{TIER_LABEL[r.tier]}</span></td>
                      <td className="doc-cell-narrow">{r.material ?? "—"}</td>
                      <td className="doc-nowrap">{GRAVITY_SHORT[r.gravity]}</td>
                      <td className="doc-cell-mid"><span className="num doc-nowrap">{valueOf(r)}</span><br /><span className="doc-sub">O₂ {basisLabel(r.o2Basis)}; P {basisLabel(r.pressureBasis)}</span></td>
                      <td className="doc-cell-src"><a href={r.source.url} target="_blank" rel="noreferrer">{r.source.ref}</a>{r.source.page ? `, ${r.source.page}` : ""}{r.source.quote ? <><br /><q className="doc-quote">{r.source.quote}</q></> : null}</td>
                      <td className="doc-nowrap">
                        <span className="claim" data-kind={r.tier === "T4_PLANNED" ? "PLANNED" : unchecked ? "DRAFT" : r.flags.includes("limit-value") ? "REPORTED LIMIT" : "PUBLISHED"}>
                          {r.tier === "T4_PLANNED" ? "planned" : unchecked ? "not yet checked" : r.flags.includes("limit-value") ? "limit · checked" : "checked"}
                        </span>
                        {r.flags.includes("conflicting-sources") && <><br /><span className="doc-sub">sources disagree</span></>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DocTable>
          </DocSection>

          <DocSection {...sec("atmospheres")}>
            <p>The reference cabin atmospheres on the Atlas are fixed values. Each was checked against the document that states it; a disagreement is reported here, not applied.</p>
            <DocTable label="Reference atmospheres and their verification" caption="Reference atmospheres: stated values, locator, verbatim quote and status">
              <thead><tr><th scope="col">Atmosphere</th><th scope="col">Values</th><th scope="col">Locator and quote</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {atmospheres.map(({ a, v }) => (
                  <tr key={a.id}>
                    <th scope="row" className="doc-cell-mid">{a.label}</th>
                    <td className="num doc-nowrap">{a.o2Pct}% O₂ · {a.pressurePsia} psia<br /><span className="doc-sub">{a.pressureKPa} kPa</span></td>
                    <td className="doc-cell-wide">
                      {v?.locator ? (v.sourceUrl ? <a href={v.sourceUrl} target="_blank" rel="noreferrer">{v.locator}</a> : v.locator) : a.source}
                      {v?.quote ? <><br /><q className="doc-quote">{v.quote}</q></> : null}
                      {v?.notes ? <><br /><span className="doc-sub">{v.notes}</span></> : null}
                    </td>
                    <td className={v?.status === "primary-checked" ? "doc-cell-mid" : "doc-cell-mid doc-caution-text"}>{v ? STATUS_LABEL[v.status] : "not yet checked"}</td>
                  </tr>
                ))}
              </tbody>
            </DocTable>
          </DocSection>

          <DocSection {...sec("insights")}>
            <p>{insightChecked} of {insights.length} findings have been checked against their primary source and are shown in the app. The others stay hidden until checked.</p>
            <DocTable label="Findings and verification status" caption="Findings and their verification status">
              <thead><tr><th scope="col">Finding</th><th scope="col">Validity</th><th scope="col">Source</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {insights.map((i) => (
                  <tr key={i.id}>
                    <td className="doc-cell-wide">{i.claim}<br /><span className="doc-sub">{i.value} · {i.conditions}</span></td>
                    <td className="doc-nowrap doc-sub">{i.validity}</td>
                    <td className="doc-cell-wide"><a href={i.source.url} target="_blank" rel="noreferrer">{i.source.ref}</a>{i.verification.locator ? `, ${i.verification.locator}` : ""}{i.verification.quote ? <><br /><q className="doc-quote">{i.verification.quote}</q></> : null}</td>
                    <td className={i.verification.status === "primary-checked" ? "doc-cell-mid doc-sub" : "doc-cell-mid doc-caution-text"}>{STATUS_LABEL[i.verification.status]}</td>
                  </tr>
                ))}
              </tbody>
            </DocTable>
          </DocSection>

          <DocSection {...sec("references")}>
            <ol className="doc-refs">
              {refs.map((r) => (
                <li key={r.id} className="doc-ref">
                  <p className="doc-ref-title"><a href={r.url} target="_blank" rel="noreferrer">{r.short}</a></p>
                  <p className="doc-ref-cite">{r.citation}</p>
                  <dl className="doc-ref-meta">
                    {r.ntrs && <div><dt>NTRS</dt><dd className="mono">{r.ntrs}</dd></div>}
                    {r.doi && <div><dt>DOI</dt><dd className="mono"><a href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">{r.doi}</a></dd></div>}
                    <div><dt>Accessed</dt><dd className="num">{r.accessed}</dd></div>
                    <div><dt>Terms</dt><dd>{r.terms}</dd></div>
                    {r.usedFor.length > 0 && <div><dt>Used for</dt><dd>{r.usedFor.join("; ")}</dd></div>}
                  </dl>
                </li>
              ))}
            </ol>
          </DocSection>

          <DocSection {...sec("software")}>
            <p>Built with Next.js and React (MIT), d3-scale, d3-array, d3-shape and d3-contour (ISC), and zod (MIT). Typefaces: Albert Sans and IBM Plex Mono, both under the SIL Open Font License 1.1, self-hosted through <code className="mono">next/font</code> (the visitor&rsquo;s browser makes no request to Google). The full list is in the repository&rsquo;s NOTICE file. No images are generated by AI, and no NASA imagery is used.</p>
            <DocTable label="Typefaces and packages" caption="Typefaces and packages that ship with the site">
              <thead><tr><th scope="col">Name</th><th scope="col">Kind</th><th scope="col">Used for</th><th scope="col">Licence</th></tr></thead>
              <tbody>
                {TYPEFACES.map((t) => <tr key={t.name}><th scope="row">{t.name}</th><td>Typeface</td><td>{t.use}</td><td className="doc-nowrap">{t.licence}</td></tr>)}
                {PACKAGES.map((p) => <tr key={p.name}><th scope="row">{p.name}</th><td>Package</td><td>{p.use}</td><td className="doc-nowrap">{p.licence}</td></tr>)}
              </tbody>
            </DocTable>
          </DocSection>

          <DocSection {...sec("si")}>
            <div className="doc-disclosure">
              <p>
                MARGIN was created by Alex de Gentile for NASA Space Apps 2026. AI (SI) tools assisted its development, which the competition rules require us to disclose.
                SI was used for research, writing code and tests, reviewing the method, and checking published values against their primary sources. Every scientific value
                shown is traced to a source listed on this page, and values not yet checked against their primary source are labelled as such. The running app uses no AI:
                every result is computed by deterministic code from the bundled data.
              </p>
            </div>
          </DocSection>

          <DocSection {...sec("licences")}>
            <dl className="doc-defs">
              <div><dt>MARGIN code</dt><dd>Apache License 2.0.</dd></div>
              <div><dt>NASA PSI data</dt><dd>As stated on each PSI record (see the table above); not relicensed by MARGIN.</dd></div>
              <div><dt>Published values</dt><dd>Short factual values and quotations of ≤ 25 words, cited to their sources; the papers themselves are linked, not redistributed.</dd></div>
              <div><dt>Fonts</dt><dd>Albert Sans and IBM Plex Mono: SIL Open Font License 1.1.</dd></div>
            </dl>
          </DocSection>
        </article>
      </div>
    </main>
  );
}
