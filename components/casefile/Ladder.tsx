"use client";
/**
 * The ranked catalogue: one compact card row per investigation, in the engine's ranking order, with
 * marginal strips on O₂, pressure and flow, D_min and the rank R (components on demand, reweightable).
 * Hovering or focusing a row shows its footprint in the field beside the list.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Run, Scenario } from "@/lib/schema";
import { classify, kPaToPsia, RANK_WEIGHTS, VERDICT_THRESHOLDS, SCALE_SCORE, type RankWeights } from "@/lib/engine";
import { GRAVITY_LABEL, GRAVITY_SHORT, fmt } from "@/lib/format";
import { NumberField, RadioGroup } from "@/components/ui/controls";
import { ClaimBadge } from "@/components/ui/misc";
import { IconPlus, IconTarget } from "@/components/ui/icons";
import {
  AXIS_KEYS, AXIS_LABEL, AXIS_UNIT, DOMAIN, FAMILY_LABEL, FAMILY_ORDER, axisTicks, inDomain, partialLabel, pos, r2, scenarioValue, tierShort,
  type AxisKey, type LadderRow, type Tick,
} from "./derive";
import type { PUnit } from "./ScenarioSentence";
import css from "./casefile.module.css";

export type SortMode = "rank" | "dmin" | "family" | "name";
const SORTS: SortMode[] = ["rank", "dmin", "family", "name"];
const SORT_LABEL: Record<SortMode, string> = { rank: "Rank R", dmin: "D_min", family: "Fuel family", name: "Name" };
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

export function sections(rows: LadderRow[], sort: SortMode, s: Scenario): Section[] {
  const otherg = rows.filter((r) => r.status === "otherg").sort(byRank);
  const planned = rows.filter((r) => r.status === "planned").sort(byName);
  const main = rows.filter((r) => r.status !== "otherg" && r.status !== "planned");
  const tail: Section[] = [
    { id: "otherg", label: "Tested only in another gravity regime", note: `No distance is computed across gravity regimes; these carry no evidence for ${GRAVITY_LABEL[s.gravity].toLowerCase()}.`, rows: otherg },
    { id: "planned", label: FAMILY_LABEL.planned, note: "Planned conditions are never counted as evidence.", rows: planned },
  ];
  let head: Section[];
  if (sort === "family") {
    head = FAMILY_ORDER.filter((f) => f !== "planned").map((f) => ({ id: f, label: FAMILY_LABEL[f], rows: main.filter((r) => r.family === f).sort(byRank) }));
  } else if (sort === "rank") {
    head = [
      { id: "ranked", label: "Comparable runs in this regime, ranked by R", rows: main.filter((r) => r.rank && !r.rank.noComparable).sort(byRank) },
      { id: "meta", label: "No comparable runs, ranked on metadata only", rows: main.filter((r) => r.rank?.noComparable).sort(byRank) },
      { id: "unranked", label: "Not ranked", note: "Published groups are ranked only when published evidence is included.", rows: main.filter((r) => !r.rank).sort(byName) },
    ];
  } else if (sort === "dmin") {
    head = [
      { id: "withd", label: "Comparable runs, nearest first", rows: main.filter((r) => r.Dmin != null).sort(byD) },
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
        {axisTicks(axis).map((v) => <line key={v} x1={pos(axis, v)} x2={pos(axis, v)} y1={0} y2={16} className={css.stripGrid} vectorEffect="non-scaling-stroke" />)}
        {ticks.filter((t) => t.kind === "run").map((t, i) => (
          <line key={i} x1={t.x} x2={t.x} y1={t.level === "solid" ? 1.5 : 4} y2={t.level === "solid" ? 14.5 : 12} className={css.tick} data-level={t.level} data-nominal={t.nominal || undefined} vectorEffect="non-scaling-stroke" />
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
  const notes: string[] = [];
  if (a.offLow > 0) notes.push(`◂${a.offLow} below`);
  if (a.offHigh > 0) notes.push(`${a.offHigh} above ▸`);
  if (a.nominal > 0) notes.push(a.nominal === a.n ? "nominal" : `${a.nominal} nominal`);
  if (a.limit > 0) notes.push(a.limit === a.n ? "reported limits" : `${a.limit} limits`);
  if (a.n > 0 && a.n < a.total) notes.push(`${a.n}/${a.total} recorded`);
  return (
    <div className={css.axisCell} data-axis={axis}>
      <span className={css.axisMini} aria-hidden="true">{AXIS_LABEL[axis]}</span>
      {a.n === 0 ? <div className={css.hatch}><span>{a.reason ?? "not recorded"}</span></div> : <Strip ticks={row.ticks[axis]} axis={axis} s={s} />}
      {a.n > 0 && (
        <p className={css.axisMeta} aria-hidden="true">
          {range && <span className="num">{range} {AXIS_UNIT[axis]}</span>}
          {notes.map((t) => <span key={t}>{t}</span>)}
        </p>
      )}
      {a.burnerFed && (
        <p className={css.burner} aria-hidden="true"><span className="num">{a.burnerFed.n}</span> inverse-flame runs: burner-fed O₂, not ambient</p>
      )}
    </div>
  );
}

/** No axis recorded, for one shared reason: one hatched cell across the three strips. */
const allMissing = (row: LadderRow) => AXIS_KEYS.every((a) => row.axes[a].n === 0 && row.axes[a].reason === row.axes.o2.reason);

