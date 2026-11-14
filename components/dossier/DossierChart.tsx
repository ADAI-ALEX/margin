/** O₂ × pressure (log) scatter of one investigation's placeable runs, one panel per gravity regime. Server-rendered SVG. */
import { scaleLinear, scaleLog } from "d3-scale";
import type { Gravity, Run } from "@/lib/schema";
import { PRESETS } from "@/content/curated";
import { GRAVITY_LABEL, fmt } from "@/lib/format";
import { GRAVS, isLimit, r2, type Fingerprint } from "@/components/casefile/derive";
import { ChartFrame } from "@/components/ui/misc";
import { LimitMark } from "@/components/atlas/marks";
import { Landmarks } from "@/components/casefile/field";
import css from "./dossier.module.css";

const W = 640, H = 360, M = { l: 66, r: 18, t: 16, b: 46 };
const TRI = (x: number, y: number, r = 5) => `${x},${r2(y - r)} ${r2(x + r * 0.9)},${r2(y + r * 0.6)} ${r2(x - r * 0.9)},${r2(y + r * 0.6)}`;

type MarkKind = "run" | "nominal" | "pub" | "limit" | "planned";
const kindOf = (r: Run): MarkKind => (r.tier === "T4_PLANNED" ? "planned" : isLimit(r) ? "limit" : r.tier === "T3_PUBLISHED" ? "pub" : r.pressureBasis === "nominal-stated" ? "nominal" : "run");

/** The field encoding (.mk-* in ui.css): dot = PSI run, hollow dot = nominal pressure, ring = published, ring + tick = limit, dashed ring = planned. */
function Mark({ kind, x, y, n }: { kind: MarkKind; x: number; y: number; n: number }) {
  const big = r2(4.5 + Math.sqrt(n - 1) * 0.8), small = r2(2.6 + Math.sqrt(n - 1) * 0.8);
  if (kind === "planned") return <circle cx={x} cy={y} r={big} className="mk-planned" />;
  if (kind === "limit") return <LimitMark x={x} y={y} scale={big / 4} />;
  if (kind === "pub") return <circle cx={x} cy={y} r={big} className="mk-ring" />;
  return <circle cx={x} cy={y} r={small} className={kind === "nominal" ? css.mNominal : "mk-dot"} />;
}

