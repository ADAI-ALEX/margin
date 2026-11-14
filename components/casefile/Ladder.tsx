"use client";
import { Fragment, useMemo } from "react";
import type { Gravity, Run, Scenario } from "@/lib/schema";
import { classify, kPaToPsia, psiaToKPa, VERDICT_THRESHOLDS } from "@/lib/engine";
import { HEADLINE } from "@/lib/data";
import { FUEL_LABEL, GRAVITY_LABEL, GRAVITY_SHORT, fmt } from "@/lib/format";
import { AXES, FAMILIES, FAMILY_SHORT, pos, inDomain, r2, r3, type AxisKey, type LadderRow, type Tick } from "./derive";
import type { PUnit } from "./ScenarioSentence";
import css from "./casefile.module.css";

export type SortMode = "family" | "R" | "Dmin";
export type MobileCol = "o2" | "p" | "flow" | "g" | "fuel" | "runs" | "R";
const MOBILE_COLS: { id: MobileCol; label: string }[] = [
  { id: "o2", label: "O₂" }, { id: "p", label: "Pressure" }, { id: "flow", label: "Flow" },
  { id: "g", label: "Gravity" }, { id: "fuel", label: "Fuel" }, { id: "runs", label: "Runs" }, { id: "R", label: "R" },
];
const GRAVS: Gravity[] = ["micro", "moon", "mars", "earth"];
const LEVEL_OPACITY = [0.15, 0.35, 1] as const;
const GRAV_HEAD = ["µg", "Mo", "Ma", "1g"];

function scenarioX(axis: AxisKey, s: Scenario) {
  const v = axis === "o2" ? s.o2Pct : axis === "p" ? s.pressureKPa : s.flowCmS ?? 0;
  return { x: pos(axis, v), off: !inDomain(axis, v) ? (v > AXES[axis].max ? "high" : "low") : null };
}

function headerTicks(axis: AxisKey, pUnit: PUnit): { v: number; label: string }[] {
  if (axis === "o2") return [10, 20, 30, 40].map((v) => ({ v, label: String(v) }));
  if (axis === "flow") { const step = AXES.flow.max / 3; return [0, 1, 2, 3].map((i) => ({ v: i * step, label: String(i * step) })); }
  return pUnit === "kPa"
    ? [20, 50, 100, 200, 500].map((v) => ({ v, label: String(v) }))
    : [5, 10, 20, 50].map((v) => ({ v: psiaToKPa(v), label: String(v) }));
}

function Rule({ axis, s }: { axis: AxisKey; s: Scenario }) {
  const { x } = scenarioX(axis, s);
  return <span className={css.rule} style={{ left: `${x}%` }} aria-hidden />;
}

