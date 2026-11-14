"use client";
import { useState } from "react";
import type { Run, Scenario } from "@/lib/schema";
import type { Evaluation } from "@/lib/engine";
import { invById } from "../shared/data";
import { GRAVITY_LABEL, fmt, fmtSigned } from "../shared/format";
import { FAMILY_COLOR, FAMILY_SHAPE, familyOf, shapePath, TIER_SHORT } from "./marks";
import { fmtP, type PUnit } from "./units";
import s from "./console.module.css";

const PAGE = 12;

export default function NearestTable({ evaluation, scenario, unit, onInspect, selectedId }: { evaluation: Evaluation; scenario: Scenario; unit: PUnit; onInspect: (r: Run) => void; selectedId: string | null }) {
  const [open, setOpen] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const rows = evaluation.comparable.slice(0, limit);
  const total = evaluation.comparable.length;

  return (
    <section className={s.drawer} aria-labelledby="a-near-h" data-open={open}>
      <header className={s.drawerHead}>
        <button type="button" className={s.drawerToggle} aria-expanded={open} aria-controls="a-near-body" onClick={() => setOpen((o) => !o)}>
          <span className={s.caret} aria-hidden>{open ? "▾" : "▸"}</span>
          <h2 id="a-near-h" className={s.panelTitle}>Nearest comparable runs</h2>
        </button>
        <span className={s.panelMeta}><span className={s.mono}>{total}</span> comparable · {evaluation.context.length} context · {evaluation.otherGravity.length} other regime · {evaluation.excludedCount} excluded</span>
      </header>
      {open && (
        <div id="a-near-body" className={s.drawerBody}>
          {total === 0 ? (
            <p className={s.empty}>
              No comparable runs in {GRAVITY_LABEL[scenario.gravity].toLowerCase()} for this question. {evaluation.otherGravity.length} runs of a comparable fuel class were tested in another gravity regime; no cross-regime distance is computed.
            </p>
          ) : (
            <div className={s.tableScroll} tabIndex={0} role="region" aria-label="Nearest comparable runs table">
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>#</th><th>Run</th><th>Tier</th><th>Investigation · material</th>
                    <th className={s.num}>O₂ %</th><th className={s.num}>P {unit}</th><th className={s.num}>Flow cm/s</th>
                    <th className={s.num}>ΔO₂ pts</th><th className={s.num}>ΔP %</th><th className={s.num}>ΔU cm/s</th>
                    <th className={s.num}>D <i>computed</i></th><th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ run, d }, i) => {
                    const fam = familyOf(run);
                    return (
                      <tr
                        key={run.id}
                        tabIndex={0}
                        aria-selected={selectedId === run.id}
                        onClick={() => onInspect(run)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onInspect(run); } }}
                      >
                        <td className={s.dim}>{i + 1}</td>
                        <td className={s.mono}>
                          <svg width={10} height={10} aria-hidden className={s.rowMark}>
                            <path d={shapePath(FAMILY_SHAPE[fam], 5, 5, 3)} fill={run.tier === "T1_PSI_RUN" ? FAMILY_COLOR[fam] : "none"} stroke={run.tier === "T1_PSI_RUN" ? "none" : FAMILY_COLOR[fam]} />
                          </svg>
                          {run.id}
                        </td>
                        <td><span className={s.tierTag} data-tier={run.tier}>{TIER_SHORT[run.tier]}</span></td>
                        <td className={s.matCell}>
                          <b>{invById.get(run.investigation)?.acronym ?? run.investigation}</b>
                          <span>{run.material ?? "material not recorded"}</span>
                        </td>
                        <td className={s.num}>{fmt(run.o2Pct)}{run.o2Basis === "limit-reported" && <sup title="reported limit">L</sup>}</td>
                        <td className={s.num}>{fmtP(run.pressureKPa, unit)}{run.pressureBasis === "nominal-stated" && <sup title="nominal (stated), not measured">N</sup>}</td>
                        <td className={s.num}>{run.flowCmS != null ? fmt(run.flowCmS) : run.flowRegime === "quiescent" ? "quiescent" : <span className={s.nr}>not recorded</span>}</td>
                        <td className={s.num}>{fmtSigned(d.raw.o2Pts)}</td>
                        <td className={s.num}>{fmtSigned(d.raw.pressurePct, 0)}</td>
                        <td className={s.num}>{d.raw.flowCmS != null ? fmtSigned(d.raw.flowCmS) : <span className={s.nr}>{d.flags.includes("flow-regime-mismatch") ? "regime ≠" : "n/r"}</span>}</td>
                        <td className={`${s.num} ${s.dCol}`}>{fmt(d.D, 2)}{d.partialMatch && <sup title={`partial match: ${d.axesUsed.length} of 3 axes`}>P</sup>}</td>
                        <td className={s.flagCell}>{run.flags.length ? <span className={s.flagCount} title={run.flags.join(", ")}>{run.flags.length} ⚑</span> : <span className={s.dim}>none</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className={s.drawerFoot}>
            <span>Superscripts: <b>N</b> nominal (stated), not measured · <b>L</b> reported limit · <b>P</b> partial match. Δ = run − scenario. Select a row for provenance.</span>
            {total > limit && <button type="button" className={s.ghostBtn} onClick={() => setLimit((l) => l + PAGE * 2)}>Show more</button>}
          </div>
        </div>
      )}
    </section>
  );
}
