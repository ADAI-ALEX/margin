"use client";
import { useCallback, useMemo, useState } from "react";
import type { Run } from "@/lib/schema";
import { runsByInv } from "@/lib/data";
import { FUEL_LABEL, GRAVITY_SHORT, fmt } from "@/lib/format";
import { AXIS_KEYS, AXIS_LABEL, AXIS_UNIT, BASIS, FIELD, REGIME_TEXT, originalCell, verification } from "@/components/casefile/derive";
import { ClaimBadge } from "@/components/ui/misc";
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
      <p className={css.tableCap}>
        {acronym}: <span className="num">{runs.length}</span> {published ? "records" : "runs"}{files.length ? <> from <span className="mono">{files.join(", ")}</span></> : null}{shown.length < runs.length ? <>, showing the first <span className="num">{shown.length}</span></> : null}.
      </p>
      <div className={`ui-table-scroll ${css.tableMax}`} tabIndex={0} role="region" aria-label={`${acronym} run table`}>
        <table className={`ui-table ${css.runTable}`}>
          <caption className="sr-only">
            {acronym}: {runs.length} {published ? "records" : "runs"}. Each value cell shows the normalized value and, beneath it, the original cell as it appears in the source.
          </caption>
          <thead>
            <tr>
              <th scope="col">{published ? "Record" : "Row"}</th>
              <th scope="col"><span className="sr-only">Inspect</span></th>
              <th scope="col">Material</th>
              <th scope="col">Fuel class</th>
              <th scope="col">g</th>
              {AXIS_KEYS.map((a) => <th key={a} scope="col" className="is-num">{AXIS_LABEL[a]} <span className={css.unit}>{AXIS_UNIT[a]}</span></th>)}
              <th scope="col">Outcome</th>
              <th scope="col">Flags</th>
              {published && <th scope="col">Source locator</th>}
              {published && <th scope="col">Verification</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const v = verification(r);
              return (
                <tr key={r.id} className={css.runRow} onClick={(e) => { if (!(e.target as HTMLElement).closest("button, a")) setOpen(r); }}>
                  <th scope="row" className="num">{r.source.row ?? r.id.split(":").slice(1).join(":")}</th>
                  <td><button type="button" className={`ui-btn ${css.inspect}`} onClick={() => setOpen(r)} aria-label={`Inspect ${r.id}`}>Inspect</button></td>
                  <td className={css.mat}>{r.material ?? <span className={css.nr}>not recorded</span>}</td>
                  <td>{FUEL_LABEL[r.fuelClass]}</td>
                  <td>{GRAVITY_SHORT[r.gravity]}</td>
                  {AXIS_KEYS.map((a) => {
                    const val = r[FIELD[a]];
                    const orig = originalCell(r, a);
                    const b = BASIS_SHORT[r[BASIS[a]]];
                    return (
                      <td key={a} className={`is-num ${css.valCell}`}>
                        {val == null ? <span className={css.nr}>not recorded</span> : <span className="num">{fmt(val, 1)}</span>}
                        {b && val != null && <span className={css.basisTag}> {b}</span>}
                        {a === "flow" && r.flowRegime !== "unknown" && <span className={css.orig}>{REGIME_TEXT[r.flowRegime]}</span>}
                        {a === "o2" && r.measures?.oxidizerXO2 && <span className={css.orig}>burner-fed {fmt(r.measures.oxidizerXO2.value, 1)}% (not ambient)</span>}
                        <span className={`mono ${css.orig}`}>{orig != null ? orig : r.tier === "T1_PSI_RUN" ? (val != null ? "stated in a document" : "—") : "transcribed"}</span>
                      </td>
                    );
                  })}
                  <td className={css.outcome}>{r.outcome ?? <span className={css.nr}>not recorded</span>}</td>
                  <td className={`mono ${css.flags}`}>{r.flags.length ? r.flags.join(", ") : <span className={css.quiet}>none</span>}</td>
                  {published && <td className={css.loc}>{r.source.ref}{r.source.page ? ` · ${r.source.page}` : ""}{r.source.quote && <span className={css.quote}>“{r.source.quote}”</span>}</td>}
                  {published && <td>{v.kind ? <><ClaimBadge kind={v.kind} /><span className={css.orig}>{v.label}</span></> : null}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {runs.length > PAGE && (
        <button type="button" className={`ui-btn ${css.more}`} onClick={() => setAll((x) => !x)} aria-expanded={all}>
          {all ? `Show the first ${PAGE} only` : `Show all ${runs.length} ${published ? "records" : "runs"}`}
        </button>
      )}
      <Provenance run={open} s={s} onClose={close} />
    </>
  );
}
