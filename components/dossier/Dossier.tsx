/** Investigation dossier (server component): PSI metadata, computed fingerprint, chart, run table. */
import type { ReactNode } from "react";
import type { Investigation } from "@/lib/schema";
import { DISCLAIMER, FUEL_LABEL, GRAVITY_LABEL, fmt } from "@/lib/format";
import {
  AXIS_LABEL, AXIS_UNIT, BASIS_TEXT, REGIME_TEXT, fingerprint, flagText, invExtra, staticById, summariesFor, tablesFor, tierShort,
} from "@/components/casefile/derive";
import { Claim } from "@/components/casefile/ui";
import { DossierChart } from "./DossierChart";
import { DossierCrumb, DossierLinks } from "./DossierLinks";
import { RunTable } from "./RunTable";
import css from "./dossier.module.css";

const NS = "not stated in PSI record";
const notStated = (inv: Investigation) => <span className={css.nr}>{inv.tier === "T2_PSI_RECORD" ? NS : "not stated in source"}</span>;
const list = (xs: string[], max: number) => (xs.length <= max ? xs.join(" · ") : `${xs.slice(0, max).join(" · ")} · +${xs.length - max} more`);

function Row({ k, children }: { k: string; children: ReactNode }) {
  return <div className={css.metaRow}><dt>{k}</dt><dd>{children}</dd></div>;
}

