"use client";
/**
 * The run inspector: one component for every place a run is opened (Atlas selection, the Investigations
 * claim ledger and ladder via the provenance drawer, dossier run tables). Conditions with units, basis and
 * flags; the distance decomposition to the current scenario (computed by the engine); match completeness;
 * investigation and source links with the verbatim quote where curated; the original row.
 */
import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import type { Run, Scenario } from "@/lib/schema";
import { SCALES, classify, distance, gate, kPaToPsia } from "@/lib/engine";
import { invById } from "@/lib/data";
import { DISCLAIMER, FUEL_LABEL, GRAVITY_LABEL, TIER_LABEL, fmt, fmtSigned } from "@/lib/format";
import {
  AXIS_KEYS, AXIS_LABEL, AXIS_UNIT, BASIS, BASIS_TEXT, ENGINE_AXIS, FIELD, REGIME_TEXT, conversionFor, flagText, sourceCells, valueKinds, verification, whyNot,
  type AxisKey,
} from "@/components/casefile/derive";
import { ClaimBadge } from "@/components/ui/misc";
import { IconClose, IconExternal } from "@/components/ui/icons";
import "./run.css";

const GAP_UNIT: Record<AxisKey, string> = { o2: "pts", p: "%", flow: "cm/s" };
const SCALE_TXT: Record<AxisKey, string> = { o2: `${SCALES.o2Pts} pts`, p: `×${SCALES.pressureRatio}`, flow: `${SCALES.flowCmS} cm/s` };
const BAR_MAX = 4; // scale units shown each side of zero; longer gaps are clipped and marked

export function runTitle(run: Run) {
  const inv = invById.get(run.investigation);
  const tail = run.source.row != null ? `row ${run.source.row}` : run.id.split(":").slice(1).join(" · ");
  return `${inv?.acronym ?? run.investigation} · ${tail}`;
}
export function runSourceLabel(run: Run) {
  return [run.source.ref, run.source.row != null ? `row ${run.source.row}` : null, run.source.page ?? null].filter(Boolean).join(", ");
}

/** Mark glyph matching the field encoding (dot / ring / dashed ring / ring with tick). */
export function TierGlyph({ run, size = 14 }: { run: Run; size?: number }) {
  const limit = run.flags.includes("limit-value");
  return (
    <svg className="run-glyph" width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
      {limit ? <g className="mk-limit"><circle cx={7} cy={7} r={4} /><line x1={0.5} x2={13.5} y1={7} y2={7} /></g>
        : run.tier === "T1_PSI_RUN" ? <circle cx={7} cy={7} r={3} className="mk-dot" />
        : <circle cx={7} cy={7} r={4.6} className={run.tier === "T3_PUBLISHED" ? "mk-ring" : "mk-planned"} />}
    </svg>
  );
}

export interface RunInspectorProps {
  run: Run;
  scenario: Scenario;
  /** Renders a close button and handles Esc (inline use). Drawers handle their own close. */
  onClose?: () => void;
  testId?: string;
  titleId?: string;
  /** Extra actions (e.g. "Zoom to run" on the Atlas). */
  actions?: ReactNode;
  /** Focus the title when the inspector opens inline. */
  autoFocus?: boolean;
  /** Hide the big title (when a drawer already shows it). */
  hideTitle?: boolean;
}

