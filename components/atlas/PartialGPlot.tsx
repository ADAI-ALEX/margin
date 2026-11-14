"use client";
import type { Gravity } from "@/lib/schema";
import { OLSON_FERKUL_2012, type GLevel } from "@/content/curated";
import { GRAVITY_SHORT, fmt } from "@/lib/format";
import { useWidth } from "./useWidth";
import { r2 } from "./geo";

const ORDER: GLevel[] = ["micro", "moon", "mars", "earth"];

/** One symbol per gravity level; points only — never a connecting line. */
function GSymbol({ g, x, y, r, on }: { g: GLevel; x: number; y: number; r: number; on: boolean }) {
  const cls = on ? "atlas-pg-mark is-on" : "atlas-pg-mark";
  if (g === "micro") return <circle cx={x} cy={y} r={r} className={cls + " is-open"} />;
  if (g === "moon") return <circle cx={x} cy={y} r={r} className={cls} />;
  if (g === "mars") return <rect x={x - r * 0.9} y={y - r * 0.9} width={r * 1.8} height={r * 1.8} className={cls} />;
  return <polygon points={`${x},${y - r * 1.1} ${x + r},${y + r * 0.8} ${x - r},${y + r * 0.8}`} className={cls} />;
}

/** Editorial dot plot of Olson & Ferkul 2012 Table I (ULOI*), per material, per g-level. */
export default function PartialGPlot({ selected }: { selected: Gravity }) {
  const [ref, w] = useWidth<HTMLDivElement>(340);
  const rows = OLSON_FERKUL_2012.rows;
  const all = rows.flatMap((r) => ORDER.map((g) => r.uloi[g]));
  const lo = Math.floor(Math.min(...all)) - 1, hi = Math.ceil(Math.max(...all)) + 1;
  const ml = 92, mr = 12, rowH = 30, top = 8;
  const h = top + rows.length * rowH + 30;
  const x = (v: number) => r2(ml + ((v - lo) / (hi - lo)) * (w - ml - mr));
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / 2) * 2; t <= hi; t += 2) ticks.push(t);
  const sel = selected as GLevel;
  return (
    <figure className="atlas-pg">
      <div ref={ref}>
        <svg width={w} height={h} role="img" aria-label={`Dot plot of limiting oxygen (ULOI*) by gravity level for ${rows.map((r) => r.material).join(", ")}. ${rows.map((r) => `${r.material}: ${ORDER.map((g) => `${GRAVITY_SHORT[g]} ${r.uloi[g]}%`).join(", ")}`).join("; ")}.`}>
          {ticks.map((t) => (
            <g key={t} className="atlas-pg-tick">
              <line x1={x(t)} x2={x(t)} y1={top} y2={top + rows.length * rowH} />
              <text x={x(t)} y={top + rows.length * rowH + 13} textAnchor="middle">{t}</text>
            </g>
          ))}
          <text className="atlas-pg-axis" x={w - mr} y={h - 3} textAnchor="end">ULOI*, % O₂ (reported limit)</text>
          {rows.map((r, i) => {
            const cy = top + i * rowH + rowH / 2;
            return (
              <g key={r.material}>
                <text className="atlas-pg-mat" x={0} y={cy - 2}>{r.material}</text>
                <text className="atlas-pg-matsub" x={0} y={cy + 10}>{r.thickness} · {r.pressurePsia} psia</text>
                {ORDER.filter((g) => g !== sel).map((g) => <GSymbol key={g} g={g} x={x(r.uloi[g])} y={cy} r={3.6} on={false} />)}
                <GSymbol g={sel} x={x(r.uloi[sel])} y={cy} r={4.8} on />
                <text className="atlas-pg-val" x={x(r.uloi[sel])} y={cy - 8} textAnchor="middle">{fmt(r.uloi[sel])}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="atlas-pg-key">
        {ORDER.map((g) => (
          <span key={g} className={g === sel ? "is-on" : undefined}>
            <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true"><GSymbol g={g} x={6} y={6} r={3.6} on={g === sel} /></svg>
            {GRAVITY_SHORT[g]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