function rowSummary(row: LadderRow): string {
  const parts = [`${row.inv.acronym}, ${tierShort(row.inv)}.`, `${row.chip}.`];
  for (const axis of AXIS_KEYS) {
    const { a, range } = axisText(row, axis);
    parts.push(a.n === 0 ? `${AXIS_LABEL[axis]} not recorded${a.reason ? ` (${a.reason})` : ""}.` : `${AXIS_LABEL[axis]} ${range} ${AXIS_UNIT[axis]}, ${a.n} of ${a.total} runs recorded.`);
    if (a.burnerFed) parts.push(`${a.burnerFed.n} inverse-flame runs record a burner-fed oxidizer of ${fmt(a.burnerFed.min, 0)}–${fmt(a.burnerFed.max, 0)}% O₂, not ambient O₂ and not on this axis.`);
  }
  if (row.nearest) parts.push(`Nearest comparable run D ${fmt(row.Dmin, 2)}, Evidence: ${classify(row.Dmin)}${row.nearest.d.partialMatch ? `, ${partialLabel(row.nearest)}; on all three axes: ${row.nearestComplete ? `D ${fmt(row.nearestComplete.d.D, 2)}, ${classify(row.nearestComplete.d.D)}` : "none"}` : ""}.`);
  else parts.push("No comparable run.");
  parts.push(`${row.comparable} of ${row.runs.length} runs comparable${row.otherRegimes.length ? `; ${row.otherRegimes.map((o) => `${o.n} in ${GRAVITY_LABEL[o.g].toLowerCase()}`).join(", ")} not drawn` : ""}.`);
  return parts.join(" ");
}

