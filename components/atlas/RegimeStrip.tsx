"use client";
/**
 * Bottom instrument strip: the snapshot status (dated, never "live"), the gravity regime selector and the
 * verdict readout. The selector is a radiogroup of exactly four discrete detents: no track, no knob travel,
 * nothing drawn between regimes. Each detent shows its own regime's occupancy, so the emptiness of three
 * regimes is visible before you select them.
 */
import type { Gravity } from "@/lib/schema";
import type { Verdict } from "@/lib/engine";
import { RadioGroup } from "@/components/ui/controls";
import { GRAVITY_LABEL, fmt } from "@/lib/format";
import { REGIMES, REGIME_COUNTS, REGIME_G, REGIME_SHORT } from "@/lib/view/regimes";

function MiniPlate({ cells, nx = 10, ny = 6 }: { cells: number[]; nx?: number; ny?: number }) {
  const W = 46, H = 26, cw = W / nx, ch = H / ny;
  const max = Math.max(1, ...cells);
  const empty = cells.every((c) => c === 0);
  return (
    <svg className="strip-plate" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} className="strip-plate-frame" />
      {empty ? <path d={`M4 ${H - 4} ${W - 4} 4`} className="strip-plate-empty" /> : cells.map((c, k) => c > 0 && (
        <rect key={k} x={(k % nx) * cw + 1} y={Math.floor(k / nx) * ch + 1} width={cw - 1} height={ch - 1} className="strip-plate-cell" style={{ opacity: 0.25 + 0.75 * Math.sqrt(c / max) }} />
      ))}
    </svg>
  );
}

export default function RegimeStrip({ gravity, onChange, verdict, D, status, occupancy }: {
  gravity: Gravity; onChange: (g: Gravity) => void; verdict: Verdict; D: number | null; status: { date: string; runs: string };
  occupancy: Record<Gravity, number[]>;
}) {
  return (
    <div className="strip">
      <p className="strip-status" title="Bundled NASA PSI snapshot; the app makes no calls to NASA at run time">
        <span className="strip-status-glyph" aria-hidden="true" />
        <span className="caps">PSI snapshot</span>
        <span className="num strip-status-val">{status.date} · {status.runs} runs</span>
      </p>
      <RadioGroup<Gravity>
        id="atlas-regime"
        label="Gravity regime"
        labelHidden
        variant="detents"
        className="strip-regimes"
        options={REGIMES}
        value={gravity}
        onChange={onChange}
        aria={(g) => GRAVITY_LABEL[g]}
        render={(g) => {
          const c = REGIME_COUNTS[g];
          return (
            <>
              <MiniPlate cells={occupancy[g]} />
              <span className="strip-name">{REGIME_SHORT[g]}</span>
              <span className="strip-g num">{REGIME_G[g]}</span>
              <span className="strip-count num">{c.psi > 0 ? `${c.psi.toLocaleString("en-GB")} PSI` : "0 PSI"}</span>
            </>
          );
        }}
      />
      <p className="strip-readout" aria-hidden="true">
        <span className="caps">Evidence</span>
        <span className="strip-verdict">{verdict}</span>
        <span className="strip-d num">{D != null && Number.isFinite(D) ? `D ${fmt(D, 2)}` : "no D"}</span>
      </p>
    </div>
  );
}
