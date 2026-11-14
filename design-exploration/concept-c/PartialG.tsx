"use client";
import { useMemo } from "react";
import type { Gravity, Run } from "@/lib/schema";
import { kPaToPsia } from "@/lib/engine";
import { OLSON_FERKUL_2012, PLANNED, type GLevel } from "../shared/content";
import { ALL_RUNS, COUNTS, invById } from "../shared/data";
import { GRAVITY_LABEL, GRAVITY_SHORT, fmt } from "../shared/format";
import { r2 } from "./derive";
import css from "./casefile.module.css";

const COLS: GLevel[] = ["earth", "mars", "moon", "micro"];
const SHAPES = ["circle", "square", "diamond"] as const;

function Mark({ shape, x, y, r }: { shape: (typeof SHAPES)[number]; x: number; y: number; r: number }) {
  if (shape === "circle") return <circle cx={x} cy={y} r={r} />;
  if (shape === "square") return <rect x={x - r * 0.9} y={y - r * 0.9} width={r * 1.8} height={r * 1.8} />;
  return <polygon points={`${x},${y - r * 1.2} ${x + r * 1.2},${y} ${x},${y + r * 1.2} ${x - r * 1.2},${y}`} />;
}

export function PartialG({ gravity, includePublished, openRun }: { gravity: Gravity; includePublished: boolean; openRun: (r: Run) => void }) {
  const rows = OLSON_FERKUL_2012.rows;
  const { lo, hi } = useMemo(() => {
    const all = rows.flatMap((r) => COLS.map((g) => r.uloi[g]));
    return { lo: Math.floor(Math.min(...all)) - 1, hi: Math.ceil(Math.max(...all)) + 1 };
  }, [rows]);
  const W = 560, H = 220, L = 44, R = 12, T = 14, B = 30;
  const colW = (W - L - R) / COLS.length;
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const yTicks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((v) => v % 2 === 0);
  const mylar = rows.find((r) => /mylar/i.test(r.material)) ?? rows[0];
  const fm2 = PLANNED;
  const fm2Inv = invById.get("PLAN-FM2");
  const runFor = (material: string, g: GLevel) => ALL_RUNS.find((r) => r.id === `PUB-OF2012:${material}:${g}`);

  const summary = rows.map((r) => `${r.material}: ${COLS.map((g) => `${GRAVITY_SHORT[g]} ${r.uloi[g]}%`).join(", ")}`).join("; ");

  return (
    <section className={css.pgSheet} aria-labelledby="cf-pg-h">
      <div className={css.sheetHead}>
        <div className={css.sheetLabel} id="cf-pg-h"><span>§2a</span> Partial gravity · {GRAVITY_LABEL[gravity]}</div>
        <span className={css.regimeNote}>different regime — PSI rows below are context only</span>
      </div>
      <div className={css.pgGrid}>
        <div>
          <p className={css.pgFact}>
            <b className={css.mono}>{COUNTS.partialGravityRuns}</b> partial-gravity combustion runs in PSI. Every PSI run in this snapshot was tested in microgravity.
            No distance is computed across gravity regimes, so the PSI rows carry no evidence for this scenario.
          </p>
          <figure className={css.pgFig}>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Dot plot of upward limiting oxygen index (ULOI*) by gravity level, Olson and Ferkul 2012 Table I. Points only, no connecting lines. ${summary}`}>
              {yTicks.map((v) => (
                <g key={v}>
                  <line x1={L - 3} x2={L} y1={r2(y(v))} y2={r2(y(v))} className={css.pgGrid2} />
                  <text x={L - 6} y={r2(y(v) + 3)} textAnchor="end" className={css.pgAxisTxt}>{v}</text>
                </g>
              ))}
              <text x={10} y={T + (H - T - B) / 2} transform={`rotate(-90 10 ${T + (H - T - B) / 2})`} textAnchor="middle" className={css.pgAxisTxt}>limiting O₂ (ULOI*; 1 g: ULOI) · %</text>
              {COLS.map((g, ci) => {
                const x0 = L + ci * colW;
                const sel = g === gravity;
                return (
                  <g key={g}>
                    {ci > 0 && <line x1={x0} x2={x0} y1={T} y2={H - B} className={css.pgSep} />}
                    {sel && <rect x={x0 + 2} y={T} width={colW - 4} height={H - T - B} className={css.pgSel} />}
                    <text x={x0 + colW / 2} y={H - B + 16} textAnchor="middle" className={sel ? css.pgColSel : css.pgAxisTxt}>{GRAVITY_SHORT[g]}</text>
                    {rows.map((r, ri) => {
                      const cx = x0 + colW / 2 + (ri - 1) * 32;
                      const run = runFor(r.material, g);
                      return (
                        <g
                          key={r.material}
                          className={css.pgPt}
                          role="button"
                          tabIndex={0}
                          aria-label={`${r.material}, ${GRAVITY_LABEL[g]}: ULOI ${r.uloi[g]}% O₂ — open provenance`}
                          onClick={() => run && openRun(run)}
                          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && run) { e.preventDefault(); openRun(run); } }}
                        >
                          <title>{`${r.material} · ${GRAVITY_LABEL[g]} · ULOI ${r.uloi[g]} % O₂`}</title>
                          <Mark shape={SHAPES[ri % 3]} x={r2(cx)} y={r2(y(r.uloi[g]))} r={4.2} />
                          <text x={r2(cx + 7)} y={r2(y(r.uloi[g]) + 3)} className={css.pgVal}>{fmt(r.uloi[g], 1)}</text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
            <figcaption>
              <span className={css.pgLegend}>
                {rows.map((r, ri) => (
                  <span key={r.material}>
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className={css.pgLegendMark}><Mark shape={SHAPES[ri % 3]} x={6} y={6} r={3.6} /></svg>
                    {r.material} <em>{r.thickness} · {r.pressurePsia} psia</em>
                  </span>
                ))}
                <span className={css.tierPub}>○ published, not in PSI{includePublished ? " · counted" : " · not counted until the published toggle is on"}</span>
              </span>
              <p className={css.pgCaption}>
                For {mylar.material.replace(/\s+G$/, "")} at {mylar.pressurePsia} psia, NASA drop-tower tests found a lower flammability limit at lunar gravity than at either 0 g or 1 g.
                Microgravity and Earth results did not bound lunar behaviour for this material.
              </p>
              <p className={css.pgSource}>
                <span className={css.badge} data-t="REPORTED LIMIT">REPORTED LIMIT</span>{" "}
                <a href={OLSON_FERKUL_2012.source.url} target="_blank" rel="noreferrer">{OLSON_FERKUL_2012.source.ref}, {OLSON_FERKUL_2012.source.page}</a> · doi {OLSON_FERKUL_2012.source.doi}
              </p>
            </figcaption>
          </figure>
        </div>
        <div className={css.pgSide}>
          <h4 className={css.miniH}>Caveats</h4>
          <ul className={css.caveats}>
            {OLSON_FERKUL_2012.caveats.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <h4 className={css.miniH}>Planned</h4>
          <div className={css.fm2}>
            <span className={css.ringPlannedInline} aria-hidden />
            <div>
              <b>{fm2Inv?.acronym ?? "FM2"}</b> — planned — first lunar-surface test. <em>Planned — not evidence; never counted.</em>
              <ul className={css.fm2List}>
                {fm2.map((r) => (
                  <li key={r.id}>
                    <button type="button" className={css.linkBtn} onClick={() => openRun(r)}>
                      <span className={css.mono}>{fmt(r.o2Pct, 0)}% · {r.pressureKPa != null ? fmt(kPaToPsia(r.pressureKPa), 1) : "—"} psia</span>
                    </button>{" "}
                    <span className={css.dimTxt}>{r.material}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
