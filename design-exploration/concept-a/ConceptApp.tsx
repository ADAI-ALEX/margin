"use client";
import { useCallback, useState } from "react";
import type { Run } from "@/lib/schema";
import { useMargin } from "../shared/useMargin";
import { HEADLINE, SNAP } from "../shared/data";
import { HAZARDS } from "../shared/content";
import { DISCLAIMER, fmt, fmtSigned, GRAVITY_SHORT } from "../shared/format";
import { fontVars } from "./fonts";
import ScenarioControls from "./ScenarioControls";
import ConditionMap from "./ConditionMap";
import VerdictInstrument from "./VerdictInstrument";
import NearestTable from "./NearestTable";
import Provenance from "./Provenance";
import { Insights, PartialGravity, Ranking } from "./EvidencePanels";
import type { PUnit } from "./units";
import { fmtP } from "./units";
import s from "./console.module.css";

export default function ConceptApp() {
  const m = useMargin("iss");
  const { scenario, evaluation } = m;
  const [unit, setUnit] = useState<PUnit>("kPa");
  const [inspect, setInspect] = useState<Run | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const close = useCallback(() => setInspect(null), []);
  const hazardLabel = HAZARDS.find((h) => h.id === scenario.hazard)?.label ?? scenario.hazard;
  const showPartialG = scenario.gravity !== "micro";

  return (
    <div className={`${s.root} ${fontVars}`}>
      <StatusStrip />

      {/* mobile-only sticky verdict bar */}
      <div className={s.mobileBar}>
        <div className={s.mbVerdict}>
          <span className={s.mbPrefix}>Evidence:</span>
          <span className={s.mbWord}>{evaluation.verdict}</span>
          <span className={s.mbD}>D {evaluation.nearest ? fmt(evaluation.nearest.d.D, 2) : "—"}</span>
        </div>
        <div className={s.mbMeta}>
          <span>{fmt(scenario.o2Pct)}% · {fmtP(scenario.pressureKPa, unit)} {unit} · {scenario.flowCmS == null ? "quiescent" : `${scenario.flowCmS} cm/s`} · {GRAVITY_SHORT[scenario.gravity]}</span>
          <span className={s.mbDisc}>{DISCLAIMER}</span>
        </div>
      </div>

      <div className={s.grid}>
        <aside className={s.rail} aria-label="Scenario controls">
          <div className={s.oControls} data-open={sheetOpen}>
            <button type="button" className={s.sheetToggle} aria-expanded={sheetOpen} aria-controls="a-controls" onClick={() => setSheetOpen((o) => !o)}>
              <span>Scenario controls</span><span aria-hidden>{sheetOpen ? "▴" : "▾"}</span>
            </button>
            <div id="a-controls" className={s.sheetBody}>
              <div className={s.railHead}>
                <h2 className={s.panelTitle}>Scenario</h2>
                <span className={s.panelMeta}>crewed environment</span>
              </div>
              <ScenarioControls scenario={scenario} update={m.update} preset={m.preset} applyPreset={m.applyPreset} unit={unit} setUnit={setUnit} />
            </div>
          </div>
        </aside>

        <main className={s.center}>
          <div className={s.oInstrument}>
            <VerdictInstrument scenario={scenario} evaluation={evaluation} psiOnly={m.psiOnly} robust={m.robust} onInspect={setInspect} />
          </div>
          <section className={`${s.mapPanel} ${s.oMap}`} aria-labelledby="a-map-h">
            <header className={s.panelHead}>
              <h2 id="a-map-h" className={s.panelTitle}>Condition map</h2>
              <span className={s.panelMeta}>context instrument · O₂ × total pressure · {GRAVITY_SHORT[scenario.gravity]} regime · hover to read, click to inspect</span>
            </header>
            <ConditionMap scenario={scenario} evaluation={evaluation} unit={unit} onInspect={setInspect} onPreset={m.applyPreset} />
          </section>
          <div className={s.oTable}>
            <NearestTable evaluation={evaluation} scenario={scenario} unit={unit} onInspect={setInspect} selectedId={inspect?.id ?? null} />
          </div>
        </main>

        <aside className={s.right} aria-label="Evidence stack">
          {showPartialG && (
            <div className={s.oPartial}>
              <PartialGravity gravity={scenario.gravity} includePublished={scenario.includePublished} onInspect={setInspect} />
            </div>
          )}
          <div className={s.oRank}>
            <Ranking ranking={m.ranking} weights={m.weights} setWeights={m.setWeights} hazardLabel={hazardLabel} />
          </div>
          <div className={s.oInsights}>
            <Insights hazard={scenario.hazard} />
          </div>
        </aside>
      </div>

      {inspect && <Provenance run={inspect} scenario={scenario} onClose={close} />}
    </div>
  );
}

function StatusStrip() {
  const H = HEADLINE;
  const gap = H.eaO2 - H.maxSolidO2;
  const fetched = SNAP.fetchedAt.slice(0, 10);
  const pct = (n: number) => <b className={s.nb}>{fmt(n)}&nbsp;%</b>;
  return (
    <header className={s.strip}>
      <div className={s.brand}>
        <span className={s.wordmark}>MARGIN</span>
        <span className={s.brandSub}>Evidence-coverage console · PSI combustion</span>
      </div>
      <div className={s.readout} role="group" aria-label="Coverage headline">
        <p className={s.heroLine} title={H.sentence}>
          Highest O₂ in PSI&apos;s <b>{H.solidRunsWithO2}</b> solid-material tests with a recorded O₂ value: {pct(H.maxSolidO2)}.
          Artemis habitats plan {pct(H.artemisO2)}, the Exploration Atmosphere {pct(H.eaO2)}; <b>{H.atOrAboveArtemis}</b> of those tests reach either level.
        </p>
        <dl className={s.readCells}>
          <div><dt>Solid tests · O₂ recorded</dt><dd>{H.solidRunsWithO2}</dd></div>
          <div><dt>Max O₂ · solid tests</dt><dd>{fmt(H.maxSolidO2)}<small>%</small></dd></div>
          <div><dt>Artemis hab</dt><dd className={s.amber}>{fmt(H.artemisO2)}<small>%</small></dd></div>
          <div><dt>Exploration Atm.</dt><dd className={s.amber}>{fmt(H.eaO2)}<small>%</small></dd></div>
          <div><dt>Gap to solid-test maximum <i>computed</i></dt><dd>{fmtSigned(gap)}<small>pts</small></dd></div>
        </dl>
      </div>
      <p className={s.banner}>
        <span className={s.bannerTag}>Prototype</span> PSI run data fetched live {fetched} · published values transcribed, awaiting human verification
      </p>
    </header>
  );
}
