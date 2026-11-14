"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import type { Gravity, Hazard, MaterialClass } from "@/lib/schema";
import { kPaToPsia, psiaToKPa } from "@/lib/engine";
import { HAZARDS, PRESETS } from "../shared/content";
import { GRAVITY_SHORT, GRAVITY_LABEL } from "../shared/format";
import type { MarginState } from "../shared/useMargin";
import css from "./casefile.module.css";

export type PUnit = "kPa" | "psia";
const FLOW_STOPS: (number | null)[] = [null, 5, 10, 20, 30];
const GRAVS: Gravity[] = ["micro", "moon", "mars", "earth"];
const MATERIAL: { id: MaterialClass; label: string }[] = [
  { id: "any", label: "any material" },
  { id: "thin", label: "thin materials" },
  { id: "thick", label: "thick materials" },
];

/** Uncontrolled numeric bracket: remounted via `key` when the committed value changes; commits on blur / Enter. */
function NumBracket({ value, digits, min, max, step, label, onCommit, width }: { value: number; digits: number; min: number; max: number; step: number; label: string; onCommit: (v: number) => void; width: string }) {
  const commit = (el: HTMLInputElement) => {
    const v = Number(el.value);
    if (el.value.trim() === "" || !Number.isFinite(v)) { el.value = value.toFixed(digits); return; }
    const c = Math.min(max, Math.max(min, v));
    if (Math.abs(c - value) > 1e-9) onCommit(c); else el.value = value.toFixed(digits);
  };
  return (
    <input
      key={value.toFixed(digits)}
      className={css.numBracket}
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

export function GravityRadios({ value, onChange, idPrefix }: { value: Gravity; onChange: (g: Gravity) => void; idPrefix: string }) {
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
    <span role="radiogroup" aria-label="Gravity regime" className={css.gravGroup} id={`${idPrefix}-grav`}>
      {GRAVS.map((g, i) => (
        <button
          key={g}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          role="radio"
          aria-checked={value === g}
          tabIndex={value === g ? 0 : -1}
          title={GRAVITY_LABEL[g]}
          className={css.gravOpt}
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

  return (
    <section className={css.sentenceSheet} aria-labelledby="cf-scenario-h">
      <div className={css.sheetLabel} id="cf-scenario-h">
        <span>§1</span> Scenario
        <span className={css.sheetLabelNote}>edit any bracket · every figure below recomputes</span>
      </div>
      <p className={css.sentence}>
        <span className={css.bracket}>
          <select aria-label="Question asked of the evidence" className={css.selBracket} value={s.hazard} onChange={(e) => update({ hazard: e.target.value as Hazard }, true)}>
            {HAZARDS.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
          </select>
        </span>
        <span className={css.joiner}>at</span>
        <span className={css.bracket}>
          <NumBracket value={s.o2Pct} digits={1} min={0} max={100} step={0.1} label="Oxygen, percent by volume" width="4.6ch" onCommit={(v) => update({ o2Pct: v })} />
          <span className={css.unit}>% O₂</span>
        </span>
        <span className={css.dot}>·</span>
        <span className={css.bracket}>
          <NumBracket
            key={pUnit}
            value={+pShown.toFixed(pUnit === "kPa" ? 1 : 2)}
            digits={pUnit === "kPa" ? 1 : 2}
            min={pUnit === "kPa" ? 1 : 0.15} max={pUnit === "kPa" ? 2000 : 290} step={pUnit === "kPa" ? 0.1 : 0.01}
            label={`Total pressure, ${pUnit}`} width="5.6ch"
            onCommit={(v) => update({ pressureKPa: pUnit === "kPa" ? v : +psiaToKPa(v).toFixed(2) })}
          />
          <span className={css.unitToggle} role="group" aria-label="Pressure unit">
            {(["kPa", "psia"] as PUnit[]).map((u) => (
              <button key={u} type="button" aria-pressed={pUnit === u} onClick={() => setPUnit(u)}>{u}</button>
            ))}
          </span>
        </span>
        <span className={css.dot}>·</span>
        <span className={css.bracket}>
          <select
            aria-label="Ventilation flow"
            className={css.selBracket}
            value={showCustom ? "custom" : s.flowCmS == null ? "q" : String(s.flowCmS)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "custom") { setCustomFlow(true); return; }
              setCustomFlow(false);
              update({ flowCmS: v === "q" ? null : Number(v) });
            }}
          >
            {FLOW_STOPS.map((f) => <option key={String(f)} value={f == null ? "q" : String(f)}>{f == null ? "quiescent" : `${f} cm/s`}</option>)}
            <option value="custom">custom…</option>
          </select>
          {showCustom && (
            <>
              <NumBracket value={s.flowCmS ?? 0} digits={1} min={0} max={200} step={0.5} label="Custom flow, cm/s" width="4.6ch" onCommit={(v) => update({ flowCmS: v })} />
              <span className={css.unit}>cm/s</span>
            </>
          )}
        </span>
        <span className={css.dot}>·</span>
        <span className={css.bracket}>
          <GravityRadios value={s.gravity} onChange={(g) => update({ gravity: g })} idPrefix="cf-s" />
        </span>
        <span className={css.joiner}>—</span>
        <span className={css.bracket}>
          <select aria-label="Material class" className={css.selBracket} value={s.materialClass} onChange={(e) => update({ materialClass: e.target.value as MaterialClass }, true)}>
            {MATERIAL.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </span>
      </p>
      <div className={css.sentenceFoot}>
        <div className={css.presetTabs} role="group" aria-label="Reference atmospheres">
          <span className={css.presetLabel}>Reference</span>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} className={css.presetTab} onClick={() => { setCustomFlow(false); applyPreset(p.id); }} title={`${p.label} · ${p.source}`}>
              {p.short}
            </button>
          ))}
        </div>
        <label className={css.pubToggle}>
          <input type="checkbox" role="switch" checked={s.includePublished} onChange={(e) => update({ includePublished: e.target.checked }, true)} />
          <span className={css.switchTrack} aria-hidden />
          <span>Include published evidence <em>(not in PSI)</em></span>
        </label>
      </div>
    </section>
  );
}
