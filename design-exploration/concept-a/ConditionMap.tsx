"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear, scaleLog } from "d3-scale";
import type { Run, Scenario } from "@/lib/schema";
import { gate, kPaToPsia, psiaToKPa, SCALES, VERDICT_THRESHOLDS, type Evaluation, type Scored } from "@/lib/engine";
import { ALL_RUNS, COUNTS, invById } from "../shared/data";
import { ATMOSPHERES, PRESETS } from "../shared/content";
import { fmt, GRAVITY_LABEL, GRAVITY_SHORT, FUEL_LABEL, TIER_LABEL, basisLabel } from "../shared/format";
import { FAMILIES, FAMILY_COLOR, FAMILY_LABEL, FAMILY_SHAPE, familyOf, markerRadius, shapePath, type Family } from "./marks";
import type { PUnit } from "./units";
import { fmtP, unitLabel, r2 } from "./units";
import s from "./console.module.css";

const O2_DOMAIN: [number, number] = [10, 45];
const P_DOMAIN_KPA: [number, number] = [20, 520];
const TICKS_O2 = [10, 15, 20, 25, 30, 35, 40, 45];
const TICKS_KPA = [20, 30, 40, 50, 70, 100, 150, 200, 300, 500];
const TICKS_PSIA = [3, 4, 5, 7, 10, 15, 20, 30, 50, 70];
const M = { top: 18, right: 54, bottom: 40, left: 52 };

type Bucket = "comparable" | "limit" | "context" | "muted" | "regime";
interface Pt { run: Run; x: number; y: number; bucket: Bucket; family: Family }

interface Props {
  scenario: Scenario;
  evaluation: Evaluation;
  unit: PUnit;
  onInspect: (run: Run) => void;
  onPreset: (id: string) => void;
}

