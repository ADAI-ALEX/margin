/**
 * Dossier hero stage: the investigation's footprint in condition space on the Atlas chart window
 * (O₂ linear 10–45 %, pressure log 20–520 kPa), in one gravity regime only. Other investigations' runs
 * in the same regime are dimmed for context. Server-rendered SVG.
 */
import Link from "next/link";
import type { Gravity, Run } from "@/lib/schema";
import { ALL_RUNS, SNAP } from "@/lib/data";
import { PRESETS } from "@/content/curated";
import { GRAVITY_LABEL, fmt } from "@/lib/format";
import { ChartFrame } from "@/components/ui/misc";
import { Dot, TierMark, fuelShape } from "@/components/atlas/marks";
import { FieldAxes, FieldSvg, Landmarks, fieldGeom } from "@/components/casefile/field";
import { GRAVS } from "@/components/casefile/derive";
import css from "./dossier.module.css";

const G = fieldGeom(520, 380, { l: 44, r: 12, t: 12, b: 34 });
const placeable = (r: Run) => r.o2Pct != null && r.pressureKPa != null && r.pressureKPa > 0;

export function DossierStage({ runs, acronym, invId }: { runs: Run[]; acronym: string; invId: string }) {
  const placed = runs.filter(placeable);
  const counts = GRAVS.map((g) => ({ g, n: placed.filter((r) => r.gravity === g).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const regime: Gravity = counts[0]?.g ?? runs[0]?.gravity ?? "micro";
  const own = placed.filter((r) => r.gravity === regime);
  const drawn = own.filter((r) => G.inWindow(r.o2Pct!, r.pressureKPa!));
  const off = own.length - drawn.length;
  const noOP = runs.length - placed.length;
  const elsewhere = placed.length - own.length;

  // context: other investigations' runs in the same regime, deduplicated to one mark per pixel
  const seen = new Set<string>();
  const context: { x: number; y: number }[] = [];
  for (const r of runs.length ? ALL_RUNS : []) {
    if (r.investigation === invId || r.gravity !== regime || r.tier === "T4_PLANNED" || !placeable(r) || !G.inWindow(r.o2Pct!, r.pressureKPa!)) continue;
    const x = Math.round(G.x(r.o2Pct!)), y = Math.round(G.y(r.pressureKPa!));
    const k = `${x}|${y}`;
    if (seen.has(k)) continue;
    seen.add(k); context.push({ x, y });
  }
  const psi = drawn.filter((r) => r.tier === "T1_PSI_RUN");
  const tiers = drawn.filter((r) => r.tier !== "T1_PSI_RUN");
  const o2s = drawn.map((r) => r.o2Pct!), ps = drawn.map((r) => r.pressureKPa!);
  const lm = PRESETS.map((p) => ({ label: p.short, o2: p.o2Pct, p: p.pressureKPa }));

  const label = drawn.length
    ? `${acronym} in ${GRAVITY_LABEL[regime].toLowerCase()}: ${drawn.length} runs drawn, O₂ ${fmt(Math.min(...o2s), 1)}–${fmt(Math.max(...o2s), 1)} %, pressure ${fmt(Math.min(...ps), 1)}–${fmt(Math.max(...ps), 1)} kPa (log scale). Reference atmospheres as triangles; other investigations' runs in this regime dimmed.`
    : `${acronym}: no run records both O₂ and pressure inside the chart window, so the plane is empty. Reference atmospheres as triangles.`;

  const notes: string[] = [];
  if (noOP) notes.push(`${noOP} run${noOP === 1 ? "" : "s"} without O₂ or pressure ${noOP === 1 ? "is" : "are"} not drawn`);
  if (off) notes.push(`${off} outside the chart window`);
  if (elsewhere) notes.push(`${elsewhere} in ${counts.slice(1).map((c) => GRAVITY_LABEL[c.g].toLowerCase()).join(", ")} ${elsewhere === 1 ? "is" : "are"} drawn separately below; regimes are never mixed`);

  return (
    <ChartFrame
      className={css.stage}
      title={runs.length ? <>Footprint · {GRAVITY_LABEL[regime]}</> : "Footprint"}
      definition={runs.length ? <>Where {acronym}&rsquo;s runs sit in condition space, in the Atlas chart window. Other investigations&rsquo; runs in this regime are dimmed.</> : <>{acronym} has no individual runs to place.</>}
      source={<>Source: NASA PSI run tables (snapshot {SNAP.fetchedAt.slice(0, 10)}) and the published papers listed under <Link href="/sources">Sources</Link>. Evidence proximity, not a safety rating; not a hazard map.</>}
    >
      <FieldSvg g={G} label={label}>
        <defs>
          <pattern id="dos-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" className="mk-hatch" />
          </pattern>
        </defs>
        <FieldAxes g={G} />
        {drawn.length === 0 && <rect x={G.M.l} y={G.M.t} width={G.W - G.M.l - G.M.r} height={G.H - G.M.t - G.M.b} fill="url(#dos-hatch)" className={css.hatchFill} />}
        <g>{context.map((c) => <circle key={`${c.x}|${c.y}`} cx={c.x} cy={c.y} r={1.3} className="mk-dot mk-dot--muted" />)}</g>
        <Landmarks g={G} items={lm} />
        <g>{psi.map((r) => <Dot key={r.id} x={G.x(r.o2Pct!)} y={G.y(r.pressureKPa!)} r={2.6} shape={fuelShape(r.fuelClass)} />)}</g>
        <g>{tiers.map((r) => <TierMark key={r.id} run={r} x={G.x(r.o2Pct!)} y={G.y(r.pressureKPa!)} scale={1.15} />)}</g>
        {drawn.length === 0 && <text x={(G.M.l + G.W - G.M.r) / 2} y={(G.M.t + G.H - G.M.b) / 2} textAnchor="middle" className={css.emptyText}>No run of {acronym} can be placed here</text>}
      </FieldSvg>
      <p className={css.stageCounts}>
        <span className="num">{drawn.length}</span> of <span className="num">{runs.length}</span> {runs.length === 1 ? "run" : "runs"} drawn{notes.length ? <> · {notes.join(" · ")}</> : null}.
      </p>
    </ChartFrame>
  );
}
