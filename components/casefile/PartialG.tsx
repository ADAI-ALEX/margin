"use client";
import { useMemo } from "react";
import type { Gravity, Run } from "@/lib/schema";
import { kPaToPsia } from "@/lib/engine";
import { OLSON_FERKUL_2012, PLANNED, type GLevel } from "@/content/curated";
import { ALL_RUNS, COUNTS, invById } from "@/lib/data";
import { GRAVITY_LABEL, GRAVITY_SHORT, fmt } from "@/lib/format";
import { r2 } from "./derive";
import { ChartFrame, ClaimBadge } from "@/components/ui/misc";
import { VerifyBadge } from "./ui";
import css from "./casefile.module.css";

const COLS: GLevel[] = ["earth", "mars", "moon", "micro"];
const SHAPES = ["circle", "square", "diamond"] as const;

/** Points only — no element ever connects one gravity level to another. */
function Mark({ shape, x, y, r }: { shape: (typeof SHAPES)[number]; x: number; y: number; r: number }) {
  if (shape === "circle") return <circle cx={x} cy={y} r={r} />;
  if (shape === "square") return <rect x={r2(x - r * 0.9)} y={r2(y - r * 0.9)} width={r2(r * 1.8)} height={r2(r * 1.8)} />;
  return <polygon points={`${x},${r2(y - r * 1.2)} ${r2(x + r * 1.2)},${y} ${x},${r2(y + r * 1.2)} ${r2(x - r * 1.2)},${y}`} />;
}

