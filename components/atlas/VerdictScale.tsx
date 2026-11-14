import { VERDICT_THRESHOLDS } from "@/lib/engine";

const MAX = 5; // display range of the scale; larger D is clipped and marked

/**
 * Where D sits against MARGIN's class boundaries (D ≤ 1 DIRECT, ≤ 2.5 NEAR, > 2.5 DISTANT).
 * Single-hue ramp: darker = closer evidence. It is a scale of evidence distance, not of hazard.
 */
export default function VerdictScale({ D }: { D: number | null }) {
  const has = D != null && Number.isFinite(D);
  const pos = has ? Math.min(D!, MAX) / MAX : 0;
  const t1 = VERDICT_THRESHOLDS.direct / MAX, t2 = VERDICT_THRESHOLDS.near / MAX;
  return (
    <div className="atlas-vscale" aria-hidden="true">
      <div className="atlas-vscale-track">
        <span className="atlas-vscale-z is-direct" style={{ left: 0, width: `${t1 * 100}%` }} />
        <span className="atlas-vscale-z is-near" style={{ left: `${t1 * 100}%`, width: `${(t2 - t1) * 100}%` }} />
        <span className="atlas-vscale-z is-distant" style={{ left: `${t2 * 100}%`, width: `${(1 - t2) * 100}%` }} />
        {has && <span className={`atlas-vscale-mark${D! > MAX ? " is-clipped" : ""}`} style={{ left: `${pos * 100}%` }} />}
      </div>
      <div className="atlas-vscale-ticks">
        <span style={{ left: 0 }}>0</span>
        <span style={{ left: `${t1 * 100}%` }}>{VERDICT_THRESHOLDS.direct}</span>
        <span style={{ left: `${t2 * 100}%` }}>{VERDICT_THRESHOLDS.near}</span>
        <span style={{ left: "100%" }}>{MAX}+</span>
      </div>
      <div className="atlas-vscale-names">
        <span style={{ left: `${(t1 / 2) * 100}%` }}>DIRECT</span>
        <span style={{ left: `${((t1 + t2) / 2) * 100}%` }}>NEAR</span>
        <span style={{ left: `${((t2 + 1) / 2) * 100}%` }}>DISTANT</span>
      </div>
    </div>
  );
}
