"use client";
/**
 * Method page: an illustration of evidence distance around ONE example test (not data, not a map).
 * All geometry and every D are precomputed on the server by the engine (illustrationData.ts); this
 * component only switches between the precomputed states. Keyboard: two radio groups (arrows, Home, End).
 */
import { useId, useState } from "react";
import { RadioGroup } from "@/components/ui/controls";
import { KeyList } from "@/components/ui/misc";
import { VERDICT_THRESHOLDS } from "@/lib/engine/constants";
import type { FlowKey, IllData } from "./illustrationData";

const factorText = (k: number) => (k === 0.5 ? "½×" : `${k}×`);
const factorAria = (k: number) => (k === 0.5 ? "Half the default scales (½×)" : k === 1 ? "Default scales (1×)" : `${k} times the default scales (${k}×)`);
const sgn = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v < 0 ? `−${Math.abs(v).toFixed(2)}` : "0.00");
const trim = (v: number) => String(+v.toFixed(3));

function Swatch({ kind }: { kind: "direct" | "near" | "envelope" | "test" | "probe" }) {
  return (
    <svg viewBox="0 0 22 14" width={22} height={14} aria-hidden="true">
      {kind === "direct" && <rect x={1} y={1} width={20} height={12} className="mk-ev-direct" />}
      {kind === "near" && <rect x={1} y={1} width={20} height={12} className="mk-ev-near" />}
      {kind === "envelope" && <line x1={1} y1={7} x2={21} y2={7} className="mk-envelope" />}
      {kind === "test" && <circle cx={11} cy={7} r={3.8} className="mk-ring" />}
      {kind === "probe" && <g><circle cx={11} cy={7} r={5} className="doc-ill-probe-ring" /><circle cx={11} cy={7} r={2.2} className="mk-probe" /></g>}
    </svg>
  );
}

