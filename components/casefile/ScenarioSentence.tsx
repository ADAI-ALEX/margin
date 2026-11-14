"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import type { Gravity, Hazard, MaterialClass } from "@/lib/schema";
import { kPaToPsia, psiaToKPa } from "@/lib/engine";
import { LIMITS } from "@/lib/state/scenarioQuery";
import { HAZARDS, PRESETS } from "@/content/curated";
import { GRAVITY_SHORT, GRAVITY_LABEL } from "@/lib/format";
import type { MarginState } from "@/lib/state/useMargin";
import { GRAVS } from "./derive";
import css from "./casefile.module.css";

export type PUnit = "kPa" | "psia";
const FLOW_STOPS: (number | null)[] = [null, 5, 10, 15, 20, 30];
const MATERIAL: { id: MaterialClass; label: string }[] = [
  { id: "any", label: "any material" },
  { id: "thin", label: "thin materials" },
  { id: "thick", label: "thick materials" },
];

/** Uncontrolled numeric field: remounted via `key` when the committed value changes; commits on blur / Enter. */
function NumField({ value, digits, min, max, step, label, onCommit, width }: { value: number; digits: number; min: number; max: number; step: number; label: string; onCommit: (v: number) => void; width: string }) {
  const commit = (el: HTMLInputElement) => {
    const v = Number(el.value);
    if (el.value.trim() === "" || !Number.isFinite(v)) { el.value = value.toFixed(digits); return; }
    const c = Math.min(max, Math.max(min, v));
    if (Math.abs(c - value) > 1e-9) onCommit(c); else el.value = value.toFixed(digits);
  };
  return (
    <input
      key={value.toFixed(digits)}
      className={css.numField}
      style={{ width }}
      type="number"
      inputMode="decimal"
      aria-label={label}
      defaultValue={value.toFixed(digits)}
      min={min} max={max} step={step}
      onBlur={(e) => commit(e.currentTarget)}
      onKeyDown={(e) => { if (e.key === "Enter") commit(e.currentTarget); }}
    />
  );
}

/** Gravity is a set of separate regimes: a radiogroup (arrow keys), never a slider. */
export function GravityRadios({ value, onChange }: { value: Gravity; onChange: (g: Gravity) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let j = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % GRAVS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + GRAVS.length) % GRAVS.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = GRAVS.length - 1;
    if (j < 0) return;
    e.preventDefault();
    onChange(GRAVS[j]);
    refs.current[j]?.focus();
  };
  return (
    <span role="radiogroup" aria-label="Gravity regime" className={css.seg}>
      {GRAVS.map((g, i) => (
        <button
          key={g}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          role="radio"
          aria-checked={value === g}
          tabIndex={value === g ? 0 : -1}
          title={GRAVITY_LABEL[g]}
          className={css.segBtn}
          onClick={() => onChange(g)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {GRAVITY_SHORT[g]}
        </button>
      ))}
    </span>
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
    <section className={css.scenario} aria-labelledby="inv-scenario-h">
      <div className={css.scenHead}>
        <h2 className={css.panelTitle} id="inv-scenario-h"><i className={css.scenKey} aria-hidden="true" />Your scenario</h2>
        <span className={css.headNote}>Shared with the Atlas through the link</span>
      </div>
      <p className={css.sentence}>
        <span className={css.field}>
          <select aria-label="Question asked of the evidence" className={css.select} value={s.hazard} onChange={(e) => update({ hazard: e.target.value as Hazard }, true)}>
            {HAZARDS.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
          </select>
        </span>
        <span className={css.joiner}>at</span>
        <span className={css.field}>
          <NumField value={s.o2Pct} digits={1} min={LIMITS.o2[0]} max={LIMITS.o2[1]} step={0.1} label="Oxygen, percent by volume" width="5.6ch" onCommit={(v) => update({ o2Pct: v })} />
          <span className={css.unit}>% O₂</span>
        </span>
        <span className={css.joiner}>and</span>
        <span className={css.field}>
          <NumField
            key={pUnit}
            value={+pShown.toFixed(pUnit === "kPa" ? 1 : 2)}
            digits={pUnit === "kPa" ? 1 : 2}
            min={pUnit === "kPa" ? pMin : +kPaToPsia(pMin).toFixed(2)} max={pUnit === "kPa" ? pMax : +kPaToPsia(pMax).toFixed(2)} step={pUnit === "kPa" ? 0.1 : 0.01}
            label={`Total pressure, ${pUnit}`} width="6.6ch"
            onCommit={(v) => update({ pressureKPa: pUnit === "kPa" ? v : +psiaToKPa(v).toFixed(2) })}
          />
          <span className={css.unitToggle} role="group" aria-label="Pressure unit">
            {(["kPa", "psia"] as PUnit[]).map((u) => (
              <button key={u} type="button" aria-pressed={pUnit === u} onClick={() => setPUnit(u)}>{u}</button>
            ))}
          </span>
        </span>
        <span className={css.joiner}>with</span>
        <span className={css.field}>
          <select
            aria-label="Ventilation flow"
            className={css.select}
            value={showCustom ? "custom" : s.flowCmS == null ? "q" : String(s.flowCmS)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "custom") { setCustomFlow(true); return; }
              setCustomFlow(false);
              update({ flowCmS: v === "q" ? null : Number(v) });
            }}
          >
            {FLOW_STOPS.map((f) => <option key={String(f)} value={f == null ? "q" : String(f)}>{f == null ? "quiescent air" : `${f} cm/s flow`}</option>)}
            <option value="custom">custom flow…</option>
          </select>
          {showCustom && (
            <>
              <NumField value={s.flowCmS ?? 0} digits={1} min={LIMITS.flowCmS[0]} max={LIMITS.flowCmS[1]} step={0.5} label="Custom flow, cm/s" width="5.6ch" onCommit={(v) => update({ flowCmS: v })} />
              <span className={css.unit}>cm/s</span>
            </>
          )}
        </span>
        <span className={css.joiner}>in</span>
        <span className={css.field}><GravityRadios value={s.gravity} onChange={(g) => update({ gravity: g })} /></span>
        <span className={css.joiner}>for</span>
        <span className={css.field}>
          <select aria-label="Material class" className={css.select} value={s.materialClass} onChange={(e) => update({ materialClass: e.target.value as MaterialClass }, true)}>
            {MATERIAL.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </span>
      </p>
      <div className={css.sentenceFoot}>
        <div className={css.presets} role="group" aria-label="Reference atmospheres">
          <span className={css.footLabel}>Reference atmospheres</span>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} className={css.preset} onClick={() => { setCustomFlow(false); applyPreset(p.id); }} title={`${p.label} · ${p.source}`}>
              {p.short}
            </button>
          ))}
        </div>
        <label className={css.pubToggle}>
          <input type="checkbox" role="switch" className={css.switch} checked={s.includePublished} onChange={(e) => update({ includePublished: e.target.checked }, true)} />
          <span>Include published evidence <span className={css.quiet}>(not in PSI)</span></span>
        </label>
      </div>
    </section>
  );
}
