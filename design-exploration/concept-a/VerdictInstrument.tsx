"use client";
import type { Run, Scenario } from "@/lib/schema";
import { classify, ROBUSTNESS_FACTORS, SCALES, VERDICT_THRESHOLDS, type Evaluation, type Robustness, type Verdict, type Scored } from "@/lib/engine";
import { invById } from "../shared/data";
import { DISCLAIMER, VERDICT_COPY, GRAVITY_LABEL, fmt, fmtSigned } from "../shared/format";
import { VERDICT_FILL, VERDICT_INK, VERDICT_LETTER } from "./marks";
import { r2 } from "./units";
import s from "./console.module.css";

const ORDER: Verdict[] = ["DIRECT", "NEAR", "DISTANT", "NONE"];
const GAUGE_SPAN = 4; // scale units shown either side of zero (display range only)

interface Props {
  scenario: Scenario;
  evaluation: Evaluation;
  psiOnly: Evaluation;
  robust: Robustness;
  onInspect: (run: Run) => void;
}

export default function VerdictInstrument({ scenario, evaluation, psiOnly, robust, onInspect }: Props) {
  const v = evaluation.verdict;
  const near = evaluation.nearest;
  const showPsiCompare = scenario.includePublished;

  return (
    <section className={s.instrument} aria-labelledby="a-verdict-h">
      <div className={s.instHead}>
        <h2 id="a-verdict-h" className={s.panelTitle}>Verdict instrument</h2>
        <span className={s.instSub}>{GRAVITY_LABEL[scenario.gravity]} · nearest comparable evidence</span>
      </div>

      <div className={s.instBody}>
        <div className={s.verdictBlock}>
          <div className={s.verdictLine} aria-live="polite">
            <span className={s.verdictPrefix}>Evidence:</span>
            <span className={s.verdictWord}>{v}</span>
          </div>
          <p className={s.disclaimer}>{DISCLAIMER}</p>
          <p className={s.verdictCopy}>{VERDICT_COPY[v]}</p>
          {near?.d.partialMatch && (
            <p className={s.partialLine}>
              {v} on {near.d.axesUsed.map((a) => AXIS_NAME[a]).join(" + ")} only — {(["o2", "pressure", "flow"] as const).filter((a) => !near.d.axesUsed.includes(a)).map((a) => missingReason(near, a, scenario)).join("; ")}
            </p>
          )}

          <div className={s.dRow}>
            <div className={s.dCell}>
              <span className={s.micro}>D · nearest</span>
              <span className={s.dValue}>{near ? fmt(near.d.D, 2) : "—"}</span>
              <span className={s.computed}>computed</span>
            </div>
            <div className={s.dCell}>
              <span className={s.micro}>Thresholds</span>
              <span className={s.dSmall}>DIRECT ≤ {VERDICT_THRESHOLDS.direct} · NEAR ≤ {VERDICT_THRESHOLDS.near}</span>
              <span className={s.dSmall}>{evaluation.comparable.length} comparable runs</span>
            </div>
            {showPsiCompare && (
              <div className={s.dCell}>
                <span className={s.micro}>PSI only</span>
                <span className={s.dSmallStrong}>{psiOnly.verdict} · D {psiOnly.nearest ? fmt(psiOnly.nearest.d.D, 2) : "—"}</span>
                <span className={s.computed}>computed, published excluded</span>
              </div>
            )}
          </div>

          {near?.d.partialMatch && (
            <div className={s.completeRow}>
              <span className={s.micro}>Best fully-compared run</span>
              {evaluation.nearestComplete ? (
                <button type="button" className={s.linkBtn} onClick={() => onInspect(evaluation.nearestComplete!.run)}>
                  D <span className={s.mono}>{fmt(evaluation.nearestComplete.d.D, 2)}</span> ({classify(evaluation.nearestComplete.d.D)}) · <span className={s.mono}>{evaluation.nearestComplete.run.id}</span>
                </button>
              ) : <span className={s.dSmallStrong}>none</span>}
              <span className={s.computed}>computed</span>
            </div>
          )}

          {near ? (
            <button type="button" className={s.nearestBtn} onClick={() => onInspect(near.run)}>
              <span className={s.micro}>Nearest run</span>
              <span className={s.mono}>{near.run.id}</span>
              <span className={s.nearestInv}>{invById.get(near.run.investigation)?.acronym ?? near.run.investigation}{near.run.material ? ` · ${near.run.material}` : ""}</span>
              <span className={s.inspectHint}>provenance →</span>
            </button>
          ) : (
            <p className={s.noneNote}>
              No comparable run in {GRAVITY_LABEL[scenario.gravity].toLowerCase()}. {evaluation.otherGravity.length} comparable-class runs exist in other gravity regimes; no cross-regime distance is computed.
            </p>
          )}
          {evaluation.limits.length > 0 && (
            <div className={s.limits}>
              <span className={s.micro}>Reported limits in this regime — not tested conditions</span>
              <ul>
                {evaluation.limits.slice(0, 4).map(({ run }) => (
                  <li key={run.id}>
                    <button type="button" className={s.linkBtn} onClick={() => onInspect(run)}>
                      <span className={s.mono}>{fmt(run.o2Pct)} % O₂</span> · {run.material ?? invById.get(run.investigation)?.acronym ?? run.investigation}
                    </button>
                  </li>
                ))}
              </ul>
              {evaluation.limits.length > 4 && <span className={s.dSmall}>+{evaluation.limits.length - 4} more</span>}
            </div>
          )}
        </div>

        <Gauges near={near} scenario={scenario} />

        <RobustMatrix robust={robust} />
      </div>
    </section>
  );
}

