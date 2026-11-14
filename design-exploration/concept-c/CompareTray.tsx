"use client";
import { useMemo, useState } from "react";
import type { Run } from "@/lib/schema";
import type { Evaluation } from "@/lib/engine";
import { TIER_LABEL, fmt, fmtSigned } from "../shared/format";
import { fingerprint, originalFor, r3, type AxisKey, type LadderRow } from "./derive";
import css from "./casefile.module.css";

const PREVIEW = 8;

function ValCell({ run, axis, digits = 1 }: { run: Run; axis: AxisKey; digits?: number }) {
  const v = axis === "o2" ? run.o2Pct : axis === "p" ? run.pressureKPa : run.flowCmS;
  const basis = axis === "o2" ? run.o2Basis : axis === "p" ? run.pressureBasis : run.flowBasis;
  const orig = originalFor(run, axis);
  return (
    <td>
      {v == null ? <span className={css.nr}>not recorded</span> : <span className={`${css.mono} ${basis === "nominal-stated" ? css.nomVal : ""}`}>{fmt(v, digits)}{basis === "nominal-stated" && <sup title="nominal (stated), not measured">nom</sup>}{basis === "limit-reported" && <sup title="reported limit">lim</sup>}</span>}
      <span className={css.origVal} title={orig ? `${orig.col}: ${orig.value}` : "no source column"}>{orig ? orig.value : "—"}</span>
    </td>
  );
}

