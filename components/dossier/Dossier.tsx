/** Investigation dossier (server component): hero with the footprint stage, record, fingerprint, charts, run table. */
import type { ReactNode } from "react";
import type { Investigation } from "@/lib/schema";
import { DISCLAIMER, FUEL_LABEL, GRAVITY_LABEL, fmt } from "@/lib/format";
import {
  AXIS_LABEL, AXIS_UNIT, BASIS_TEXT, REGIME_TEXT, fingerprint, flagText, invExtra, staticById, summariesFor, tablesFor, tierShort,
} from "@/components/casefile/derive";
import { ClaimBadge } from "@/components/ui/misc";
import { IconExternal } from "@/components/ui/icons";
import { DossierChart } from "./DossierChart";
import { DossierStage } from "./DossierStage";
import { DossierCrumb, DossierLinks } from "./DossierLinks";
import { RunTable } from "./RunTable";
import css from "./dossier.module.css";

const NS = "not stated in PSI record";
const notStated = (inv: Investigation) => <span className={css.nr}>{inv.tier === "T2_PSI_RECORD" ? NS : "not stated in source"}</span>;
const list = (xs: string[], max: number) => (xs.length <= max ? xs.join(" · ") : `${xs.slice(0, max).join(" · ")} · +${xs.length - max} more`);

