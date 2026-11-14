"use client";
/**
 * Concept B — ATLAS: an evidence landscape drawn as a printed scientific atlas.
 * Map-first: the O₂ × pressure plane coloured by nearest-comparable-evidence
 * distance, four separate gravity sheets, and a template-generated field-notes margin.
 */
import { useMemo, useState } from "react";
import type { Gravity, Run } from "@/lib/schema";
import { distanceField, evaluate, ROBUSTNESS_FACTORS, VERDICT_THRESHOLDS } from "@/lib/engine";
import { useMargin, DEFAULT_SCENARIO } from "@/lib/state/useMargin";
import { ALL_RUNS, HEADLINE, PSI_RUNS } from "@/lib/data";
import { ATMOSPHERES, HAZARDS, PLANNED, PRESETS, PUBLISHED } from "@/content/curated";
import { GRAVITY_LABEL } from "@/lib/format";
import { MAIN_GRID, O2_DOMAIN, P_DOMAIN, SHEET_GRID, fractionWithin, scaledField, scalesTimes } from "./geo";
import CoverageMap from "./CoverageMap";
import GravitySheets, { GRAVITIES, type SheetData } from "./GravitySheets";
import FieldNotes from "./FieldNotes";
import Toolbar from "./Toolbar";
import { KeySwatch } from "./marks";
import "./atlas.css";


