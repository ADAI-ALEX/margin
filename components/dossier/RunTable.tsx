"use client";
import { useCallback, useMemo, useState } from "react";
import type { Run } from "@/lib/schema";
import { runsByInv } from "@/lib/data";
import { FUEL_LABEL, GRAVITY_SHORT, fmt } from "@/lib/format";
import { AXIS_KEYS, AXIS_LABEL, AXIS_UNIT, BASIS, FIELD, REGIME_TEXT, originalCell, verification } from "@/components/casefile/derive";
import { Claim } from "@/components/casefile/ui";
import { Provenance } from "@/components/casefile/Provenance";
import { useCarriedScenario } from "./useCarriedScenario";
import css from "./dossier.module.css";

const PAGE = 50;
const BASIS_SHORT = { measured: "", "nominal-stated": "nominal", "limit-reported": "limit", unknown: "" } as const;

/** The investigation's runs: normalized values with the original cell beneath. Real table; paginated for large tables. */
export function RunTable({ invId, acronym, files }: { invId: string; acronym: string; files: string[] }) {
  const runs = useMemo(() => runsByInv(invId), [invId]);
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<Run | null>(null);
  const s = useCarriedScenario();
  const close = useCallback(() => setOpen(null), []);
  const published = runs.some((r) => r.tier !== "T1_PSI_RUN");
  const shown = all ? runs : runs.slice(0, PAGE);

  return (
    <>
      <div className={css.tableScroll} tabIndex={0} role="region" aria-label={`${acronym} run table (scrolls sideways on small screens)`}>
        <table className={css.runTable}>
          <caption className={css.caption}>
            {acronym}: {runs.length} {published ? "records" : "runs"}{files.length ? <> from {files.join(", ")}</> : null}. Each value cell shows the normalized value and, beneath it, the original cell as it appears in the source{shown.length < runs.length ? <> — showing {shown.length} of {runs.length}</> : null}.
          </caption>
          <thead>
            <tr>
              <th scope="col">{published ? "Record" : "Row"}</th>
              <th scope="col">Material</th>
              <th scope="col">Fuel class</th>
              <th scope="col">g</th>
              {AXIS_KEYS.map((a) => <th key={a} scope="col" className={css.right}>{AXIS_LABEL[a]} <span className={css.quiet}>{AXIS_UNIT[a]}</span></th>)}
              <th scope="col">Outcome</th>
              <th scope="col">Flags</th>
              {published && <th scope="col">Source locator</th>}
              {published && <th scope="col">Verification</th>}
              <th scope="col"><span className="sr-only">Provenance</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const v = verification(r);
              return (
                <tr key={r.id}>
                  <th scope="row" className="num">{r.source.row ?? r.id.split(":").slice(1).join(":")}</th>
                  <td className={css.mat}>{r.material ?? <span className={css.nr}>not recorded</span>}</td>
                  <td>{FUEL_LABEL[r.fuelClass]}</td>
                  <td>{GRAVITY_SHORT[r.gravity]}</td>
                  {AXIS_KEYS.map((a) => {
                    const val = r[FIELD[a]];
                    const orig = originalCell(r, a);
                    const b = BASIS_SHORT[r[BASIS[a]]];
                    return (
                      <td key={a} className={css.valCell}>
                        {val == null ? <span className={css.nr}>not recorded</span> : <span className="num">{fmt(val, a === "p" ? 1 : 1)}</span>}
                        {b && val != null && <span className={css.basisTag}> {b}</span>}
                        {a === "flow" && r.flowRegime !== "unknown" && <span className={css.quiet}> {REGIME_TEXT[r.flowRegime]}</span>}
                        {a === "o2" && r.measures?.oxidizerXO2 && <span className={css.orig}>burner-fed {fmt(r.measures.oxidizerXO2.value, 1)}% (not ambient)</span>}
                        <span className={css.orig}>{orig != null ? orig : r.tier === "T1_PSI_RUN" ? (val != null ? "stated in a document" : "—") : "transcribed"}</span>
                      </td>
                    );
                  })}
                  <td>{r.outcome ?? <span className={css.nr}>not recorded</span>}</td>
                  <td className={css.flags}>{r.flags.length ? r.flags.join(", ") : <span className={css.quiet}>none</span>}</td>
                  {published && <td className={css.loc}>{r.source.ref}{r.source.page ? ` · ${r.source.page}` : ""}{r.source.quote && <span className={css.quote}>“{r.source.quote}”</span>}</td>}
                  {published && <td>{v.kind ? <><Claim kind={v.kind} /><span className={css.orig}>{v.label}</span></> : null}</td>}
                  <td className={css.actCell}><button type="button" className={css.detailBtn} onClick={() => setOpen(r)} aria-label={`Provenance of ${r.id}`}>Provenance</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {runs.length > PAGE && (
        <button type="button" className={css.moreBtn} onClick={() => setAll((x) => !x)} aria-expanded={all}>
          {all ? `Show the first ${PAGE} only` : `Show all ${runs.length} ${published ? "records" : "runs"}`}
        </button>
      )}
      <div className={css.provHost}><Provenance run={open} s={s} onClose={close} /></div>
    </>
  );
}
