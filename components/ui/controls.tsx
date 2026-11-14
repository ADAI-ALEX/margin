"use client";
/**
 * Form-like instrument controls shared by every route. One implementation each:
 * RadioGroup (segmented control or discrete detents), Switch, SelectField, NumberField (with unit toggle).
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ RadioGroup */
export interface RadioGroupProps<T> {
  /** Visible group label. Use `labelHidden` to keep it for screen readers only. */
  label: string;
  labelHidden?: boolean;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T, on: boolean) => ReactNode;
  /** Accessible name per option (defaults to the rendered text). */
  aria?: (v: T) => string;
  variant?: "segmented" | "detents";
  size?: "sm" | "md";
  className?: string;
  id?: string;
}

/**
 * A radiogroup with roving tabindex: arrows, Home and End move the selection and the focus.
 * Never a slider: options are discrete and nothing is drawn between them.
 */
export function RadioGroup<T extends string | number | null>(p: RadioGroupProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const lid = p.id ? `${p.id}-label` : `rg-${uid}`;
  const idx = p.options.indexOf(p.value);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = p.options.length;
    let k = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") k = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") k = (i - 1 + n) % n;
    else if (e.key === "Home") k = 0;
    else if (e.key === "End") k = n - 1;
    if (k < 0) return;
    e.preventDefault();
    p.onChange(p.options[k]);
    refs.current[k]?.focus();
  };
  return (
    <div className={`ui-rg ui-rg--${p.variant ?? "segmented"} ui-rg--${p.size ?? "md"} ${p.className ?? ""}`}>
      <span id={lid} className={p.labelHidden ? "sr-only" : "ui-label"}>{p.label}</span>
      <div className="ui-rg-track" role="radiogroup" aria-labelledby={lid}>
        {p.options.map((o, i) => {
          const on = o === p.value;
          return (
            <button
              key={String(o)}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={p.aria?.(o)}
              tabIndex={on || (idx < 0 && i === 0) ? 0 : -1}
              className="ui-rg-opt"
              data-on={on || undefined}
              onClick={() => p.onChange(o)}
              onKeyDown={(e) => onKey(e, i)}
            >{p.render(o, on)}</button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Switch */
export function Switch({ checked, onChange, label, id, className }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string; className?: string }) {
  const uid = useId();
  const tid = `${id ?? `sw-${uid}`}-t`;
  return (
    <button type="button" role="switch" id={id} aria-checked={checked} aria-labelledby={tid} className={`ui-switch ${className ?? ""}`} data-on={checked || undefined} onClick={() => onChange(!checked)}>
      <span className="ui-switch-box" aria-hidden="true"><span /></span>
      <span id={tid} className="ui-switch-text">{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ SelectField */
export function SelectField({ id, label, value, onChange, children, inline }: {
  id: string; label: string; value: string; onChange: (v: string) => void; children: ReactNode; inline?: boolean;
}) {
  return (
    <div className={`ui-field${inline ? " ui-field--inline" : ""}`}>
      <label className="ui-label" htmlFor={id}>{label}</label>
      <span className="ui-select-wrap">
        <select id={id} className="ui-select" value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
        <svg className="ui-select-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ NumberField */
/** Commits on blur or Enter, so typing "3" on the way to "34" does not move the scenario. */
export function NumberField({ id, label, value, onCommit, min, max, step, unit, unitToggle, inline }: {
  id: string; label: string; value: number; onCommit: (v: number) => void; min: number; max: number; step: number; unit: string;
  unitToggle?: { label: string; pressed: boolean; onToggle: () => void; title: string };
  inline?: boolean;
}) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => { setTxt(String(value)); }, [value]); // eslint-disable-line react-hooks/set-state-in-effect
  const commit = () => {
    const v = Number(txt);
    if (txt.trim() !== "" && Number.isFinite(v)) onCommit(Math.min(max, Math.max(min, v)));
    else setTxt(String(value));
  };
  return (
    <div className={`ui-field${inline ? " ui-field--inline" : ""}`}>
      <label className="ui-label" htmlFor={id}>{label}</label>
      <span className="ui-num">
        <input id={id} className="ui-num-input num" type="number" inputMode="decimal" min={min} max={max} step={step} value={txt}
          onChange={(e) => setTxt(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); }} />
        {unitToggle ? (
          <button type="button" className="ui-num-unit is-toggle" aria-pressed={unitToggle.pressed} onClick={unitToggle.onToggle} title={unitToggle.title} aria-label={`${unitToggle.title} (now ${unit})`}>{unit}</button>
        ) : <span className="ui-num-unit">{unit}</span>}
      </span>
    </div>
  );
}
