"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Run, Scenario } from "@/lib/schema";
import { classify, kPaToPsia, VERDICT_THRESHOLDS, SCALE_SCORE, type RankRow, type RankWeights } from "@/lib/engine";
import { GRAVITY_LABEL, GRAVITY_SHORT, fmt } from "@/lib/format";
import {
  AXIS_KEYS, AXIS_LABEL, AXIS_UNIT, DOMAIN, FAMILY_LABEL, FAMILY_ORDER, axisTicks, inDomain, partialLabel, pos, r2, scenarioValue, tierShort,
  type AxisKey, type LadderRow, type Tick,
} from "./derive";
import { Claim, EvidenceWord } from "./ui";
import type { PUnit } from "./ScenarioSentence";
import css from "./casefile.module.css";

export type SortMode = "rank" | "dmin" | "family" | "name";
const SORTS: { id: SortMode; label: string }[] = [
  { id: "rank", label: "Rank R" }, { id: "dmin", label: "D_min" }, { id: "family", label: "Fuel family" }, { id: "name", label: "Name" },
];
const COMPONENTS = ["P", "H", "S", "C", "M"] as const;
type Comp = (typeof COMPONENTS)[number];
const COMP_NAME: Record<Comp, string> = { P: "Proximity", H: "Hazard match", S: "Scale", C: "Coverage", M: "Measurements" };
const COMP_DEF: Record<Comp, string> = {
  P: "exp(−D_min) over this investigation’s comparable runs; 0 if none",
  H: "curated hazard map: primary 1, secondary 0.5, none 0",
  S: `large-scale ${SCALE_SCORE.large}, bench ${SCALE_SCORE.bench}, ground ${SCALE_SCORE.ground}`,
  C: `share of the investigation’s runs within NEAR (D ≤ ${VERDICT_THRESHOLDS.near})`,
  M: "1 if outcome + a hazard-relevant metric, 0.5 if outcome only",
};

interface Section { id: string; label: string; note?: string; rows: LadderRow[] }

function byName(a: LadderRow, b: LadderRow) { return a.inv.acronym.localeCompare(b.inv.acronym); }
function byRank(a: LadderRow, b: LadderRow) {
  const ka = a.rank ? (a.rank.noComparable ? 1 : 0) : 2, kb = b.rank ? (b.rank.noComparable ? 1 : 0) : 2;
  return ka - kb || (b.rank?.R ?? -1) - (a.rank?.R ?? -1) || (a.Dmin ?? Infinity) - (b.Dmin ?? Infinity) || byName(a, b);
}
function byD(a: LadderRow, b: LadderRow) { return (a.Dmin ?? Infinity) - (b.Dmin ?? Infinity) || byRank(a, b); }

function sections(rows: LadderRow[], sort: SortMode, s: Scenario): Section[] {
  const otherg = rows.filter((r) => r.status === "otherg").sort(byRank);
  const planned = rows.filter((r) => r.status === "planned").sort(byName);
  const main = rows.filter((r) => r.status !== "otherg" && r.status !== "planned");
  const tail: Section[] = [
    { id: "otherg", label: `Tested only in another gravity regime`, note: `No distance is computed across gravity regimes; these rows carry no evidence for ${GRAVITY_LABEL[s.gravity].toLowerCase()}.`, rows: otherg },
    { id: "planned", label: FAMILY_LABEL.planned, note: "Planned conditions are never counted as evidence.", rows: planned },
  ];
  let head: Section[];
  if (sort === "family") {
    head = FAMILY_ORDER.filter((f) => f !== "planned").map((f) => ({ id: f, label: FAMILY_LABEL[f], rows: main.filter((r) => r.family === f).sort(byRank) }));
  } else if (sort === "rank") {
    head = [
      { id: "ranked", label: "Comparable runs in this regime — ranked by R", rows: main.filter((r) => r.rank && !r.rank.noComparable).sort(byRank) },
      { id: "meta", label: "No comparable runs — ranked on metadata only", rows: main.filter((r) => r.rank?.noComparable).sort(byRank) },
      { id: "unranked", label: "Not ranked", note: "Published groups are ranked only when published evidence is included.", rows: main.filter((r) => !r.rank).sort(byName) },
    ];
  } else if (sort === "dmin") {
    head = [
      { id: "withd", label: "Comparable runs — nearest first", rows: main.filter((r) => r.Dmin != null).sort(byD) },
      { id: "nod", label: "No comparable runs", rows: main.filter((r) => r.Dmin == null).sort(byName) },
    ];
  } else {
    head = [{ id: "az", label: "All investigations, A–Z", rows: [...main].sort(byName) }];
  }
  return [...head, ...tail].filter((x) => x.rows.length);
}