export default function RunInspector({ run, scenario: s, onClose, testId, titleId = "run-insp-title", actions, autoFocus, hideTitle }: RunInspectorProps) {
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (autoFocus) head.current?.focus(); }, [run.id, autoFocus]);
  const inv = invById.get(run.investigation);
  const g = gate(run, s);
  const sameRegime = run.gravity === s.gravity;
  const d = sameRegime && (g.status === "comparable" || g.status === "limit") ? distance(run, s) : null;
  const why = whyNot(run, s);
  const ver = verification(run);
  const original = Object.entries(run.original);
  const measures = Object.entries(run.measures ?? {}).filter(([k]) => k !== "oxidizerXO2");

  return (
    <article className="run-insp" data-testid={testId} data-run={run.id} aria-labelledby={hideTitle ? undefined : titleId}
      onKeyDown={onClose ? (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } } : undefined}>
      <header className="run-head">
        <p className="run-tier">
          <TierGlyph run={run} />
          <span>{run.flags.includes("limit-value") ? "Reported limit · not a tested condition" : TIER_LABEL[run.tier]}</span>
          {ver.kind && <ClaimBadge kind={ver.kind} title={ver.label} />}
        </p>
        {onClose && <button type="button" className="ui-sq" onClick={onClose} aria-label="Close run inspector"><IconClose /></button>}
      </header>
      {!hideTitle && <h3 id={titleId} ref={head} tabIndex={-1} className="run-title">{runTitle(run)}</h3>}
      <p className="run-sub">
        {inv ? <Link href={`/investigations/${inv.id}`}>{inv.acronym}</Link> : run.investigation}
        {inv && inv.title !== inv.acronym && <span> · {inv.title}</span>}
      </p>
      <p className="run-id mono">{run.id}</p>

      <section className="run-sec" aria-label="Conditions">
        <h4 className="caps">Conditions</h4>
        <dl className="run-dl">
          {AXIS_KEYS.map((axis) => {
            const v = run[FIELD[axis]];
            return (
              <div key={axis}>
                <dt>{AXIS_LABEL[axis]}</dt>
                <dd>
                  {v == null ? <span className="run-nr">not recorded</span> : <span className="num run-val">{fmt(v, axis === "p" ? 1 : 1)} {AXIS_UNIT[axis]}</span>}
                  {axis === "p" && v != null && <span className="run-q"> · {fmt(kPaToPsia(v), 2)} psia</span>}
                  {axis === "flow" && <span className="run-q"> · {REGIME_TEXT[run.flowRegime]}</span>}
                  <span className="run-basis">{v != null ? BASIS_TEXT[run[BASIS[axis]]] : ""} {valueKinds(run, axis).map((k) => <ClaimBadge key={k} kind={k} />)}</span>
                </dd>
              </div>
            );
          })}
          <div><dt>Material</dt><dd>{run.material?.replace(/\s+/g, " ").trim() ?? <span className="run-nr">not recorded</span>}</dd></div>
          <div><dt>Fuel class</dt><dd>{FUEL_LABEL[run.fuelClass]}</dd></div>
          <div><dt>Gravity</dt><dd>{GRAVITY_LABEL[run.gravity]}</dd></div>
          <div><dt>Outcome</dt><dd>{run.outcome ?? <span className="run-nr">not recorded</span>}</dd></div>
          {measures.map(([k, m]) => <div key={k}><dt>{m.label}</dt><dd><span className="num run-val">{m.value} {m.unit}</span> <span className="run-basis">{run.tier === "T1_PSI_RUN" ? "recorded in table" : "as reported"}</span></dd></div>)}
        </dl>
        {run.measures?.oxidizerXO2 && (
          <p className="run-note">Burner-fed oxidizer: <span className="num">{fmt(run.measures.oxidizerXO2.value, 1)}% O₂</span>, the oxygen fraction of the stream fed through the burner (inverse flame), not the surrounding atmosphere; it is not placed on the ambient O₂ axis.</p>
        )}
      </section>

      <section className="run-sec" aria-label="Against your scenario">
        <h4 className="caps">Against your scenario <ClaimBadge kind="COMPUTED" /></h4>
        {d && Number.isFinite(d.D) ? (
          <>
            <p className="run-dline">
              <span className="run-dlabel">D</span><span className="run-dval num">{fmt(d.D, 2)}</span>
              <span className="run-dclass">{g.status === "limit" ? "orientation only" : classify(d.D)}</span>
              <span className="run-dmeta">{d.axesUsed.length} of 3 axes compared{d.partialMatch ? " · partial match" : ""}</span>
            </p>
            {g.status === "limit" && <p className="run-note">A reported limit is never used for the verdict or the coverage bands; the distance is shown for orientation only.</p>}
            <table className="run-gaps">
              <caption className="sr-only">Signed per-axis gaps, run minus scenario, in physical units and MARGIN scale units</caption>
              <thead className="sr-only"><tr><th scope="col">Axis</th><th scope="col">Gap in scale units</th><th scope="col">Physical difference</th></tr></thead>
              <tbody>
                {AXIS_KEYS.map((axis) => {
                  const ea = ENGINE_AXIS[axis];
                  const used = d.axesUsed.includes(ea);
                  const gap = d.gaps[ea];
                  const raw = axis === "o2" ? d.raw.o2Pts : axis === "p" ? d.raw.pressurePct : d.raw.flowCmS;
                  const w = gap == null ? 0 : (Math.min(Math.abs(gap), BAR_MAX) / BAR_MAX) * 50;
                  return (
                    <tr key={axis} data-off={!used || undefined}>
                      <th scope="row">{AXIS_LABEL[axis]}<span className="run-scale">1 unit = {SCALE_TXT[axis]}</span></th>
                      <td className="run-barcell">
                        {used && gap != null ? (
                          <span className="run-track" aria-hidden="true"><span className="run-zero" /><span className={`run-bar${Math.abs(gap) > BAR_MAX ? " is-clipped" : ""}`} style={{ left: gap < 0 ? `${50 - w}%` : "50%", width: `${w}%` }} /></span>
                        ) : <span className="run-nr">{axis === "flow" && d.flags.includes("flow-regime-mismatch") ? "flow regime differs · not compared" : "not recorded · not compared"}</span>}
                      </td>
                      <td className="run-gapval num">{used && gap != null ? <>{fmtSigned(gap, 2)}<span className="run-q"> ({fmtSigned(raw, axis === "p" ? 0 : 1)} {GAP_UNIT[axis]})</span></> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="run-micro">D = √(Σ gap²) on the compared axes; signed as run minus scenario. A missing axis can only make a run look closer. {DISCLAIMER}</p>
          </>
        ) : (
          <p className="run-note">Not compared: {why ?? g.status}.{!sameRegime && " No distance is computed across gravity regimes."}</p>
        )}
      </section>

      <section className="run-sec" aria-label="Source">
        <h4 className="caps">Source</h4>
        <p className="run-src">
          <span className="mono">{runSourceLabel(run)}</span>
          <a href={run.source.url} target="_blank" rel="noreferrer" className="run-srclink">{run.source.kind === "psi-table" ? "PSI record" : run.source.kind === "plan" ? "Plan document" : "Paper"}: {run.source.url.replace(/^https?:\/\//, "").slice(0, 48)}<IconExternal size={12} /><span className="sr-only"> (opens in a new tab)</span></a>
        </p>
        {run.source.quote && <blockquote className="run-quote">&ldquo;{run.source.quote}&rdquo;</blockquote>}
        {run.tier !== "T1_PSI_RUN" && <p className="run-micro">{run.tier === "T3_PUBLISHED" ? "Published value, not a PSI table row. " : ""}{ver.label}.</p>}
      </section>

      {(run.flags.length > 0 || run.note || (run.alternatives?.length ?? 0) > 0) && (
        <section className="run-sec" aria-label="Flags and notes">
          <h4 className="caps">Flags, in plain words</h4>
          {run.flags.length > 0 && <dl className="run-flags">{run.flags.map((f) => <div key={f}><dt className="mono">{f}</dt><dd>{flagText(f)}</dd></div>)}</dl>}
          {run.note && <p className="run-note"><b>Note.</b> {run.note}</p>}
          {run.alternatives?.map((a, i) => <p key={i} className="run-note">Other reported value: {a.o2Pct != null && <span className="num">{a.o2Pct}% O₂ </span>}{a.pressureKPa != null && <span className="num">{a.pressureKPa} kPa </span>}· {a.source}</p>)}
        </section>
      )}

      <details className="run-sec run-details">
        <summary className="caps">Conversions and original cells <span className="num run-q">({original.length} columns)</span></summary>
        {AXIS_KEYS.map((axis) => {
          const conv = conversionFor(run, axis);
          const cells = sourceCells(run, axis);
          if (!conv && !cells.length) return null;
          return <p key={axis} className="run-note">{AXIS_LABEL[axis]}: {cells.map((c) => <span key={c.col} className="mono">{c.col} = {c.value === "" ? "(empty)" : c.value} </span>)}{conv && <span className="mono">→ {conv.to} ({conv.formula})</span>}</p>;
        })}
        {original.length ? (
          <div className="ui-table-scroll run-orig" tabIndex={0} role="region" aria-label={`Original row of ${run.id}`}>
            <table className="ui-table"><caption className="sr-only">All original cells of {run.id} as they appear in the source table</caption>
              <tbody>{original.map(([k, v]) => <tr key={k}><th scope="row" className="mono">{k}</th><td className="mono">{v === "" ? <span className="run-nr">empty cell</span> : v}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="run-micro">Transcribed from a publication; there is no table row.</p>}
      </details>

      <p className="run-actions">
        {inv && <Link className="ui-btn" href={`/investigations/${inv.id}`}>Open dossier</Link>}
        {actions}
      </p>
    </article>
  );
}