const AXIS_NAME = { o2: "O₂", pressure: "pressure", flow: "flow" } as const;

function missingReason(sc: Scored, axis: "o2" | "pressure" | "flow", scenario: Scenario): string {
  const r = sc.run;
  if (axis === "o2") return "O₂ not recorded";
  if (axis === "pressure") return "pressure not recorded";
  if (sc.d.flags.includes("flow-regime-mismatch")) {
    return scenario.flowCmS == null || scenario.flowCmS === 0 ? "flow-regime mismatch (forced-flow run vs quiescent scenario)" : "flow-regime mismatch (quiescent run vs forced-flow scenario)";
  }
  if (r.flowCmS == null) return r.flowRegime === "natural-convection" ? "flow not recorded (natural convection)" : "flow not recorded";
  return "not compared";
}

function Gauges({ near, scenario }: { near: Scored | null; scenario: Scenario }) {
  const rows: { axis: "o2" | "pressure" | "flow"; label: string; unitText: string; scaleText: string }[] = [
    { axis: "o2", label: "O₂", unitText: "pts", scaleText: `1 u = ${SCALES.o2Pts} pts` },
    { axis: "pressure", label: "Pressure", unitText: "%", scaleText: `1 u = ×${SCALES.pressureRatio}` },
    { axis: "flow", label: "Flow", unitText: "cm/s", scaleText: `1 u = ${SCALES.flowCmS} cm/s` },
  ];
  return (
    <div className={s.gauges} role="group" aria-label="Per-axis deviation of the nearest run from the scenario">
      <div className={s.gaugeHead}>
        <span className={s.micro}>Deviation · nearest run − scenario</span>
        <span className={s.computed}>computed</span>
      </div>
      {rows.map(({ axis, label, unitText, scaleText }) => {
        const gap = near ? near.d.gaps[axis] : null;
        const raw = near ? (axis === "o2" ? near.d.raw.o2Pts : axis === "pressure" ? near.d.raw.pressurePct : near.d.raw.flowCmS) : null;
        const compared = near != null && near.d.axesUsed.includes(axis) && gap != null;
        const clamped = gap == null ? 0 : Math.max(-GAUGE_SPAN, Math.min(GAUGE_SPAN, gap));
        const pct = r2((clamped / GAUGE_SPAN) * 50);
        const over = gap != null && Math.abs(gap) > GAUGE_SPAN;
        return (
          <div key={axis} className={s.gauge}>
            <div className={s.gaugeLabel}>
              <span>{label}</span>
              <span className={s.gaugeScale}>{scaleText}</span>
            </div>
            {compared ? (
              <>
                <div className={s.gaugeTrack} aria-hidden>
                  <span className={s.gaugeBand} style={{ left: `${r2(50 - 50 / GAUGE_SPAN)}%`, width: `${r2(100 / GAUGE_SPAN)}%` }} />
                  {[-1, 1].map((t) => <span key={t} className={s.gaugeTick} style={{ left: `${r2(50 + (t / GAUGE_SPAN) * 50)}%` }} />)}
                  <span className={s.gaugeZero} />
                  <span className={s.gaugeBar} style={pct >= 0 ? { left: "50%", width: `${pct}%` } : { left: `${r2(50 + pct)}%`, width: `${-pct}%` }} />
                  {over && <span className={s.gaugeOver} data-side={gap! > 0 ? "r" : "l"}>{gap! > 0 ? "▸" : "◂"}</span>}
                </div>
                <div className={s.gaugeVal}>
                  <span className={s.mono}>{fmtSigned(raw, axis === "pressure" ? 0 : 1)} {unitText}</span>
                  <span className={s.gaugeUnits}>{fmtSigned(gap, 2)} u</span>
                </div>
              </>
            ) : (
              <div className={s.gaugeMissing}>
                <span>not compared</span>
                <span className={s.gaugeReason}>{near ? missingReason(near, axis, scenario) : "no comparable run"}</span>
              </div>
            )}
          </div>
        );
      })}
      <div className={s.gaugeAxis} aria-hidden>
        <span>−{GAUGE_SPAN} u</span><span>−1</span><span>0</span><span>+1</span><span>+{GAUGE_SPAN} u</span>
      </div>
      {near?.run.pressureBasis === "nominal-stated" && <p className={s.gaugeNote}>Run pressure is nominal (stated), not measured.</p>}
      {near?.d.partialMatch && <p className={s.gaugeNote}>Partial match: D uses {near.d.axesUsed.length} of 3 axes.</p>}
    </div>
  );
}

