"use client";
import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import type { Run, Scenario } from "@/lib/schema";
import { distance, gate, classify, kPaToPsia, SCALES } from "@/lib/engine";
import { invById } from "@/lib/data";
import { DISCLAIMER, FUEL_LABEL, GRAVITY_LABEL, TIER_LABEL, fmt, fmtSigned } from "@/lib/format";
import {
  AXIS_KEYS, AXIS_LABEL, AXIS_UNIT, BASIS, BASIS_TEXT, ENGINE_AXIS, FIELD, REGIME_TEXT, conversionFor, flagText, sourceCells, valueKinds, whyNot,
} from "./derive";
import { Claim, EvidenceWord, MethodNote, SourceRef, VerifyBadge } from "./ui";
import css from "./casefile.module.css";

const GAP_UNIT = { o2: "pts", p: "%", flow: "cm/s" } as const;
const SCALE_TXT = { o2: `${SCALES.o2Pts} pts`, p: `×${SCALES.pressureRatio}`, flow: `${SCALES.flowCmS} cm/s` } as const;

export function Provenance({ run, s, onClose }: { run: Run | null; s: Scenario; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!run) return;
    if (!openerRef.current) openerRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, onClose]);
  useEffect(() => {
    if (run) return;
    const el = openerRef.current;
    openerRef.current = null;
    if (el && document.contains(el)) el.focus();
  }, [run]);

  if (!run) return null;

  // keep Tab inside the dialog
  const trap = (e: ReactKeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
    const f = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const inv = invById.get(run.investigation);
  const g = gate(run, s);
  const sameRegime = run.gravity === s.gravity;
  const d = sameRegime && (g.status === "comparable" || g.status === "limit") ? distance(run, s) : null;
  const why = whyNot(run, s);
  const origEntries = Object.entries(run.original);

  return (
    <div className={css.provWrap}>
      <div className={css.provBackdrop} onClick={onClose} aria-hidden="true" />
      <aside ref={panelRef} className={css.prov} role="dialog" aria-modal="true" aria-labelledby="inv-prov-h" data-testid="provenance" onKeyDown={trap}>
        <header className={css.provHead}>
          <div>
            <p className={css.provKicker}>Provenance</p>
            <h2 id="inv-prov-h" className={css.provTitle}><span className="num">{run.id}</span></h2>
            <p className={css.provSub}>
              {TIER_LABEL[run.tier]} · {inv ? <Link href={`/investigations/${inv.id}`}>{inv.acronym}</Link> : run.investigation} · {FUEL_LABEL[run.fuelClass]} · {GRAVITY_LABEL[run.gravity]}
            </p>
            <p className={css.provSub}>{run.material ?? <span className={css.nr}>material not recorded</span>}{run.outcome && <> · outcome: {run.outcome}</>}</p>
            <VerifyBadge run={run} />
          </div>
          <button ref={closeRef} type="button" className={css.closeBtn} onClick={onClose} aria-label="Close provenance">Close ✕</button>
        </header>

        <div className={css.provBody}>
          <section>
            <h3 className={css.h3}>Source</h3>
            <p className={css.provP}><SourceRef run={run} /></p>
            {run.source.quote && <blockquote className={css.quote}>“{run.source.quote}”</blockquote>}
          </section>

          <section>
            <h3 className={css.h3}>Values: normalized and original</h3>
            <div className={css.tableScroll} tabIndex={0} role="region" aria-label="Values: normalized and original">
              <table className={css.dataTable}>
                <caption className="sr-only">Normalized value, basis, original source cell and conversion for each axis of run {run.id}</caption>
                <thead><tr><th scope="col">Axis</th><th scope="col">Normalized</th><th scope="col">Basis</th><th scope="col">Original cell(s)</th><th scope="col">Conversion</th></tr></thead>
                <tbody>
                  {AXIS_KEYS.map((axis) => {
                    const v = run[FIELD[axis]];
                    const conv = conversionFor(run, axis);
                    const cells = sourceCells(run, axis);
                    return (
                      <tr key={axis}>
                        <th scope="row">{AXIS_LABEL[axis]}</th>
                        <td>
                          {v == null ? <span className={css.nr}>not recorded</span> : <span className="num">{fmt(v, axis === "p" ? 2 : 1)} {AXIS_UNIT[axis]}</span>}
                          {axis === "p" && v != null && <span className={css.quiet}> · {fmt(kPaToPsia(v), 2)} psia</span>}
                          {axis === "flow" && <span className={css.quiet}> · {REGIME_TEXT[run.flowRegime]}</span>}
                          <span className={css.kinds}>{valueKinds(run, axis).map((k) => <Claim key={k} kind={k} />)}</span>
                        </td>
                        <td>{BASIS_TEXT[run[BASIS[axis]]]}</td>
                        <td>
                          {cells.length ? cells.map((c) => <span key={c.col} className={css.cellPair}><span className={css.colName}>{c.col}</span> <span className="num">{c.value === "" ? "(empty)" : c.value}</span></span>)
                            : <span className={css.nr}>{run.tier === "T1_PSI_RUN" ? (v != null ? "no source column — stated in a document" : "no source column") : "transcribed from the paper"}</span>}
                        </td>
                        <td>{conv ? <span className="num">{conv.from} → {conv.to} ({conv.formula})</span> : <span className={css.nr}>{v != null ? "none — used as recorded" : "—"}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {run.measures?.oxidizerXO2 && (
              <p className={css.provNote}>Burner-fed oxidizer: <span className="num">{fmt(run.measures.oxidizerXO2.value, 1)}% O₂</span>. This is the oxygen fraction of the stream fed through the burner (inverse flame), not the surrounding atmosphere, so it is not placed on the ambient O₂ axis.</p>
            )}
            {Object.entries(run.measures ?? {}).filter(([k]) => k !== "oxidizerXO2").length > 0 && (
              <ul className={css.measureList}>
                {Object.entries(run.measures).filter(([k]) => k !== "oxidizerXO2").map(([k, m]) => (
                  <li key={k}>{m.label}: <span className="num">{m.value} {m.unit}</span> <span className={css.quiet}>as reported</span></li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className={css.h3}>Flags, in plain words</h3>
            {run.flags.length ? (
              <dl className={css.flagDl}>
                {run.flags.map((f) => <div key={f}><dt className="num">{f}</dt><dd>{flagText(f)}</dd></div>)}
              </dl>
            ) : <p className={css.quiet}>No data-quality flags.</p>}
            {run.note && <p className={css.provNote}><b>Note.</b> {run.note}</p>}
            {run.alternatives?.length ? (
              <ul className={css.measureList}>
                {run.alternatives.map((a, i) => <li key={i}>Alternative value: {a.o2Pct != null && <span className="num">{a.o2Pct}% O₂ </span>}{a.pressureKPa != null && <span className="num">{a.pressureKPa} kPa </span>}— {a.source}</li>)}
              </ul>
            ) : null}
          </section>

          <section>
            <h3 className={css.h3}>Against your scenario <Claim kind="COMPUTED" /></h3>
            {d && Number.isFinite(d.D) ? (
              <>
                <p className={css.provP}>
                  {g.status === "limit" ? <>Reported limit — never used for the verdict. Distance for orientation only: </> : <>Comparable. </>}
                  D <b className="num">{fmt(d.D, 2)}</b> · <EvidenceWord v={classify(d.D)} /> · axes compared: {d.axesUsed.map((a) => AXIS_LABEL[a === "pressure" ? "p" : a]).join(", ")}
                  {d.partialMatch && <> (partial match)</>}
                </p>
                <div className={css.tableScroll} tabIndex={0} role="region" aria-label="Gaps to your scenario">
                  <table className={css.dataTable}>
                    <caption className="sr-only">Signed per-axis gaps, run minus scenario</caption>
                    <thead><tr><th scope="col">Axis</th><th scope="col">Gap (run − scenario)</th><th scope="col">In scale units</th><th scope="col">One unit</th></tr></thead>
                    <tbody>
                      {AXIS_KEYS.map((axis) => {
                        const ea = ENGINE_AXIS[axis];
                        const used = d.axesUsed.includes(ea);
                        const raw = axis === "o2" ? d.raw.o2Pts : axis === "p" ? d.raw.pressurePct : d.raw.flowCmS;
                        return (
                          <tr key={axis}>
                            <th scope="row">{AXIS_LABEL[axis]}</th>
                            <td>{used ? <span className="num">{fmtSigned(raw, axis === "p" ? 0 : 1)} {GAP_UNIT[axis]}</span> : <span className={css.nr}>{axis === "flow" && d.flags.includes("flow-regime-mismatch") ? "not compared — flow regime differs" : "not compared — not recorded"}</span>}</td>
                            <td>{used ? <span className="num">{fmtSigned(d.gaps[ea], 2)}</span> : "—"}</td>
                            <td className="num">{SCALE_TXT[axis]}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className={css.disclaimerSm}>{DISCLAIMER} <MethodNote short /></p>
              </>
            ) : (
              <p className={css.provP}>Not compared: {why ?? g.status}. {!sameRegime && <>No distance is computed across gravity regimes.</>}</p>
            )}
          </section>

          <section>
            <h3 className={css.h3}>Original row <span className={css.h3Note}><span className="num">{origEntries.length}</span> columns</span></h3>
            {origEntries.length ? (
              <div className={css.tableScroll} tabIndex={0} role="region" aria-label="Original row">
                <table className={`${css.dataTable} ${css.origTable}`}>
                  <caption className="sr-only">All original cells of {run.id} as they appear in the source table</caption>
                  <tbody>
                    {origEntries.map(([k, v]) => (
                      <tr key={k}><th scope="row">{k}</th><td className="num">{v === "" ? <span className={css.nr}>empty cell</span> : v}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className={css.quiet}>Transcribed from a publication; there is no table row.</p>}
          </section>
        </div>
      </aside>
    </div>
  );
}
