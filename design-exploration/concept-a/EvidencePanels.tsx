"use client";
import { useMemo } from "react";
import type { Gravity, Hazard, Run } from "@/lib/schema";
import { RANK_WEIGHTS, type RankRow, type RankWeights } from "@/lib/engine";
import { ALL_RUNS, COUNTS, runsByInv, invById } from "../shared/data";
import { INSIGHTS, OLSON_FERKUL_2012, type GLevel } from "../shared/content";
import { GRAVITY_LABEL, GRAVITY_SHORT, fmt } from "../shared/format";
import { RANK_COLOR, RANK_COMPONENTS, RANK_LABEL, shapePath, type Shape } from "./marks";
import { r2 } from "./units";
import s from "./console.module.css";

/* ------------------------------------------------------------------ Partial gravity */
const G_ORDER: GLevel[] = ["micro", "moon", "mars", "earth"];
const G_SHAPE: Record<GLevel, Shape> = { micro: "circle", moon: "diamond", mars: "square", earth: "triangle" };
const runById = new Map(ALL_RUNS.map((r) => [r.id, r]));

export function PartialGravity({ gravity, includePublished, onInspect }: { gravity: Gravity; includePublished: boolean; onInspect: (r: Run) => void }) {
  const rows = OLSON_FERKUL_2012.rows;
  const [lo, hi] = useMemo(() => {
    const all = rows.flatMap((r) => G_ORDER.map((g) => r.uloi[g]));
    return [Math.floor(Math.min(...all) - 1), Math.ceil(Math.max(...all) + 1)];
  }, [rows]);
  const W = 340, rowH = 30, padL = 92, padR = 12, top = 6;
  const H = top + rows.length * rowH + 26;
  const x = (v: number) => r2(padL + ((v - lo) / (hi - lo)) * (W - padL - padR));
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / 2) * 2; t <= hi; t += 2) ticks.push(t);
  const fm2 = runsByInv("PLAN-FM2");
  const fm2Inv = invById.get("PLAN-FM2");
  const mylar = rows.find((r) => r.material.startsWith("Mylar"));
  const luci = runsByInv("PUB-LUCI");

  return (
    <section className={s.panel} aria-labelledby="a-pg-h" data-slide>
      <header className={s.panelHead}>
        <h2 id="a-pg-h" className={s.panelTitle}>Partial-gravity evidence</h2>
        <span className={s.panelMeta}>{GRAVITY_LABEL[gravity]}</span>
      </header>
      <p className={s.pgLead}>
        PSI contains <span className={s.mono}>{COUNTS.partialGravityRuns}</span> partial-gravity combustion tests. All PSI runs are microgravity, so the µg layer is shown dimmed and is not compared.
      </p>
      <div className={s.pgPlotHead}>
        <span className={s.micro}>limiting O₂ (ULOI*; 1 g: ULOI) · % by volume</span>
        <span className={s.measured}>reported limit</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={s.pgSvg} role="img"
        aria-label={`Dot plot of reported limiting oxygen by gravity level for ${rows.length} materials from ${OLSON_FERKUL_2012.source.ref}. Points only; gravity levels are not connected.`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top} y2={top + rows.length * rowH} className={s.gridLine} />
            <text x={x(t)} y={top + rows.length * rowH + 14} className={s.tick} textAnchor="middle">{t}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cy = top + i * rowH + rowH / 2;
          return (
            <g key={r.material}>
              <text x={0} y={cy - 2} className={s.pgMat}>{r.material}</text>
              <text x={0} y={cy + 9} className={s.pgMatSub}>{r.thickness} · {r.pressurePsia} psia</text>
              {G_ORDER.map((g) => {
                const id = `PUB-OF2012:${r.material}:${g}`;
                const run = runById.get(id);
                const active = g === gravity;
                return (
                  <path
                    key={g}
                    d={shapePath(G_SHAPE[g], x(r.uloi[g]), cy, active ? 5 : 4)}
                    className={active ? s.pgPtActive : s.pgPt}
                    onClick={() => run && onInspect(run)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${r.material}, ${GRAVITY_SHORT[g]}: ${r.uloi[g]} % O₂. Open provenance.`}
                    onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && run) { e.preventDefault(); onInspect(run); } }}
                  >
                    <title>{`${r.material} · ${GRAVITY_SHORT[g]} · ${g === "earth" ? "ULOI" : "ULOI*"} ${r.uloi[g]} % O₂`}</title>
                  </path>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className={s.pgKey}>
        {G_ORDER.map((g) => (
          <span key={g} data-active={g === gravity || undefined}>
            <svg width={12} height={12} aria-hidden><path d={shapePath(G_SHAPE[g], 6, 6, 3.6)} /></svg>{GRAVITY_SHORT[g]}
          </span>
        ))}
        <span className={s.pgKeyNote}>No distance is computed across gravity regimes.</span>
      </div>
      {mylar && (
        <p className={s.approved}>
          For Mylar at {mylar.pressurePsia} psia, NASA drop-tower tests found a lower flammability limit at lunar gravity than at either 0 g or 1 g. Microgravity and Earth results did not bound lunar behaviour for this material.
        </p>
      )}
      <ul className={s.caveats}>
        {OLSON_FERKUL_2012.caveats.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <p className={s.srcLine}>
        Source: <a href={OLSON_FERKUL_2012.source.url} target="_blank" rel="noreferrer">{OLSON_FERKUL_2012.source.ref}, {OLSON_FERKUL_2012.source.page}</a> · transcribed, awaiting human verification
      </p>
      <div className={s.pgFoot}>
        <div className={s.pgFootRow}>
          <svg width={14} height={14} aria-hidden><circle cx={7} cy={7} r={5} fill="none" stroke="var(--a-ink)" strokeDasharray="2.5 2" /></svg>
          <span><b>{fm2Inv?.acronym ?? "FM2"}</b> · planned — first lunar-surface test · <span className={s.mono}>{fm2.length}</span> planned conditions, never counted</span>
        </div>
        {luci.length > 0 && (
          <div className={s.pgFootRow}>
            <svg width={14} height={14} aria-hidden><circle cx={7} cy={7} r={5} fill="none" stroke="var(--a-ink)" strokeWidth={1.4} /></svg>
            <span><b>LUCI</b> · {luci.length} preliminary lunar-g burns, single flight · {includePublished ? "shown on map" : "enable published evidence to show"}</span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Ranking */
export function Ranking({ ranking, weights, setWeights, hazardLabel }: { ranking: RankRow[]; weights: RankWeights; setWeights: (w: RankWeights) => void; hazardLabel: string }) {
  const top = ranking.slice(0, 8);
  const wsum = RANK_COMPONENTS.reduce((a, k) => a + weights[k], 0) || 1;
  const isDefault = RANK_COMPONENTS.every((k) => weights[k] === RANK_WEIGHTS[k]);
  return (
    <section className={s.panel} aria-labelledby="a-rank-h">
      <header className={s.panelHead}>
        <h2 id="a-rank-h" className={s.panelTitle}>Ranked investigations</h2>
        <span className={s.panelMeta}>{hazardLabel} · R computed</span>
      </header>
      <ol className={s.rankList}>
        {top.map((row, i) => (
          <li key={row.investigation.id} className={s.rankRow} data-none={row.noComparable || undefined}>
            <span className={s.rankN}>{i + 1}</span>
            <div className={s.rankMain}>
              <div className={s.rankTop}>
                <span className={s.rankName} title={row.investigation.title}>{row.investigation.acronym}</span>
                <span className={s.rankTier} data-tier={row.investigation.tier}>{row.investigation.tier === "T3_PUBLISHED" ? "published" : row.investigation.tier === "T4_PLANNED" ? "planned" : "PSI"}</span>
                <span className={s.rankR}><span className={s.mono}>{fmt(row.R, 1)}</span></span>
              </div>
              <div className={s.stack} role="img" aria-label={`R ${fmt(row.R, 1)}: ${RANK_COMPONENTS.map((k) => `${RANK_LABEL[k]} ${fmt(row.contributions[k] * 100, 1)}`).join(", ")}`}>
                {RANK_COMPONENTS.map((k) => (
                  <span key={k} style={{ width: `${r2(row.contributions[k] * 100)}%`, background: RANK_COLOR[k] }} title={`${RANK_LABEL[k]}: component ${fmt(row.components[k], 2)} × weight → ${fmt(row.contributions[k] * 100, 1)}`} />
                ))}
              </div>
              <div className={s.rankSub}>
                {row.noComparable ? "no comparable run" : <>D<sub>min</sub> <span className={s.mono}>{fmt(row.Dmin, 2)}</span> · <span className={s.mono}>{row.comparableRuns}</span> comparable · <span className={s.mono}>{row.nearRuns}</span> within NEAR</>}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className={s.rankKey} aria-hidden>
        {RANK_COMPONENTS.map((k) => <span key={k}><i style={{ background: RANK_COLOR[k] }} />{k} {RANK_LABEL[k]}</span>)}
      </div>
      <details className={s.weights}>
        <summary>Weights {isDefault ? "(default)" : "(modified)"}</summary>
        <div className={s.weightsBody}>
          {RANK_COMPONENTS.map((k) => (
            <label key={k} className={s.weightRow}>
              <span className={s.weightName}><i style={{ background: RANK_COLOR[k] }} />{k} · {RANK_LABEL[k]}</span>
              <input type="range" min={0} max={1} step={0.05} value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} />
              <span className={s.mono}>{fmt(weights[k] / wsum, 2)}</span>
            </label>
          ))}
          <div className={s.weightFoot}>
            <span>Normalised to sum 1. R = 100 × Σ wᵢ·componentᵢ.</span>
            <button type="button" className={s.ghostBtn} onClick={() => setWeights({ ...RANK_WEIGHTS })} disabled={isDefault}>Reset</button>
          </div>
        </div>
      </details>
    </section>
  );
}

/* ------------------------------------------------------------------ Insights */
export function Insights({ hazard }: { hazard: Hazard }) {
  const list = INSIGHTS.filter((i) => i.hazards.includes(hazard));
  return (
    <section className={s.panel} aria-labelledby="a-ins-h">
      <header className={s.panelHead}>
        <h2 id="a-ins-h" className={s.panelTitle}>Insight cards</h2>
        <span className={s.panelMeta}>{list.length} drafts · none verified</span>
      </header>
      <div className={s.cards}>
        {list.map((i) => (
          <article key={i.id} className={s.card}>
            <div className={s.cardTop}>
              <span className={s.draft}>DRAFT — unverified</span>
              <span className={s.validity} data-v={i.validity}>{i.validity}</span>
              <span className={s.phase}>{i.phase}</span>
            </div>
            <p className={s.claim}>{i.claim}</p>
            <p className={s.cardValue}><span className={s.mono}>{i.value}</span></p>
            <dl className={s.cardDl}>
              <dt>Conditions</dt><dd>{i.conditions}</dd>
              <dt>Scope</dt><dd>{i.scope}</dd>
              <dt>Not valid for</dt><dd>{i.notValidFor}</dd>
              <dt>Source</dt><dd><a href={i.source.url} target="_blank" rel="noreferrer">{i.source.ref}</a></dd>
            </dl>
          </article>
        ))}
        {list.length === 0 && <p className={s.empty}>No draft insights for this question.</p>}
      </div>
    </section>
  );
}

