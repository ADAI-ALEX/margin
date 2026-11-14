"use client";
import { useEffect, useRef } from "react";
import type { Run, Scenario } from "@/lib/schema";
import { distance, gate } from "@/lib/engine";
import { invById } from "../shared/data";
import { basisLabel, fmt, fmtSigned, FUEL_LABEL, GRAVITY_LABEL, TIER_LABEL } from "../shared/format";
import { fmtP } from "./units";
import s from "./console.module.css";

export default function Provenance({ run, scenario, onClose }: { run: Run; scenario: Scenario; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [onClose]);

  const inv = invById.get(run.investigation);
  const g = gate(run, scenario);
  const d = g.status === "comparable" ? distance(run, scenario) : null;
  const originals = Object.entries(run.original);
  const measures = Object.entries(run.measures);

  return (
    <div className={s.provLayer}>
      <div className={s.provBackdrop} onClick={onClose} aria-hidden />
      <aside className={s.prov} role="dialog" aria-modal="true" aria-labelledby="a-prov-h">
        <header className={s.provHead}>
          <div>
            <span className={s.micro}>Provenance</span>
            <h2 id="a-prov-h" className={s.provTitle}>{run.id}</h2>
            <span className={s.tierTag} data-tier={run.tier}>{TIER_LABEL[run.tier]}</span>
          </div>
          <button ref={closeRef} type="button" className={s.closeBtn} onClick={onClose} aria-label="Close provenance">×</button>
        </header>

        <div className={s.provBody}>
          <section className={s.provSec}>
            <h3>Source</h3>
            <dl className={s.provDl}>
              <dt>Investigation</dt><dd>{inv ? `${inv.acronym} — ${inv.title}` : run.investigation}</dd>
              <dt>{run.source.kind === "psi-table" ? "File" : "Document"}</dt><dd className={s.mono}>{run.source.ref}</dd>
              {run.source.row != null && (<><dt>Row</dt><dd className={s.mono}>{run.source.row} (1-based data row)</dd></>)}
              {run.source.page && (<><dt>Page / table</dt><dd>{run.source.page}</dd></>)}
              {run.source.quote && (<><dt>Quote</dt><dd>“{run.source.quote}”</dd></>)}
              <dt>Link</dt><dd><a href={run.source.url} target="_blank" rel="noreferrer">{run.source.url}</a></dd>
            </dl>
          </section>

          <section className={s.provSec}>
            <h3>Normalised values</h3>
            <dl className={s.provDl}>
              <dt>Fuel class</dt><dd>{FUEL_LABEL[run.fuelClass]}</dd>
              <dt>Material</dt><dd>{run.material ?? <span className={s.nr}>not recorded</span>}</dd>
              <dt>Gravity</dt><dd>{GRAVITY_LABEL[run.gravity]}</dd>
              <dt>O₂</dt><dd><span className={s.mono}>{run.o2Pct != null ? `${fmt(run.o2Pct)} %` : "not recorded"}</span> <i className={s.basis} data-b={run.o2Basis}>{basisLabel(run.o2Basis)}</i></dd>
              <dt>Pressure</dt><dd><span className={s.mono}>{run.pressureKPa != null ? `${fmtP(run.pressureKPa, "kPa")} kPa · ${fmtP(run.pressureKPa, "psia")} psia` : "not recorded"}</span> <i className={s.basis} data-b={run.pressureBasis}>{basisLabel(run.pressureBasis)}</i></dd>
              <dt>Flow</dt><dd><span className={s.mono}>{run.flowCmS != null ? `${fmt(run.flowCmS)} cm/s` : run.flowRegime === "quiescent" ? "quiescent" : "not recorded"}</span> <i className={s.basis} data-b={run.flowBasis}>{basisLabel(run.flowBasis)}</i> · regime {run.flowRegime}</dd>
              <dt>Outcome</dt><dd>{run.outcome ?? <span className={s.nr}>not recorded</span>}</dd>
              {measures.map(([k, m]) => (<div key={k} className={s.contents}><dt>{m.label}</dt><dd className={s.mono}>{m.value} {m.unit}</dd></div>))}
            </dl>
          </section>

          <section className={s.provSec}>
            <h3>Against this scenario <span className={s.computed}>computed</span></h3>
            {d ? (
              <dl className={s.provDl}>
                <dt>D</dt><dd className={s.mono}>{fmt(d.D, 2)} ({d.axesUsed.length} of 3 axes)</dd>
                <dt>ΔO₂</dt><dd className={s.mono}>{d.raw.o2Pts != null ? `${fmtSigned(d.raw.o2Pts)} pts` : "not compared"}</dd>
                <dt>ΔP</dt><dd className={s.mono}>{d.raw.pressurePct != null ? `${fmtSigned(d.raw.pressurePct, 0)} %` : "not compared"}</dd>
                <dt>ΔU</dt><dd className={s.mono}>{d.raw.flowCmS != null ? `${fmtSigned(d.raw.flowCmS)} cm/s` : d.flags.includes("flow-regime-mismatch") ? "not compared — flow-regime mismatch" : "not compared — flow not recorded"}</dd>
              </dl>
            ) : (
              <p className={s.provNote}>Not compared: {g.status === "comparable" ? "" : g.reason}.</p>
            )}
          </section>

          <section className={s.provSec}>
            <h3>Flags</h3>
            {run.flags.length ? (
              <ul className={s.flagList}>{run.flags.map((f) => <li key={f} className={s.flag}>{f}</li>)}</ul>
            ) : <p className={s.provNote}>No flags.</p>}
            {run.note && <p className={s.provNote}>{run.note}</p>}
          </section>

          {run.conversions.length > 0 && (
            <section className={s.provSec}>
              <h3>Conversions</h3>
              <table className={s.miniTable}>
                <thead><tr><th>Field</th><th>From</th><th>To</th><th>Formula</th></tr></thead>
                <tbody>{run.conversions.map((c, i) => <tr key={i}><td>{c.field}</td><td className={s.mono}>{c.from}</td><td className={s.mono}>{c.to}</td><td>{c.formula}</td></tr>)}</tbody>
              </table>
            </section>
          )}
          {run.conversions.length === 0 && (
            <section className={s.provSec}><h3>Conversions</h3><p className={s.provNote}>None applied; values taken as recorded.</p></section>
          )}

          {run.alternatives && run.alternatives.length > 0 && (
            <section className={s.provSec}>
              <h3>Alternative reported values</h3>
              <ul className={s.altList}>
                {run.alternatives.map((a, i) => (
                  <li key={i}><span className={s.mono}>{a.o2Pct != null ? `${a.o2Pct} % O₂` : ""}{a.pressureKPa != null ? ` · ${a.pressureKPa} kPa` : ""}</span> — {a.source}</li>
                ))}
              </ul>
            </section>
          )}

          <section className={s.provSec}>
            <h3>Original cells</h3>
            {originals.length ? (
              <table className={s.miniTable}>
                <tbody>{originals.map(([k, v]) => <tr key={k}><th>{k}</th><td className={s.mono}>{v === "" ? <span className={s.nr}>empty cell</span> : v}</td></tr>)}</tbody>
              </table>
            ) : <p className={s.provNote}>Transcribed from a publication; no source table cells. See document and page above.</p>}
          </section>
        </div>
      </aside>
    </div>
  );
}
