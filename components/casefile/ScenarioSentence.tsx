"use client";
/**
 * The scenario as one sentence of instrument controls: question · O₂ · pressure · flow · gravity regime · material.
 * Shared with the Atlas through the URL (useMargin). Gravity is a radiogroup of four separate regimes, never a slider.
 */
import { useState } from "react";
import type { Gravity, Hazard, MaterialClass } from "@/lib/schema";
import { kPaToPsia, psiaToKPa } from "@/lib/engine";
import { LIMITS } from "@/lib/state/scenarioQuery";
import { HAZARDS, PRESETS } from "@/content/curated";
import { GRAVITY_SHORT, GRAVITY_LABEL } from "@/lib/format";
import type { MarginState } from "@/lib/state/useMargin";
import { RadioGroup, Switch } from "@/components/ui/controls";
import { GRAVS } from "./derive";
import css from "./casefile.module.css";

export type PUnit = "kPa" | "psia";
const FLOW_STOPS: (number | null)[] = [null, 5, 10, 15, 20, 30];
const MATERIAL: { id: MaterialClass; label: string }[] = [
  { id: "any", label: "any material" },
  { id: "thin", label: "thin materials" },
  { id: "thick", label: "thick materials" },
];

const Caret = () => (
  <svg className="ui-select-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
);

/** Uncontrolled numeric field: remounted via `key` when the committed value changes; commits on blur / Enter. */
function NumField({ value, digits, min, max, step, label, onCommit, unit, unitSlot, width }: {
  value: number; digits: number; min: number; max: number; step: number; label: string; onCommit: (v: number) => void; unit?: string; unitSlot?: React.ReactNode; width: string;
}) {
  const commit = (el: HTMLInputElement) => {
    const v = Number(el.value);
    if (el.value.trim() === "" || !Number.isFinite(v)) { el.value = value.toFixed(digits); return; }
    const c = Math.min(max, Math.max(min, v));
    if (Math.abs(c - value) > 1e-9) onCommit(c); else el.value = value.toFixed(digits);
  };
  return (
    <span className={`ui-num ${css.sNum}`}>
      <input
        key={value.toFixed(digits)}
        className="ui-num-input num"
        style={{ width }}
        type="number"
        inputMode="decimal"
        aria-label={label}
        defaultValue={value.toFixed(digits)}
        min={min} max={max} step={step}
        onBlur={(e) => commit(e.currentTarget)}
        onKeyDown={(e) => { if (e.key === "Enter") commit(e.currentTarget); }}
      />
      {unitSlot ?? <span className="ui-num-unit" aria-hidden="true">{unit}</span>}
    </span>
  );
}

function Select({ label, value, onChange, children, className }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return (
    <span className={`ui-select-wrap ${css.sSelect} ${className ?? ""}`}>
      <select aria-label={label} className="ui-select" value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
      <Caret />
    </span>
  );
}

/** Gravity is a set of separate regimes: a radiogroup (arrow keys), never a slider. */
export function GravityRadios({ value, onChange }: { value: Gravity; onChange: (g: Gravity) => void }) {
  return (
    <RadioGroup<Gravity>
      label="Gravity regime" labelHidden options={GRAVS} value={value} onChange={onChange}
      aria={(g) => GRAVITY_LABEL[g]} render={(g) => GRAVITY_SHORT[g]} className={css.sGravity}
    />
  );
}