// ------------------------------------------------------------------ weights
function WeightsEditor({ weights, setWeights }: { weights: RankWeights; setWeights: (w: RankWeights) => void }) {
  const wsum = COMPONENTS.reduce((a, k) => a + weights[k], 0) || 1;
  const isDefault = COMPONENTS.every((k) => weights[k] === RANK_WEIGHTS[k]);
  return (
    <div className={css.weights} id="inv-weights" role="group" aria-labelledby="inv-weights-h">
      <div className={css.weightsHead}>
        <h3 className="ui-label" id="inv-weights-h">Rank weights</h3>
        <p className={css.weightsNote}>R = 100 × Σ weight × component. Weights are renormalised to sum to 1 by the engine; the ranking updates as you commit a value.</p>
        <button type="button" className="ui-btn ui-btn--quiet" onClick={() => setWeights({ ...RANK_WEIGHTS })} disabled={isDefault}>Reset to defaults</button>
      </div>
      <div className={css.weightsGrid}>
        {COMPONENTS.map((k) => (
          <div key={k} className={css.wItem}>
            <NumberField id={`inv-w-${k}`} label={`${k} · ${COMP_NAME[k]}`} value={weights[k]} min={0} max={1} step={0.05} unit={`${Math.round((weights[k] / wsum) * 100)}%`}
              onCommit={(v) => setWeights({ ...weights, [k]: v })} />
            <p className={css.wDef}><i className={css.rseg} data-c={k} aria-hidden="true" /> {COMP_DEF[k]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ catalogue
export function Ladder(props: {
  rows: LadderRow[]; s: Scenario; pUnit: PUnit; sort: SortMode; setSort: (m: SortMode) => void;
  pinned: string[]; togglePin: (id: string) => void; openRun: (r: Run) => void;
  weights: RankWeights; setWeights: (w: RankWeights) => void;
  focusId: string | null; selectedId: string | null; onHover: (id: string | null) => void; onSelect: (id: string) => void;
}) {
  const { rows, s, pUnit, sort, setSort, pinned, togglePin, openRun, weights, setWeights, focusId, selectedId, onHover, onSelect } = props;
  const secs = useMemo(() => sections(rows, sort, s), [rows, sort, s]);
  const [openR, setOpenR] = useState<string | null>(null);
  const [weightsOpen, setWeightsOpen] = useState(false);

  const comparableCount = rows.filter((r) => r.status === "comparable").length;
  const pinFull = pinned.length >= 3;
  const wsum = COMPONENTS.reduce((a, k) => a + weights[k], 0) || 1;

  return (
    <section className={css.catalogue} aria-labelledby="inv-ladder-h" data-testid="ladder" onMouseLeave={() => onHover(null)}>
      <div className={css.secHead}>
        <div className={css.secHeadText}>
          <h2 className={css.h2} id="inv-ladder-h">Ranked catalogue</h2>
          <p className={css.secSub}>
            <span className="num">{rows.length}</span> investigations · <span className="num">{comparableCount}</span> with comparable runs for this question in {GRAVITY_LABEL[s.gravity].toLowerCase()}.
            Strips show where each investigation&rsquo;s runs sit on one axis; the amber rule is your scenario.
          </p>
        </div>
        <div className={css.catTools}>
          <RadioGroup<SortMode> label="Sort" options={SORTS} value={sort} onChange={setSort} render={(m) => SORT_LABEL[m]} size="sm" className={css.sortRg} />
          <button type="button" className="ui-btn" aria-expanded={weightsOpen} aria-controls="inv-weights" onClick={() => setWeightsOpen((x) => !x)}>
            Weights <span className={`num ${css.wInline}`}>{COMPONENTS.map((k) => `${k} ${Math.round((weights[k] / wsum) * 100)}`).join(" · ")}</span>
          </button>
        </div>
      </div>

      {weightsOpen && <WeightsEditor weights={weights} setWeights={setWeights} />}

      <div className={css.catHead} aria-hidden="true">
        <span className={css.chName}>Investigation</span>
        {AXIS_KEYS.map((axis) => {
          const v = scenarioValue(axis, s);
          const x = pos(axis, v);
          const off = !inDomain(axis, v) ? (v > DOMAIN[axis].max ? "▸ " : "◂ ") : "";
          const label = axis === "p" ? (pUnit === "kPa" ? fmt(v, 1) : fmt(kPaToPsia(v), 2)) : axis === "flow" && s.flowCmS == null ? "quiescent" : fmt(v, axis === "flow" ? 0 : 1);
          return (
            <span key={axis} className={css.chAxis}>
              <span className={css.chTitle}>{AXIS_LABEL[axis]} <span className={css.chUnit}>{axis === "p" ? `${pUnit}, log` : AXIS_UNIT[axis]}</span></span>
              <span className={css.chFlagTrack}><span className={css.chFlag} style={{ left: `${x}%` }} data-edge={x > 82 ? "r" : x < 18 ? "l" : undefined}>{off}{label}</span></span>
              <span className={css.chScale}>
                {axisTicks(axis).map((t) => <span key={t} style={{ left: `${pos(axis, t)}%` }}>{axis === "p" && pUnit === "psia" ? fmt(kPaToPsia(t), 1) : t}</span>)}
              </span>
            </span>
          );
        })}
        <span className={css.chD}>D<sub>min</sub></span>
        <span className={css.chR}>Rank R</span>
      </div>

      {secs.map((sec) => (
        <div key={sec.id} className={css.catSec}>
          <h3 className={css.catSecLabel}>
            {sec.label} <span className={`num ${css.catSecCount}`}>{sec.rows.length}</span>
          </h3>
          {sec.note && <p className={css.catSecNote}>{sec.note}</p>}
          <ol className={css.rows}>
            {sec.rows.map((row) => {
              const id = row.inv.id;
              const isPinned = pinned.includes(id);
              const v = classify(row.Dmin);
              const rOpen = openR === id;
              return (
                <li
                  key={id}
                  data-testid="ladder-row" data-inv={id} data-status={row.status}
                  className={css.row} data-pinned={isPinned || undefined} data-focus={focusId === id || undefined} data-selected={selectedId === id || undefined}
                  onMouseEnter={() => onHover(id)} onFocus={() => onHover(id)}
                >
                  <div className={css.rName}>
                    <div className={css.rBtns}>
                      <button
                        type="button"
                        data-testid="pin-toggle"
                        className={`ui-sq ${css.pin}`}
                        aria-pressed={isPinned}
                        aria-disabled={!isPinned && pinFull ? true : undefined}
                        aria-label={`${isPinned ? "Remove" : "Add"} ${row.inv.acronym} ${isPinned ? "from" : "to"} compare`}
                        title={!isPinned && pinFull ? "Compare holds 3: remove one first" : isPinned ? "Remove from compare" : "Add to compare"}
                        onClick={() => { if (isPinned || !pinFull) togglePin(id); }}
                      >
                        {isPinned ? <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg> : <IconPlus size={14} />}
                      </button>
                      <button type="button" className={`ui-sq ${css.target}`} aria-pressed={selectedId === id} aria-label={`Show ${row.inv.acronym} footprint in the field`} title="Show footprint" onClick={() => onSelect(id)}>
                        <IconTarget size={14} />
                      </button>
                    </div>
                    <div className={css.rText}>
                      <Link href={`/investigations/${id}`} className={css.rAcr}>{row.inv.acronym}</Link>
                      <span className={css.rMeta}>
                        <span className={css.tier} data-tier={row.inv.tier}>{tierShort(row.inv)}</span>
                        <span className="num">{id}</span>
                      </span>
                      <span className={css.chip} data-status={row.status}>{row.chip}</span>
                      {row.otherRegimes.length > 0 && row.status !== "otherg" && (
                        <span className={css.otherG}>+{row.otherRegimes.map((o) => `${o.n} ${GRAVITY_SHORT[o.g]}`).join(", ")} in other regimes, not drawn</span>
                      )}
                      <span className="sr-only">{rowSummary(row)}</span>
                    </div>
                  </div>
                  {allMissing(row)
                    ? <div className={css.axisCell} data-axis="all" aria-hidden="true"><div className={css.hatch}><span>{row.axes.o2.reason ?? "not recorded"}</span></div></div>
                    : AXIS_KEYS.map((axis) => <AxisCell key={axis} row={row} axis={axis} s={s} />)}
                  <div className={css.rD}>
                    {row.nearest ? (
                      <button type="button" className={css.dBtn} onClick={() => openRun(row.nearest!.run)} aria-label={`D_min ${fmt(row.Dmin, 2)}, Evidence: ${v}. Open provenance of nearest run ${row.nearest.run.id}`}>
                        <span className={`num ${css.dVal}`}>{fmt(row.Dmin, 2)}</span>
                        <span className={css.dClass}>{v}</span>
                      </button>
                    ) : (
                      <span className={css.none}>{row.status === "planned" ? "never counted" : "none"}<span className="sr-only"> comparable</span></span>
                    )}
                    {row.nearest?.d.partialMatch && (
                      <span className={css.partial}>
                        partial{row.nearestComplete
                          ? <> · all axes <button type="button" className="ui-link-btn num" onClick={() => openRun(row.nearestComplete!.run)} aria-label={`On all three axes: D ${fmt(row.nearestComplete.d.D, 2)}, Evidence: ${classify(row.nearestComplete.d.D)}. Open provenance of ${row.nearestComplete.run.id}`}>{fmt(row.nearestComplete.d.D, 2)}</button></>
                          : <> · all axes: none</>}
                      </span>
                    )}
                  </div>
                  <div className={css.rR}>
                    {row.rank ? (
                      <button type="button" className={css.rBtn} aria-expanded={rOpen} aria-controls={`inv-rb-${id}`} onClick={() => setOpenR(rOpen ? null : id)}
                        aria-label={`Rank R ${fmt(row.rank.R, 1)}${row.rank.noComparable ? ", ranked on metadata only" : ""}. ${rOpen ? "Hide" : "Show"} components`}>
                        <span className={`num ${css.rVal}`}>{fmt(row.rank.R, 1)}</span>
                        <span className={css.rBar} aria-hidden="true">
                          {COMPONENTS.map((k) => <span key={k} className={css.rseg} data-c={k} style={{ width: `${r2(Math.max(0, row.rank!.contributions[k] * 100))}%` }} />)}
                        </span>
                      </button>
                    ) : <span className={css.none}>not ranked</span>}
                    <span className={css.rRuns}>
                      {row.runs.length > 0 ? <><span className="num">{row.comparable}/{row.runs.length}</span> comparable</>
                        : row.inv.summaryRowCount > 0 ? <><span className="num">{row.inv.summaryRowCount}</span> summary rows</> : "no runs"}
                    </span>
                  </div>
                  {row.rank && rOpen && (
                    <div className={css.rBreak} id={`inv-rb-${id}`}>
                      <table className={css.breakTable}>
                        <caption className={css.breakCap}>R = 100 × Σ weight × component = <b className="num">{fmt(row.rank.R, 1)}</b> <ClaimBadge kind="COMPUTED" />{row.rank.noComparable && <> · no comparable runs: ranked on metadata only (P = 0, C = 0)</>}</caption>
                        <thead><tr><th scope="col">Component</th><th scope="col" className="is-num">Value</th><th scope="col" className="is-num">Weight</th><th scope="col" className="is-num">Points</th></tr></thead>
                        <tbody>
                          {COMPONENTS.map((k) => (
                            <tr key={k}>
                              <th scope="row"><i className={css.rseg} data-c={k} aria-hidden="true" /> {k} · {COMP_NAME[k]}<span className={css.breakDef}>{COMP_DEF[k]}</span></th>
                              <td className="num is-num">{fmt(row.rank!.components[k], 2)}</td>
                              <td className="num is-num">{fmt(weights[k] / wsum, 2)}</td>
                              <td className="num is-num">{fmt(row.rank!.contributions[k] * 100, 1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}

      <details className={css.legend}>
        <summary>How to read the strips</summary>
        <ul className={css.legendList}>
          <li><i className={css.lgTick} data-level="solid" /> comparable run, within NEAR (D ≤ {VERDICT_THRESHOLDS.near}) on the <em>other</em> compared axes</li>
          <li><i className={css.lgTick} data-level="ghost" /> comparable, but farther than NEAR on the other axes</li>
          <li><i className={css.lgTick} data-level="faint" /> not comparable for this question</li>
          <li><i className={css.lgTick} data-level="solid" data-nominal /> nominal (stated) value</li>
          <li><i className={css.ring} data-kind="published" data-level="solid" /> published (not in PSI)</li>
          <li><i className={css.ring} data-kind="limit" data-level="solid" /> reported limit: a threshold, not a test</li>
          <li><i className={css.ring} data-kind="planned" /> planned: not evidence</li>
          <li><i className={css.lgHatch} /> not recorded</li>
          <li><i className={css.lgRule} /> your scenario</li>
        </ul>
        <p className={css.legendNote}>
          Strips are marginal: a run close on O₂ can be far on pressure or flow, so a tick is drawn solid only when that run is also within NEAR on the other axes it is compared on.
          Only runs in the scenario&rsquo;s gravity regime are drawn. Inverse-flame O₂ (fed through the burner) is noted under the O₂ strip, not placed on it.
          R components: {COMPONENTS.map((k) => `${k} ${COMP_NAME[k].toLowerCase()}`).join(", ")}.
        </p>
      </details>
    </section>
  );
}