function RobustMatrix({ robust }: { robust: Robustness }) {
  const cells = robust.cells;
  const fl = (f: number) => (f === 1 ? "1×" : f < 1 ? "½×" : `${f}×`);
  const counts = ORDER.filter((k) => k !== "NONE" || robust.verdicts.NONE > 0).map((k) => `${robust.verdicts[k]} ${k}`).join(" · ");

  return (
    <div className={s.robust} role="group" aria-label={`Robustness: ${robust.combos} scale combinations: ${counts}`}>
      <div className={s.gaugeHead}>
        <span className={s.micro}>Robustness · scales ½×–2×</span>
        <span className={robust.robust ? s.robustTag : s.sensitiveTag}>{robust.robust ? "Robust" : "Sensitive"}</span>
      </div>
      <div className={s.matrixRow}>
        {ROBUSTNESS_FACTORS.map((c) => (
          <div key={c} className={s.matrixBlock}>
            <div className={s.matrixGrid}>
              {cells.filter((x) => x.flow === c).map((x) => (
                <span
                  key={`${x.o2}-${x.pressure}-${x.flow}`}
                  className={s.cell}
                  data-default={x.o2 === 1 && x.pressure === 1 && x.flow === 1}
                  data-v={x.verdict}
                  style={{ background: VERDICT_FILL[x.verdict], color: VERDICT_INK[x.verdict] }}
                  title={`O₂ scale ${fl(x.o2)}, pressure scale ${fl(x.pressure)}, flow scale ${fl(x.flow)}: ${x.verdict}${x.D != null ? `, D ${fmt(x.D, 2)}` : ""}`}
                >
                  {VERDICT_LETTER[x.verdict]}
                </span>
              ))}
            </div>
            <span className={s.matrixCap}>flow {fl(c)}</span>
          </div>
        ))}
      </div>
      <p className={s.robustCount}>
        <span className={s.mono}>{robust.combos}</span> scale combinations: {counts}
      </p>
      <p className={s.robustNote}>
        Rows O₂ scale, columns pressure scale (½× · 1× · 2×). Outlined cell = default scales.
        {robust.Drange && <> D range <span className={s.mono}>{fmt(robust.Drange[0], 2)}–{fmt(robust.Drange[1], 2)}</span> (computed).</>}
      </p>
      <div className={s.matrixKey} aria-hidden>
        {ORDER.map((k) => (
          <span key={k}><i style={{ background: VERDICT_FILL[k], color: VERDICT_INK[k] }} data-v={k}>{VERDICT_LETTER[k]}</i>{k}</span>
        ))}
      </div>
    </div>
  );
}