export default function DistanceIllustration({ data }: { data: IllData }) {
  const uid = useId();
  const [k, setK] = useState<number>(1);
  const [flow, setFlow] = useState<FlowKey>(data.flows[0].key);
  const st = data.states.find((s) => s.k === k && s.flow === flow) ?? data.states[0];
  const others = data.states.filter((s) => s.flow === flow && s.k !== k);
  const flowCm = (key: FlowKey) => data.flows.find((f) => f.key === key)?.cmS;
  const { view: v, test, probe } = data;
  const isPub = test.tier !== "T1_PSI_RUN";
  const flowGap = st.gaps.flow ?? 0;
  const noDirect = st.direct === "";
  const clip = `doc-ill-clip-${uid.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hatch = `doc-ill-hatch-${uid.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const summary = `Illustration. Example test at ${test.o2}% O₂ and ${test.p} kPa; probe at ${probe.o2}% O₂ and ${probe.p} kPa with flow ${flowCm(flow) ?? "quiescent"} cm/s; scales ${factorText(k)} their defaults. D = ${st.D.toFixed(2)}, ${st.verdict}.`;

  return (
    <div className="doc-ill">
      <div className="doc-ill-controls">
        <RadioGroup label="Scales (all three axes)" options={data.factors} value={k} onChange={setK} render={(o) => factorText(o)} aria={factorAria} size="sm" />
        {data.flows.length > 1 && (
          <RadioGroup
            label="Probe flow" options={data.flows.map((f) => f.key)} value={flow} onChange={setFlow} size="sm"
            render={(o) => `${flowCm(o) ?? "quiescent"} cm/s · ${o === "test" ? "same as test" : "preset"}`}
          />
        )}
      </div>

      <div className="doc-ill-body">
        <svg className="doc-ill-svg" viewBox={`0 0 ${v.w} ${v.h}`} role="img" aria-label={summary}>
          <defs>
            <clipPath id={clip}><rect x={v.x0} y={v.y0} width={v.x1 - v.x0} height={v.y1 - v.y0} /></clipPath>
            <pattern id={hatch} width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={7} className="doc-ill-hatch-line" />
            </pattern>
          </defs>
          <rect x={v.x0} y={v.y0} width={v.x1 - v.x0} height={v.y1 - v.y0} fill={`url(#${hatch})`} className="doc-ill-plane" />
          <g clipPath={`url(#${clip})`}>
            {data.yTicks.map((t) => <line key={`gy${t.v}`} x1={v.x0} x2={v.x1} y1={t.y} y2={t.y} className="doc-ill-grid" />)}
            {data.xTicks.map((t) => <line key={`gx${t.v}`} y1={v.y0} y2={v.y1} x1={t.x} x2={t.x} className="doc-ill-grid" />)}
            {st.near && <path d={st.near} className="mk-ev-near" fillRule="evenodd" />}
            {st.direct && <path d={st.direct} className="mk-ev-direct" fillRule="evenodd" />}
            {others.map((o) => o.near && <path key={o.k} d={o.near} className="mk-envelope" />)}
            <line x1={probe.x} y1={probe.y} x2={test.x} y2={test.y} className="doc-ill-gap" />
            {isPub ? <circle cx={test.x} cy={test.y} r={4.4} className="mk-ring" /> : <circle cx={test.x} cy={test.y} r={3} className="mk-dot" />}
            <circle cx={probe.x} cy={probe.y} r={7} className="doc-ill-probe-ring" />
            <circle cx={probe.x} cy={probe.y} r={3} className="mk-probe" />
          </g>
          {st.nearTop && <text x={st.nearTop[0]} y={st.nearTop[1] + 14} className="doc-ill-region" textAnchor="middle">D ≤ {VERDICT_THRESHOLDS.near}</text>}
          {st.directTop && <text x={st.directTop[0]} y={st.directTop[1] + 14} className="doc-ill-region" textAnchor="middle">D ≤ {VERDICT_THRESHOLDS.direct}</text>}
          <text x={test.x - 10} y={test.y + 18} className="doc-ill-label" textAnchor="end">Example test</text>
          <text x={probe.x + 12} y={probe.y - 10} className="doc-ill-label doc-ill-label--probe">Probe</text>
          {noDirect && (
            <text x={(v.x0 + v.x1) / 2} y={v.y0 + 18} className="doc-ill-note" textAnchor="middle">{st.near === "" ? `No D ≤ ${VERDICT_THRESHOLDS.direct} or D ≤ ${VERDICT_THRESHOLDS.near} region` : `No D ≤ ${VERDICT_THRESHOLDS.direct} region`}: the flow gap alone is {Math.abs(flowGap).toFixed(2)}</text>
          )}
          <rect x={v.x0} y={v.y0} width={v.x1 - v.x0} height={v.y1 - v.y0} className="doc-ill-frame" />
          {data.xTicks.map((t) => <text key={`tx${t.v}`} x={t.x} y={v.y1 + 16} className="doc-ill-tick" textAnchor="middle">{t.v}</text>)}
          {data.yTicks.map((t) => <text key={`ty${t.v}`} x={v.x0 - 8} y={t.y + 4} className="doc-ill-tick" textAnchor="end">{t.v}</text>)}
          <text x={(v.x0 + v.x1) / 2} y={v.h - 4} className="doc-ill-axis" textAnchor="middle">Oxygen, % by volume</text>
          <text transform={`translate(12 ${(v.y0 + v.y1) / 2}) rotate(-90)`} className="doc-ill-axis" textAnchor="middle">Pressure, kPa (log)</text>
        </svg>

        <div className="doc-ill-readout">
          <p className="ui-label">Probe to example test</p>
          <p className="doc-ill-d" aria-live="polite">
            <span className="doc-ill-d-sym">D</span> <span className="num">{st.D.toFixed(2)}</span>{" "}
            <span className="doc-ill-class">{st.verdict}</span>
          </p>
          <dl className="doc-ill-gaps">
            <div><dt>O₂ gap</dt><dd className="num">{st.gaps.o2 == null ? "—" : sgn(st.gaps.o2)}</dd></div>
            <div><dt>Pressure gap</dt><dd className="num">{st.gaps.pressure == null ? "—" : sgn(st.gaps.pressure)}</dd></div>
            <div><dt>Flow gap</dt><dd className="num">{st.gaps.flow == null ? "not compared" : sgn(st.gaps.flow)}</dd></div>
          </dl>
          <p className="doc-ill-scales">
            Gaps in scaled units (test minus probe). Scales at {factorText(k)}: {trim(st.scales.o2Pts)} pts O₂, ×{trim(st.scales.pressureRatio)} pressure, {trim(st.scales.flowCmS)} cm/s flow.
          </p>
          {flowGap !== 0 && (
            <p className="doc-ill-caution">The probe&rsquo;s flow differs from the test&rsquo;s, so the flow gap is part of D everywhere on this plane and both regions shrink.</p>
          )}
        </div>
      </div>

      <KeyList
        className="doc-ill-key"
        label="Illustration key"
        items={[
          { swatch: <Swatch kind="direct" />, text: `D ≤ ${VERDICT_THRESHOLDS.direct} from the example test (DIRECT)` },
          { swatch: <Swatch kind="near" />, text: `D ≤ ${VERDICT_THRESHOLDS.near} (NEAR)` },
          { swatch: <Swatch kind="envelope" />, text: `D = ${VERDICT_THRESHOLDS.near} at the other two scale settings` },
          { swatch: <Swatch kind="test" />, text: isPub ? "Example test (published, not in PSI)" : "Example test (PSI run)" },
          { swatch: <Swatch kind="probe" />, text: "Probe (a scenario)" },
        ]}
      />
    </div>
  );
}