function Column({ row, ev, unpin, openRun }: { row: LadderRow; ev: Evaluation; unpin: () => void; openRun: (r: Run) => void }) {
  const fp = useMemo(() => fingerprint(row), [row]);
  const [all, setAll] = useState(false);
  const { inv } = row;
  const dById = useMemo(() => {
    const m = new Map<string, number>();
    for (const sc of ev.comparable) if (sc.run.investigation === inv.id) m.set(sc.run.id, sc.d.D);
    return m;
  }, [ev, inv.id]);
  const sorted = useMemo(() => [...row.runs].sort((a, b) => (dById.get(a.id) ?? Infinity) - (dById.get(b.id) ?? Infinity) || (a.source.row ?? 0) - (b.source.row ?? 0)), [row.runs, dById]);
  const shown = all ? sorted : sorted.slice(0, PREVIEW);
  const outMax = Math.max(1, ...fp.outcomes.map((o) => o.n));
  const n = row.nearest;

  return (
    <article className={css.tcol} aria-label={`${inv.acronym} dossier`}>
      <header className={css.tcolHead}>
        <div>
          <h3><span className={css.tierMark} data-tier={inv.tier === "T2_PSI_RECORD" ? "T1_PSI_RUN" : inv.tier} aria-hidden /> {inv.acronym} <span className={css.invId}>{inv.id}</span></h3>
          <p className={css.tcolTitle}>{inv.title}</p>
          <span className={`${css.chip} ${css[`chip_${row.state}`] ?? ""}`}>{row.state === "comparable" ? `comparable · ${row.comparableRuns} runs` : row.chip}</span>
        </div>
        <button type="button" className={css.unpinBtn} onClick={unpin} aria-label={`Unpin ${inv.acronym}`}>Unpin ✕</button>
      </header>

      <section className={css.tsec}>
        <h4 className={css.miniH}>Fingerprint <em>computed from runs</em></h4>
        <dl className={css.fpStats}>
          <div><dt>Runs</dt><dd className={css.mono}>{fp.runs || (inv.summaryRowCount ? `0 · ${inv.summaryRowCount} summary rows` : "0")}</dd></div>
          <div><dt>D<sub>min</sub></dt><dd className={css.mono}>{row.Dmin != null ? fmt(row.Dmin, 2) : "—"}</dd></div>
          <div><dt>R</dt><dd className={css.mono}>{row.R != null ? fmt(row.R, 1) : "—"}</dd></div>
        </dl>
        {fp.runs === 0 ? (
          <p className={css.hatchNote}>{inv.summaryRowCount > 0 ? "summary table only — not runs" : "no run table"}; nothing to fingerprint.</p>
        ) : (
          <>
            <table className={css.fpTable}>
              <tbody>
                {fp.varied.map((v) => <tr key={v.label}><th>{v.label}</th><td><span className={css.fpTagV}>varied</span> {v.detail}</td></tr>)}
                {fp.constant.map((v) => <tr key={v.label}><th>{v.label}</th><td><span className={css.fpTagC}>held</span> {v.detail}</td></tr>)}
                {fp.notRecorded.map((v) => <tr key={v}><th>{v.split(" (")[0]}</th><td><span className={css.fpTagN}>not recorded</span> {v.includes("(") ? v.slice(v.indexOf("(") + 1, -1) : ""}</td></tr>)}
              </tbody>
            </table>
            <p className={css.fpCols}>
              <b>Original columns</b> · varied: {fp.variedCols.length ? fp.variedCols.slice(0, 6).map((c) => `${c.col} (${c.distinct})`).join(", ") : "none"}{fp.variedCols.length > 6 ? ` +${fp.variedCols.length - 6}` : ""}
              {" · "}held: {fp.constantCols.length ? fp.constantCols.slice(0, 4).map((c) => `${c.col} = ${c.value}`).join(", ") : "none"}{fp.constantCols.length > 4 ? ` +${fp.constantCols.length - 4}` : ""}
              {fp.identifiers.length > 0 && <> · per-run identifiers: {fp.identifiers.length}</>}
            </p>
            <div className={css.fpSplit}>
              <div>
                <span className={css.fpSub}>Outcomes</span>
                <ul className={css.outList}>
                  {fp.outcomes.slice(0, 5).map((o) => (
                    <li key={o.label}><span className={o.label === "not recorded" ? css.nr : ""}>{o.label}</span><span className={css.outBar}><span style={{ width: `${r3((o.n / outMax) * 100)}%` }} /></span><span className={css.mono}>{o.n}</span></li>
                  ))}
                  {fp.outcomes.length > 5 && <li className={css.dimTxt}>+{fp.outcomes.length - 5} more</li>}
                </ul>
              </div>
              <div>
                <span className={css.fpSub}>Data-quality flags</span>
                {fp.flags.length ? <p className={css.flagRow}>{fp.flags.map((f) => <span key={f.flag} className={css.flag}>{f.flag} <b>{f.n}</b></span>)}</p> : <p className={css.dimTxt}>none</p>}
              </div>
            </div>
          </>
        )}
      </section>

      <section className={css.tsec}>
        <h4 className={css.miniH}>Record</h4>
        <table className={css.metaTable}>
          <tbody>
            <tr><th>Tier</th><td>{inv.tier === "T2_PSI_RECORD" ? "PSI record" : TIER_LABEL[inv.tier]}</td></tr>
            <tr><th>PI</th><td>{inv.pi ?? <span className={css.nr}>not recorded</span>}</td></tr>
            <tr><th>Platform</th><td>{inv.platform ?? <span className={css.nr}>not recorded</span>}</td></tr>
            <tr><th>Hardware</th><td>{inv.hardware ?? <span className={css.nr}>not recorded</span>}</td></tr>
            <tr><th>Dates</th><td className={css.mono}>{inv.startDate || inv.endDate ? `${inv.startDate ?? "?"} → ${inv.endDate ?? "?"}` : <span className={css.nr}>not recorded</span>}</td></tr>
            <tr><th>DOI</th><td>{inv.doi ? <a href={`https://doi.org/${inv.doi}`} target="_blank" rel="noreferrer" className={css.mono}>{inv.doi}</a> : <span className={css.nr}>not recorded</span>}</td></tr>
            <tr><th>Licence</th><td>{inv.license ?? <span className={css.nr}>not recorded</span>}</td></tr>
          </tbody>
        </table>
        <a href={inv.landingUrl} target="_blank" rel="noreferrer" className={css.extLink}>{inv.tier === "T2_PSI_RECORD" ? "Open in PSI" : "Open source"} ↗</a>
      </section>

      <section className={css.tsec}>
        <h4 className={css.miniH}>Nearest run <em>computed</em></h4>
        {n ? (
          <button type="button" className={css.excerpt} onClick={() => openRun(n.run)}>
            <span className={css.mono}>{n.run.id}</span> · {n.run.material ?? "material not recorded"}
            <span className={css.excerptFig}>D <b className={css.mono}>{fmt(n.d.D, 2)}</b> · O₂ {fmtSigned(n.d.raw.o2Pts, 1)} pts · P {fmtSigned(n.d.raw.pressurePct, 0)} % · flow {n.d.flags.includes("flow-regime-mismatch") ? "regime mismatch" : n.d.raw.flowCmS == null ? "not used" : `${fmtSigned(n.d.raw.flowCmS, 1)} cm/s`}</span>
          </button>
        ) : <p className={css.dimTxt}>No comparable run for this scenario — {row.chip}.</p>}
      </section>

      {row.runs.length > 0 && (
        <section className={css.tsec}>
          <h4 className={css.miniH}>Runs <em>normalized / original · click a row for provenance</em></h4>
          <div className={css.tableScroll}>
            <table className={css.runTable}>
              <thead><tr><th>Row</th><th>Material</th><th>O₂ %</th><th>P kPa</th><th>Flow cm/s</th><th>Flags</th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} tabIndex={0} onClick={() => openRun(r)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRun(r); } }} data-near={dById.has(r.id)}>
                    <td className={css.mono}>{r.source.row ?? r.source.page?.slice(0, 10) ?? "—"}</td>
                    <td className={css.matCell} title={r.material ?? ""}>{r.material ?? <span className={css.nr}>not recorded</span>}</td>
                    <ValCell run={r} axis="o2" />
                    <ValCell run={r} axis="p" />
                    <ValCell run={r} axis="flow" />
                    <td>{r.flags.length ? <span className={css.flagCount} title={r.flags.join(", ")}>{r.flags.length}</span> : <span className={css.dimTxt}>0</span>}{r.conversions.length > 0 && <span className={css.convMark} title={r.conversions.map((c) => `${c.field}: ${c.from} → ${c.to} (${c.formula})`).join("\n")}>conv</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {row.runs.length > PREVIEW && (
            <button type="button" className={css.linkBtn} onClick={() => setAll((x) => !x)}>{all ? "Show first " + PREVIEW : `Show all ${row.runs.length} runs`}</button>
          )}
        </section>
      )}
    </article>
  );
}

