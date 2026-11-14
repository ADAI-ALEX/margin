"use client";
import { useId, useRef, useState } from "react";
import type { Gravity, MaterialClass, Scenario } from "@/lib/schema";
import { kPaToPsia, psiaToKPa } from "@/lib/engine";
import { HAZARDS, PRESETS } from "../shared/content";
import { GRAVITY_LABEL, GRAVITY_SHORT, fmt } from "../shared/format";
import type { PUnit } from "./units";
import s from "./console.module.css";

const GRAVITIES: Gravity[] = ["micro", "moon", "mars", "earth"];
const FLOW_CHIPS: (number | null)[] = [null, 5, 10, 20, 30];
const MATERIALS: { id: MaterialClass; label: string }[] = [
  { id: "any", label: "Any" }, { id: "thin", label: "Thin" }, { id: "thick", label: "Thick" },
];

interface Props {
  scenario: Scenario;
  update: (patch: Partial<Scenario>, keepPreset?: boolean) => void;
  preset: string | null;
  applyPreset: (id: string) => void;
  unit: PUnit;
  setUnit: (u: PUnit) => void;
}

export default function ScenarioControls({ scenario, update, preset, applyPreset, unit, setUnit }: Props) {
  const pDisplay = unit === "kPa" ? scenario.pressureKPa : kPaToPsia(scenario.pressureKPa);
  const isChip = FLOW_CHIPS.includes(scenario.flowCmS);

  return (
    <div className={s.controls}>
      <Group title="Reference atmosphere" hint="preset">
        <div className={s.presetList} role="group" aria-label="Reference atmosphere presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              className={s.presetBtn}
              onClick={() => applyPreset(p.id)}
              title={`${p.label} · ${p.source}${p.note ? ` · ${p.note}` : ""}`}
            >
              <span className={s.presetName}>{p.short}</span>
              <span className={s.presetVals}>{fmt(p.o2Pct)}% · {unit === "kPa" ? `${fmt(p.pressureKPa)} kPa` : `${fmt(p.pressurePsia)} psia`}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Atmosphere">
        <Stepper
          label="O₂"
          unitText="% vol"
          value={scenario.o2Pct}
          decimals={1}
          step={0.5}
          min={5}
          max={100}
          onChange={(v) => update({ o2Pct: v })}
        />
        <Stepper
          label="Total pressure"
          unitText={unit}
          value={pDisplay}
          decimals={unit === "kPa" ? 1 : 2}
          step={unit === "kPa" ? 1 : 0.1}
          min={unit === "kPa" ? 5 : 0.7}
          max={unit === "kPa" ? 700 : 100}
          onChange={(v) => update({ pressureKPa: unit === "kPa" ? v : psiaToKPa(v) })}
          trailing={
            <div className={s.unitToggle} role="radiogroup" aria-label="Pressure unit">
              {(["kPa", "psia"] as PUnit[]).map((u) => (
                <button key={u} type="button" role="radio" aria-checked={unit === u} onClick={() => setUnit(u)}>{u}</button>
              ))}
            </div>
          }
          secondary={unit === "kPa" ? `${fmt(kPaToPsia(scenario.pressureKPa), 2)} psia` : `${fmt(scenario.pressureKPa)} kPa`}
        />
      </Group>

      <Group title="Ventilation flow" hint="cm/s">
        <div className={s.chips} role="radiogroup" aria-label="Ventilation flow">
          {FLOW_CHIPS.map((f) => (
            <button
              key={String(f)}
              type="button"
              role="radio"
              aria-checked={scenario.flowCmS === f}
              className={s.chip}
              onClick={() => update({ flowCmS: f })}
            >
              {f == null ? "quiescent" : f}
            </button>
          ))}
        </div>
        <Stepper
          label="Custom"
          unitText="cm/s"
          value={scenario.flowCmS ?? 0}
          decimals={1}
          step={1}
          min={0}
          max={200}
          compact
          dim={isChip}
          onChange={(v) => update({ flowCmS: v === 0 ? null : v })}
          secondary={scenario.flowCmS == null ? "quiescent (no forced flow)" : undefined}
        />
      </Group>

      <Group title="Gravity regime" hint="categorical">
        <GravityRadio value={scenario.gravity} onChange={(g) => update({ gravity: g })} />
        <p className={s.ctrlNote}>Regimes are compared separately. No distance is computed across gravity levels.</p>
      </Group>

      <Group title="Question">
        <div className={s.segGrid} role="radiogroup" aria-label="Fire-safety question">
          {HAZARDS.map((h) => (
            <button key={h.id} type="button" role="radio" aria-checked={scenario.hazard === h.id} className={s.segBtn} onClick={() => update({ hazard: h.id }, true)}>
              {h.label}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Material class">
        <div className={s.seg3} role="radiogroup" aria-label="Material class">
          {MATERIALS.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={scenario.materialClass === m.id} className={s.segBtn} onClick={() => update({ materialClass: m.id }, true)}>
              {m.label}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Evidence tiers">
        <button
          type="button"
          role="switch"
          aria-checked={scenario.includePublished}
          className={s.switchRow}
          onClick={() => update({ includePublished: !scenario.includePublished }, true)}
        >
          <span className={s.switchTrack}><span className={s.switchKnob} /></span>
          <span>
            <span className={s.switchLabel}>Include published evidence</span>
            <span className={s.switchSub}>T3 values transcribed from papers, unverified. Planned tests (T4) are never counted.</span>
          </span>
        </button>
      </Group>
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className={s.group}>
      <legend className={s.groupTitle}>{title}{hint && <span className={s.groupHint}>{hint}</span>}</legend>
      {children}
    </fieldset>
  );
}

interface StepperProps {
  label: string; unitText: string; value: number; decimals: number; step: number; min: number; max: number;
  onChange: (v: number) => void; trailing?: React.ReactNode; secondary?: string; compact?: boolean; dim?: boolean;
}
function Stepper({ label, unitText, value, decimals, step, min, max, onChange, trailing, secondary, compact, dim }: StepperProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const id = useId();
  const clamp = (v: number) => Math.min(max, Math.max(min, +v.toFixed(4)));
  const commit = () => {
    if (draft != null) {
      const n = Number(draft.replace(",", "."));
      if (draft.trim() !== "" && Number.isFinite(n)) onChange(clamp(n));
    }
    setDraft(null);
  };
  const bump = (dir: 1 | -1, mult = 1) => onChange(clamp(Math.round((value + dir * step * mult) / step) * step));
  return (
    <div className={compact ? s.stepperCompact : s.stepper} data-dim={dim || undefined}>
      <div className={s.stepHead}>
        <label htmlFor={id} className={s.stepLabel}>{label}</label>
        {trailing}
      </div>
      <div className={s.stepBody}>
        <button type="button" className={s.stepBtn} aria-label={`Decrease ${label}`} onClick={(e) => bump(-1, e.shiftKey ? 10 : 1)}>−</button>
        <div className={s.stepField}>
          <input
            id={id}
            className={s.numInput}
            inputMode="decimal"
            value={draft ?? value.toFixed(decimals)}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { commit(); e.currentTarget.blur(); }
              else if (e.key === "Escape") { setDraft(null); e.currentTarget.blur(); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setDraft(null); bump(1, e.shiftKey ? 10 : 1); }
              else if (e.key === "ArrowDown") { e.preventDefault(); setDraft(null); bump(-1, e.shiftKey ? 10 : 1); }
            }}
          />
          <span className={s.stepUnit}>{unitText}</span>
        </div>
        <button type="button" className={s.stepBtn} aria-label={`Increase ${label}`} onClick={(e) => bump(1, e.shiftKey ? 10 : 1)}>+</button>
      </div>
      {secondary && <div className={s.stepSecondary}>{secondary}</div>}
    </div>
  );
}

function GravityRadio({ value, onChange }: { value: Gravity; onChange: (g: Gravity) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % GRAVITIES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + GRAVITIES.length) % GRAVITIES.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = GRAVITIES.length - 1;
    if (n >= 0) { e.preventDefault(); onChange(GRAVITIES[n]); refs.current[n]?.focus(); }
  };
  return (
    <div className={s.gravity} role="radiogroup" aria-label="Gravity regime">
      {GRAVITIES.map((g, i) => (
        <button
          key={g}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          role="radio"
          aria-checked={value === g}
          tabIndex={value === g ? 0 : -1}
          className={s.gravBtn}
          onClick={() => onChange(g)}
          onKeyDown={(e) => onKey(e, i)}
          title={GRAVITY_LABEL[g]}
        >
          <span className={s.gravShort}>{GRAVITY_SHORT[g]}</span>
          <span className={s.gravLong}>{GRAVITY_LABEL[g].replace(/^\S+\s?/, "") || GRAVITY_LABEL[g]}</span>
        </button>
      ))}
    </div>
  );
}
