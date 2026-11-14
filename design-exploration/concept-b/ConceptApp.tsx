"use client";
/**
 * Concept B — ATLAS: an evidence landscape drawn as a printed scientific atlas.
 * Map-first: the O₂ × pressure plane coloured by nearest-comparable-evidence
 * distance, four separate gravity sheets, and a template-generated field-notes margin.
 */
import { useMemo, useState } from "react";
import type { Gravity, Run } from "@/lib/schema";
import { distanceField, evaluate, ROBUSTNESS_FACTORS, VERDICT_THRESHOLDS } from "@/lib/engine";
import { useMargin, DEFAULT_SCENARIO } from "../shared/useMargin";
import { ALL_RUNS, HEADLINE, PSI_RUNS, SNAP } from "../shared/data";
import { ATMOSPHERES, HAZARDS, PLANNED, PRESETS, PUBLISHED } from "../shared/content";
import { GRAVITY_LABEL } from "../shared/format";
import { fontVars } from "./fonts";
import { MAIN_GRID, O2_DOMAIN, P_DOMAIN, SHEET_GRID, fractionWithin, scaledField, scalesTimes } from "./geo";
import CoverageMap from "./CoverageMap";
import GravitySheets, { GRAVITIES, type SheetData } from "./GravitySheets";
import FieldNotes from "./FieldNotes";
import Toolbar from "./Toolbar";
import { KeySwatch } from "./marks";
import "./atlas.css";

const PLATE = ["I", "II", "III", "IV"];
const fetchedDate = new Date(SNAP.fetchedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function ConceptApp() {
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
  const selectGravity = (g: Gravity) => m.update({ gravity: g });

  return (
    <div className={`atlas-root ${fontVars}`}>
      <svg className="atlas-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <pattern id="atlas-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" className="atlas-hatch-bg" />
            <line x1="0" y1="0" x2="0" y2="6" className="atlas-hatch-line" />
          </pattern>
        </defs>
      </svg>

      <header className="atlas-masthead">
        <div className="atlas-mast-row">
          <p className="atlas-wordmark">MARGIN <span>· An atlas of combustion evidence</span></p>
          <p className="atlas-banner">Prototype · PSI run data fetched live {fetchedDate} · published values transcribed, awaiting human verification</p>
        </div>
        <p className="atlas-hero">
          The highest O₂ in any of PSI&rsquo;s <span className="atlas-num">{HEADLINE.solidRunsWithO2}</span> solid-material tests with a recorded O₂ value is{" "}
          <span className="atlas-num">{HEADLINE.maxSolidO2}%</span>. Artemis surface habitats plan <span className="atlas-num">{HEADLINE.artemisO2}%</span> and the
          Exploration Atmosphere <span className="atlas-num">{HEADLINE.eaO2}%</span>: <em>{HEADLINE.atOrAboveArtemis === 0 ? "none" : <span className="atlas-num">{HEADLINE.atOrAboveArtemis}</span>}</em> of those tests reach either level.
        </p>
      </header>

      <Toolbar scenario={s} preset={m.preset} update={m.update} applyPreset={(id) => { m.applyPreset(id); setSelectedId(null); }} />

      <div className="atlas-body">
        <main className="atlas-main">
          <div className="atlas-plate-head">
            <p className="atlas-plate-no">Plate {PLATE[gi]}</p>
            <h1 className="atlas-plate-title">Nearest comparable evidence · {GRAVITY_LABEL[s.gravity]}</h1>
            <p className="atlas-plate-sub">{hazardLabel} · {s.materialClass === "any" ? "any material" : `${s.materialClass} materials`} · {s.flowCmS == null ? "quiescent" : `${s.flowCmS} cm/s`} · {includePublished ? "PSI + published" : "PSI only"}. Drag the pin, or tap the map to place it; select a landmark to jump.</p>
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

          <section className="atlas-key" aria-labelledby="atlas-key-title">
            <h2 id="atlas-key-title" className="atlas-key-title">Key · Evidence coverage — not a hazard map</h2>
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
            <p className="atlas-micro atlas-key-flow">Bands are computed at the scenario&rsquo;s flow; runs at another flow sit further away than the plane suggests.</p>
            <p className="atlas-micro">D is computed from O₂, log pressure and flow gaps to the nearest comparable test, with flow, gravity, question and material held at the scenario&rsquo;s values. Dot shapes: ● solid · ◆ liquid droplet · + gas burner · ■ smoke source. Click any mark for its specimen card.</p>
          </section>

          <GravitySheets sheets={sheets} scenario={s} onSelect={selectGravity} />
        </main>

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
