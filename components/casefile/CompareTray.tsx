"use client";
import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import type { Run } from "@/lib/schema";
import { classify } from "@/lib/engine";
import { FUEL_LABEL, GRAVITY_LABEL, fmt } from "@/lib/format";
import {
  AXIS_KEYS, AXIS_LABEL, AXIS_UNIT, FIELD, REGIME_TEXT, axisPrintText, conversionFor, fingerprint, flagText, originalCell, partialLabel, sourceLabel, tierShort,
  type Fingerprint, type LadderRow,
} from "./derive";
import { Claim, EvidenceWord, VerifyBadge } from "./ui";
import css from "./casefile.module.css";

interface Cell { key: string; node: ReactNode }
interface Line { label: string; cells: Cell[]; computed?: boolean }

const list = (xs: string[], max = 4) => (xs.length <= max ? xs.join(" · ") : `${xs.slice(0, max).join(" · ")} · +${xs.length - max} more`);
const nr = (t = "not stated in record") => <span className={css.nr}>{t}</span>;

function exampleRun(row: LadderRow): Run | null {
  if (row.nearest) return row.nearest.run;
  return row.runs.find((r) => r.conversions.length > 0) ?? row.runs[0] ?? null;
}

function ExampleValues({ run }: { run: Run }) {
  return (
    <span className={css.example}>
      <span className="num">{run.id}</span>
      {AXIS_KEYS.map((axis) => {
        const v = run[FIELD[axis]];
        const conv = conversionFor(run, axis);
        const orig = originalCell(run, axis);
        return (
          <span key={axis} className={css.exLine}>
            {AXIS_LABEL[axis]}: {v == null ? <span className={css.nr}>not recorded</span> : <>
              {orig != null && orig !== String(v) ? <><span className="num">{orig}</span> → </> : null}
              <span className="num">{fmt(v, 2)} {AXIS_UNIT[axis]}</span>
              {conv && <span className={css.quiet}> ({conv.formula})</span>}
              {!conv && orig == null && <span className={css.quiet}> (no source column)</span>}
            </>}
          </span>
        );
      })}
    </span>
  );
}