export function Dossier({ id }: { id: string }) {
  const st = staticById.get(id)!;
  const { inv, runs } = st;
  const extra = invExtra(id);
  const fp = fingerprint(st);
  const tables = tablesFor(id);
  const summaries = summariesFor(id);
  const runFiles = tables.filter((t) => t.kind === "run");
  const isPsi = inv.tier === "T2_PSI_RECORD";
  const skipped = runFiles.reduce((a, t) => a + t.skippedNonRunRows, 0);
  const sumCols = Array.from(new Set(summaries.flatMap((x) => Object.keys(x.original))));
  const kind = runs.length ? (isPsi ? "runs" : "published") : summaries.length ? "summary" : "none";

  return (
    <main id="main" className={css.root} data-testid="dossier" data-inv={inv.id}>
      <header className={css.head}>
        <DossierCrumb id={inv.id} />
        <div className={css.headMain}>
          <div className={css.headText}>
            <h1 className={css.h1}>{inv.acronym}</h1>
            {inv.title !== inv.acronym && <p className={css.title}>{inv.title}</p>}
            <p className={css.headMeta}>
              <span className={css.tier} data-tier={inv.tier}>{tierShort(inv)}</span>
              <span className="num">{inv.id}</span>
              <span>Investigation dossier</span>
            </p>
          </div>
          <DossierLinks id={inv.id} />
        </div>
        <p className={css.disclaimer}>{DISCLAIMER} This page describes what was tested and where each value comes from.</p>
      </header>

      <div className={css.grid}>
        <section className={css.section} aria-labelledby="dos-record-h">
          <h2 className={css.h2} id="dos-record-h">Record</h2>
          <dl className={css.meta}>
            <Row k="Principal investigator">{inv.pi ?? notStated(inv)}</Row>
            <Row k="Platform">{inv.platform ?? notStated(inv)}</Row>
            <Row k="Hardware">{inv.hardware ?? notStated(inv)}</Row>
            <Row k="Dates">{inv.startDate || inv.endDate ? <span className="num">{inv.startDate ?? "?"} → {inv.endDate ?? "?"}</span> : notStated(inv)}</Row>
            <Row k="DOI">{inv.doi ? <a href={`https://doi.org/${inv.doi}`} target="_blank" rel="noreferrer" className="num">{inv.doi} ↗</a> : notStated(inv)}</Row>
            <Row k="Licence">{inv.license ?? notStated(inv)}</Row>
            <Row k={isPsi ? "PSI record" : "Source"}><a href={inv.landingUrl} target="_blank" rel="noreferrer" className={css.url}>{inv.landingUrl} ↗</a></Row>
            {isPsi && <Row k="PSI version">{extra?.psiVersion != null ? <span className="num">v{extra.psiVersion}</span> : <span className={css.nr}>{NS}</span>}{extra?.psiModified ? <> · modified <span className="num">{extra.psiModified}</span></> : null}</Row>}
            {isPsi && <Row k="Publications listed">{inv.publicationsCount}</Row>}
            {!isPsi && <Row k="Status">{inv.tier === "T4_PLANNED" ? <><Claim kind="PLANNED" /> planned — never counted as evidence</> : <>published values, not in PSI; shown only when “Include published evidence” is on</>}</Row>}
          </dl>
        </section>

        <section className={css.section} aria-labelledby="dos-obj-h">
          <h2 className={css.h2} id="dos-obj-h">Objective</h2>
          {inv.objective ? <><p className={css.sub}>{isPsi ? "As written in the PSI record:" : "From the source:"}</p><blockquote className={css.objective}>{inv.objective}</blockquote></> : <p className={css.nr}>{isPsi ? "Objective not stated in PSI record." : "No objective text; see the source document."}</p>}
        </section>
      </div>

      <section className={css.section} aria-labelledby="dos-fp-h" data-testid="fingerprint">
        <h2 className={css.h2} id="dos-fp-h">Fingerprint <Claim kind="COMPUTED" /></h2>
        {runs.length === 0 ? (
          <p className={css.emptyNote}>
            {summaries.length
              ? <>PSI has summary rows only for this investigation ({summaries.length} rows in {Array.from(new Set(summaries.map((x) => x.file))).join(", ")}), not individual runs — so there is nothing to fingerprint run by run. The summary rows are listed below.</>
              : <>PSI has no experimental table for this investigation, so no run fingerprint can be computed.</>}
          </p>
        ) : (
          <>
            <p className={css.sub}>Computed from the {runs.length} {isPsi ? "run rows" : "records"} below: what varied, what was held constant, and what was never recorded.</p>
            <div className={css.tableScroll} tabIndex={0} role="region" aria-label="Condition axes (scrolls sideways on small screens)">
              <table className={css.fpTable}>
                <caption className="sr-only">Condition axes: what varied and what was held constant</caption>
                <thead><tr><th scope="col">Axis</th><th scope="col">State</th><th scope="col">Range</th><th scope="col">Basis</th><th scope="col" className={css.right}>Recorded</th></tr></thead>
                <tbody>
                  {fp.axes.map((a) => (
                    <tr key={a.axis}>
                      <th scope="row">{AXIS_LABEL[a.axis]}</th>
                      <td><b>{a.state === "held" ? "held constant" : a.state}</b></td>
                      <td>{a.min == null ? <span className={css.nr}>{a.reason ?? "—"}</span> : <span className="num">{a.min === a.max ? `${fmt(a.min, 1)}` : `${fmt(a.min, 1)}–${fmt(a.max, 1)}`} {AXIS_UNIT[a.axis]}{a.levels > 1 ? ` · ${a.levels} levels` : ""}</span>}</td>
                      <td>{a.basis || <span className={css.nr}>{BASIS_TEXT.unknown}</span>}</td>
                      <td className={`num ${css.right}`}>{a.n}/{a.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {fp.burnerFed && <p className={css.note}><span className="num">{fp.burnerFed.n}</span> inverse-flame runs record a burner-fed oxidizer of <span className="num">{fmt(fp.burnerFed.min, 1)}–{fmt(fp.burnerFed.max, 1)}%</span> O₂. That is the stream fed through the burner, not the surrounding atmosphere, so it is not on the ambient O₂ axis.</p>}
            <dl className={css.fpDl}>
              <Row k="Placeable">
                <span className="num">{fp.placeable}</span> of {runs.length} record O₂ and can be placed (the engine can compute a distance); <span className="num">{fp.charted}</span> also record pressure and appear on the chart.
                {fp.notPlaceable.length > 0 && <> Not placeable: {fp.notPlaceable.map((x) => `${x.n} — ${x.reason}`).join("; ")}.</>}
              </Row>
              <Row k="Gravity">{fp.gravity.map((g) => `${GRAVITY_LABEL[g.g]} (${g.n})`).join(" · ")}</Row>
              <Row k="Fuel classes">{fp.fuel.map((f) => `${FUEL_LABEL[f.fc]} (${f.n})`).join(" · ")}</Row>
              <Row k="Flow regime">{fp.regimes.map((x) => `${REGIME_TEXT[x.regime]} (${x.n})`).join(" · ")}</Row>
              <Row k={`Materials (${fp.materials.length})`}>{list(fp.materials.map((m) => `${m.label} (${m.n})`), 12)}</Row>
              <Row k="Outcomes">{list(fp.outcomes.map((o) => `${o.label} (${o.n})`), 8)}</Row>
              <Row k="Measured quantities">{fp.measures.length ? list(fp.measures.map((m) => `${m.label} [${m.unit}] (${m.n})`), 10) : <span className={css.nr}>none normalized beyond O₂, pressure and flow</span>}</Row>
              <Row k="Varied (source columns)">{fp.variedCols.length ? list(fp.variedCols.map((c) => `${c.col} (${c.distinct} values)`), 14) : <span className={css.nr}>none</span>}</Row>
              <Row k="Held constant (source columns)">{fp.heldCols.length ? list(fp.heldCols.map((c) => `${c.col} = ${c.value}`), 10) : <span className={css.nr}>none</span>}</Row>
              {fp.identifiers.length > 0 && <Row k="Per-run identifiers">{list(fp.identifiers, 8)}</Row>}
              <Row k="Data-quality flags">
                {fp.flags.length ? (
                  <ul className={css.flagList}>{fp.flags.map((f) => <li key={f.flag}><span className="num">{f.flag}</span> × {f.n} — {flagText(f.flag)}</li>)}</ul>
                ) : <span className={css.nr}>none</span>}
              </Row>
            </dl>
          </>
        )}
      </section>

      <DossierChart runs={runs} fp={fp} acronym={inv.acronym} />

      <section className={css.section} aria-labelledby="dos-runs-h" data-testid="run-table" data-kind={kind} data-rows={runs.length}>
        <h2 className={css.h2} id="dos-runs-h">{kind === "published" ? (inv.tier === "T4_PLANNED" ? "Planned conditions (not evidence)" : "Published records") : "Run table"}</h2>
        {kind === "runs" && (
          <>
            {skipped > 0 && <p className={css.sub}>{skipped} non-run row{skipped === 1 ? "" : "s"} in the CSV (notes or headers) were not treated as runs.</p>}
            <RunTable invId={inv.id} acronym={inv.acronym} files={runFiles.map((t) => t.file)} />
          </>
        )}
        {kind === "published" && (
          <>
            <p className={css.sub}>{inv.tier === "T4_PLANNED" ? "Planned conditions: never counted as evidence." : "Values transcribed from the paper, with the source locator and verification state of each record."}</p>
            <RunTable invId={inv.id} acronym={inv.acronym} files={[]} />
          </>
        )}
        {kind === "summary" && <p className={css.emptyNote}>PSI has no run-level table for this investigation: its experimental table holds summary rows only (each summarises a test series, not a single run), so nothing is placed or compared. The summary rows are listed below.</p>}
        {kind === "none" && <p className={css.emptyNote}>PSI has no experimental table for this investigation (no run-level table) — only the record text above.</p>}
      </section>

      {kind === "summary" && (
        <section className={css.section} aria-labelledby="dos-sum-h" data-testid="summary-rows">
          <h2 className={css.h2} id="dos-sum-h">Summary rows (not runs)</h2>
            <div className={css.tableScroll} tabIndex={0} role="region" aria-label="Summary rows (scrolls sideways on small screens)">
              <table className={css.runTable}>
                <caption className={css.caption}>{summaries.length} summary rows from {Array.from(new Set(summaries.map((x) => x.file))).join(", ")}, as they appear in PSI.</caption>
                <thead><tr><th scope="col">Row</th>{sumCols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
                <tbody>
                  {summaries.map((x) => (
                    <tr key={`${x.file}-${x.row}`}>
                      <th scope="row" className="num">{x.row}</th>
                      {sumCols.map((c) => <td key={c}>{x.original[c] ?? ""}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </section>
      )}
    </main>
  );
}