function Row({ k, children }: { k: string; children: ReactNode }) {
  return <div className={css.dlRow}><dt>{k}</dt><dd>{children}</dd></div>;
}
function Ext({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <a href={href} target="_blank" rel="noreferrer" className={className}>{children}<IconExternal size={12} className={css.extIcon} /><span className="sr-only"> (opens in a new tab)</span></a>;
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
  const sumFiles = Array.from(new Set(summaries.map((x) => x.file))).join(", ");
  const varied = fp.axes.filter((a) => a.state === "varied");
  const held = fp.axes.filter((a) => a.state === "held");
  const absent = fp.axes.filter((a) => a.state === "not recorded");
  const range = (a: (typeof fp.axes)[number]) => a.min == null ? "" : a.min === a.max ? `${fmt(a.min, 1)} ${AXIS_UNIT[a.axis]}` : `${fmt(a.min, 1)}–${fmt(a.max, 1)} ${AXIS_UNIT[a.axis]}`;

  return (
    <main id="main" className={`ui-page ${css.root}`} data-testid="dossier" data-inv={inv.id}>
      <DossierCrumb acronym={inv.acronym} />

      <section className={css.hero} aria-labelledby="dos-h1">
        <div className={css.heroText}>
          <p className={css.kicker}>
            <span className={css.tier} data-tier={inv.tier}>{tierShort(inv)}</span>
            <span className="num">{inv.id}</span>
            <span>Investigation dossier</span>
          </p>
          <h1 className={`ui-page-title ${css.h1}`} id="dos-h1">{inv.acronym}</h1>
          {inv.title !== inv.acronym && <p className={css.title}>{inv.title}</p>}
          <dl className={css.heroMeta}>
            <Row k="Principal investigator">{inv.pi ?? notStated(inv)}</Row>
            <Row k="Platform">{inv.platform ?? notStated(inv)}</Row>
            <Row k="Hardware">{inv.hardware ?? notStated(inv)}</Row>
            <Row k="Dates">{inv.startDate || inv.endDate ? <span className="num">{inv.startDate ?? "?"} → {inv.endDate ?? "?"}</span> : notStated(inv)}</Row>
            <Row k="Licence">{inv.license ?? notStated(inv)}</Row>
            {isPsi && <Row k="PSI version">{extra?.psiVersion != null ? <span className="num">v{extra.psiVersion}</span> : <span className={css.nr}>{NS}</span>}{extra?.psiModified ? <> · modified <span className="num">{extra.psiModified}</span></> : null}</Row>}
            {isPsi && <Row k="Publications listed"><span className="num">{inv.publicationsCount}</span></Row>}
            {!isPsi && <Row k="Status">{inv.tier === "T4_PLANNED" ? <><ClaimBadge kind="PLANNED" /> planned: never counted as evidence</> : <>published values, not in PSI; shown only when &ldquo;Include published evidence&rdquo; is on</>}</Row>}
          </dl>
          <p className={css.heroLinks}>
            <Ext href={inv.landingUrl}>{isPsi ? "PSI record" : inv.tier === "T4_PLANNED" ? "Plan document" : "Source document"}</Ext>
            {inv.doi && <Ext href={`https://doi.org/${inv.doi}`}><span>doi <span className="num">{inv.doi}</span></span></Ext>}
            <span className={css.urlText}>{inv.landingUrl.replace(/^https?:\/\//, "")}</span>
          </p>
          <DossierLinks id={inv.id} />
          <p className={css.disclaimer}><b>{DISCLAIMER}</b> This page describes what was tested and where each value comes from.</p>
        </div>
        <DossierStage runs={runs} acronym={inv.acronym} invId={inv.id} />
      </section>

      <section className={css.section} aria-labelledby="dos-obj-h">
        <h2 className={css.h2} id="dos-obj-h">Objective</h2>
        {inv.objective
          ? <><p className={css.sub}>{isPsi ? "As written in the PSI record:" : "From the source:"}</p><blockquote className={css.objective}>{inv.objective}</blockquote></>
          : <p className={css.nr}>{isPsi ? "Objective not stated in PSI record." : "No objective text; see the source document."}</p>}
      </section>

      <section className={css.section} aria-labelledby="dos-fp-h" data-testid="fingerprint">
        <h2 className={css.h2} id="dos-fp-h">Fingerprint <ClaimBadge kind="COMPUTED" /></h2>
        {runs.length === 0 ? (
          <p className={css.emptyNote}>
            {summaries.length
              ? <>PSI has summary rows only for this investigation ({summaries.length} rows in {sumFiles}), not individual runs, so there is nothing to fingerprint run by run. The summary rows are listed below.</>
              : <>PSI has no experimental table for this investigation, so no run fingerprint can be computed.</>}
          </p>
        ) : (
          <>
            <p className={css.sub}>Computed from the {runs.length} {isPsi ? "run rows" : "records"} below: what varied, what was held constant, and what was never recorded.</p>
            <div className={css.fpCards}>
              <div className={css.fpCard}>
                <h3 className="ui-label">Varied</h3>
                <ul className={css.fpList}>
                  {varied.map((a) => <li key={a.axis}><b>{AXIS_LABEL[a.axis]}</b> <span className="num">{range(a)}</span> <span className={css.quiet}>· {a.levels} levels · {a.basis}</span></li>)}
                  {fp.variedCols.slice(0, 8).map((c) => <li key={c.col}><span className="mono">{c.col}</span> <span className={css.quiet}>· {c.distinct} values</span></li>)}
                  {fp.variedCols.length > 8 && <li className={css.quiet}>+{fp.variedCols.length - 8} more source columns</li>}
                  {!varied.length && !fp.variedCols.length && <li className={css.nr}>nothing varied</li>}
                </ul>
              </div>
              <div className={css.fpCard}>
                <h3 className="ui-label">Held constant</h3>
                <ul className={css.fpList}>
                  {held.map((a) => <li key={a.axis}><b>{AXIS_LABEL[a.axis]}</b> <span className="num">{range(a)}</span> <span className={css.quiet}>· {a.basis}</span></li>)}
                  {fp.heldCols.slice(0, 8).map((c) => <li key={c.col}><span className="mono">{c.col}</span> = {c.value}</li>)}
                  {fp.heldCols.length > 8 && <li className={css.quiet}>+{fp.heldCols.length - 8} more source columns</li>}
                  {!held.length && !fp.heldCols.length && <li className={css.nr}>nothing held constant</li>}
                </ul>
              </div>
              <div className={css.fpCard}>
                <h3 className="ui-label">Not recorded</h3>
                <ul className={css.fpList}>
                  {absent.map((a) => <li key={a.axis}><b>{AXIS_LABEL[a.axis]}</b> <span className={css.quiet}>{a.reason ?? BASIS_TEXT.unknown}</span></li>)}
                  {fp.axes.filter((a) => a.state !== "not recorded" && a.n < a.total).map((a) => <li key={`p${a.axis}`}><b>{AXIS_LABEL[a.axis]}</b> <span className={css.quiet}>missing in {a.total - a.n} of {a.total} rows{a.reason ? ` · ${a.reason}` : ""}</span></li>)}
                  {!absent.length && fp.axes.every((a) => a.n === a.total) && <li className={css.nr}>every row records O₂, pressure and flow</li>}
                </ul>
              </div>
            </div>
            {fp.burnerFed && <p className={css.note}><span className="num">{fp.burnerFed.n}</span> inverse-flame runs record a burner-fed oxidizer of <span className="num">{fmt(fp.burnerFed.min, 1)}–{fmt(fp.burnerFed.max, 1)}%</span> O₂. That is the stream fed through the burner, not the surrounding atmosphere, so it is not on the ambient O₂ axis.</p>}
            <div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Condition axes">
              <table className="ui-table">
                <caption className="sr-only">Condition axes: what varied and what was held constant</caption>
                <thead><tr><th scope="col">Axis</th><th scope="col">State</th><th scope="col">Range</th><th scope="col">Basis</th><th scope="col" className="is-num">Recorded</th></tr></thead>
                <tbody>
                  {fp.axes.map((a) => (
                    <tr key={a.axis}>
                      <th scope="row">{AXIS_LABEL[a.axis]}</th>
                      <td>{a.state === "held" ? "held constant" : a.state}</td>
                      <td>{a.min == null ? <span className={css.nr}>{a.reason ?? "—"}</span> : <span className="num">{range(a)}{a.levels > 1 ? ` · ${a.levels} levels` : ""}</span>}</td>
                      <td>{a.basis || <span className={css.nr}>{BASIS_TEXT.unknown}</span>}</td>
                      <td className="num is-num">{a.n}/{a.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className={css.dl}>
              <Row k="Placeable">
                <span className="num">{fp.placeable}</span> of {runs.length} record O₂ and can be placed (the engine can compute a distance); <span className="num">{fp.charted}</span> also record pressure and appear on the charts.
                {fp.notPlaceable.length > 0 && <> Not placeable: {fp.notPlaceable.map((x) => `${x.n}: ${x.reason}`).join("; ")}.</>}
              </Row>
              <Row k="Gravity">{fp.gravity.map((g) => `${GRAVITY_LABEL[g.g]} (${g.n})`).join(" · ")}</Row>
              <Row k="Fuel classes">{fp.fuel.map((f) => `${FUEL_LABEL[f.fc]} (${f.n})`).join(" · ")}</Row>
              <Row k="Flow regime">{fp.regimes.map((x) => `${REGIME_TEXT[x.regime]} (${x.n})`).join(" · ")}</Row>
              <Row k={`Materials (${fp.materials.length})`}>{list(fp.materials.map((m) => `${m.label} (${m.n})`), 12)}</Row>
              <Row k="Outcomes">{list(fp.outcomes.map((o) => `${o.label} (${o.n})`), 8)}</Row>
              <Row k="Measured quantities">{fp.measures.length ? list(fp.measures.map((m) => `${m.label} [${m.unit}] (${m.n})`), 10) : <span className={css.nr}>none normalized beyond O₂, pressure and flow</span>}</Row>
              {fp.identifiers.length > 0 && <Row k="Per-run identifiers">{list(fp.identifiers, 8)}</Row>}
              <Row k="Data-quality flags">
                {fp.flags.length ? (
                  <ul className={css.flagList}>{fp.flags.map((f) => <li key={f.flag}><span className="mono">{f.flag}</span> × <span className="num">{f.n}</span>: {flagText(f.flag)}</li>)}</ul>
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
            <p className={css.sub}>Normalized values with the original cell beneath each. Inspect a row for its conversions, flags, source and distance to your scenario.{skipped > 0 && <> {skipped} non-run row{skipped === 1 ? "" : "s"} in the CSV (notes or headers) were not treated as runs.</>}</p>
            <RunTable invId={inv.id} acronym={inv.acronym} files={runFiles.map((t) => t.file)} />
          </>
        )}
        {kind === "published" && (
          <>
            <p className={css.sub}>{inv.tier === "T4_PLANNED" ? "Planned conditions: never counted as evidence." : "Values transcribed from the paper (published, not a PSI table row), with the source locator and verification state of each record."}</p>
            <RunTable invId={inv.id} acronym={inv.acronym} files={[]} />
          </>
        )}
        {kind === "summary" && <p className={css.emptyNote}>PSI has no run-level table for this investigation: its experimental table holds summary rows only (each summarises a test series, not a single run), so nothing is placed or compared. The summary rows are listed below.</p>}
        {kind === "none" && <p className={css.emptyNote}>PSI has no experimental table for this investigation (no run-level table): only the record text above.</p>}
      </section>

      {kind === "summary" && (
        <section className={css.section} aria-labelledby="dos-sum-h" data-testid="summary-rows">
          <h2 className={css.h2} id="dos-sum-h">Summary rows (not runs)</h2>
          <p className={css.sub}>{summaries.length} summary rows from <span className="mono">{sumFiles}</span>, as they appear in PSI.</p>
          <div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Summary rows">
            <table className="ui-table">
              <caption className="sr-only">{summaries.length} summary rows from {sumFiles}, as they appear in PSI</caption>
              <thead><tr><th scope="col">Row</th>{sumCols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
              <tbody>
                {summaries.map((x) => (
                  <tr key={`${x.file}-${x.row}`}>
                    <th scope="row" className="num">{x.row}</th>
                    {sumCols.map((c) => <td key={c} className={css.cell}>{x.original[c] ?? ""}</td>)}
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
