/** O₂ × pressure (log) scatter of one investigation's placeable runs, one panel per gravity regime. Server-rendered SVG. */
import { scaleLinear, scaleLog } from "d3-scale";
import type { Gravity, Run } from "@/lib/schema";
import { PRESETS } from "@/content/curated";
import { GRAVITY_LABEL, fmt } from "@/lib/format";
import { GRAVS, isLimit, r2, type Fingerprint } from "@/components/casefile/derive";
import css from "./dossier.module.css";

const W = 640, H = 360, M = { l: 54, r: 16, t: 14, b: 42 };

type MarkKind = "run" | "nominal" | "pub" | "limit" | "planned";
const kindOf = (r: Run): MarkKind => (r.tier === "T4_PLANNED" ? "planned" : isLimit(r) ? "limit" : r.tier === "T3_PUBLISHED" ? "pub" : r.pressureBasis === "nominal-stated" ? "nominal" : "run");

function Mark({ kind, x, y, n }: { kind: MarkKind; x: number; y: number; n: number }) {
  const big = r2(4.5 + Math.sqrt(n - 1) * 0.8), small = r2(2.6 + Math.sqrt(n - 1) * 0.8);
  if (kind === "planned") return <circle cx={x} cy={y} r={big} className={css.mPlanned} />;
  if (kind === "limit") return <g className={css.mLimit}><circle cx={x} cy={y} r={big} /><line x1={x} x2={x} y1={r2(y - big)} y2={r2(y + big)} /></g>;
  if (kind === "pub") return <circle cx={x} cy={y} r={big} className={css.mPub} />;
  return <circle cx={x} cy={y} r={small} className={kind === "nominal" ? css.mNominal : css.mRun} />;
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
  const cm = new Map<string, { label: string; o2: number; p: number }>();
  for (const pr of PRESETS) {
    const k = `${pr.o2Pct}|${pr.pressureKPa}`;
    const c = cm.get(k);
    if (c) c.label = `${c.label} / ${pr.short}`; else cm.set(k, { label: pr.short, o2: pr.o2Pct, p: pr.pressureKPa });
  }
  const crosses = [...cm.values()].sort((a, b) => a.o2 - b.o2);
  const o2r = [Math.min(...runs.map((r) => r.o2Pct as number)), Math.max(...runs.map((r) => r.o2Pct as number))];
  const pr = [Math.min(...runs.map((r) => r.pressureKPa as number)), Math.max(...runs.map((r) => r.pressureKPa as number))];
  const label = `${acronym}, ${GRAVITY_LABEL[g]}: ${runs.length} runs plotted, O₂ ${fmt(o2r[0], 1)}–${fmt(o2r[1], 1)} %, pressure ${fmt(pr[0], 1)}–${fmt(pr[1], 1)} kPa (log scale). Reference atmospheres drawn as crosshairs: ${PRESETS.map((p) => `${p.short} ${p.o2Pct}% / ${p.pressureKPa} kPa`).join("; ")}.`;
  return (
    <figure className={css.panel}>
      <figcaption className={css.panelCap}>{GRAVITY_LABEL[g]} <span className={css.quiet}>· {runs.length} runs</span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className={css.chartSvg}>
        {xt.map((v) => (
          <g key={`x${v}`} className={css.axis}>
            <line x1={r2(x(v))} x2={r2(x(v))} y1={M.t} y2={H - M.b} className={css.gridLine} />
            <text x={r2(x(v))} y={H - M.b + 14} textAnchor="middle">{v}</text>
          </g>
        ))}
        {yt.map((v) => (
          <g key={`y${v}`} className={css.axis}>
            <line x1={M.l} x2={W - M.r} y1={r2(y(v))} y2={r2(y(v))} className={css.gridLine} />
            <text x={M.l - 6} y={r2(y(v)) + 3} textAnchor="end">{v}</text>
          </g>
        ))}
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} className={css.frame} />
        <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" className={css.axisTitle}>O₂, % by volume (ambient)</text>
        <text x={12} y={(M.t + H - M.b) / 2} transform={`rotate(-90 12 ${(M.t + H - M.b) / 2})`} textAnchor="middle" className={css.axisTitle}>Pressure, kPa (log scale)</text>
        {crosses.map((c, i) => {
          const cx = r2(x(c.o2)), cy = r2(y(c.p));
          const ty = i % 2 === 0 ? cy - 7 : cy + 17; // alternate above/below so neighbouring labels do not collide
          return (
            <g key={c.label} className={css.cross}>
              <line x1={cx - 9} x2={cx + 9} y1={cy} y2={cy} />
              <line x1={cx} x2={cx} y1={cy - 9} y2={cy + 9} />
              {cx > W * 0.7 ? <text x={cx - 6} y={ty} textAnchor="end">{c.label}</text> : <text x={cx + 6} y={ty}>{c.label}</text>}
            </g>
          );
        })}
        {groups.map((g) => (
          <g key={g.key}>
            <title>{`${g.n > 1 ? `${g.n} runs` : g.first.id} · ${fmt(g.o2, 1)}% O₂ · ${fmt(g.p, 1)} kPa${g.n === 1 ? ` · ${g.first.material ?? "material not recorded"}` : ""}`}</title>
            <Mark kind={g.kind} n={g.n} x={r2(x(g.o2))} y={r2(y(g.p))} />
          </g>
        ))}
      </svg>
    </figure>
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
  return (
    <section className={css.section} aria-labelledby="dos-chart-h" data-testid="dossier-chart" data-empty={placed.length === 0 || undefined}>
      <h2 className={css.h2} id="dos-chart-h">Where the runs sit: O₂ × pressure</h2>
      {placed.length > 0 ? (
        <>
          <p className={css.sub}>
            {placed.length} of {runs.length} runs record both ambient O₂ and pressure and are plotted.{missing > 0 && <> {missing} are not: {reasons.join("; ")}.</>}
            {byG.length > 1 && <> Each gravity regime has its own panel; regimes are never compared with one another.</>}
          </p>
          <div className={css.panels} data-n={byG.length}>
            {byG.map((p) => <Panel key={p.g} g={p.g} runs={p.runs} acronym={acronym} />)}
          </div>
          <ul className={css.key}>
            {kinds.has("run") && <li><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="2.6" className={css.mRun} /></svg> PSI run (larger = several runs at the same condition)</li>}
            {kinds.has("nominal") && <li><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="2.6" className={css.mNominal} /></svg> PSI run, pressure nominal (stated)</li>}
            {kinds.has("pub") && <li><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" className={css.mPub} /></svg> published (not in PSI)</li>}
            {kinds.has("limit") && <li><svg width="12" height="12" aria-hidden="true"><g className={css.mLimit}><circle cx="6" cy="6" r="4.5" /><line x1="6" x2="6" y1="1.5" y2="10.5" /></g></svg> reported limit — not a tested condition</li>}
            {kinds.has("planned") && <li><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" className={css.mPlanned} /></svg> planned — not evidence</li>}
            <li><svg width="14" height="14" aria-hidden="true" className={css.cross}><line x1="1" x2="13" y1="7" y2="7" /><line x1="7" x2="7" y1="1" y2="13" /></svg> reference atmosphere</li>
          </ul>
        </>
      ) : (
        <p className={css.emptyNote}>
          Nothing from this investigation can be placed on an O₂ × pressure chart: {reasons.length ? reasons.join("; ") : "no run records both values"}.
        </p>
      )}
    </section>
  );
}
