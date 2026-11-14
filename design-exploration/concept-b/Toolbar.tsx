"use client";
import { useRef } from "react";
import type { Gravity, Hazard, MaterialClass, Scenario } from "@/lib/schema";
import { HAZARDS, PRESETS } from "../shared/content";
import { GRAVITY_LABEL, GRAVITY_SHORT } from "../shared/format";
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

export default function Toolbar({ scenario, preset, update, applyPreset }: {
  scenario: Scenario; preset: string | null;
  update: (patch: Partial<Scenario>, keepPreset?: boolean) => void;
  applyPreset: (id: string) => void;
}) {
  const flowOpts = FLOW_STOPS.includes(scenario.flowCmS) ? FLOW_STOPS : [...FLOW_STOPS, scenario.flowCmS];
  return (
    <div className="atlas-toolbar" role="toolbar" aria-label="Scenario">
      <div className="atlas-field">
        <label className="atlas-field-label" htmlFor="atlas-q">Question</label>
        <select id="atlas-q" className="atlas-select" value={scenario.hazard} onChange={(e) => update({ hazard: e.target.value as Hazard }, true)}>
          {HAZARDS.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
        </select>
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
        onChange={(v) => update({ flowCmS: v })}
        render={(v) => (v == null ? "quiescent" : String(v))}
        aria={(v) => (v == null ? "quiescent" : `${v} centimetres per second`)}
      />
      <Segmented<Gravity>
        label="Gravity"
        options={GRAVITIES}
        value={scenario.gravity}
        onChange={(v) => update({ gravity: v })}
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
      <div className="atlas-field">
        <label className="atlas-field-label" htmlFor="atlas-preset">Landmark</label>
        <select id="atlas-preset" className="atlas-select" value={preset ?? ""} onChange={(e) => e.target.value && applyPreset(e.target.value)}>
          <option value="">Custom position</option>
          {PRESETS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </div>
    </div>
  );
}
