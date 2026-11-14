"use client";
/** The verdict readout for the scenario, in the Atlas inspector's language: class word, D, COMPUTED, scale. */
import type { Run, Scenario } from "@/lib/schema";
import { VERDICT_THRESHOLDS, type Evaluation } from "@/lib/engine";
import { invById } from "@/lib/data";
import { DISCLAIMER, GRAVITY_LABEL, fmt } from "@/lib/format";
import { HAZARDS } from "@/content/curated";
import { ClaimBadge } from "@/components/ui/misc";
import { partialLabel } from "./derive";
import { MethodNote } from "./ui";
import type { FlowRow } from "./ClaimLedger";
import css from "./casefile.module.css";

const MAX = 5; // display range of the scale; larger D is clipped and marked

/** Where D sits against MARGIN's class boundaries. Single hue: it is a scale of evidence distance, not of hazard. */
function DScale({ D }: { D: number | null }) {
  const has = D != null && Number.isFinite(D);
  const pos = has ? Math.min(D!, MAX) / MAX : 0;
  const t1 = (VERDICT_THRESHOLDS.direct / MAX) * 100, t2 = (VERDICT_THRESHOLDS.near / MAX) * 100;
  return (
    <div className={css.dscale} aria-hidden="true">
      <div className={css.dscaleTrack}>
        <span className={css.dsDirect} style={{ width: `${t1}%` }} />
        <span className={css.dsNear} style={{ left: `${t1}%`, width: `${t2 - t1}%` }} />
        {has && <span className={css.dsMark} data-clipped={D! > MAX || undefined} style={{ left: `${pos * 100}%` }} />}
      </div>
      <div className={css.dsTicks}>
        <span style={{ left: 0 }}>0</span>
        <span style={{ left: `${t1}%` }}>{VERDICT_THRESHOLDS.direct}</span>
        <span style={{ left: `${t2}%` }}>{VERDICT_THRESHOLDS.near}</span>
        <span style={{ left: "100%" }}>{MAX}+</span>
      </div>
      <div className={css.dsNames}>
        <span style={{ left: `${t1 / 2}%` }}>DIRECT</span>
        <span style={{ left: `${(t1 + t2) / 2}%` }}>NEAR</span>
        <span style={{ left: `${(t2 + 100) / 2}%` }}>DISTANT</span>
      </div>
    </div>
  );
}

export function Finding({ s, ev, flowRows, flowSpan, openRun }: { s: Scenario; ev: Evaluation; flowRows: FlowRow[]; flowSpan: [number, number]; openRun: (r: Run) => void }) {
  const n = ev.nearest;
  const nearestInv = n ? invById.get(n.run.investigation) : null;
  const hazard = HAZARDS.find((h) => h.id === s.hazard)?.label ?? s.hazard;
  const others = flowRows.filter((r) => r.ev.verdict !== ev.verdict);
  const byVerdict = new Map<string, string[]>();
  for (const r of others) byVerdict.set(r.ev.verdict, [...(byVerdict.get(r.ev.verdict) ?? []), `${fmt(r.u, r.u % 1 ? 1 : 0)}${r.ev.qualifier ? " (partial match)" : ""}`]);

  return (
    <section className={`ui-panel ${css.finding}`} aria-live="polite" aria-labelledby="inv-finding-h" data-testid="finding" data-verdict={ev.verdict}>
      <div className="ui-panel-head">
        <h2 className="ui-panel-label" id="inv-finding-h">Finding</h2>
        <span className="ui-panel-rule" aria-hidden="true" />
      </div>
      <div className={css.fBody}>
        <p className={css.fCtx}>{GRAVITY_LABEL[s.gravity]} · {hazard} · {s.materialClass === "any" ? "any material" : `${s.materialClass} materials`} · {s.includePublished ? "PSI + published" : "PSI only"}</p>
        <div className={css.fRow}>
          <p className={css.fWord}><span className="caps">Evidence</span><span className={css.fClass}>{ev.verdict}</span></p>
          {n && (
            <p className={css.fD} aria-label={`Evidence distance D ${fmt(n.d.D, 2)}, computed`}>
              <span className={css.fDl}>D</span><span className={`num ${css.fDv}`}>{fmt(n.d.D, 2)}</span><ClaimBadge kind="COMPUTED">computed</ClaimBadge>
            </p>
          )}
        </div>
        <DScale D={n ? n.d.D : null} />
        <p className={css.fNearest}>
          {n ? (
            <>Nearest comparable run{" "}
              <button type="button" className="ui-link-btn mono" onClick={() => openRun(n.run)}>{n.run.id}</button>
              {nearestInv && <> · {nearestInv.acronym}</>}
            </>
          ) : <>No comparable run in {GRAVITY_LABEL[s.gravity].toLowerCase()} for this question.</>}
        </p>
        {ev.qualifier && n && (
          <p className={css.fQual}>
            <ClaimBadge kind="ASSUMED">partial match</ClaimBadge>{" "}
            {partialLabel(n)}. {ev.qualifier === "flow-regime-mismatch" ? "The nearest run's flow regime differs, so flow is not compared." : "The nearest run does not record every axis; a missing axis can only make a run look closer."}{" "}
            {ev.nearestComplete
              ? <>On all three axes: <button type="button" className="ui-link-btn mono" onClick={() => openRun(ev.nearestComplete!.run)}>{ev.nearestComplete.run.id}</button> at D <span className="num">{fmt(ev.nearestComplete.d.D, 2)}</span>, <b>{ev.verdictComplete}</b>.</>
              : <>No comparable run in this regime is compared on all three axes: <b>{ev.verdictComplete}</b> on all three.</>}
          </p>
        )}
        <p className={css.fNote}>
          {others.length > 0
            ? <>The verdict depends on the assumed ventilation flow: {[...byVerdict.entries()].map(([v, us], i) => <span key={v}>{i > 0 ? "; " : ""}<b>{v}</b> at {us.join(", ")} cm/s</span>)}. See Flow sensitivity below.</>
            : <>Same verdict at every flow from {flowSpan[0]} to {flowSpan[1]} cm/s.</>}
        </p>
        <p className={css.fDisclaimer}>{DISCLAIMER}</p>
        <p className={css.fMethod}><MethodNote short /></p>
      </div>
    </section>
  );
}