function Strip({ ticks, axis }: { ticks: Tick[]; axis: AxisKey }) {
  const grid = headerTicks(axis, "kPa");
  return (
    <>
      <svg className={css.strip} viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden>
        {grid.map((g) => <line key={g.v} x1={r2(pos(axis, g.v))} x2={r2(pos(axis, g.v))} y1={0} y2={20} className={css.gridLine} vectorEffect="non-scaling-stroke" />)}
        {ticks.filter((t) => t.tier === "T1_PSI_RUN").map((t, i) => (
          <line
            key={i}
            data-l={t.level}
            x1={r2(pos(axis, t.v))} x2={r2(pos(axis, t.v))} y1={3} y2={17}
            className={t.basis === "nominal-stated" ? css.tickNominal : css.tick}
            strokeOpacity={LEVEL_OPACITY[t.level]}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {ticks.filter((t) => t.tier !== "T1_PSI_RUN").map((t, i) => (
        <span
          key={i}
          data-l={t.level}
          className={t.tier === "T4_PLANNED" ? css.ringPlanned : t.limit ? css.ringLimit : css.ringPub}
          title={t.limit ? "reported limit — not a tested condition" : undefined}
          style={{ left: `${pos(axis, t.v)}%`, opacity: t.tier === "T4_PLANNED" ? 1 : LEVEL_OPACITY[t.level] }}
          aria-hidden
        />
      ))}
    </>
  );
}

function AxisCell({ row, axis, s, mcol }: { row: LadderRow; axis: AxisKey; s: Scenario; mcol: boolean }) {
  const a = row.axes[axis];
  const ticks = row.ticks[axis];
  const showMax = axis === "o2" && row.family === "solids";
  const range = a.min != null && a.max != null ? (a.min === a.max ? fmt(a.min, a.min < 10 ? 2 : 1) : `${fmt(a.min, 1)}–${fmt(a.max, 1)}`) : "";
  const label = a.n === 0
    ? `${AXES[axis].label}: not recorded — ${a.reason}`
    : `${AXES[axis].label}: ${a.n} of ${a.total} runs recorded, ${range} ${AXES[axis].unit}${a.nominal ? `, ${a.nominal} nominal (stated), not measured` : ""}${a.limit ? `, ${a.limit} reported limits` : ""}${a.offHigh ? `, ${a.offHigh} above the chart` : ""}`;
  return (
    <div role="cell" data-c={axis} className={`${css.axisCell} ${mcol ? css.colOpt : ""}`} title={label}>
      {a.n === 0 ? (
        <div className={css.hatch}><span>{a.reason}</span></div>
      ) : (
        <>
          {showMax && <span className={css.maxMark} style={{ left: `${pos("o2", HEADLINE.maxSolidO2)}%` }} aria-hidden />}
          <Strip ticks={ticks} axis={axis} />
          {a.offHigh > 0 && <span className={css.offChart} aria-hidden>▸{a.offHigh}</span>}
          <span className={css.axisMeta}>
            <span className={css.mono}>{range}</span>
            {a.nominal > 0 && <span className={css.metaNom}>nominal (stated)</span>}
            {a.limit > 0 && a.limit === a.n && <span className={css.metaNom}>reported limit</span>}
            {a.n < a.total && <span className={css.metaPart}>{a.n}/{a.total} · rest not recorded</span>}
          </span>
        </>
      )}
      <Rule axis={axis} s={s} />
    </div>
  );
}

function GravCell({ row, s }: { row: LadderRow; s: Scenario }) {
  return (
    <div role="cell" data-c="g" className={`${css.gravCell} ${css.colOpt}`}>
      {GRAVS.map((g) => {
        const gi = row.gravities[g];
        const cls = gi.n === 0 ? css.gEmpty : gi.tier === "T1_PSI_RUN" ? css.gPsi : gi.tier === "T3_PUBLISHED" ? css.gPub : css.gPlan;
        return (
          <span key={g} className={`${css.gMini} ${cls} ${s.gravity === g ? css.gScen : ""}`} title={`${GRAVITY_LABEL[g]}: ${gi.n ? `${gi.n} ${gi.tier === "T4_PLANNED" ? "planned (not evidence)" : "runs"}` : "no tests"}`}>
            <span className={css.srOnly}>{GRAVITY_SHORT[g]} {gi.n ? gi.n : "none"}</span>
          </span>
        );
      })}
    </div>
  );
}

function verdictLetter(D: number | null) {
  return classify(D);
}

export function Ladder(props: {
  rows: LadderRow[]; s: Scenario; pUnit: PUnit; sort: SortMode; setSort: (m: SortMode) => void;
  pinned: string[]; togglePin: (id: string) => void; openRun: (r: Run) => void;
  mobileCol: MobileCol; setMobileCol: (c: MobileCol) => void;
}) {
  const { rows, s, pUnit, sort, setSort, pinned, togglePin, openRun, mobileCol, setMobileCol } = props;

  const ordered = useMemo(() => {
    const byR = (a: LadderRow, b: LadderRow) => (b.R ?? -1) - (a.R ?? -1) || (a.Dmin ?? Infinity) - (b.Dmin ?? Infinity) || a.inv.acronym.localeCompare(b.inv.acronym);
    const byD = (a: LadderRow, b: LadderRow) => (a.Dmin ?? Infinity) - (b.Dmin ?? Infinity) || byR(a, b);
    if (sort === "R") return [{ family: null, rows: [...rows].sort(byR) }];
    if (sort === "Dmin") return [{ family: null, rows: [...rows].sort(byD) }];
    return FAMILIES.map((f) => ({ family: f, rows: rows.filter((r) => r.family === f.id).sort(byR) })).filter((g) => g.rows.length);
  }, [rows, sort]);

  const comparableCount = rows.filter((r) => r.state === "comparable").length;
  const solidMaxX = pos("o2", HEADLINE.maxSolidO2);
  const pinFull = pinned.length >= 3;

  return (
    <section className={css.ladderSheet} aria-labelledby="cf-ladder-h">
      <div className={css.sheetHead}>
        <div className={css.sheetLabel} id="cf-ladder-h"><span>§2</span> Envelope ladder <span className={css.sheetLabelNote}>{rows.length} investigations · {comparableCount} comparable for this question and regime</span></div>
        <div className={css.sortGroup} role="group" aria-label="Sort rows">
          <span className={css.presetLabel}>Sort</span>
          {([["family", "Family"], ["R", "R · computed"], ["Dmin", "D_min · computed"]] as [SortMode, string][]).map(([id, l]) => (
            <button key={id} type="button" aria-pressed={sort === id} className={css.presetTab} onClick={() => setSort(id)}>{l}</button>
          ))}
        </div>
      </div>
      <p className={css.legend}>
        <span><i className={css.lgTick} style={{ opacity: 1 }} /> comparable run, D ≤ {VERDICT_THRESHOLDS.near} (NEAR or better)</span>
        <span><i className={css.lgTick} style={{ opacity: LEVEL_OPACITY[1] }} /> comparable, farther</span>
        <span><i className={css.lgTick} style={{ opacity: LEVEL_OPACITY[0] }} /> not comparable here</span>
        <span><i className={css.lgRing} /> published</span>
        <span><i className={css.lgRingLimit} /> reported limit — not a tested condition</span>
        <span><i className={css.lgRingPlan} /> planned — not evidence</span>
        <span><i className={css.lgNom} /> nominal (stated)</span>
        <span><i className={css.lgHatch} /> not recorded</span>
        <span><i className={css.lgRule} /> your scenario</span>
      </p>
      <p className={css.caveatLine}>
        Strips are marginal: a tick close on O₂ can be far on pressure or flow. Full ink marks runs within D ≤ {VERDICT_THRESHOLDS.near} on all compared axes jointly — hover or focus a row to isolate those same runs in every column.
      </p>
      <div className={css.mobileCols} role="group" aria-label="Ladder column">
        {MOBILE_COLS.map((c) => (
          <button key={c.id} type="button" aria-pressed={mobileCol === c.id} onClick={() => setMobileCol(c.id)}>{c.label}</button>
        ))}
      </div>

      <div className={css.ladder} role="table" aria-label="Envelope ladder: investigations against tested O₂, pressure, flow and gravity" data-mcol={mobileCol}>
        <div role="row" className={`${css.lrow} ${css.lhead}`}>
          <div role="columnheader" data-c="pin" className={css.cPin}><span className={css.srOnly}>Pin</span></div>
          <div role="columnheader" data-c="name" className={css.cName}>Investigation</div>
          {(["o2", "p", "flow"] as AxisKey[]).map((axis) => {
            const sx = scenarioX(axis, s);
            const val = axis === "o2" ? `${fmt(s.o2Pct, 1)}` : axis === "p" ? (pUnit === "kPa" ? fmt(s.pressureKPa, 1) : fmt(kPaToPsia(s.pressureKPa), 2)) : s.flowCmS == null ? "quiescent" : fmt(s.flowCmS, 0);
            return (
              <div key={axis} role="columnheader" data-c={axis} className={`${css.axisHead} ${css.colOpt}`}>
                <span className={css.axisTitle}>{AXES[axis].label} <em>{axis === "p" ? `${pUnit}${AXES.p.log ? " · log" : ""}` : AXES[axis].unit}</em></span>
                <span className={css.axisScale} aria-hidden>
                  {headerTicks(axis, pUnit).map((t) => <span key={t.label} style={{ left: `${pos(axis, t.v)}%` }}>{t.label}</span>)}
                </span>
                <span className={css.scenFlag} style={{ left: `${sx.x}%` }} data-edge={sx.x > 70 ? "r" : "l"}>
                  {sx.off === "high" ? "▸ " : sx.off === "low" ? "◂ " : ""}{val}
                </span>
                <Rule axis={axis} s={s} />
              </div>
            );
          })}
          <div role="columnheader" data-c="g" className={`${css.cG} ${css.colOpt}`} title="Gravity regimes with tests: µg · Moon · Mars · 1 g">
            <span className={css.gTitle}>Gravity</span>
            <span className={css.gHeadRow} aria-hidden>{GRAV_HEAD.map((g) => <span key={g}>{g}</span>)}</span>
          </div>
          <div role="columnheader" data-c="fuel" className={`${css.cFuel} ${css.colOpt}`}>Fuel class</div>
          <div role="columnheader" data-c="runs" className={`${css.cNum} ${css.colOpt}`}>Runs</div>
          <div role="columnheader" data-c="dmin" className={css.cNum}>D<sub>min</sub><em>computed</em></div>
          <div role="columnheader" data-c="R" className={`${css.cNum} ${css.colOpt}`}>R<em>computed</em></div>
        </div>

        {ordered.map((g, gi) => (
          <Fragment key={g.family?.id ?? `flat${gi}`}>
            {g.family && (
              <div role="row" className={`${css.lrow} ${css.lgroup}`}>
                <div role="rowheader" className={css.groupName}>
                  {g.family.label} <span className={css.mono}>{g.rows.length}</span>
                </div>
                {(["o2", "p", "flow"] as AxisKey[]).map((axis) => (
                  <div key={axis} role="cell" data-c={axis} className={`${css.groupAxis} ${css.colOpt}`}>
                    {axis === "o2" && g.family!.id === "solids" && (
                      <>
                        <span className={css.maxMark} style={{ left: `${solidMaxX}%` }} aria-hidden />
                        <span className={css.maxLabel} style={{ left: `${solidMaxX}%` }} title={`Highest O₂ among the ${HEADLINE.solidRunsWithO2} PSI solid-material tests with a recorded O₂ value`}>solid max {fmt(HEADLINE.maxSolidO2, 1)}%</span>
                      </>
                    )}
                    <Rule axis={axis} s={s} />
                  </div>
                ))}
                <div role="cell" className={css.groupRest} />
              </div>
            )}
            {g.rows.map((row) => {
              const isPinned = pinned.includes(row.inv.id);
              const dim = row.state !== "comparable";
              const v = verdictLetter(row.Dmin);
              return (
                <div key={row.inv.id} role="row" className={`${css.lrow} ${dim ? css.dim : css.emph} ${isPinned ? css.pinnedRow : ""}`} data-state={row.state} data-tier={row.inv.tier}>
                  <div role="cell" data-c="pin" className={css.cPin}>
                    <button
                      type="button"
                      className={css.pinBtn}
                      aria-pressed={isPinned}
                      disabled={!isPinned && pinFull}
                      aria-label={`${isPinned ? "Unpin" : "Pin"} ${row.inv.acronym} ${isPinned ? "from" : "to"} compare tray`}
                      title={!isPinned && pinFull ? "Compare tray holds 3 — unpin one first" : isPinned ? "Unpin" : "Pin to compare"}
                      onClick={() => togglePin(row.inv.id)}
                    >
                      {isPinned ? "■" : "□"}
                    </button>
                  </div>
                  <div role="rowheader" data-c="name" className={css.cName}>
                    <span className={css.invName}>
                      <b>{row.inv.acronym}</b>
                      <span className={css.invId}>{row.inv.id.startsWith("PSI-") ? row.inv.id : row.inv.tier === "T4_PLANNED" ? "T4" : "T3"}</span>
                      {!g.family && <span className={css.famTag}>{FAMILY_SHORT[row.family]}</span>}
                    </span>
                    <span className={`${css.chip} ${css[`chip_${row.state}`] ?? ""}`}>
                      {row.state === "comparable" ? `comparable · ${row.comparableRuns} run${row.comparableRuns === 1 ? "" : "s"} · ${row.nearRuns} near` : row.chip}
                    </span>
                  </div>
                  <AxisCell row={row} axis="o2" s={s} mcol />
                  <AxisCell row={row} axis="p" s={s} mcol />
                  <AxisCell row={row} axis="flow" s={s} mcol />
                  <GravCell row={row} s={s} />
                  <div role="cell" data-c="fuel" className={`${css.cFuel} ${css.colOpt}`}>
                    {row.fuel.length ? (
                      <span title={row.fuel.map((f) => `${FUEL_LABEL[f.fc]}: ${f.n}`).join(" · ")}>
                        {FUEL_LABEL[row.fuel[0].fc]}{row.fuel.length > 1 && <em> +{row.fuel.length - 1}</em>}
                      </span>
                    ) : <span className={css.nr}>not recorded</span>}
                  </div>
                  <div role="cell" data-c="runs" className={`${css.cNum} ${css.colOpt}`}>
                    {row.runs.length > 0 ? (
                      <span className={css.mono}>{row.runs.length}{row.inv.tier === "T4_PLANNED" && <em className={css.planNote}> planned</em>}</span>
                    ) : row.summaryOnly ? (
                      <span className={css.sumOnly} title="summary table only — not runs">Σ {row.inv.summaryRowCount}<em>summary</em></span>
                    ) : <span className={css.nr}>none</span>}
                  </div>
                  <div role="cell" data-c="dmin" className={css.cNum}>
                    {row.Dmin != null && row.nearest ? (
                      <button type="button" className={css.dBtn} data-v={v} onClick={() => openRun(row.nearest!.run)} title={`Nearest comparable run ${row.nearest.run.id} — open provenance`}>
                        {fmt(row.Dmin, 2)}<span className={css.dV}>{v}</span>
                      </button>
                    ) : <span className={css.nr}>—</span>}
                  </div>
                  <div role="cell" data-c="R" className={`${css.cNum} ${css.colOpt}`}>
                    {row.R != null ? (
                      <span className={css.rCell}><span className={css.mono}>{fmt(row.R, 1)}</span><span className={css.rBar}><span style={{ width: `${r3(Math.min(100, row.R))}%` }} /></span></span>
                    ) : <span className={css.nr}>—</span>}
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
