"use client";
import { useEffect, useRef, useState } from "react";
import { kPaToPsia, psiaToKPa } from "@/lib/engine";
import type { Gravity, Hazard, MaterialClass, Scenario } from "@/lib/schema";
import { HAZARDS, PRESETS } from "@/content/curated";
import { GRAVITY_LABEL, GRAVITY_SHORT } from "@/lib/format";
import { GRAVITIES } from "./GravitySheets";

/** Labelled flow stops (UI choices, cm/s); null = quiescent. */
const FLOW_STOPS: (number | null)[] = [null, 5, 10, 20, 30];

function Segmented<T extends string | number | null>({ label, options, value, onChange, render, aria }: {
  label: string; options: T[]; value: T; onChange: (v: T) => void; render: (v: T) => React.ReactNode; aria?: (v: T) => string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = options.indexOf(value);
  const lid = `atlas-l-${label.replace(/[^a-z0-9]+/gi, "-")}`;
  const onKey = (e: React.KeyboardEvent, i: number) => {
    let k = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") k = (i + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") k = (i - 1 + options.length) % options.length;
    else if (e.key === "Home") k = 0;
    else if (e.key === "End") k = options.length - 1;
    if (k < 0) return;
    e.preventDefault();
    onChange(options[k]);
    refs.current[k]?.focus();
  };
  return (
    <div className="atlas-field">
      <span className="atlas-field-label" id={lid}>{label}</span>
      <div className="atlas-seg-group" role="radiogroup" aria-labelledby={lid}>
        {options.map((o, i) => (
          <button
            key={String(o)}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={o === value}
            aria-label={aria?.(o)}
            tabIndex={o === value || (idx < 0 && i === 0) ? 0 : -1}
            className={`atlas-seg-btn${o === value ? " is-on" : ""}`}
            onClick={() => onChange(o)}
            onKeyDown={(e) => onKey(e, i)}
          >{render(o)}</button>
        ))}
      </div>
    </div>
  );
}

/** Number field that commits on blur / Enter, so typing "3" on the way to "34" doesn't move the pin. */
function NumField({ id, label, value, onCommit, min, max, step, unit, children }: {
  id: string; label: string; value: number; onCommit: (v: number) => void; min: number; max: number; step: number; unit: string; children?: React.ReactNode;
}) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => { setTxt(String(value)); }, [value]); // eslint-disable-line react-hooks/set-state-in-effect
  const commit = () => {
    const v = Number(txt);
    if (txt.trim() !== "" && Number.isFinite(v)) onCommit(Math.min(max, Math.max(min, v)));
    else setTxt(String(value));
  };
  return (
    <div className="atlas-field">
      <span className="atlas-field-head">
        <label className="atlas-field-label" htmlFor={id}>{label}</label>
        {children}
      </span>
      <span className="atlas-numgroup">
        <input id={id} className="atlas-numinput" type="number" inputMode="decimal" min={min} max={max} step={step} value={txt}
          onChange={(e) => setTxt(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); }} />
        <span className="atlas-unit">{unit}</span>
      </span>
    </div>
  );
}

export default function Toolbar({ scenario, preset, update, applyPreset }: {
  scenario: Scenario; preset: string | null;
  update: (patch: Partial<Scenario>, keepPreset?: boolean) => void;
  applyPreset: (id: string) => void;
}) {
  const flowOpts = FLOW_STOPS.includes(scenario.flowCmS) ? FLOW_STOPS : [...FLOW_STOPS, scenario.flowCmS];
  const [psiaUnit, setPsiaUnit] = useState(false);
  const pShown = psiaUnit ? +kPaToPsia(scenario.pressureKPa).toFixed(2) : +scenario.pressureKPa.toFixed(1);
  return (
    <div className="atlas-toolbar" role="toolbar" aria-label="Scenario" data-testid="scenario-toolbar">
      <div className="atlas-field">
        <label className="atlas-field-label" htmlFor="atlas-preset">Landmark</label>
        <select id="atlas-preset" className="atlas-select" value={preset ?? ""} onChange={(e) => e.target.value && applyPreset(e.target.value)}>
          <option value="">Custom position</option>
          {PRESETS.map((a) => <option key={a.id} value={a.id}>{a.short} · {a.o2Pct}% O₂ · {a.pressurePsia} psia</option>)}
        </select>
      </div>
      <div className="atlas-field">
        <label className="atlas-field-label" htmlFor="atlas-q">Question</label>
        <select id="atlas-q" className="atlas-select" value={scenario.hazard} onChange={(e) => update({ hazard: e.target.value as Hazard }, true)}>
          {HAZARDS.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
        </select>
      </div>
      <div className="atlas-rail-pair">
      <NumField id="atlas-o2" label="O₂" value={+scenario.o2Pct.toFixed(2)} min={0.1} max={100} step={0.1} unit="%" onCommit={(v) => update({ o2Pct: v })} />
      <NumField id="atlas-p" label="Pressure" value={pShown} min={psiaUnit ? 0.2 : 1} max={psiaUnit ? 145 : 1000} step={psiaUnit ? 0.1 : 0.5}
        unit={psiaUnit ? "psia" : "kPa"} onCommit={(v) => update({ pressureKPa: psiaUnit ? +psiaToKPa(v).toFixed(2) : v })}>
        <button type="button" className="atlas-unit-toggle" aria-pressed={psiaUnit} onClick={() => setPsiaUnit((u) => !u)} title="Show pressure in psia">psia</button>
      </NumField>
      </div>
      <Segmented<MaterialClass>
        label="Material"
        options={["any", "thin", "thick"]}
        value={scenario.materialClass}
        onChange={(v) => update({ materialClass: v }, true)}
        render={(v) => v}
      />
      <Segmented<number | null>
        label="Flow, cm/s"
        options={flowOpts}
        value={scenario.flowCmS}
        onChange={(v) => update({ flowCmS: v }, true)}
        render={(v) => (v == null ? "quiescent" : String(v))}
        aria={(v) => (v == null ? "quiescent" : `${v} centimetres per second`)}
      />
      <Segmented<Gravity>
        label="Gravity"
        options={GRAVITIES}
        value={scenario.gravity}
        onChange={(v) => update({ gravity: v }, true)}
        render={(v) => GRAVITY_SHORT[v]}
        aria={(v) => GRAVITY_LABEL[v]}
      />
      <div className="atlas-field">
        <span className="atlas-field-label" id="atlas-pub-l">Evidence</span>
        <button
          type="button"
          role="switch"
          aria-checked={scenario.includePublished}
          aria-labelledby="atlas-pub-l atlas-pub-t"
          className={`atlas-switch${scenario.includePublished ? " is-on" : ""}`}
          onClick={() => update({ includePublished: !scenario.includePublished }, true)}
        >
          <span className="atlas-switch-box" aria-hidden="true"><span /></span>
          <span id="atlas-pub-t">Include published evidence</span>
        </button>
      </div>
      <p className="atlas-rail-note">Presets are reference cabin atmospheres. Flow is an assumed ventilation speed; gravity selects a separate evidence regime — MARGIN never estimates between regimes.</p>
    </div>
  );
}
