"use client";
/**
 * Scenario console: the probe's settings. Landmark, question, O₂, pressure (kPa or psia), material class,
 * assumed ventilation flow and whether published evidence counts. Gravity is not here: it is the regime
 * selector in the bottom instrument strip (a separate evidence regime, never a slider).
 */
import { useState } from "react";
import { kPaToPsia, psiaToKPa } from "@/lib/engine";
import type { Hazard, MaterialClass, Scenario } from "@/lib/schema";
import { HAZARDS, PRESETS } from "@/content/curated";
import { NumberField, RadioGroup, SelectField, Switch } from "@/components/ui/controls";

/** Labelled flow stops (UI choices, cm/s); null = quiescent. */
export const FLOW_STOPS: (number | null)[] = [null, 5, 10, 20, 30];

export default function Console({ scenario: s, preset, update, applyPreset }: {
  scenario: Scenario; preset: string | null;
  update: (patch: Partial<Scenario>, keepPreset?: boolean) => void;
  applyPreset: (id: string) => void;
}) {
  const flowOpts = FLOW_STOPS.includes(s.flowCmS) ? FLOW_STOPS : [...FLOW_STOPS, s.flowCmS];
  const [psiaUnit, setPsiaUnit] = useState(false);
  const pShown = psiaUnit ? +kPaToPsia(s.pressureKPa).toFixed(2) : +s.pressureKPa.toFixed(1);
  return (
    <div className="con" role="group" aria-label="Scenario" data-testid="scenario-toolbar">
      <SelectField id="atlas-preset" label="Landmark" value={preset ?? ""} onChange={(v) => v && applyPreset(v)} inline>
        <option value="">Custom position</option>
        {PRESETS.map((a) => <option key={a.id} value={a.id}>{a.short} · {a.o2Pct}% O₂ · {a.pressurePsia} psia</option>)}
      </SelectField>
      <SelectField id="atlas-q" label="Question" value={s.hazard} onChange={(v) => update({ hazard: v as Hazard }, true)} inline>
        {HAZARDS.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
      </SelectField>
      <div className="con-pair">
        <NumberField id="atlas-o2" label="O₂" value={+s.o2Pct.toFixed(2)} min={0.1} max={100} step={0.1} unit="%" onCommit={(v) => update({ o2Pct: v })} />
        <NumberField id="atlas-p" label="Pressure" value={pShown} min={psiaUnit ? 0.2 : 1} max={psiaUnit ? 145 : 1000} step={psiaUnit ? 0.1 : 0.5}
          unit={psiaUnit ? "psia" : "kPa"} onCommit={(v) => update({ pressureKPa: psiaUnit ? +psiaToKPa(v).toFixed(2) : v })}
          unitToggle={{ label: "psia", pressed: psiaUnit, onToggle: () => setPsiaUnit((u) => !u), title: "Switch pressure unit between kPa and psia" }} />
      </div>
      <RadioGroup<MaterialClass> label="Material" options={["any", "thin", "thick"]} value={s.materialClass} onChange={(v) => update({ materialClass: v }, true)} render={(v) => v} size="sm" />
      <RadioGroup<number | null> label="Assumed flow, cm/s" options={flowOpts} value={s.flowCmS} onChange={(v) => update({ flowCmS: v }, true)}
        render={(v) => (v == null ? "quiescent" : String(v))} aria={(v) => (v == null ? "quiescent" : `${v} centimetres per second`)} size="sm" />
      <Switch checked={s.includePublished} onChange={(v) => update({ includePublished: v }, true)} label="Include published evidence" />
    </div>
  );
}