export function CompareTray({ rows, pinned, unpin, openRun }: { rows: LadderRow[]; pinned: string[]; unpin: (id: string) => void; openRun: (r: Run) => void }) {
  const cols = useMemo(() => pinned.map((id) => rows.find((r) => r.inv.id === id)).filter((r): r is LadderRow => !!r), [pinned, rows]);
  const fps = useMemo(() => new Map(cols.map((r) => [r.inv.id, fingerprint(r)])), [cols]);
  const fp = (r: LadderRow) => fps.get(r.inv.id) as Fingerprint;

  const lines: Line[] = cols.length === 0 ? [] : [
    {
      label: "Evidence for your scenario", computed: true,
      cells: cols.map((r) => ({
        key: r.nearest ? `${classify(r.Dmin)}${r.nearest.d.partialMatch ? "p" : ""}` : r.chip,
        node: r.nearest ? (
          <span className={css.stack}>
            <span>D<sub>min</sub> <b className="num">{fmt(r.Dmin, 2)}</b> · <EvidenceWord v={classify(r.Dmin)} /></span>
            {r.nearest.d.partialMatch && <span className={css.partial}>{partialLabel(r.nearest)}</span>}
            <button type="button" className={css.runLink} onClick={() => openRun(r.nearest!.run)}>nearest: {r.nearest.run.id}</button>
          </span>
        ) : <span className={css.nr}>{r.chip}</span>,
      })),
    },
    {
      label: "Rank R", computed: true,
      cells: cols.map((r) => ({ key: r.rank ? fmt(r.rank.R, 1) : "-", node: r.rank ? <><span className="num">{fmt(r.rank.R, 1)}</span>{r.rank.noComparable && <span className={css.quiet}> — ranked on metadata only</span>}</> : nr("not ranked") })),
    },
    {
      label: "Runs",
      cells: cols.map((r) => ({
        key: String(r.runs.length),
        node: r.runs.length ? <><span className="num">{r.runs.length}</span> runs · <span className="num">{r.comparable}</span> comparable · <span className="num">{r.near}</span> within NEAR</> : r.inv.summaryRowCount ? <><span className="num">{r.inv.summaryRowCount}</span> summary rows — no runs</> : nr("no run table"),
      })),
    },
    { label: "Gravity", cells: cols.map((r) => { const t = fp(r).gravity.map((g) => `${GRAVITY_LABEL[g.g]} (${g.n})`).join(" · "); return { key: fp(r).gravity.map((g) => g.g).sort().join(), node: t || nr("no runs") }; }) },
    { label: "Platform · hardware", cells: cols.map((r) => { const t = [r.inv.platform, r.inv.hardware].filter(Boolean).join(" · "); return { key: t, node: t || nr() }; }) },
    { label: "Dates", cells: cols.map((r) => { const t = r.inv.startDate || r.inv.endDate ? `${r.inv.startDate ?? "?"} → ${r.inv.endDate ?? "?"}` : ""; return { key: t, node: t ? <span className="num">{t}</span> : nr() }; }) },
    ...AXIS_KEYS.map((axis): Line => ({
      label: `${AXIS_LABEL[axis]} (${AXIS_UNIT[axis]})`,
      cells: cols.map((r) => {
        const a = fp(r).axes.find((x) => x.axis === axis)!;
        const t = axisPrintText(a);
        return { key: `${a.state}|${a.min}|${a.max}`, node: <span><b className={css.state}>{a.state === "held" ? "held constant" : a.state}</b> · {t}{axis === "o2" && fp(r).burnerFed && <span className={css.quiet}> · {fp(r).burnerFed!.n} inverse-flame runs burner-fed {fmt(fp(r).burnerFed!.min, 0)}–{fmt(fp(r).burnerFed!.max, 0)}% (not ambient)</span>}</span> };
      }),
    })),
    { label: "Flow regime", cells: cols.map((r) => { const t = fp(r).regimes.map((x) => `${REGIME_TEXT[x.regime]} ${x.n}`).join(" · "); return { key: fp(r).regimes.map((x) => x.regime).join(), node: t || nr("no runs") }; }) },
    { label: "Fuel classes", cells: cols.map((r) => { const t = fp(r).fuel.map((f) => `${FUEL_LABEL[f.fc]} ${f.n}`).join(" · "); return { key: fp(r).fuel.map((f) => f.fc).join(), node: t || nr("no runs") }; }) },
    { label: "Materials", cells: cols.map((r) => { const m = fp(r).materials; return { key: m.map((x) => x.label).join(), node: m.length ? <><span className="num">{m.length}</span> distinct: {list(m.map((x) => `${x.label} (${x.n})`), 3)}</> : nr("no runs") }; }) },
    { label: "Varied (source columns)", cells: cols.map((r) => { const v = fp(r).variedCols; return { key: v.map((x) => x.col).join(), node: v.length ? list(v.map((x) => `${x.col} (${x.distinct})`), 5) : nr("none") }; }) },
    { label: "Held constant (source columns)", cells: cols.map((r) => { const v = fp(r).heldCols; return { key: v.map((x) => x.col).join(), node: v.length ? list(v.map((x) => `${x.col} = ${x.value}`), 4) : nr("none") }; }) },
    { label: "Outcomes", cells: cols.map((r) => { const o = fp(r).outcomes; return { key: o.map((x) => x.label).join(), node: o.length ? list(o.map((x) => `${x.label} (${x.n})`), 4) : nr("no runs") }; }) },
    { label: "Measured quantities", cells: cols.map((r) => { const m = fp(r).measures; return { key: m.map((x) => x.label).join(), node: m.length ? list(m.map((x) => `${x.label} [${x.unit}] (${x.n})`), 4) : nr("none normalized") }; }) },
    {
      label: "Example: original → normalized",
      cells: cols.map((r) => { const ex = exampleRun(r); return { key: ex?.id ?? "", node: ex ? <><ExampleValues run={ex} /><VerifyBadge run={ex} /></> : nr("no runs") }; }),
    },
    { label: "Data-quality flags", cells: cols.map((r) => { const f = fp(r).flags; return { key: f.map((x) => x.flag).join(), node: f.length ? <span className={css.stack}>{f.map((x) => <span key={x.flag} title={flagText(x.flag)}><span className="num">{x.flag}</span> × {x.n}</span>)}</span> : nr("none") }; }) },
    {
      label: "Sources",
      cells: cols.map((r) => ({
        key: r.inv.id,
        node: (
          <span className={css.stack}>
            <Link href={`/investigations/${r.inv.id}`}>Dossier</Link>
            <a href={r.inv.landingUrl} target="_blank" rel="noreferrer">{r.inv.tier === "T2_PSI_RECORD" ? "PSI record" : "Source document"} ↗</a>
            {r.inv.doi && <a href={`https://doi.org/${r.inv.doi}`} target="_blank" rel="noreferrer">doi {r.inv.doi} ↗</a>}
            {r.runs[0] && <span className={css.quiet}>{sourceLabel(r.runs[0]).replace(/ · row \d+$/, "")}</span>}
          </span>
        ),
      })),
    },
  ];

  return (
    <section className={css.compare} aria-labelledby="inv-compare-h" data-testid="compare-tray" id="compare">
      <div className={css.secHead}>
        <div>
          <h2 className={css.h2} id="inv-compare-h">Compare <span className="num">{cols.length}/3</span></h2>
          <p className={css.secSub}>How did the tests differ? Fingerprints aligned side by side — what varied, what was held constant, and where each value comes from. Pinned investigations are kept in the link.</p>
        </div>
      </div>
      {cols.length === 0 ? (
        <p className={css.empty}>Nothing pinned yet. Use the <b>+</b> button beside an investigation in the ladder to add up to three.</p>
      ) : (
        <div className={css.tableScroll} tabIndex={0} role="region" aria-label="Compare table (scrolls sideways on small screens)">
          <table className={css.cmpTable} data-multi={cols.length > 1 || undefined}>
            <caption className="sr-only">Aligned fingerprints of the pinned investigations. Rows marked “differs” vary between them.</caption>
            <thead>
              <tr>
                <td />
                {cols.map((r) => (
                  <th key={r.inv.id} scope="col" className={css.cmpHead}>
                    <span className={css.cmpName}><Link href={`/investigations/${r.inv.id}`}>{r.inv.acronym}</Link></span>
                    <span className={css.invMeta}><span className={css.tier} data-tier={r.inv.tier}>{tierShort(r.inv)}</span> <span className="num">{r.inv.id}</span></span>
                    <span className={css.cmpTitle}>{r.inv.title}</span>
                    <button type="button" className={css.unpinBtn} onClick={() => unpin(r.inv.id)} aria-label={`Remove ${r.inv.acronym} from compare`}>Remove ✕</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const differs = cols.length > 1 && new Set(l.cells.map((c) => c.key)).size > 1;
                return (
                  <tr key={l.label} data-differs={differs || undefined}>
                    <th scope="row" className={css.cmpLabel}>
                      {l.label}
                      {l.computed && <> <Claim kind="COMPUTED" /></>}
                      {cols.length > 1 && <span className={css.diffTag}>{differs ? "differs" : "same"}</span>}
                    </th>
                    {l.cells.map((c, i) => <td key={i}>{c.node}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
