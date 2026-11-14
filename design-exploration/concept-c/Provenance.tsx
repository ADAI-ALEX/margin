"use client";
import { useEffect, useRef } from "react";
import type { Run, Scenario } from "@/lib/schema";
import { distance, gate, classify, kPaToPsia } from "@/lib/engine";
import { invById } from "../shared/data";
import { FUEL_LABEL, GRAVITY_LABEL, TIER_LABEL, basisLabel, fmt, fmtSigned, DISCLAIMER } from "../shared/format";
import css from "./casefile.module.css";

export function Provenance({ run, s, onClose }: { run: Run | null; s: Scenario; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!run) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [run, onClose]);
  if (!run) return null;

  const inv = invById.get(run.investigation);
  const g = gate(run, s);
  const d = g.status === "comparable" ? distance(run, s) : null;
  const val = (v: number | null, unit: string, digits = 1) => (v == null ? <span className={css.nr}>not recorded</span> : <span className={css.mono}>{fmt(v, digits)} {unit}</span>);

  return (
    <div className={css.provWrap}>
      <div className={css.provBackdrop} onClick={onClose} aria-hidden />
      <aside className={css.prov} role="dialog" aria-modal="true" aria-labelledby="cf-prov-h">
        <header className={css.provHead}>
          <div>
            <div className={css.sheetLabel}><span>§P</span> Provenance</div>
            <h3 id="cf-prov-h" className={css.provTitle}><span className={css.mono}>{run.id}</span></h3>
            <p className={css.provSub}>
              <span className={css.tierMark} data-tier={run.tier} aria-hidden /> {TIER_LABEL[run.tier]} · {inv?.acronym ?? run.investigation} · {FUEL_LABEL[run.fuelClass]} · {GRAVITY_LABEL[run.gravity]}
            </p>
          </div>
          <button ref={closeRef} type="button" className={css.closeBtn} onClick={onClose} aria-label="Close provenance">Close ✕</button>
        </header>

        <div className={css.provBody}>
          <section>
            <h4 className={css.miniH}>Source</h4>
            <p className={css.provSrc}>
              {run.source.ref}
              {run.source.row != null && <> · data row <b className={css.mono}>{run.source.row}</b></>}
              {run.source.page && <> · {run.source.page}</>}
            </p>
            {run.source.quote && <blockquote className={css.quote}>{run.source.quote}</blockquote>}
            <a href={run.source.url} target="_blank" rel="noreferrer" className={css.extLink}>{run.source.kind === "psi-table" ? "Open in PSI" : "Open source"} ↗</a>
          </section>

          <section>
            <h4 className={css.miniH}>Normalized values</h4>
            <table className={css.kvTable}>
              <tbody>
                <tr><th>Material</th><td colSpan={2}>{run.material ?? <span className={css.nr}>not recorded</span>}</td></tr>
                <tr><th>O₂</th><td>{val(run.o2Pct, "%")}</td><td className={css.basis}>{basisLabel(run.o2Basis)}</td></tr>
                <tr><th>Pressure</th><td>{val(run.pressureKPa, "kPa")}{run.pressureKPa != null && <span className={css.dimTxt}> · {fmt(kPaToPsia(run.pressureKPa), 2)} psia</span>}</td><td className={css.basis}>{basisLabel(run.pressureBasis)}</td></tr>
                <tr><th>Flow</th><td>{val(run.flowCmS, "cm/s")}</td><td className={css.basis}>{basisLabel(run.flowBasis)} · {run.flowRegime}</td></tr>
                <tr><th>Outcome</th><td colSpan={2}>{run.outcome ?? <span className={css.nr}>not recorded</span>}</td></tr>
                {Object.entries(run.measures).map(([k, m]) => (
                  <tr key={k}><th>{m.label}</th><td colSpan={2}><span className={css.mono}>{m.value} {m.unit}</span> <span className={css.dimTxt}>as reported in source</span></td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h4 className={css.miniH}>Conversions</h4>
            {run.conversions.length ? (
              <table className={css.dataTable}>
                <thead><tr><th>Field</th><th>From</th><th>To</th><th>Formula</th></tr></thead>
                <tbody>
                  {run.conversions.map((c, i) => <tr key={i}><td>{c.field}</td><td className={css.mono}>{c.from}</td><td className={css.mono}>{c.to}</td><td className={css.mono}>{c.formula}</td></tr>)}
                </tbody>
              </table>
            ) : <p className={css.dimTxt}>No unit conversion applied; values used as recorded.</p>}
          </section>

          <section>
            <h4 className={css.miniH}>Flags &amp; note</h4>
            {run.flags.length ? <p className={css.flagRow}>{run.flags.map((f) => <span key={f} className={css.flag}>{f}</span>)}</p> : <p className={css.dimTxt}>No flags.</p>}
            {run.note && <p className={css.note}>{run.note}</p>}
            {run.alternatives?.length ? (
              <ul className={css.altList}>
                {run.alternatives.map((a, i) => <li key={i}>Alternative: {a.o2Pct != null && <span className={css.mono}>{a.o2Pct}% O₂ </span>}{a.pressureKPa != null && <span className={css.mono}>{a.pressureKPa} kPa </span>}— {a.source}</li>)}
              </ul>
            ) : null}
          </section>

          <section>
            <h4 className={css.miniH}>Against your scenario <em>computed</em></h4>
            {d ? (
              <p className={css.provGate}>
                Comparable · D <b className={css.mono}>{fmt(d.D, 2)}</b> ({classify(d.D)}) · O₂ {fmtSigned(d.raw.o2Pts, 1)} pts · P {fmtSigned(d.raw.pressurePct, 0)} % · flow {d.flags.includes("flow-regime-mismatch") ? "regime mismatch" : `${fmtSigned(d.raw.flowCmS, 1)} cm/s`}
                <span className={css.disclaimerSm}>{DISCLAIMER}</span>
              </p>
            ) : (
              <p className={css.provGate}>Not compared: {g.status === "comparable" ? "" : g.reason}.</p>
            )}
          </section>

          <section>
            <h4 className={css.miniH}>Original cells <em>{Object.keys(run.original).length} columns</em></h4>
            {Object.keys(run.original).length ? (
              <table className={css.kvTable}>
                <tbody>
                  {Object.entries(run.original).map(([k, v]) => (
                    <tr key={k}><th>{k}</th><td className={css.mono} colSpan={2}>{v === "" ? <span className={css.nr}>empty cell</span> : v}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className={css.dimTxt}>Transcribed from a publication; no table cells.</p>}
          </section>
        </div>
      </aside>
    </div>
  );
}