export function PartialG({ gravity, includePublished, openRun }: { gravity: Gravity; includePublished: boolean; openRun: (r: Run) => void }) {
  const rows = OLSON_FERKUL_2012.rows;
  const { lo, hi } = useMemo(() => {
    const all = rows.flatMap((r) => COLS.map((g) => r.uloi[g]));
    return { lo: Math.floor(Math.min(...all)) - 1, hi: Math.ceil(Math.max(...all)) + 1 };
  }, [rows]);
  const W = 560, H = 240, L = 44, R = 8, T = 18, B = 34;
  const colW = (W - L - R) / COLS.length;
  const y = (v: number) => r2(T + (1 - (v - lo) / (hi - lo)) * (H - T - B));
  const yTicks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((v) => v % 2 === 0);
  const ofRuns = ALL_RUNS.filter((r) => r.investigation === "PUB-OLSON-FERKUL-2012");
  const runFor = (material: string, g: GLevel) => ofRuns.find((r) => r.id === `PUB-OF2012:${material}:${g}`);
  const luci = ALL_RUNS.filter((r) => r.investigation === "PUB-LUCI");
  const fm2Inv = invById.get("PLAN-FM2");
  const summary = rows.map((r) => `${r.material}: ${COLS.map((g) => `${GRAVITY_SHORT[g]} ${r.uloi[g]}%`).join(", ")}`).join("; ");

  return (
    <section className={css.pg} aria-labelledby="inv-pg-h">
      <div className={css.secHead}>
        <div className={css.secHeadText}>
          <h2 className={css.h2} id="inv-pg-h">Partial gravity · {GRAVITY_LABEL[gravity]}</h2>
          <p className={css.secSub}>
            <b className={css.pgBanner}>{COUNTS.partialGravityRuns === 0 ? "PSI contains no partial-gravity combustion tests." : <>PSI holds <span className="num">{COUNTS.partialGravityRuns}</span> partial-gravity combustion runs.</>}</b>{" "}
            Each gravity level is a separate regime: no distance is computed between them and we do not interpolate between gravity levels. The only reduced-gravity values on record here are published drop-tower limits, shown as separate points.
          </p>
        </div>
      </div>
      <div className={css.pgGrid}>
        <ChartFrame
          className={css.pgFig}
          title="Limiting O₂ by gravity level"
          definition={<>Upward-limiting O₂ (ULOI*) for three thin materials, one column per gravity level. Points only: nothing connects one gravity level to another.</>}
          source={<>
            <ClaimBadge kind="REPORTED LIMIT" /> {ofRuns[0] && <VerifyBadge run={ofRuns[0]} compact />}{" "}
            Source: <a href={OLSON_FERKUL_2012.source.url} target="_blank" rel="noreferrer">{OLSON_FERKUL_2012.source.ref}, {OLSON_FERKUL_2012.source.page}<span className="sr-only"> (opens in a new tab)</span></a> · doi {OLSON_FERKUL_2012.source.doi}.
            {" "}{includePublished ? "Counted as published evidence (toggle on)." : "Not counted until “Include published evidence” is on."} Reported limits, not tested conditions; not a hazard map.
          </>}
        >
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Limiting O₂ (ULOI*) by gravity level, Olson and Ferkul 2012 Table I, shown as separate points with no connecting lines. ${summary}`} className={css.pgSvg}>
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={L - 4} x2={L} y1={y(v)} y2={y(v)} className={css.pgTickLine} />
                <text x={L - 7} y={y(v) + 3} textAnchor="end" className={css.pgTickText}>{v}</text>
              </g>
            ))}
            <text x={10} y={T + (H - T - B) / 2} transform={`rotate(-90 10 ${T + (H - T - B) / 2})`} textAnchor="middle" className={css.pgAxisTitle}>ULOI* · % O₂</text>
            {COLS.map((g, ci) => {
              const x0 = L + ci * colW;
              const sel = g === gravity;
              return (
                <g key={g}>
                  <rect x={x0 + 2} y={T} width={colW - 4} height={H - T - B} className={sel ? css.pgColSelBg : css.pgColBg} />
                  <text x={x0 + colW / 2} y={H - B + 17} textAnchor="middle" className={sel ? css.pgColSel : css.pgColLabel}>{GRAVITY_SHORT[g]}{sel ? " · selected" : ""}</text>
                  {rows.map((r, ri) => {
                    const cx = r2(x0 + colW / 2 + (ri - 1) * Math.min(38, colW / 3.6));
                    return (
                      <g key={r.material} className={css.pgPt} data-sel={sel || undefined}>
                        <Mark shape={SHAPES[ri % 3]} x={cx} y={y(r.uloi[g])} r={4.2} />
                        <text x={cx} y={y(r.uloi[g]) - 9} textAnchor="middle" className={css.pgVal}>{fmt(r.uloi[g], 1)}</text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
          <ul className={css.pgLegend}>
            {rows.map((r, ri) => (
              <li key={r.material}>
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={css.pgLegendMark}><Mark shape={SHAPES[ri % 3]} x={6} y={6} r={3.6} /></svg>
                {r.material} <span className={css.quiet}>{r.thickness} · {r.pressurePsia} psia</span>
              </li>
            ))}
          </ul>
        </ChartFrame>
        <div className={css.pgSide}>
          <div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Limiting O₂ values by gravity level">
            <table className="ui-table">
              <caption className={css.capLeft}>Values (% O₂). Open a value for its provenance.</caption>
              <thead><tr><th scope="col">Material</th>{COLS.map((g) => <th key={g} scope="col" className="is-num">{GRAVITY_SHORT[g]}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.material}>
                    <th scope="row">{r.material}</th>
                    {COLS.map((g) => {
                      const run = runFor(r.material, g);
                      return (
                        <td key={g} className="num is-num" data-sel={g === gravity || undefined}>
                          {run ? <button type="button" className="ui-link-btn num" onClick={() => openRun(run)} aria-label={`${r.material}, ${GRAVITY_LABEL[g]}: limiting O₂ ${r.uloi[g]}%. Open provenance`}>{fmt(r.uloi[g], 1)}</button> : fmt(r.uloi[g], 1)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className={css.h3}>Caveats</h3>
          <ul className={css.caveats}>
            {OLSON_FERKUL_2012.caveats.map((c) => <li key={c}>{c}</li>)}
            {luci.map((r) => r.note && <li key={r.id}>LUCI ({r.material}): {r.note}</li>)}
          </ul>
          <h3 className={css.h3}>Planned · not evidence</h3>
          <p className={css.pgP}><ClaimBadge kind="PLANNED" /> <b>{fm2Inv?.acronym ?? "FM2"}</b>: {fm2Inv?.title ?? "planned lunar-surface test"}. Never counted.</p>
          <ul className={css.caveats}>
            {PLANNED.map((r) => (
              <li key={r.id}>
                <button type="button" className="ui-link-btn" onClick={() => openRun(r)}>
                  <span className="num">{fmt(r.o2Pct, 0)}% O₂ · {r.pressureKPa != null ? `${fmt(kPaToPsia(r.pressureKPa), 1)} psia` : "pressure not stated"}</span>
                </button>{" "}
                <span className={css.quiet}>{r.material}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
