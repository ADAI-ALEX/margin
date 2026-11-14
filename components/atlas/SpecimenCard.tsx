"use client";
import { useEffect, useRef } from "react";
import type { Run } from "@/lib/schema";
import type { Scored } from "@/lib/engine";
import { invById } from "@/lib/data";
import { FUEL_LABEL, GRAVITY_LABEL, TIER_LABEL, basisLabel, fmt, fmtSigned, psia } from "@/lib/format";

export function runTitle(run: Run) {
  const inv = invById.get(run.investigation);
  const tail = run.source.row != null ? `row ${run.source.row}` : run.id.split(":").slice(1).join(" · ");
  return `${inv?.acronym ?? run.investigation} · ${tail}`;
}

export function sourceLabel(run: Run) {
  return [run.source.ref, run.source.row != null ? `row ${run.source.row}` : null, run.source.page ?? null].filter(Boolean).join(", ");
}

const NR = <span className="atlas-nr">not recorded</span>;

/** "Specimen card": full provenance for one run, opened in the margin. */
export default function SpecimenCard({ run, scored, onClose }: { run: Run; scored: Scored | null; onClose: () => void }) {
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => { head.current?.focus(); }, [run.id]);
  const inv = invById.get(run.investigation);
  const tierCls = run.tier === "T1_PSI_RUN" ? "is-psi" : run.tier === "T3_PUBLISHED" ? "is-pub" : "is-plan";
  const measures = Object.entries(run.measures);
  const original = Object.entries(run.original);
  return (
    <article data-testid="specimen-card" data-run={run.id} className="atlas-specimen" aria-labelledby="atlas-specimen-title" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <header className="atlas-specimen-head">
        <span className={`atlas-tier ${tierCls}`}>
          <svg viewBox="0 0 14 14" width={14} height={14} aria-hidden="true">
            {run.tier === "T1_PSI_RUN" ? <circle cx={7} cy={7} r={3} className="atlas-dot" /> : <circle cx={7} cy={7} r={4.5} className={run.tier === "T3_PUBLISHED" ? "atlas-ring" : "atlas-planned"} />}
          </svg>
          {TIER_LABEL[run.tier]}
        </span>
        <button type="button" className="atlas-close" onClick={onClose} aria-label="Close specimen card">×</button>
      </header>
      <h3 id="atlas-specimen-title" ref={head} tabIndex={-1} className="atlas-specimen-title">Specimen · {runTitle(run)}</h3>
      <p className="atlas-specimen-inv">{inv?.title ?? run.investigation}</p>

      <dl className="atlas-dl">
        <dt>Material</dt><dd>{run.material ?? NR}</dd>
        <dt>Fuel class</dt><dd>{FUEL_LABEL[run.fuelClass]}</dd>
        <dt>Gravity</dt><dd>{GRAVITY_LABEL[run.gravity]}</dd>
        <dt>O₂</dt><dd>{run.o2Pct != null ? <><span className="atlas-num">{fmt(run.o2Pct)} %</span> <span className="atlas-basis">{basisLabel(run.o2Basis)}</span></> : NR}</dd>
        <dt>Pressure</dt><dd>{run.pressureKPa != null ? <><span className="atlas-num">{fmt(run.pressureKPa)} kPa · {psia(run.pressureKPa)} psia</span> <span className="atlas-basis">{basisLabel(run.pressureBasis)}</span></> : NR}</dd>
        <dt>Flow</dt><dd>{run.flowCmS != null ? <><span className="atlas-num">{fmt(run.flowCmS)} cm/s</span> <span className="atlas-basis">{basisLabel(run.flowBasis)} · {run.flowRegime}</span></> : <>{NR}{run.flowRegime !== "unknown" && <span className="atlas-basis"> · {run.flowRegime}</span>}</>}</dd>
        <dt>Outcome</dt><dd>{run.outcome ?? NR}</dd>
        {measures.map(([k, v]) => (
          <div key={k} className="atlas-dl-row"><dt>{v.label}</dt><dd><span className="atlas-num">{v.value} {v.unit}</span> <span className="atlas-basis">{run.tier === "T1_PSI_RUN" ? "recorded in table" : "reported"}</span></dd></div>
        ))}
      </dl>

      {scored && (
        <div className="atlas-specimen-calc">
          <span className="atlas-computed">computed</span>
          D to scenario <span className="atlas-num">{fmt(scored.d.D, 2)}</span>
          {" · "}O₂ <span className="atlas-num">{fmtSigned(scored.d.raw.o2Pts)} pts</span>
          {" · "}P <span className="atlas-num">{fmtSigned(scored.d.raw.pressurePct, 0)} %</span>
          {" · "}flow <span className="atlas-num">{scored.d.raw.flowCmS != null ? `${fmtSigned(scored.d.raw.flowCmS)} cm/s` : "not compared"}</span>
          {scored.d.partialMatch && <span className="atlas-basis"> · partial match (axes: {scored.d.axesUsed.join(", ")})</span>}
        </div>
      )}

      <h4 className="atlas-h4">Source</h4>
      <p className="atlas-specimen-src">
        {sourceLabel(run)}<br />
        <a href={run.source.url} target="_blank" rel="noreferrer">{run.source.url.replace(/^https?:\/\//, "")} ↗</a>
      </p>
      {run.tier !== "T1_PSI_RUN" && (
        <p className="atlas-micro">
          {run.source.page && <>{run.source.page}. </>}
          {run.flags.includes("unverified-transcription") ? "Not yet checked against the primary source." : "Checked against the primary source (SI-assisted); human sign-off pending."}
        </p>
      )}
      {run.source.quote && <blockquote className="atlas-insight-quote">&ldquo;{run.source.quote}&rdquo;</blockquote>}

      {run.flags.length > 0 && (
        <>
          <h4 className="atlas-h4">Flags</h4>
          <ul className="atlas-flags">{run.flags.map((f) => <li key={f}>{f}</li>)}</ul>
        </>
      )}
      {run.note && <p className="atlas-specimen-note"><span className="atlas-h4 atlas-inline">Note</span> {run.note}</p>}
      {run.alternatives && run.alternatives.length > 0 && (
        <>
          <h4 className="atlas-h4">Other reported values</h4>
          <ul className="atlas-alts">{run.alternatives.map((a, i) => <li key={i}>{a.o2Pct != null && <span className="atlas-num">{a.o2Pct}% O₂ </span>}{a.pressureKPa != null && <span className="atlas-num">{a.pressureKPa} kPa </span>}— {a.source}</li>)}</ul>
        </>
      )}

      <h4 className="atlas-h4">Conversions</h4>
      {run.conversions.length ? (
        <ul className="atlas-conv">{run.conversions.map((c, i) => <li key={i}><span className="atlas-num">{c.field}: {c.from} → {c.to}</span> <span className="atlas-basis">{c.formula}</span></li>)}</ul>
      ) : <p className="atlas-micro">None applied — values used as recorded.</p>}

      <h4 className="atlas-h4">Original cells</h4>
      {original.length ? (
        <div className="atlas-cells">
          <table>
            <tbody>{original.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v === "" ? NR : v}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <p className="atlas-micro">No table cells: value transcribed from the publication cited above.</p>}
    </article>
  );
}