export function CompareTray({ rows, pinned, ev, open, setOpen, unpin, openRun }: {
  rows: LadderRow[]; pinned: string[]; ev: Evaluation; open: boolean; setOpen: (o: boolean) => void; unpin: (id: string) => void; openRun: (r: Run) => void;
}) {
  const pinnedRows = pinned.map((id) => rows.find((r) => r.inv.id === id)).filter((r): r is LadderRow => !!r);
  return (
    <div className={`${css.tray} ${open ? css.trayOpen : ""}`} role="region" aria-label="Compare tray">
      <div className={css.trayBar}>
        <span className={css.trayTitle}>Compare <span className={css.mono}>{pinnedRows.length}/3</span></span>
        <span className={css.trayChips}>
          {pinnedRows.length === 0 && <span className={css.dimTxt}>Pin up to 3 investigations with □ in the ladder.</span>}
          {pinnedRows.map((r) => (
            <span key={r.inv.id} className={css.trayChip}>
              {r.inv.acronym}
              <button type="button" onClick={() => unpin(r.inv.id)} aria-label={`Unpin ${r.inv.acronym}`}>✕</button>
            </span>
          ))}
        </span>
        <button type="button" className={css.trayToggle} aria-expanded={open} disabled={pinnedRows.length === 0} onClick={() => setOpen(!open)}>
          {open ? "Close ▾" : "Open dossiers ▴"}
        </button>
      </div>
      {open && pinnedRows.length > 0 && (
        <div className={css.trayBody} style={{ ["--cf-tcols" as string]: pinnedRows.length }}>
          {pinnedRows.map((r) => <Column key={r.inv.id} row={r} ev={ev} unpin={() => unpin(r.inv.id)} openRun={openRun} />)}
        </div>
      )}
    </div>
  );
}