export default function ConditionMap({ scenario, evaluation, unit, onInspect, onPreset }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<Pt | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = Math.round(Math.max(300, Math.min(560, width * 0.6)));
  const iw = width - M.left - M.right;
  const ih = height - M.top - M.bottom;

  // Scales return 2-decimal values so server and client markup are identical (no hydration drift).
  const sx = useMemo(() => { const f = scaleLinear().domain(O2_DOMAIN).range([0, iw]); return (v: number) => r2(f(v)); }, [iw]);
  const sy = useMemo(() => { const f = scaleLog().domain(P_DOMAIN_KPA).range([ih, 0]); return (v: number) => r2(f(v)); }, [ih]);

  const scoredById = useMemo(() => {
    const m = new Map<string, Scored>();
    for (const sc of evaluation.comparable) m.set(sc.run.id, sc);
    return m;
  }, [evaluation]);

  // Runs eligible to be drawn: placeable (O2 + P recorded). T3 only when published is on.
  const { pts, offRight } = useMemo(() => {
    const out: Pt[] = [];
    const off: Run[] = [];
    for (const run of ALL_RUNS) {
      if (run.o2Pct == null || run.pressureKPa == null) continue;
      if (run.tier === "T3_PUBLISHED" && !scenario.includePublished) continue;
      if (run.tier === "T4_PLANNED" && run.gravity !== scenario.gravity) continue;
      const g = gate(run, scenario);
      let bucket: Bucket;
      if (run.gravity !== scenario.gravity) bucket = "regime";
      else if (g.status === "comparable") bucket = "comparable";
      else if (g.status === "limit") bucket = "limit";
      else if (g.status === "context") bucket = "context";
      else bucket = "muted";
      if (run.o2Pct > O2_DOMAIN[1]) { if (bucket !== "regime") off.push(run); continue; }
      if (run.o2Pct < O2_DOMAIN[0] || run.pressureKPa < P_DOMAIN_KPA[0] || run.pressureKPa > P_DOMAIN_KPA[1]) continue;
      out.push({ run, x: sx(run.o2Pct), y: sy(run.pressureKPa), bucket, family: familyOf(run) });
    }
    return { pts: out, offRight: off };
  }, [scenario, sx, sy]);

  // Batch markers into one path per (bucket, family, tier) for performance.
  const layers = useMemo(() => {
    const groups = new Map<string, { bucket: Bucket; family: Family; tier: Run["tier"]; d: string[] }>();
    for (const p of pts) {
      const k = `${p.bucket}|${p.family}|${p.run.tier}`;
      const g = groups.get(k) ?? { bucket: p.bucket, family: p.family, tier: p.run.tier, d: [] };
      g.d.push(shapePath(FAMILY_SHAPE[p.family], p.x, p.y, markerRadius(p.run.tier)));
      groups.set(k, g);
    }
    const order: Bucket[] = ["regime", "muted", "context", "limit", "comparable"];
    return [...groups.values()].sort((a, b) => order.indexOf(a.bucket) - order.indexOf(b.bucket) || (a.tier === "T1_PSI_RUN" ? -1 : 1));
  }, [pts]);

  const offStats = useMemo(() => {
    const max = offRight.reduce((m, r) => Math.max(m, r.o2Pct ?? 0), 0);
    const fams = new Set(offRight.map((r) => FAMILY_LABEL[familyOf(r)].toLowerCase()));
    return { n: offRight.length, max, fams: [...fams].join(", ") };
  }, [offRight]);

  // Reference atmospheres (deduplicated by position).
  const refs = useMemo(() => {
    const m = new Map<string, { ids: string[]; labels: string[]; o2: number; p: number }>();
    for (const a of PRESETS) {
      const k = `${a.o2Pct}|${a.pressureKPa}`;
      const e = m.get(k) ?? { ids: [], labels: [], o2: a.o2Pct, p: a.pressureKPa };
      e.ids.push(a.id); e.labels.push(a.short);
      m.set(k, e);
    }
    return [...m.values()];
  }, []);
  const suit = ATMOSPHERES.find((a) => a.offChart);

  // Scenario crosshair (clamped to the plotted domain).
  const cx = sx(Math.min(O2_DOMAIN[1], Math.max(O2_DOMAIN[0], scenario.o2Pct)));
  const cy = sy(Math.min(P_DOMAIN_KPA[1], Math.max(P_DOMAIN_KPA[0], scenario.pressureKPa)));
  const scenarioOff = scenario.o2Pct > O2_DOMAIN[1] || scenario.o2Pct < O2_DOMAIN[0] || scenario.pressureKPa > P_DOMAIN_KPA[1] || scenario.pressureKPa < P_DOMAIN_KPA[0];

  // Iso-distance loci D = k in (linear O2, log P) with flow gap = 0: exact ellipses.
  // Half-width k·SCALES.o2Pts in O2; pressure factor SCALES.pressureRatio^k. Translation-invariant
  // on these axes, so it is computed once relative to the crosshair and glides with it.
  const ellipse = (k: number) => {
    const pts2: string[] = [];
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * 2 * Math.PI;
      const o2 = scenario.o2Pct + k * SCALES.o2Pts * Math.cos(t);
      const p = scenario.pressureKPa * Math.pow(SCALES.pressureRatio, k * Math.sin(t));
      pts2.push(`${i ? "L" : "M"}${(sx(o2) - sx(scenario.o2Pct)).toFixed(1)} ${(sy(p) - sy(scenario.pressureKPa)).toFixed(1)}`);
    }
    return pts2.join("") + "Z";
  };
  const kNear = VERDICT_THRESHOLDS.near, kDirect = VERDICT_THRESHOLDS.direct;
  const outerTop = r2(sy(scenario.pressureKPa * Math.pow(SCALES.pressureRatio, kNear)) - sy(scenario.pressureKPa));
  const outerBottom = r2(sy(scenario.pressureKPa / Math.pow(SCALES.pressureRatio, kNear)) - sy(scenario.pressureKPa));
  const innerTop = r2(sy(scenario.pressureKPa * Math.pow(SCALES.pressureRatio, kDirect)) - sy(scenario.pressureKPa));
  const labelBelow = cy + outerTop < 34;
  const labelAnchor = cx < iw * 0.36 ? "start" : cx > iw * 0.64 ? "end" : "middle";

  const nearest = evaluation.nearest;
  const nearestPt = nearest ? pts.find((p) => p.run.id === nearest.run.id) : undefined;

  const pTicks = unit === "kPa" ? TICKS_KPA : TICKS_PSIA.map((v) => psiaToKPa(v));
  const maxSolid = COUNTS.maxSolidO2;

  function handleMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const k = rect.width > 0 ? iw / rect.width : 1; // viewBox units per CSS px
    const mx = (e.clientX - rect.left) * k, my = (e.clientY - rect.top) * k;
    let best: Pt | null = null, bd = 14 * 14;
    for (const p of pts) {
      if (p.bucket === "regime") continue;
      const d = (p.x - mx) ** 2 + (p.y - my) ** 2;
      if (d < bd || (d === bd && p.bucket === "comparable")) { bd = d; best = p; }
    }
    setHover(best);
  }

  const visibleComparable = pts.filter((p) => p.bucket === "comparable").length;
  const ariaLabel = `Condition Map: ${pts.length} placeable runs plotted by oxygen percent (linear, ${O2_DOMAIN[0]} to ${O2_DOMAIN[1]}) and total pressure (log, ${fmtP(P_DOMAIN_KPA[0], unit)} to ${fmtP(P_DOMAIN_KPA[1], unit)} ${unitLabel(unit)}). ${visibleComparable} are comparable for this question in ${GRAVITY_LABEL[scenario.gravity]}. Scenario at ${fmt(scenario.o2Pct)} percent O2 and ${fmtP(scenario.pressureKPa, unit)} ${unitLabel(unit)}. ${offStats.n} runs lie above ${O2_DOMAIN[1]} percent O2, off chart.`;

  const hv = hover;
  const hvScored = hv ? scoredById.get(hv.run.id) : undefined;

  return (
    <div className={s.mapWrap} ref={wrapRef} data-gravity={scenario.gravity}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" className={s.mapSvg} role="img" aria-label={ariaLabel}>
        <defs>
          <clipPath id="a-plot-clip"><rect x={0} y={0} width={iw} height={ih} /></clipPath>
        </defs>
        <g transform={`translate(${M.left},${M.top})`}>
          {/* grid */}
          <rect x={0} y={0} width={iw} height={ih} className={s.plotBg} />
          {TICKS_O2.map((t) => (
            <g key={`x${t}`}>
              <line x1={sx(t)} x2={sx(t)} y1={0} y2={ih} className={s.gridLine} />
              <text x={sx(t)} y={ih + 16} className={s.tick} textAnchor="middle">{t}</text>
            </g>
          ))}
          {pTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={0} x2={iw} y1={sy(t)} y2={sy(t)} className={s.gridLine} />
              <text x={-8} y={sy(t) + 3.5} className={s.tick} textAnchor="end">{unit === "kPa" ? t : +kPaToPsia(t).toFixed(1)}</text>
            </g>
          ))}
          <text x={r2(iw / 2)} y={ih + 34} className={s.axisLabel} textAnchor="middle">O₂ · % by volume · linear</text>
          <text transform={`translate(-40,${r2(ih / 2)}) rotate(-90)`} className={s.axisLabel} textAnchor="middle">Total pressure · {unitLabel(unit)} · log</text>

          <g clipPath="url(#a-plot-clip)">
            {/* max solid O2 recorded */}
            <line x1={sx(maxSolid)} x2={sx(maxSolid)} y1={0} y2={ih} className={s.maxSolidLine} />
            <text x={sx(maxSolid) + 4} y={12} className={s.maxSolidLabel}>{iw < 520 ? "max solid-test O₂" : "max O₂ in solid tests with a recorded O₂ value"} · {fmt(maxSolid)} %</text>

            {/* evidence layers */}
            {layers.map((g) => {
              const color = FAMILY_COLOR[g.family];
              const filled = g.tier === "T1_PSI_RUN";
              return (
                <path
                  key={`${g.bucket}|${g.family}|${g.tier}`}
                  d={g.d.join("")}
                  className={`${s.layer} ${s[`b_${g.bucket}`]}`}
                  fill={filled ? color : "none"}
                  stroke={filled ? "none" : color}
                  strokeWidth={filled ? 0 : 1.4}
                  strokeDasharray={g.tier === "T4_PLANNED" ? "2.5 2" : undefined}
                />
              );
            })}
            {pts.some((p) => p.run.tier === "T4_PLANNED") && (() => {
              const pl = pts.filter((p) => p.run.tier === "T4_PLANNED");
              const top = pl.reduce((a, b) => (b.y < a.y ? b : a));
              return <text x={top.x + 9} y={top.y - 6} className={s.plannedLabel}>planned — not evidence</text>;
            })()}

            {/* reported limits: ring + vertical limit tick (not a tested condition) */}
            {pts.filter((p) => p.bucket === "limit").map((p) => (
              <line key={`lim-${p.run.id}`} x1={p.x} x2={p.x} y1={r2(p.y - 10)} y2={r2(p.y + 10)} className={s.limitTick} />
            ))}

            {/* reference atmospheres */}
            {refs.map((r) => {
              const x = sx(r.o2), y = sy(r.p);
              return (
                <g key={r.ids.join()} className={s.refMark} onClick={() => onPreset(r.ids[0])}>
                  <title>{`Reference atmosphere: ${r.labels.join(" · ")} — click to load`}</title>
                  <line x1={x - 7} x2={x + 7} y1={y} y2={y} />
                  <line x1={x} x2={x} y1={y - 7} y2={y + 7} />
                  <rect x={x - 3} y={y - 3} width={6} height={6} />
                  <text x={x + 9} y={y + 14}>{r.labels.join(" · ")}</text>
                </g>
              );
            })}

            {/* nearest leader */}
            {nearestPt && (
              <g className={s.leader}>
                <line x1={cx} y1={cy} x2={nearestPt.x} y2={nearestPt.y} />
                <circle cx={nearestPt.x} cy={nearestPt.y} r={7} />
              </g>
            )}

            {/* scenario crosshair + iso-distance ellipses (glides) */}
            <g className={s.crosshair} style={{ transform: `translate(${cx}px, ${cy}px)` }}>
              <line x1={-4000} x2={4000} y1={0} y2={0} className={s.crossLine} />
              <line x1={0} x2={0} y1={-4000} y2={4000} className={s.crossLine} />
              <path d={ellipse(kNear)} className={s.isoOuter} />
              <path d={ellipse(kDirect)} className={s.isoInner} />
              <text x={0} y={innerTop - 4} className={s.isoLabel} textAnchor="middle">D = {kDirect}</text>
              <text x={0} y={labelBelow ? outerBottom + 12 : outerTop - 17} className={s.isoLabel} textAnchor={labelAnchor}>
                <tspan x={labelAnchor === "start" ? -4 : labelAnchor === "end" ? 4 : 0}>D = {kNear} · evidence-distance contour</tspan>
                <tspan x={labelAnchor === "start" ? -4 : labelAnchor === "end" ? 4 : 0} dy={11}>(computed) — not a hazard boundary</tspan>
              </text>
              <circle r={4.5} className={s.reticle} />
              <circle r={1.4} className={s.reticleDot} />
            </g>
          </g>

          {/* off-chart: right edge */}
          <g transform={`translate(${iw + 6},0)`} className={s.offChart}>
            <line x1={0} x2={0} y1={0} y2={ih} />
            {offStats.n > 0 && (
              <g transform={`translate(4,${r2(ih * 0.35)})`}>
                <path d="M0 -5 L7 0 L0 5 Z" />
                <text x={0} y={18}>{offStats.n}</text>
                <text x={0} y={30}>&gt;{O2_DOMAIN[1]}%</text>
                <title>{`${offStats.n} runs above ${O2_DOMAIN[1]} % O₂ (up to ${fmt(offStats.max)} %): ${offStats.fams}`}</title>
              </g>
            )}
            {suit && suit.pressureKPa >= P_DOMAIN_KPA[0] && (
              <g transform={`translate(4,${sy(suit.pressureKPa)})`} className={s.offRef}>
                <path d="M0 -5 L7 0 L0 5 Z" />
                <text x={0} y={16}>{suit.short}</text>
                <text x={0} y={27}>{fmt(suit.o2Pct, 0)}%</text>
                <title>{`${suit.label}: ${suit.o2Pct} % O₂ at ${fmtP(suit.pressureKPa, unit)} ${unitLabel(unit)} — off chart`}</title>
              </g>
            )}
          </g>
          {scenarioOff && <text x={iw - 4} y={ih - 6} textAnchor="end" className={s.offScenario}>scenario outside plotted domain · marker clamped to edge</text>}

          {/* hover / click capture */}
          <rect
            x={0} y={0} width={iw} height={ih} fill="transparent"
            className={hover ? s.captureHot : s.capture}
            onPointerMove={handleMove}
            onPointerLeave={() => setHover(null)}
            onClick={() => hover && onInspect(hover.run)}
          />
          {hv && <circle cx={hv.x} cy={hv.y} r={markerRadius(hv.run.tier) + 4} className={s.hoverRing} pointerEvents="none" />}
        </g>
      </svg>

      {hv && (
        <div
          className={s.tooltip}
          style={{ left: Math.min(width - 250, Math.max(4, hv.x + M.left + 12)), top: hv.y + M.top + (hv.y > ih * 0.6 ? -150 : 14) }}
          role="status"
        >
          <div className={s.ttHead}><span className={s.mono}>{hv.run.id}</span><span className={s.ttTier}>{TIER_LABEL[hv.run.tier]}</span></div>
          <div className={s.ttInv}>{invById.get(hv.run.investigation)?.acronym ?? hv.run.investigation} · {FUEL_LABEL[hv.run.fuelClass]}</div>
          {hv.run.material && <div className={s.ttMat}>{hv.run.material}</div>}
          <dl className={s.ttGrid}>
            <dt>O₂</dt><dd>{fmt(hv.run.o2Pct)} %<i>{basisLabel(hv.run.o2Basis)}</i></dd>
            <dt>P</dt><dd>{fmtP(hv.run.pressureKPa, unit)} {unitLabel(unit)}<i>{basisLabel(hv.run.pressureBasis)}</i></dd>
            <dt>Flow</dt><dd>{hv.run.flowCmS == null ? (hv.run.flowRegime === "quiescent" ? "quiescent" : "not recorded") : `${fmt(hv.run.flowCmS)} cm/s`}</dd>
            <dt>g</dt><dd>{GRAVITY_SHORT[hv.run.gravity]}</dd>
            {hvScored && (<><dt>D</dt><dd>{fmt(hvScored.d.D, 2)}<i>computed</i></dd></>)}
          </dl>
          <div className={s.ttFoot}>{hv.bucket === "comparable" ? "Comparable for this question" : hv.bucket === "limit" ? "Reported limit — not a tested condition" : hv.bucket === "context" ? "Context only for this question" : "Not comparable for this question"} · click to inspect</div>
        </div>
      )}

      <MapLegend gravity={scenario.gravity} published={scenario.includePublished} />
    </div>
  );
}

