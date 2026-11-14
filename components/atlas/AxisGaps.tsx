"use client";
import type { Scored } from "@/lib/engine";
import { SCALES } from "@/lib/engine";
import { fmtSigned } from "@/lib/format";

const AXES = [
  { k: "o2", label: "O₂", unit: "pts", raw: (s: Scored) => s.d.raw.o2Pts, digits: 1, scale: `${SCALES.o2Pts} pts` },
  { k: "pressure", label: "Pressure", unit: "%", raw: (s: Scored) => s.d.raw.pressurePct, digits: 0, scale: `×${SCALES.pressureRatio}` },
  { k: "flow", label: "Flow", unit: "cm/s", raw: (s: Scored) => s.d.raw.flowCmS, digits: 1, scale: `${SCALES.flowCmS} cm/s` },
] as const;
const MAX = 4; // bar half-width in scale units; longer gaps are clipped and marked

/**
 * Signed per-axis gaps (test − scenario) of one scored run, in MARGIN scale units, with the physical
 * difference alongside. D is the root-sum-square of the bars. Bars are neutral ink: a gap is a
 * distance between conditions, not a tolerance or a pass/fail margin.
 */
export default function AxisGaps({ scored, title }: { scored: Scored; title: string }) {
  const { d } = scored;
  const mismatch = d.flags.includes("flow-regime-mismatch");
  return (
    <figure className="atlas-gaps" aria-label={`${title}: per-axis gaps`}>
      <figcaption className="atlas-h4">{title}</figcaption>
      <table className="atlas-gaps-table">
        <colgroup><col className="c-axis" /><col /><col className="c-val" /></colgroup>
        <thead className="sr-only"><tr><th scope="col">Axis</th><th scope="col">Gap in scale units</th><th scope="col">Physical difference</th></tr></thead>
        <tbody>
          {AXES.map((a) => {
            const g = d.gaps[a.k];
            const raw = a.raw(scored);
            const used = d.axesUsed.includes(a.k);
            const clipped = g != null && Math.abs(g) > MAX;
            const w = g == null ? 0 : (Math.min(Math.abs(g), MAX) / MAX) * 50;
            return (
              <tr key={a.k} className={used ? "" : "is-off"}>
                <th scope="row" className="atlas-gaps-axis">{a.label}<span className="atlas-gaps-scale">1 unit = {a.scale}</span></th>
                <td className="atlas-gaps-barcell">
                  {used && g != null ? (
                    <span className="atlas-gaps-track" aria-hidden="true">
                      <span className="atlas-gaps-zero" />
                      <span className={`atlas-gaps-bar${clipped ? " is-clipped" : ""}`} style={{ left: g < 0 ? `${50 - w}%` : "50%", width: `${w}%` }} />
                    </span>
                  ) : <span className="atlas-gaps-na">{a.k === "flow" && mismatch ? "flow regime differs — not compared" : "not recorded — not compared"}</span>}
                </td>
                <td className="atlas-gaps-val num">
                  {used && g != null ? <>{fmtSigned(g, 2)}<span className="atlas-gaps-phys"> ({fmtSigned(raw, a.digits)} {a.unit})</span></> : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="atlas-micro">D = √(Σ gap²) = <span className="num">{Number.isFinite(d.D) ? d.D.toFixed(2) : "—"}</span> on {d.axesUsed.length} of 3 axes. Signed as test minus scenario.</p>
    </figure>
  );
}
