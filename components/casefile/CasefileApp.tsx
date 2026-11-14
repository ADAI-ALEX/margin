"use client";
import { useCallback, useMemo, useState } from "react";
import type { Run } from "@/lib/schema";
import { useMargin } from "@/lib/state/useMargin";
import { COUNTS, HEADLINE, SNAP } from "@/lib/data";
import { fmt } from "@/lib/format";
import { buildRows, fetchedDate } from "./derive";
import { ScenarioSentence, type PUnit } from "./ScenarioSentence";
import { Ladder, type MobileCol, type SortMode } from "./Ladder";
import { PartialG } from "./PartialG";
import { ClaimLedger, Finding } from "./ClaimLedger";
import { CompareTray } from "./CompareTray";
import { Provenance } from "./Provenance";
import { fontVars } from "./fonts";
import css from "./casefile.module.css";

export default function CasefileApp() {
  const m = useMargin("iss");
  const { scenario: s, evaluation: ev, psiOnly, ranking, robust } = m;
  const [pUnit, setPUnit] = useState<PUnit>("kPa");
  const [sort, setSort] = useState<SortMode>("family");
  const [mobileCol, setMobileCol] = useState<MobileCol>("o2");
  const [pinned, setPinned] = useState<string[]>(["PSI-25"]);
  const [trayOpen, setTrayOpen] = useState(false);
  const [provRun, setProvRun] = useState<Run | null>(null);

  const rows = useMemo(() => buildRows(s, ev, ranking), [s, ev, ranking]);
  const togglePin = useCallback((id: string) => {
    setPinned((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));
  }, []);
  const unpin = useCallback((id: string) => {
    setPinned((p) => p.filter((x) => x !== id));
    if (pinned.length === 1 && pinned[0] === id) setTrayOpen(false);
  }, [pinned]);
  const closeProv = useCallback(() => setProvRun(null), []);

  return (
    <div className={`${css.root} ${fontVars}`}>
      <header className={css.masthead}>
        <div className={css.brand}>
          <span className={css.wordmark}>MARGIN</span>
          <span className={css.brandSub}>Casefile · evidence coverage across NASA PSI combustion data</span>
        </div>
        <p className={css.banner} role="note">
          Prototype · PSI run data fetched live {fetchedDate(SNAP.fetchedAt)} · published values transcribed, awaiting human verification
        </p>
      </header>

      <section className={css.headline} aria-label="Coverage headline">
        <p>
          <span className={css.hlFig}>{fmt(HEADLINE.maxSolidO2, 1)}<small>% O₂</small></span>
          <span className={css.hlText}>
            highest O₂ in any of PSI&rsquo;s <b className={css.mono}>{HEADLINE.solidRunsWithO2}</b> solid-material tests with a recorded O₂ value.
            Artemis habitat plans <b className={css.mono}>{fmt(HEADLINE.artemisO2, 1)}%</b>, the Exploration Atmosphere <b className={css.mono}>{fmt(HEADLINE.eaO2, 1)}%</b>:{" "}
            <b className={css.mono}>{HEADLINE.atOrAboveArtemis}</b> of those tests reach either.
          </span>
        </p>
        <span className={css.hlSrc}>MEASURED · computed from {COUNTS.totalRuns} PSI run rows in {SNAP.tableStats.length} experimental tables</span>
      </section>

      <ScenarioSentence m={m} pUnit={pUnit} setPUnit={setPUnit} />

      <div className={css.workspace}>
        <main className={css.mainCol}>
          {s.gravity !== "micro" && <PartialG gravity={s.gravity} includePublished={s.includePublished} openRun={setProvRun} />}
          <Ladder
            rows={rows} s={s} pUnit={pUnit} sort={sort} setSort={setSort}
            pinned={pinned} togglePin={togglePin} openRun={setProvRun}
            mobileCol={mobileCol} setMobileCol={setMobileCol}
          />
        </main>
        <aside className={css.sideCol}>
          <Finding s={s} ev={ev} psiOnly={psiOnly} robust={robust} openRun={setProvRun} />
          <ClaimLedger s={s} ev={ev} psiOnly={psiOnly} robust={robust} openRun={setProvRun} />
        </aside>
      </div>

      <CompareTray rows={rows} pinned={pinned} ev={ev} open={trayOpen} setOpen={setTrayOpen} unpin={unpin} openRun={setProvRun} />
      <Provenance run={provRun} s={s} onClose={closeProv} />
    </div>
  );
}