function Panel({ runs, g, acronym }: { runs: Run[]; g: Gravity; acronym: string }) {
  const o2s = [...runs.map((r) => r.o2Pct as number), ...PRESETS.map((p) => p.o2Pct)];
  const ps = [...runs.map((r) => r.pressureKPa as number), ...PRESETS.map((p) => p.pressureKPa)];
  const x = scaleLinear().domain([Math.floor(Math.min(...o2s) - 2), Math.ceil(Math.max(...o2s) + 2)]).range([M.l, W - M.r]).nice();
  const y = scaleLog().domain([Math.min(...ps) * 0.8, Math.max(...ps) * 1.25]).range([H - M.b, M.t]).nice();
  const xt = x.ticks(8), yt = y.ticks(6).filter((v) => [1, 2, 5].includes(+v.toExponential().slice(0, 1)));
  // identical conditions are drawn once, sized by count
  const gm = new Map<string, { key: string; kind: MarkKind; o2: number; p: number; n: number; first: Run }>();
  for (const r of runs) {
    const kind = kindOf(r), o2 = r.o2Pct as number, p = r.pressureKPa as number;
    const key = `${kind}|${o2.toFixed(2)}|${p.toFixed(2)}`;
    const g = gm.get(key);
    if (g) g.n++; else gm.set(key, { key, kind, o2, p, n: 1, first: r });
  }
  const groups = [...gm.values()].sort((a, b) => Number(a.kind === "run" || a.kind === "nominal" ? 0 : 1) - Number(b.kind === "run" || b.kind === "nominal" ? 0 : 1));
  const [xd0, xd1] = x.domain(), [yd0, yd1] = y.domain();
  const geom = { W, H, M, x: (v: number) => r2(x(v)), y: (v: number) => r2(y(v)), inWindow: (o: number, p: number) => o >= xd0 && o <= xd1 && p >= yd0 && p <= yd1 };
  const o2r = [Math.min(...runs.map((r) => r.o2Pct as number)), Math.max(...runs.map((r) => r.o2Pct as number))];
  const pr = [Math.min(...runs.map((r) => r.pressureKPa as number)), Math.max(...runs.map((r) => r.pressureKPa as number))];
  const label = `${acronym}, ${GRAVITY_LABEL[g]}: ${runs.length} runs plotted, O₂ ${fmt(o2r[0], 1)}–${fmt(o2r[1], 1)} %, pressure ${fmt(pr[0], 1)}–${fmt(pr[1], 1)} kPa (log scale). Reference atmospheres drawn as triangles: ${PRESETS.map((p) => `${p.short} ${p.o2Pct}% / ${p.pressureKPa} kPa`).join("; ")}.`;
  return (
    <div className={css.panel}>
      <p className={css.panelCap}>{GRAVITY_LABEL[g]} <span className={css.capCount}><span className="num">{runs.length}</span> runs</span></p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className={css.chartSvg}>
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} className={css.plotBg} />
        {xt.map((v) => (
          <g key={`x${v}`} className={css.axis}>
            <line x1={r2(x(v))} x2={r2(x(v))} y1={M.t} y2={H - M.b} className={css.gridLine} />
            <line x1={r2(x(v))} x2={r2(x(v))} y1={H - M.b} y2={H - M.b + 4} className={css.tickMark} />
            <text x={r2(x(v))} y={H - M.b + 16} textAnchor="middle">{v}%</text>
          </g>
        ))}
        {yt.map((v) => (
          <g key={`y${v}`} className={css.axis}>
            <line x1={M.l} x2={W - M.r} y1={r2(y(v))} y2={r2(y(v))} className={css.gridLine} />
            <line x1={M.l - 4} x2={M.l} y1={r2(y(v))} y2={r2(y(v))} className={css.tickMark} />
            <text x={M.l - 8} y={r2(y(v)) + 3.5} textAnchor="end">{v} kPa</text>
          </g>
        ))}
        <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} className={css.frame} />
        <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} className={css.frame} />
        <text x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle" className={css.axisTitle}>O₂, % by volume (ambient)</text>
        <text x={13} y={(M.t + H - M.b) / 2} transform={`rotate(-90 13 ${(M.t + H - M.b) / 2})`} textAnchor="middle" className={css.axisTitle}>Pressure, kPa (log scale)</text>
        <Landmarks g={geom} items={PRESETS.map((p) => ({ label: p.short, o2: p.o2Pct, p: p.pressureKPa }))} marks={runs.map((r) => ({ x: geom.x(r.o2Pct as number), y: geom.y(r.pressureKPa as number) }))} />
        {groups.map((g) => (
          <g key={g.key}>
            <title>{`${g.n > 1 ? `${g.n} runs` : g.first.id} · ${fmt(g.o2, 1)}% O₂ · ${fmt(g.p, 1)} kPa${g.n === 1 ? ` · ${g.first.material ?? "material not recorded"}` : ""}`}</title>
            <Mark kind={g.kind} n={g.n} x={r2(x(g.o2))} y={r2(y(g.p))} />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function DossierChart({ runs, fp, acronym }: { runs: Run[]; fp: Fingerprint; acronym: string }) {
  const placed = runs.filter((r) => r.o2Pct != null && r.pressureKPa != null && r.pressureKPa > 0);
  const byG = GRAVS.map((g) => ({ g, runs: placed.filter((r) => r.gravity === g) })).filter((x) => x.runs.length);
  const missing = runs.length - placed.length;
  const kinds = new Set(placed.map(kindOf));
  const reasons: string[] = [];
  if (runs.length === 0) reasons.push("there are no individual runs to place");
  else {
    const noO2 = runs.filter((r) => r.o2Pct == null).length, noP = runs.filter((r) => r.o2Pct != null && r.pressureKPa == null).length;
    for (const np of fp.notPlaceable) reasons.push(`${np.n} run${np.n === 1 ? "" : "s"}: ${np.reason}`);
    if (noP) reasons.push(`${noP} run${noP === 1 ? "" : "s"}: O₂ recorded but pressure not recorded`);
    void noO2;
  }
  const source = <>Source: the normalized O₂ and pressure of each run in the run table below (NASA PSI run tables or the cited paper); the original cell and any conversion are in each run&rsquo;s provenance. Reference atmospheres are MARGIN&rsquo;s presets. Not a hazard map.</>;
  return (
    <section className={css.section} aria-labelledby="dos-chart-h" data-empty={placed.length === 0 || undefined}>
      <ChartFrame
        testId="dossier-chart"
        id="dos-chart"
        headingLevel={2}
        className={css.chartMod}
        title={<span id="dos-chart-h">Where the runs sit: O₂ × pressure, zoomed to the data</span>}
        definition={placed.length > 0
          ? <>{placed.length} of {runs.length} runs record both ambient O₂ and pressure and are plotted.{missing > 0 && <> {missing} are not: {reasons.join("; ")}.</>}{byG.length > 1 && <> Each gravity regime has its own panel; regimes are never compared with one another.</>}</>
          : <>Nothing from this investigation can be placed on an O₂ × pressure chart: {reasons.length ? reasons.join("; ") : "no run records both values"}.</>}
        source={source}
      >
        {placed.length > 0 ? (
          <>
            <div className={css.panels} data-n={byG.length}>
              {byG.map((p) => <Panel key={p.g} g={p.g} runs={p.runs} acronym={acronym} />)}
            </div>
            <ul className={css.key} aria-label="Key">
              {kinds.has("run") && <li><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="2.6" className="mk-dot" /></svg> PSI run (larger = several runs at the same condition)</li>}
              {kinds.has("nominal") && <li><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="2.6" className={css.mNominal} /></svg> PSI run, pressure nominal (stated)</li>}
              {kinds.has("pub") && <li><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="4.5" className="mk-ring" /></svg> published (not in PSI)</li>}
              {kinds.has("limit") && <li><svg width="16" height="14" aria-hidden="true"><LimitMark x={8} y={7} scale={0.9} /></svg> reported limit: not a tested condition</li>}
              {kinds.has("planned") && <li><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="4.5" className="mk-planned" /></svg> planned: not evidence</li>}
              <li><svg width="14" height="14" aria-hidden="true"><polygon points={TRI(7, 8, 5)} className="mk-landmark" /></svg> reference atmosphere</li>
            </ul>
          </>
        ) : <div className={css.emptyPlot} aria-hidden="true" />}
      </ChartFrame>
    </section>
  );
}