// ------------------------------------------------------------------ strip
function Strip({ ticks, axis, s }: { ticks: Tick[]; axis: AxisKey; s: Scenario }) {
  const sx = pos(axis, scenarioValue(axis, s));
  return (
    <div className={css.strip} aria-hidden="true">
      <svg viewBox="0 0 100 16" preserveAspectRatio="none" className={css.stripSvg}>
        {axisTicks(axis).map((v) => <line key={v} x1={pos(axis, v)} x2={pos(axis, v)} y1={0} y2={16} className={css.grid} vectorEffect="non-scaling-stroke" />)}
        {ticks.filter((t) => t.kind === "run").map((t, i) => (
          <line key={i} x1={t.x} x2={t.x} y1={t.level === "solid" ? 1.5 : 3.5} y2={t.level === "solid" ? 14.5 : 12.5} className={css.tick} data-level={t.level} data-nominal={t.nominal || undefined} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {ticks.filter((t) => t.kind !== "run").map((t, i) => (
        <span key={i} className={css.ring} data-kind={t.kind} data-level={t.level} style={{ left: `${t.x}%` }} />
      ))}
      <span className={css.scenRule} style={{ left: `${sx}%` }} />
    </div>
  );
}

function axisText(row: LadderRow, axis: AxisKey) {
  const a = row.axes[axis];
  const d = axis === "p" ? (a.min != null && a.min < 10 ? 2 : 1) : 1;
  const range = a.min == null ? null : a.min === a.max ? `${fmt(a.min, d)}` : `${fmt(a.min, d)}–${fmt(a.max, d)}`;
  return { a, range };
}

function AxisCell({ row, axis, s }: { row: LadderRow; axis: AxisKey; s: Scenario }) {
  const { a, range } = axisText(row, axis);
  const offHigh = a.offHigh, offLow = a.offLow;
  return (
    <td className={css.axisCell}>
      {a.n === 0 ? (
        <div className={css.hatch}><span>{a.reason ?? "not recorded"}</span></div>
      ) : (
        <Strip ticks={row.ticks[axis]} axis={axis} s={s} />
      )}
      <div className={css.axisMeta}>
        {range && <span className="num">{range} {AXIS_UNIT[axis]}</span>}
        {offLow > 0 && <span>◂{offLow} below chart</span>}
        {offHigh > 0 && <span>{offHigh} above chart ▸</span>}
        {a.nominal > 0 && <span className={css.metaNote}>{a.nominal === a.n ? "nominal (stated)" : `${a.nominal} nominal`}</span>}
        {a.limit > 0 && <span className={css.metaNote}>{a.limit === a.n ? "reported limits" : `${a.limit} reported limits`}</span>}
        {a.n > 0 && a.n < a.total && <span>{a.n}/{a.total} recorded</span>}
      </div>
      {a.burnerFed && (
        <div className={css.burner}>
          <span className="num">{a.burnerFed.n}</span> inverse-flame runs: burner-fed oxidizer <span className="num">{fmt(a.burnerFed.min, 0)}–{fmt(a.burnerFed.max, 0)}%</span> — not ambient O₂, not on this axis
        </div>
      )}
    </td>
  );
}

function rowSummary(row: LadderRow, s: Scenario): string {
  const parts = [`${row.inv.acronym}, ${tierShort(row.inv)}.`, `${row.chip}.`];
  for (const axis of AXIS_KEYS) {
    const { a, range } = axisText(row, axis);
    parts.push(a.n === 0 ? `${AXIS_LABEL[axis]} not recorded${a.reason ? ` (${a.reason})` : ""}.` : `${AXIS_LABEL[axis]} ${range} ${AXIS_UNIT[axis]}, ${a.n} of ${a.total} runs recorded.`);
  }
  if (row.nearest) parts.push(`Nearest comparable run D ${fmt(row.Dmin, 2)}, Evidence: ${classify(row.Dmin)}${row.nearest.d.partialMatch ? `, ${partialLabel(row.nearest)}; on all three axes: ${row.nearestComplete ? `D ${fmt(row.nearestComplete.d.D, 2)}, ${classify(row.nearestComplete.d.D)}` : "none"}` : ""}.`);
  else parts.push("No comparable run.");
  if (row.rank) parts.push(`Rank R ${fmt(row.rank.R, 1)}${row.rank.noComparable ? ", ranked on metadata only" : ""}: ${COMPONENTS.map((k) => `${k} ${fmt(row.rank!.components[k], 2)}`).join(", ")}.`);
  else parts.push("Not ranked.");
  parts.push(`${row.comparable} of ${row.runs.length} runs comparable${row.otherRegimes.length ? `; ${row.otherRegimes.map((o) => `${o.n} in ${GRAVITY_LABEL[o.g].toLowerCase()}`).join(", ")} not drawn` : ""}.`);
  void s;
  return parts.join(" ");
}

// ------------------------------------------------------------------ R tooltip (fixed-position, outside the scroll box)
interface Tip { row: RankRow; x: number; y: number }
function RankTip({ tip, weights }: { tip: Tip | null; weights: RankWeights }) {
  if (!tip) return null;
  const wsum = COMPONENTS.reduce((a, k) => a + weights[k], 0) || 1;
  const left = typeof window !== "undefined" ? Math.min(tip.x, window.innerWidth - 340) : tip.x;
  return (
    <div role="tooltip" id="inv-rank-tip" className={css.tip} style={{ left: Math.max(8, left), top: tip.y }}>
      <p className={css.tipHead}>R = 100 × Σ weight × component = <b className="num">{fmt(tip.row.R, 1)}</b> <Claim kind="COMPUTED" /></p>
      <table className={css.tipTable}>
        <thead><tr><th scope="col">Component</th><th scope="col">Value</th><th scope="col">Weight</th><th scope="col">Points</th></tr></thead>
        <tbody>
          {COMPONENTS.map((k) => (
            <tr key={k}>
              <th scope="row"><i className={css.rseg} data-c={k} /> {k} · {COMP_NAME[k]}<span className={css.tipDef}>{COMP_DEF[k]}</span></th>
              <td className="num">{fmt(tip.row.components[k], 2)}</td>
              <td className="num">{fmt(weights[k] / wsum, 2)}</td>
              <td className="num">{fmt(tip.row.contributions[k] * 100, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {tip.row.noComparable && <p className={css.tipNote}>No comparable runs — ranked on metadata only (P = 0, C = 0).</p>}
    </div>
  );
}

export function Ladder(props: {
  rows: LadderRow[]; s: Scenario; pUnit: PUnit; sort: SortMode; setSort: (m: SortMode) => void;
  pinned: string[]; togglePin: (id: string) => void; openRun: (r: Run) => void; weights: RankWeights;
}) {
  const { rows, s, pUnit, sort, setSort, pinned, togglePin, openRun, weights } = props;
  const secs = useMemo(() => sections(rows, sort, s), [rows, sort, s]);
  const [tip, setTip] = useState<Tip | null>(null);
  const showTip = useCallback((row: RankRow, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const below = r.bottom + 230 < window.innerHeight;
    setTip({ row, x: r.left - 260, y: below ? r.bottom + 6 : Math.max(8, r.top - 236) });
  }, []);
  useEffect(() => {
    if (!tip) return;
    const close = () => setTip(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("keydown", onKey); };
  }, [tip]);

  const comparableCount = rows.filter((r) => r.status === "comparable").length;
  const pinFull = pinned.length >= 3;
  const wsum = COMPONENTS.reduce((a, k) => a + weights[k], 0) || 1;

  return (
    <section className={css.ladderSec} aria-labelledby="inv-ladder-h" data-testid="ladder">
      <div className={css.secHead}>
        <div>
          <h2 className={css.h2} id="inv-ladder-h">Envelope ladder</h2>
          <p className={css.secSub}>
            {rows.length} investigations · <span className="num">{comparableCount}</span> with comparable runs for this question in {GRAVITY_LABEL[s.gravity].toLowerCase()}.
            Each strip shows where an investigation&rsquo;s runs sit on one axis; the vertical rule is your scenario.
          </p>
        </div>
        <div className={css.sortGroup} role="group" aria-label="Sort investigations">
          <span className={css.footLabel}>Sort</span>
          <span className={css.seg}>
            {SORTS.map((o) => (
              <button key={o.id} type="button" className={css.segBtn} aria-pressed={sort === o.id} onClick={() => setSort(o.id)}>{o.label}</button>
            ))}
          </span>
        </div>
      </div>

      <div className={css.legend}>
        <ul className={css.legendList}>
          <li><i className={css.lgTick} data-level="solid" /> comparable run, within NEAR (D ≤ {VERDICT_THRESHOLDS.near}) on the <em>other</em> compared axes</li>
          <li><i className={css.lgTick} data-level="ghost" /> comparable, but farther than NEAR on the other axes (ghost)</li>
          <li><i className={css.lgTick} data-level="faint" /> not comparable for this question</li>
          <li><i className={css.lgTick} data-level="solid" data-nominal /> nominal (stated) value</li>
          <li><i className={css.ring} data-kind="published" data-level="solid" /> published (not in PSI)</li>
          <li><i className={css.ring} data-kind="limit" data-level="solid" /> reported limit — a threshold, not a test</li>
          <li><i className={css.ring} data-kind="planned" /> planned — not evidence</li>
          <li><i className={css.lgHatch} /> not recorded</li>
          <li><i className={css.lgRule} /> your scenario</li>
        </ul>
        <p className={css.legendNote}>
          Strips are marginal: a run close on O₂ can be far on pressure or flow, so a tick is drawn solid only when that run is also within NEAR on the other axes it is compared on.
          Only runs in the scenario&rsquo;s gravity regime are drawn. Inverse-flame O₂ (fed through the burner) is listed under the O₂ strip, not placed on it.
        </p>
      </div>

      <div className={css.tableScroll} tabIndex={0} role="region" aria-label="Envelope ladder table (scrolls sideways on small screens)">
        <table className={css.ladder}>
          <caption className="sr-only">
            Envelope ladder: each NASA investigation, where its runs sit on O₂, pressure and flow relative to your scenario, its nearest comparable run (D_min), rank R and comparable runs.
          </caption>
          <thead>
            <tr>
              <th scope="col" className={css.cName}>Investigation</th>
              {AXIS_KEYS.map((axis) => {
                const v = scenarioValue(axis, s);
                const x = pos(axis, v);
                const off = !inDomain(axis, v) ? (v > DOMAIN[axis].max ? "▸ " : "◂ ") : "";
                const label = axis === "p" ? (pUnit === "kPa" ? fmt(v, 1) : fmt(kPaToPsia(v), 2)) : axis === "flow" && s.flowCmS == null ? "quiescent" : fmt(v, axis === "flow" ? 0 : 1);
                return (
                  <th key={axis} scope="col" className={css.axisHead}>
                    <span className={css.axisTitle}>{AXIS_LABEL[axis]} <span className={css.quiet}>{axis === "p" ? `${pUnit}, log scale` : AXIS_UNIT[axis]}</span></span>
                    <span className={css.axisScale} aria-hidden="true">
                      {axisTicks(axis).map((t) => <span key={t} style={{ left: `${pos(axis, t)}%` }}>{axis === "p" && pUnit === "psia" ? fmt(kPaToPsia(t), 1) : t}</span>)}
                    </span>
                    <span className="sr-only">Your scenario: {label}</span>
                    <span className={css.flagTrack} aria-hidden="true"><span className={css.scenFlag} style={{ left: `${x}%` }} data-edge={x > 85 ? "r" : x < 15 ? "l" : undefined}>{off}{label}</span></span>
                  </th>
                );
              })}
              <th scope="col" className={css.cD}>D<sub>min</sub> · evidence <Claim kind="COMPUTED" /></th>
              <th scope="col" className={css.cR}>Rank R <Claim kind="COMPUTED" /></th>
              <th scope="col" className={css.cRuns}>Comparable / total runs</th>
            </tr>
          </thead>
          {secs.map((sec) => (
            <tbody key={sec.id}>
              <tr className={css.secRow}>
                <th scope="colgroup" colSpan={7}>
                  <span className={css.secLabel}>
                    {sec.label} <span className={`num ${css.secCount}`}>{sec.rows.length}</span>
                    {sec.note && <span className={css.secNote}> — {sec.note}</span>}
                  </span>
                </th>
              </tr>
              {sec.rows.map((row) => {
                const isPinned = pinned.includes(row.inv.id);
                const v = classify(row.Dmin);
                return (
                  <tr key={row.inv.id} data-testid="ladder-row" data-inv={row.inv.id} data-status={row.status} className={`${css.lrow} ${isPinned ? css.pinnedRow : ""}`}>
                    <th scope="row" className={css.cName}>
                      <div className={css.nameCell}>
                        <button
                          type="button"
                          data-testid="pin-toggle"
                          className={css.pinBtn}
                          aria-pressed={isPinned}
                          aria-disabled={!isPinned && pinFull ? true : undefined}
                          aria-label={`${isPinned ? "Remove" : "Add"} ${row.inv.acronym} ${isPinned ? "from" : "to"} compare`}
                          title={!isPinned && pinFull ? "Compare holds 3 — remove one first" : isPinned ? "Remove from compare" : "Add to compare"}
                          onClick={() => { if (isPinned || !pinFull) togglePin(row.inv.id); }}
                        >
                          <span aria-hidden="true">{isPinned ? "✓" : "+"}</span>
                        </button>
                        <div className={css.nameText}>
                          <Link href={`/investigations/${row.inv.id}`} className={css.invLink}>{row.inv.acronym}</Link>
                          <span className={css.invMeta}>
                            <span className={css.tier} data-tier={row.inv.tier}>{tierShort(row.inv)}</span>
                            <span className="num">{row.inv.id}</span>
                            {sort !== "family" && <span>· {FAMILY_LABEL[row.family]}</span>}
                          </span>
                          <span className={css.chip} data-status={row.status}>{row.chip}</span>
                          {row.otherRegimes.length > 0 && row.status !== "otherg" && (
                            <span className={css.otherG}>+{row.otherRegimes.map((o) => `${o.n} ${GRAVITY_SHORT[o.g]}`).join(", ")} in other regimes (not drawn)</span>
                          )}
                          <span className="sr-only">{rowSummary(row, s)}</span>
                        </div>
                      </div>
                    </th>
                    {AXIS_KEYS.map((axis) => <AxisCell key={axis} row={row} axis={axis} s={s} />)}
                    <td className={css.cD}>
                      {row.nearest ? (
                        <button type="button" className={css.dBtn} onClick={() => openRun(row.nearest!.run)} aria-label={`D_min ${fmt(row.Dmin, 2)}, Evidence: ${v}. Open provenance of nearest run ${row.nearest.run.id}`}>
                          <span className={css.dVal}>{fmt(row.Dmin, 2)}</span>
                          <EvidenceWord v={v} />
                          {row.nearest.d.partialMatch && <span className={css.partial}>{partialLabel(row.nearest)}</span>}
                        </button>
                      ) : null}
                      {row.nearest?.d.partialMatch ? (
                        row.nearestComplete
                          ? <button type="button" className={css.allAxes} onClick={() => openRun(row.nearestComplete!.run)} aria-label={`On all three axes: D ${fmt(row.nearestComplete.d.D, 2)}, Evidence: ${classify(row.nearestComplete.d.D)}. Open provenance of ${row.nearestComplete.run.id}`}>on all three axes: <span className="num">{fmt(row.nearestComplete.d.D, 2)}</span> <EvidenceWord v={classify(row.nearestComplete.d.D)} prefix={false} /></button>
                          : <span className={css.allAxes}>on all three axes: none</span>
                      ) : null}
                      {row.nearest ? null : (
                        <span className={css.none}>{row.status === "planned" ? "planned — never counted" : row.rank?.noComparable ? "no comparable runs — ranked on metadata only" : "no comparable runs"}</span>
                      )}
                    </td>
                    <td className={css.cR}>
                      {row.rank ? (
                        <button
                          type="button"
                          className={css.rBtn}
                          aria-describedby={tip?.row.investigation.id === row.inv.id ? "inv-rank-tip" : undefined}
                          aria-label={`Rank R ${fmt(row.rank.R, 1)}: components ${COMPONENTS.map((k) => `${COMP_NAME[k]} ${fmt(row.rank!.components[k], 2)}`).join(", ")}`}
                          onMouseEnter={(e) => showTip(row.rank!, e.currentTarget)}
                          onMouseLeave={() => setTip(null)}
                          onFocus={(e) => showTip(row.rank!, e.currentTarget)}
                          onBlur={() => setTip(null)}
                          onClick={(e) => showTip(row.rank!, e.currentTarget)}
                        >
                          <span className="num">{fmt(row.rank.R, 1)}</span>
                          <span className={css.rBar} aria-hidden="true">
                            {COMPONENTS.map((k) => <span key={k} className={css.rseg} data-c={k} style={{ width: `${r2(Math.max(0, row.rank!.contributions[k] * 100))}%` }} />)}
                          </span>
                        </button>
                      ) : <span className={css.none}>not ranked</span>}
                    </td>
                    <td className={css.cRuns}>
                      {row.runs.length > 0 ? (
                        <>
                          <span className={`num ${css.nowrap}`}>{row.comparable} / {row.runs.length}</span>
                          {row.comparable > 0 && <span className={css.subNum}><span className="num">{row.near}</span> within NEAR</span>}
                        </>
                      ) : row.inv.summaryRowCount > 0 ? (
                        <span className={css.subNum}><span className="num">{row.inv.summaryRowCount}</span> summary rows, no runs</span>
                      ) : <span className={css.none}>no runs</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
      <p className={css.rankKey}>
        <span>R components:</span>
        {COMPONENTS.map((k) => <span key={k}><i className={css.rseg} data-c={k} /> {k} {COMP_NAME[k].toLowerCase()} ×<span className="num">{fmt(weights[k] / wsum, 2)}</span></span>)}
        <span className={css.quiet}>Hover or focus an R value for the breakdown.</span>
      </p>
      <RankTip tip={tip} weights={weights} />
    </section>
  );
}
