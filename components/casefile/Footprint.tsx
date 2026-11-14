"use client";
/**
 * Footprint field: one investigation's runs in the scenario's gravity regime, on the Atlas chart window,
 * against the scenario probe. Other investigations' runs in the same regime are dimmed. Never mixes regimes.
 */
import { useMemo } from "react";
import Link from "next/link";
import type { Run, Scenario } from "@/lib/schema";
import type { Evaluation } from "@/lib/engine";
import { ALL_RUNS, SNAP } from "@/lib/data";
import { GRAVITY_LABEL, fmt } from "@/lib/format";
import { ChartFrame } from "@/components/ui/misc";
import { Dot, TierMark, fuelShape, isLimit } from "@/components/atlas/marks";
import { r2 } from "@/components/atlas/geo";
import { FieldAxes, FieldSvg, Probe, fieldGeom } from "./field";
import type { LadderRow } from "./derive";
import css from "./casefile.module.css";

const G = fieldGeom(360, 300, { l: 40, r: 10, t: 10, b: 32 });
const placeable = (r: Run) => r.o2Pct != null && r.pressureKPa != null && r.pressureKPa > 0;

export function Footprint({ row, s, ev }: { row: LadderRow | null; s: Scenario; ev: Evaluation }) {
  const comparableIds = useMemo(() => new Set(ev.comparable.map((sc) => sc.run.id)), [ev]);
  const focusId = row?.inv.id ?? null;
  const focusTier = row?.inv.tier;

  // Context: every other placeable run in this regime (published only when counted; planned never).
  const context = useMemo(() => ALL_RUNS.filter((r) =>
    r.gravity === s.gravity && placeable(r) && r.investigation !== focusId && r.tier !== "T4_PLANNED" && (r.tier !== "T3_PUBLISHED" || s.includePublished) && G.inWindow(r.o2Pct!, r.pressureKPa!),
  ), [s.gravity, s.includePublished, focusId]);

  const own = row ? row.regimeRuns : [];
  const ownPlaceable = own.filter(placeable);
  const drawn = ownPlaceable.filter((r) => G.inWindow(r.o2Pct!, r.pressureKPa!));
  const offWindow = ownPlaceable.length - drawn.length;
  const notPlaceable = own.length - ownPlaceable.length;
  const otherRegimes = row ? row.otherRegimes.reduce((a, o) => a + o.n, 0) : 0;
  const psiComp = drawn.filter((r) => r.tier === "T1_PSI_RUN" && comparableIds.has(r.id));
  const psiOther = drawn.filter((r) => r.tier === "T1_PSI_RUN" && !comparableIds.has(r.id));
  const tiers = drawn.filter((r) => r.tier !== "T1_PSI_RUN");
  const nearest = row?.nearest && G.inWindow(row.nearest.run.o2Pct ?? -1, row.nearest.run.pressureKPa ?? -1) ? row.nearest : null;

  const o2s = drawn.map((r) => r.o2Pct!), ps = drawn.map((r) => r.pressureKPa!);
  const regime = GRAVITY_LABEL[s.gravity];
  const label = row
    ? `${row.inv.acronym} in ${regime.toLowerCase()}: ${drawn.length} runs drawn${drawn.length ? `, O₂ ${fmt(Math.min(...o2s), 1)}–${fmt(Math.max(...o2s), 1)} %, pressure ${fmt(Math.min(...ps), 1)}–${fmt(Math.max(...ps), 1)} kPa` : ""}; ${psiComp.length} comparable for this question${nearest ? `, nearest at D ${fmt(nearest.d.D, 2)}` : ""}. Scenario at ${fmt(s.o2Pct, 1)} % O₂, ${fmt(s.pressureKPa, 1)} kPa. ${context.length} runs of other investigations dimmed.`
    : `No investigation selected. ${context.length} runs in ${regime.toLowerCase()} dimmed; scenario at ${fmt(s.o2Pct, 1)} % O₂, ${fmt(s.pressureKPa, 1)} kPa.`;

  const notes: string[] = [];
  if (row) {
    if (offWindow) notes.push(`${offWindow} outside the chart window`);
    if (notPlaceable) notes.push(`${notPlaceable} without O₂ or pressure, not drawn`);
    if (otherRegimes) notes.push(`${otherRegimes} in other gravity regimes, not drawn`);
    if (focusTier === "T3_PUBLISHED" && !s.includePublished) notes.push("published: not counted while the published toggle is off");
    if (focusTier === "T4_PLANNED") notes.push("planned: never evidence");
  }

  return (
    <ChartFrame
      className={css.footprint}
      id="inv-footprint"
      title={row ? <>Footprint · <Link href={`/investigations/${row.inv.id}`}>{row.inv.acronym}</Link></> : "Footprint"}
      definition={<>Where this investigation&rsquo;s runs sit in {regime.toLowerCase()} condition space, against your scenario (amber). Other investigations&rsquo; runs are dimmed. Hover or focus a row to change it.</>}
      source={<>Source: NASA PSI run tables (snapshot {SNAP.fetchedAt.slice(0, 10)}) and the published papers listed under <Link href="/sources">Sources</Link>. Evidence proximity, not a safety rating; not a hazard map.</>}
    >
      <FieldSvg g={G} label={label}>
        <FieldAxes g={G} dense />
        <g>{context.map((r) => <Dot key={r.id} x={G.x(r.o2Pct!)} y={G.y(r.pressureKPa!)} r={1.5} shape={fuelShape(r.fuelClass)} muted />)}</g>
        <g>{psiOther.map((r) => <Dot key={r.id} x={G.x(r.o2Pct!)} y={G.y(r.pressureKPa!)} r={2} shape={fuelShape(r.fuelClass)} muted />)}</g>
        <g className={css.fpHalo}>{psiComp.map((r) => <circle key={r.id} cx={G.x(r.o2Pct!)} cy={G.y(r.pressureKPa!)} r={5} />)}</g>
        <g>{psiComp.map((r) => <Dot key={r.id} x={G.x(r.o2Pct!)} y={G.y(r.pressureKPa!)} r={2.6} shape={fuelShape(r.fuelClass)} />)}</g>
        <g>{tiers.map((r) => <TierMark key={r.id} run={r} x={G.x(r.o2Pct!)} y={G.y(r.pressureKPa!)} scale={1.05} />)}</g>
        {nearest && (
          <g className={css.fpNearest}>
            <circle cx={G.x(nearest.run.o2Pct!)} cy={G.y(nearest.run.pressureKPa!)} r={8.5} />
            <text x={r2(G.x(nearest.run.o2Pct!) + (G.x(nearest.run.o2Pct!) > G.W * 0.7 ? -12 : 12))} y={r2(G.y(nearest.run.pressureKPa!) - 10)} textAnchor={G.x(nearest.run.o2Pct!) > G.W * 0.7 ? "end" : "start"}>nearest · D {fmt(nearest.d.D, 2)}</text>
          </g>
        )}
        <Probe g={G} o2={s.o2Pct} p={s.pressureKPa} />
      </FieldSvg>
      <p className={css.fpCounts}>
        {row ? (
          <>
            <span className="num">{drawn.length}</span> of <span className="num">{row.runs.length}</span> runs drawn
            {psiComp.length > 0 && <> · <span className="num">{psiComp.length}</span> comparable</>}
            {tiers.length > 0 && <> · <span className="num">{tiers.filter((r) => r.tier === "T3_PUBLISHED" && !isLimit(r)).length}</span> published, <span className="num">{tiers.filter(isLimit).length}</span> limits</>}
            {notes.length > 0 && <> · {notes.join(" · ")}</>}
          </>
        ) : "Hover a row to see its footprint."}
      </p>
      <ul className={css.fpKey} aria-label="Key">
        <li><svg width="16" height="12" aria-hidden="true"><circle cx="8" cy="6" r="2.6" className="mk-dot" /></svg>comparable run</li>
        <li><svg width="16" height="12" aria-hidden="true"><circle cx="8" cy="6" r="2" className="mk-dot mk-dot--muted" /></svg>other runs</li>
        <li><svg width="16" height="12" aria-hidden="true"><circle cx="8" cy="6" r="3.8" className="mk-ring" /></svg>published</li>
        <li><svg width="16" height="12" aria-hidden="true"><circle cx="8" cy="6" r="2.6" className="mk-probe" /></svg>your scenario</li>
      </ul>
    </ChartFrame>
  );
}