export function ScenarioSentence({ m, pUnit, setPUnit }: { m: MarginState; pUnit: PUnit; setPUnit: (u: PUnit) => void }) {
  const { scenario: s, update, preset, applyPreset } = m;
  const [customFlow, setCustomFlow] = useState(false);
  const flowIsStop = FLOW_STOPS.includes(s.flowCmS);
  const showCustom = customFlow || !flowIsStop;
  const pShown = pUnit === "kPa" ? s.pressureKPa : kPaToPsia(s.pressureKPa);
  const [pMin, pMax] = LIMITS.pressureKPa;

  return (
    <section className={`ui-panel ${css.scenario}`} aria-labelledby="inv-scenario-h">
      <div className="ui-panel-head">
        <h2 className="ui-panel-label" id="inv-scenario-h"><i className={css.scenKey} aria-hidden="true" />Your scenario</h2>
        <span className="ui-panel-rule" aria-hidden="true" />
        <span className={css.headNote}>Shared with the Atlas through the link</span>
      </div>
      <div className={css.sentence}>
        <Select label="Question asked of the evidence" value={s.hazard} onChange={(v) => update({ hazard: v as Hazard }, true)}>
          {HAZARDS.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
        </Select>
        <span className={css.joiner}>at</span>
        <NumField value={s.o2Pct} digits={1} min={LIMITS.o2[0]} max={LIMITS.o2[1]} step={0.1} label="Oxygen, percent by volume" unit="% O₂" width="5ch" onCommit={(v) => update({ o2Pct: v })} />
        <span className={css.joiner}>and</span>
        <NumField
          key={pUnit}
          value={+pShown.toFixed(pUnit === "kPa" ? 1 : 2)}
          digits={pUnit === "kPa" ? 1 : 2}
          min={pUnit === "kPa" ? pMin : +kPaToPsia(pMin).toFixed(2)} max={pUnit === "kPa" ? pMax : +kPaToPsia(pMax).toFixed(2)} step={pUnit === "kPa" ? 0.1 : 0.01}
          label={`Total pressure, ${pUnit}`} width="5.6ch"
          onCommit={(v) => update({ pressureKPa: pUnit === "kPa" ? v : +psiaToKPa(v).toFixed(2) })}
          unitSlot={
            <button type="button" className="ui-num-unit is-toggle" onClick={() => setPUnit(pUnit === "kPa" ? "psia" : "kPa")} aria-label={`Pressure unit: ${pUnit}. Switch to ${pUnit === "kPa" ? "psia" : "kPa"}`}>{pUnit}</button>
          }
        />
        <span className={css.joiner}>with</span>
        <Select
          label="Ventilation flow"
          value={showCustom ? "custom" : s.flowCmS == null ? "q" : String(s.flowCmS)}
          onChange={(v) => {
            if (v === "custom") { setCustomFlow(true); return; }
            setCustomFlow(false);
            update({ flowCmS: v === "q" ? null : Number(v) });
          }}
        >
          {FLOW_STOPS.map((f) => <option key={String(f)} value={f == null ? "q" : String(f)}>{f == null ? "quiescent air" : `${f} cm/s flow`}</option>)}
          <option value="custom">custom flow…</option>
        </Select>
        {showCustom && (
          <NumField value={s.flowCmS ?? 0} digits={1} min={LIMITS.flowCmS[0]} max={LIMITS.flowCmS[1]} step={0.5} label="Custom flow, cm/s" unit="cm/s" width="5ch" onCommit={(v) => update({ flowCmS: v })} />
        )}
        <span className={css.joiner}>in</span>
        <GravityRadios value={s.gravity} onChange={(g) => update({ gravity: g })} />
        <span className={css.joiner}>for</span>
        <Select label="Material class" value={s.materialClass} onChange={(v) => update({ materialClass: v as MaterialClass }, true)}>
          {MATERIAL.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </Select>
      </div>
      <div className={css.sentenceFoot}>
        <div className={css.presets} role="group" aria-labelledby="inv-presets-l">
          <span className="ui-label" id="inv-presets-l">Reference atmospheres</span>
          <span className={css.presetBtns}>
            {PRESETS.map((p) => (
              <button key={p.id} type="button" aria-pressed={preset === p.id} className={`ui-btn ${css.preset}`} onClick={() => { setCustomFlow(false); applyPreset(p.id); }} title={`${p.label} · ${p.source}`}>
                {p.short}
              </button>
            ))}
          </span>
        </div>
        <Switch checked={s.includePublished} onChange={(v) => update({ includePublished: v }, true)} label="Include published evidence (not in PSI)" />
      </div>
    </section>
  );
}