export default function AtlasApp() {
  const m = useMargin("iss");
  const s = m.scenario;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverInv, setHoverInv] = useState<string | null>(null);
  const [pinnedInv, setPinnedInv] = useState<string | null>(null);

  // Everything the field depends on — and nothing it doesn't (the pin position).
  const { flowCmS, hazard, materialClass, includePublished } = s;
  const base = useMemo(() => ({ ...DEFAULT_SCENARIO, flowCmS, hazard, materialClass, includePublished }), [flowCmS, hazard, materialClass, includePublished]);
  const sheetEvals = useMemo(() => GRAVITIES.map((g) => evaluate(ALL_RUNS, { ...base, gravity: g })), [base]);
  const sheetFields = useMemo(() => sheetEvals.map((e, i) => distanceField(e, { ...base, gravity: GRAVITIES[i] }, O2_DOMAIN, P_DOMAIN, SHEET_GRID.nx, SHEET_GRID.ny)), [sheetEvals, base]);
  const comparableSets = useMemo(() => sheetEvals.map((e) => new Set(e.comparable.map((c) => c.run.id))), [sheetEvals]);

  const gi = GRAVITIES.indexOf(s.gravity);
  const fieldEval = sheetEvals[gi];
  const field = useMemo(() => distanceField(fieldEval, { ...base, gravity: GRAVITIES[gi] }, O2_DOMAIN, P_DOMAIN, MAIN_GRID.nx, MAIN_GRID.ny), [fieldEval, base, gi]);
  const envHalf = useMemo(() => scaledField(fieldEval, scalesTimes(ROBUSTNESS_FACTORS[0]), O2_DOMAIN, P_DOMAIN, MAIN_GRID.nx, MAIN_GRID.ny), [fieldEval]);
  const envDouble = useMemo(() => scaledField(fieldEval, scalesTimes(ROBUSTNESS_FACTORS[ROBUSTNESS_FACTORS.length - 1]), O2_DOMAIN, P_DOMAIN, MAIN_GRID.nx, MAIN_GRID.ny), [fieldEval]);
  const coveragePct = useMemo(() => fractionWithin(field, VERDICT_THRESHOLDS.near) * 100, [field]);

  const runsByG = useMemo(() => GRAVITIES.map((g) => ALL_RUNS.filter((r) =>
    r.gravity === g && r.o2Pct != null && r.pressureKPa != null &&
    (r.tier === "T1_PSI_RUN" || r.tier === "T4_PLANNED" || (r.tier === "T3_PUBLISHED" && includePublished)))), [includePublished]);

  // per-sheet verdict at the current pin (cheap: one pass over the runs per regime)
  const sheetVerdicts = useMemo(() => GRAVITIES.map((g) => (g === s.gravity ? m.evaluation.verdict : evaluate(ALL_RUNS, { ...s, gravity: g }).verdict)), [s, m.evaluation]);
  const sheets: SheetData[] = GRAVITIES.map((g, i) => ({
    g, field: sheetFields[i], runs: runsByG[i], comparableIds: comparableSets[i], verdict: sheetVerdicts[i],
    psi: PSI_RUNS.filter((r) => r.gravity === g).length,
    published: includePublished ? PUBLISHED.filter((r) => r.gravity === g).length : 0,
    planned: PLANNED.filter((r) => r.gravity === g).length,
  }));

  const selected: Run | null = selectedId ? ALL_RUNS.find((r) => r.id === selectedId) ?? null : null;
  const selectedScored = selectedId ? m.evaluation.comparable.find((c) => c.run.id === selectedId) ?? null : null;
  const highlightInv = hoverInv ?? pinnedInv;

  const hazardLabel = HAZARDS.find((h) => h.id === s.hazard)!.label;
  const selectGravity = (g: Gravity) => m.update({ gravity: g }, true);

  return (
    <div className="atlas-root" id="main">
      <svg className="atlas-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <pattern id="atlas-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" className="atlas-hatch-bg" />
            <line x1="0" y1="0" x2="0" y2="6" className="atlas-hatch-line" />
          </pattern>
        </defs>
      </svg>

      <header className="atlas-intro">
        <div className="atlas-intro-text">
          <h1 className="atlas-title">How close is the evidence?</h1>
          <p className="atlas-lede">
            MARGIN places every NASA PSI combustion test and published result in one condition space with a crewed-cabin atmosphere, and measures how far
            that scenario is from the nearest comparable test, gravity regime by gravity regime, with every number traced to its source.
          </p>
        </div>
        <dl className="atlas-stats" aria-label="Coverage headline, computed from the PSI run tables">
          <div className="atlas-stat">
            <dt>Highest O₂ in any PSI solid-material test</dt>
            <dd><span className="atlas-stat-val">{HEADLINE.maxSolidO2}</span><span className="atlas-stat-unit">% O₂</span></dd>
            <p>of {HEADLINE.solidRunsWithO2} tests with O₂ recorded{HEADLINE.solidRunsNoO2 > 0 ? `; ${HEADLINE.solidRunsNoO2} more record none` : ""}</p>
          </div>
          <div className="atlas-stat is-target">
            <dt>Planned habitat atmospheres</dt>
            <dd><span className="atlas-stat-val">{HEADLINE.artemisO2}–{HEADLINE.eaO2}</span><span className="atlas-stat-unit">% O₂</span></dd>
            <p>Artemis surface habitat to the Exploration Atmosphere</p>
          </div>
          <div className="atlas-stat">
            <dt>PSI solid tests at those levels</dt>
            <dd><span className="atlas-stat-val">{HEADLINE.atOrAboveArtemis}</span></dd>
            <p>reach {HEADLINE.artemisO2}% O₂ or more</p>
          </div>
        </dl>
      </header>

      <div className="atlas-workspace">
        <aside className="atlas-rail" aria-label="Scenario controls">
          <Toolbar scenario={s} preset={m.preset} update={m.update} applyPreset={(id) => { m.applyPreset(id); setSelectedId(null); }} />
        </aside>
        <section className="atlas-stage" aria-labelledby="atlas-plate-title">
          <div className="atlas-plate">
          <div className="atlas-plate-head">
            <div>
              <h2 id="atlas-plate-title" className="atlas-plate-title">Evidence coverage <span className="atlas-plate-regime">· {GRAVITY_LABEL[s.gravity]}</span></h2>
              <p className="atlas-plate-sub">{hazardLabel} · {s.materialClass === "any" ? "any material" : `${s.materialClass} materials`} · {s.flowCmS == null ? "quiescent" : `${s.flowCmS} cm/s`} · {includePublished ? "PSI + published" : "PSI only"}</p>
            </div>
            <p className="atlas-plate-hint">Drag the pin or tap the map · select a landmark to jump</p>
          </div>

          <CoverageMap
            field={field}
            envHalf={envHalf}
            envDouble={envDouble}
            runs={runsByG[gi]}
            comparableIds={comparableSets[gi]}
            scenario={s}
            verdict={m.evaluation.verdict}
            nearestD={m.evaluation.nearest?.d.D ?? null}
            landmarks={PRESETS}
            offChartLandmarks={ATMOSPHERES.filter((a) => a.offChart)}
            activePreset={m.preset}
            selectedId={selectedId}
            highlightInv={highlightInv}
            plateLabel={GRAVITY_LABEL[s.gravity]}
            coveragePct={coveragePct}
            onMove={(o2Pct, pressureKPa) => m.update({ o2Pct, pressureKPa })}
            onPreset={(id) => { m.applyPreset(id); }}
            onInspect={(r) => setSelectedId(r.id)}
          />

          <p className="atlas-map-caption">
            <span className="atlas-map-source"><strong>Evidence proximity, not a safety rating.</strong> Shading is the distance D to the nearest comparable test under MARGIN&rsquo;s method — a map of where tests exist, not a hazard map. Source: NASA PSI run tables{includePublished ? " and the published papers listed under Sources" : ""}.</span>
            {field.omitted > 0 && <span>{field.omitted} comparable {field.omitted === 1 ? "run lacks" : "runs lack"} a recorded pressure, so {field.omitted === 1 ? "it is" : "they are"} not drawn on this plane; {field.omitted === 1 ? "it still counts" : "they still count"} for the verdict as partial matches.</span>}
          </p>

          <section className="atlas-key" aria-labelledby="atlas-key-title">
            <h3 id="atlas-key-title" className="atlas-key-title">Key</h3>
            <ul className="atlas-key-list">
              <li><KeySwatch kind="direct" /> DIRECT · D ≤ {VERDICT_THRESHOLDS.direct}</li>
              <li><KeySwatch kind="near" /> NEAR · D ≤ {VERDICT_THRESHOLDS.near}</li>
              <li><KeySwatch kind="uncharted" /> no comparable evidence for this question and flow (D &gt; {VERDICT_THRESHOLDS.near})</li>
              <li><KeySwatch kind="envelope" /> boundary if scales were halved / doubled</li>
              <li><KeySwatch kind="dot" /> PSI run (comparable)</li>
              <li><KeySwatch kind="muted" /> PSI run, other fuel class</li>
              <li><KeySwatch kind="ring" /> Published (not in PSI)</li>
              <li><KeySwatch kind="planned" /> planned — not evidence</li>
              <li><KeySwatch kind="limit" /> reported limit — a threshold, not a tested condition</li>
              <li><KeySwatch kind="landmark" /> habitat atmosphere</li>
              <li><KeySwatch kind="pin" /> your scenario</li>
            </ul>
            <p className="atlas-micro atlas-key-flow">Bands are computed at the scenario&rsquo;s flow, gravity, question and material; runs at another flow sit further away than the plane suggests. Marks: ● solid · ◆ liquid droplet · + gas burner · ■ smoke source. Click a mark to inspect its source.</p>
          </section>
          </div>

          <GravitySheets sheets={sheets} scenario={s} onSelect={selectGravity} />
        </section>

        <FieldNotes
          scenario={s}
          evaluation={m.evaluation}
          psiOnly={m.psiOnly}
          robust={m.robust}
          ranking={m.ranking}
          coveragePct={coveragePct}
          grid={MAIN_GRID}
          selected={selected}
          selectedScored={selectedScored}
          highlightInv={highlightInv}
          pinnedInv={pinnedInv}
          onInspect={(r) => setSelectedId(r.id)}
          onCloseSpecimen={() => setSelectedId(null)}
          onHoverInv={setHoverInv}
          onPinInv={(id) => setPinnedInv((cur) => (cur === id ? null : id))}
        />
      </div>
    </div>
  );
}