function MapLegend({ gravity, published }: { gravity: Scenario["gravity"]; published: boolean }) {
  return (
    <div className={s.legend} aria-label="Map legend">
      <div className={s.legendGroup}>
        <span className={s.micro}>Fuel</span>
        {FAMILIES.map((f) => (
          <span key={f} className={s.legendItem}>
            <svg width={12} height={12} aria-hidden><path d={shapePath(FAMILY_SHAPE[f], 6, 6, 3.6)} fill={FAMILY_COLOR[f]} /></svg>
            {FAMILY_LABEL[f]}
          </span>
        ))}
      </div>
      <div className={s.legendGroup}>
        <span className={s.micro}>Tier</span>
        <span className={s.legendItem}><svg width={12} height={12} aria-hidden><circle cx={6} cy={6} r={3} fill="var(--a-ink)" /></svg>PSI run</span>
        <span className={s.legendItem} data-off={!published}><svg width={14} height={14} aria-hidden><circle cx={7} cy={7} r={5} fill="none" stroke="var(--a-ink)" strokeWidth={1.4} /></svg>Published{published ? "" : " (hidden)"}</span>
        <span className={s.legendItem}><svg width={14} height={14} aria-hidden><circle cx={7} cy={7} r={5} fill="none" stroke="var(--a-ink)" strokeWidth={1.4} strokeDasharray="2.5 2" /></svg>planned — not evidence</span>
      </div>
      <div className={s.legendGroup}>
        <span className={s.micro}>Overlay</span>
        <span className={s.legendItem}><svg width={14} height={14} aria-hidden><path d="M0 7h14M7 0v14" stroke="var(--a-amber)" strokeWidth={1.2} /></svg>Reference atmosphere</span>
        <span className={s.legendItem}><svg width={18} height={12} aria-hidden><ellipse cx={9} cy={6} rx={8} ry={5} fill="none" stroke="var(--a-ink)" strokeDasharray="3 2" /></svg>Evidence-distance contours D = {VERDICT_THRESHOLDS.direct} / {VERDICT_THRESHOLDS.near}, not a hazard boundary: computed in the O₂–P plane at the scenario&apos;s flow; runs at a different flow sit further away than the plane suggests</span>
        <span className={s.legendItem}><svg width={18} height={12} aria-hidden><path d="M1 11L17 1" stroke="var(--a-ink)" strokeDasharray="1.5 2" /></svg>Nearest comparable run</span>
        <span className={s.legendItem}><svg width={14} height={16} aria-hidden><circle cx={7} cy={8} r={4.5} fill="none" stroke="var(--a-ink)" strokeWidth={1.2} /><path d="M7 0v16" stroke="var(--a-ink)" /></svg>reported limit — not a tested condition</span>
        {gravity !== "micro" && <span className={s.legendItem}>µg layer dimmed — different regime, no distance computed</span>}
      </div>
    </div>
  );
}
