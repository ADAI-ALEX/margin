"use client";
import type { ReactNode } from "react";
import type { Run, Scenario } from "@/lib/schema";
import { SCALES, VERDICT_THRESHOLDS, classify, kPaToPsia, type Evaluation, type Robustness, type Scored, type Verdict } from "@/lib/engine";
import { HAZARDS, INSIGHTS, OLSON_FERKUL_2012, PLANNED } from "@/content/curated";
import { COUNTS, HEADLINE, SNAP, invById } from "@/lib/data";
import { DISCLAIMER, GRAVITY_LABEL, VERDICT_COPY, basisLabel, fmt, fmtSigned } from "@/lib/format";
import { fetchedDate } from "./derive";
import css from "./casefile.module.css";

type ClaimType = "MEASURED" | "COMPUTED" | "NOMINAL" | "REPORTED LIMIT" | "MODEL" | "EXTRAPOLATED" | "DRAFT" | "PLANNED";
interface Claim { id: string; types: ClaimType[]; title: ReactNode; body?: ReactNode; source: ReactNode; draft?: boolean }

const VERDICTS: Verdict[] = ["DIRECT", "NEAR", "DISTANT", "NONE"];
const AXIS_NAME = { o2: "O₂", pressure: "pressure", flow: "flow" } as const;
const ALL_AXES = ["o2", "pressure", "flow"] as const;
function comparedOn(sc: Scored) {
  const used = sc.d.axesUsed.map((a) => AXIS_NAME[a]);
  const missing = ALL_AXES.filter((a) => !sc.d.axesUsed.includes(a)).map((a) => AXIS_NAME[a]);
  return { used: used.join(", "), missing: missing.join(", ") };
}
export const Badge = ({ t }: { t: ClaimType }) => <span className={css.badge} data-t={t}>{t}</span>;

const basisType = (b: Run["o2Basis"]): ClaimType | null => (b === "measured" ? "MEASURED" : b === "nominal-stated" ? "NOMINAL" : b === "limit-reported" ? "REPORTED LIMIT" : null);

function srcLabel(r: Run) {
  return `${r.source.ref}${r.source.row != null ? ` · row ${r.source.row}` : ""}${r.source.page ? ` · ${r.source.page}` : ""}`;
}

function RunSource({ run, openRun }: { run: Run; openRun: (r: Run) => void }) {
  return (
    <>
      <button type="button" className={css.linkBtn} onClick={() => openRun(run)}>{srcLabel(run)}</button>
      {" · "}
      <a href={run.source.url} target="_blank" rel="noreferrer">source ↗</a>
    </>
  );
}

function Gaps({ sc }: { sc: Scored }) {
  const { d } = sc;
  const cell = (label: string, gap: number | null, raw: string, used: boolean) => (
    <span className={css.gap}>
      <span className={css.gapLabel}>{label}</span>
      <span className={css.mono}>{used ? raw : "not used"}</span>
      {used && gap != null && <span className={css.gapUnits}>{fmtSigned(gap, 2)} u</span>}
    </span>
  );
  return (
    <span className={css.gaps}>
      {cell("O₂", d.gaps.o2, `${fmtSigned(d.raw.o2Pts, 1)} pts`, d.axesUsed.includes("o2"))}
      {cell("Pressure", d.gaps.pressure, `${fmtSigned(d.raw.pressurePct, 0)} %`, d.axesUsed.includes("pressure"))}
      {cell("Flow", d.gaps.flow, d.flags.includes("flow-regime-mismatch") ? "regime mismatch" : `${fmtSigned(d.raw.flowCmS, 1)} cm/s`, d.axesUsed.includes("flow"))}
    </span>
  );
}

export function VerdictGlyph({ v }: { v: Verdict }) {
  return (
    <span className={css.vGlyph} aria-hidden>
      {VERDICTS.map((x) => <span key={x} data-on={x === v} />)}
    </span>
  );
}

export function Finding({ s, ev, psiOnly, robust, openRun }: { s: Scenario; ev: Evaluation; psiOnly: Evaluation; robust: Robustness; openRun: (r: Run) => void }) {
  const n = ev.nearest;
  return (
    <section className={css.finding} aria-labelledby="cf-finding-h">
      <div className={css.sheetLabel} id="cf-finding-h"><span>§3</span> Finding</div>
      <div className={css.verdictRow} aria-live="polite">
        <h2 className={css.verdict}>Evidence: <b>{ev.verdict}</b></h2>
        <span className={css.disclaimer}>{DISCLAIMER}</span>
      </div>
      <p className={css.verdictCopy}>
        <VerdictGlyph v={ev.verdict} /> {VERDICT_COPY[ev.verdict]}{s.gravity !== "micro" ? ` · ${GRAVITY_LABEL[s.gravity]}` : ""}
      </p>
      <dl className={css.figures}>
        <div><dt>D nearest <em>computed</em></dt><dd className={css.mono}>{n ? fmt(n.d.D, 2) : "—"}</dd></div>
        {s.includePublished && <div><dt>PSI only <em>computed</em></dt><dd className={css.mono}>{psiOnly.verdict} · {psiOnly.nearest ? fmt(psiOnly.nearest.d.D, 2) : "—"}</dd></div>}
        <div><dt>Comparable runs</dt><dd className={css.mono}>{ev.comparable.length}</dd></div>
        <div><dt>Robustness <em>{robust.combos} combos</em></dt><dd className={css.mono}>{robust.robust ? "Robust" : "Sensitive"}</dd></div>
      </dl>
      {n ? (
        <div className={css.nearestBox}>
          <span className={css.nearestHead}>Nearest comparable run</span>
          <button type="button" className={css.nearestBtn} onClick={() => openRun(n.run)}>
            <span className={css.mono}>{n.run.id}</span> · {n.run.material ?? "material not recorded"} <span className={css.open}>provenance →</span>
          </button>
          <Gaps sc={n} />
          {n.d.partialMatch && (
            <p className={css.partialNote}>
              Partial match: compared on {comparedOn(n).used} only; {comparedOn(n).missing} not compared (not recorded or flow-regime mismatch).
            </p>
          )}
          {n.d.partialMatch && (ev.nearestComplete ? (
            <button type="button" className={css.nearestBtn} onClick={() => openRun(ev.nearestComplete!.run)}>
              <span className={css.nearestHead}>Best fully-compared run</span>{" "}
              <span className={css.mono}>{ev.nearestComplete.run.id}</span> · D <b className={css.mono}>{fmt(ev.nearestComplete.d.D, 2)}</b> ({classify(ev.nearestComplete.d.D)}) <span className={css.open}>provenance →</span>
            </button>
          ) : <p className={css.partialNote}>No comparable run is compared on all three axes.</p>)}
        </div>
      ) : (
        <p className={css.noneBox}>No comparable run in {GRAVITY_LABEL[s.gravity].toLowerCase()} for this question{s.includePublished ? "" : " (PSI only)"}.</p>
      )}
    </section>
  );
}

export function ClaimLedger({ s, ev, psiOnly, robust, openRun }: { s: Scenario; ev: Evaluation; psiOnly: Evaluation; robust: Robustness; openRun: (r: Run) => void }) {
  const claims: Claim[] = [];
  const n = ev.nearest;
  const engineSrc = <>MARGIN engine · <code>evaluate()</code> · scales O₂ {SCALES.o2Pts} pts, pressure ×{SCALES.pressureRatio}, flow {SCALES.flowCmS} cm/s per unit</>;

  claims.push({
    id: "verdict", types: ["COMPUTED"],
    title: <>Evidence <b>{ev.verdict}</b>: {VERDICT_COPY[ev.verdict].toLowerCase()}{n ? <> — D = <span className={css.mono}>{fmt(n.d.D, 2)}</span></> : null}.</>,
    body: <>Thresholds DIRECT ≤ {VERDICT_THRESHOLDS.direct}, NEAR ≤ {VERDICT_THRESHOLDS.near}. {ev.comparable.length} comparable runs passed the gate for “{HAZARDS.find((h) => h.id === s.hazard)?.label}” in {GRAVITY_LABEL[s.gravity].toLowerCase()}. <i>{DISCLAIMER}</i></>,
    source: engineSrc,
  });
  if (s.includePublished) {
    claims.push({
      id: "psionly", types: ["COMPUTED"],
      title: <>Without published evidence the verdict is <b>{psiOnly.verdict}</b>{psiOnly.nearest ? <> (D = <span className={css.mono}>{fmt(psiOnly.nearest.d.D, 2)}</span>)</> : null}.</>,
      body: <>Published values are transcribed and await human verification.</>,
      source: engineSrc,
    });
  }
  if (n) {
    const r = n.run;
    const types = Array.from(new Set([basisType(r.o2Basis), basisType(r.pressureBasis)].filter((x): x is ClaimType => !!x)));
    claims.push({
      id: "nearest", types,
      title: <>Nearest comparable run <span className={css.mono}>{r.id}</span>: {r.material ?? "material not recorded"}{r.tier === "T3_PUBLISHED" ? " (published)" : ""}.{n.d.partialMatch ? <> Compared on {comparedOn(n).used} only; {comparedOn(n).missing} not compared.</> : null}</>,
      body: (
        <span className={css.kv}>
          <span>O₂ <b className={css.mono}>{r.o2Pct != null ? `${fmt(r.o2Pct, 1)} %` : "not recorded"}</b> <em>{basisLabel(r.o2Basis)}</em></span>
          <span>P <b className={css.mono}>{r.pressureKPa != null ? `${fmt(r.pressureKPa, 1)} kPa · ${fmt(kPaToPsia(r.pressureKPa), 2)} psia` : "not recorded"}</b> <em>{basisLabel(r.pressureBasis)}</em></span>
          <span>Flow <b className={css.mono}>{r.flowCmS != null ? `${fmt(r.flowCmS, 1)} cm/s` : "not recorded"}</b> <em>{r.flowRegime}</em></span>
          {r.flags.length > 0 && <span className={css.flagRow}>{r.flags.map((f) => <span key={f} className={css.flag}>{f}</span>)}</span>}
        </span>
      ),
      source: <RunSource run={r} openRun={openRun} />,
    });
    claims.push({
      id: "gaps", types: ["COMPUTED"],
      title: <>Per-axis gaps, run − scenario{n.d.partialMatch ? " (partial match: not all axes comparable)" : ""}.</>,
      body: <Gaps sc={n} />,
      source: <>MARGIN engine · <code>distance()</code> · u = scale units</>,
    });
    if (n.d.partialMatch) {
      const c = ev.nearestComplete;
      claims.push(c ? {
        id: "complete", types: Array.from(new Set(["COMPUTED" as ClaimType, ...[basisType(c.run.o2Basis), basisType(c.run.pressureBasis)].filter((x): x is ClaimType => !!x)])),
        title: <>Best fully-compared run (O₂, pressure and flow): <span className={css.mono}>{c.run.id}</span>, {c.run.material ?? "material not recorded"} — D = <span className={css.mono}>{fmt(c.d.D, 2)}</span> ({classify(c.d.D)}).</>,
        body: <Gaps sc={c} />,
        source: <RunSource run={c.run} openRun={openRun} />,
      } : {
        id: "complete", types: ["COMPUTED"],
        title: <>Best fully-compared run: none. No comparable run records all three axes for this scenario.</>,
        source: <>MARGIN engine · <code>evaluate().nearestComplete</code></>,
      });
    }
  } else {
    claims.push({
      id: "nonearest", types: ["COMPUTED"],
      title: <>No run passes the gate for this question in {GRAVITY_LABEL[s.gravity].toLowerCase()}{s.includePublished ? "" : " (PSI only)"}.</>,
      body: <>{ev.otherGravity.length} relevant runs exist in other gravity regimes; no cross-regime distance is computed.</>,
      source: <>MARGIN engine · <code>gate()</code></>,
    });
  }
  const lim = ev.limits[0];
  if (lim) {
    claims.push({
      id: "limit", types: ["REPORTED LIMIT"],
      title: <>Nearest reported limit: <span className={css.mono}>{fmt(lim.run.o2Pct, 1)} % O₂</span>{lim.run.pressureKPa != null ? <> at <span className={css.mono}>{fmt(lim.run.pressureKPa, 1)} kPa</span></> : null} — {lim.run.material ?? lim.run.investigation}. A threshold inferred from a test series, not a tested condition; never used for the verdict.</>,
      body: <>{ev.limits.length} reported limit point{ev.limits.length === 1 ? "" : "s"} in this regime. Distance to this one, for orientation only: D = <span className={css.mono}>{fmt(lim.d.D, 2)}</span> <em>computed</em>.</>,
      source: <RunSource run={lim.run} openRun={openRun} />,
    });
  }
  claims.push({
    id: "robust", types: ["COMPUTED"],
    title: <>{robust.robust ? "Robust" : "Sensitive"}: verdict across {robust.combos} scale combinations (each scale ½×, 1×, 2×).</>,
    body: (
      <span className={css.robustCounts}>
        {VERDICTS.map((v) => <span key={v} data-zero={robust.verdicts[v] === 0}><b className={css.mono}>{robust.verdicts[v]}</b> {v}</span>)}
        {robust.Drange && <span>D <b className={css.mono}>{fmt(robust.Drange[0], 2)}–{fmt(robust.Drange[1], 2)}</b></span>}
      </span>
    ),
    source: <>MARGIN engine · <code>robustness()</code></>,
  });
  claims.push({
    id: "coverage", types: ["MEASURED", "COMPUTED"],
    title: <>Highest O₂ in any of PSI&rsquo;s {HEADLINE.solidRunsWithO2} solid-material tests with a recorded O₂ value: <b className={css.mono}>{fmt(HEADLINE.maxSolidO2, 1)} %</b>. {HEADLINE.atOrAboveArtemis} reach the Artemis habitat&rsquo;s {fmt(HEADLINE.artemisO2, 1)} %; {HEADLINE.atOrAboveEA} reach the Exploration Atmosphere&rsquo;s {fmt(HEADLINE.eaO2, 1)} %.</>,
    body: <>{COUNTS.totalRuns} PSI run rows; {COUNTS.plottable} carry both O₂ and pressure.</>,
    source: <>PSI snapshot fetched {fetchedDate(SNAP.fetchedAt)} · {SNAP.tableStats.length} experimental tables</>,
  });
  claims.push({
    id: "context", types: ["COMPUTED"],
    title: <>{ev.context.length} runs are context only; {ev.otherGravity.length} are in another gravity regime; {ev.excludedCount} are excluded by the gate.</>,
    source: <>MARGIN engine · <code>gate()</code></>,
  });
  if (s.gravity !== "micro") {
    const mylar = OLSON_FERKUL_2012.rows.find((r) => /mylar/i.test(r.material)) ?? OLSON_FERKUL_2012.rows[0];
    claims.push({
      id: "pg-psi", types: ["COMPUTED"],
      title: <>PSI holds <b className={css.mono}>{COUNTS.partialGravityRuns}</b> partial-gravity combustion runs; all PSI runs are microgravity.</>,
      source: <>PSI snapshot fetched {fetchedDate(SNAP.fetchedAt)}</>,
    });
    claims.push({
      id: "pg-of", types: ["REPORTED LIMIT"],
      title: <>For {mylar.material.replace(/\s+G$/, "")} at {mylar.pressurePsia} psia, NASA drop-tower tests found a lower flammability limit at lunar gravity than at either 0 g or 1 g. Microgravity and Earth results did not bound lunar behaviour for this material.</>,
      body: <>ULOI* Moon <span className={css.mono}>{mylar.uloi.moon}</span> · 0 g <span className={css.mono}>{mylar.uloi.micro}</span> · 1 g <span className={css.mono}>{mylar.uloi.earth}</span> % O₂. {OLSON_FERKUL_2012.caveats.join("; ")}.</>,
      source: <a href={OLSON_FERKUL_2012.source.url} target="_blank" rel="noreferrer">{OLSON_FERKUL_2012.source.ref}, {OLSON_FERKUL_2012.source.page} ↗</a>,
    });
    const fm2 = invById.get("PLAN-FM2");
    claims.push({
      id: "pg-fm2", types: ["PLANNED"],
      title: <>{fm2?.acronym ?? "FM2"}: planned — first lunar-surface test. {PLANNED.length} planned conditions, never counted as evidence.</>,
      source: fm2 ? <a href={fm2.landingUrl} target="_blank" rel="noreferrer">{PLANNED[0]?.source.ref} ↗</a> : "—",
    });
  }
  const drafts = INSIGHTS.filter((i) => i.hazards.includes(s.hazard));

  return (
    <section className={css.ledger} aria-labelledby="cf-ledger-h">
      <div className={css.sheetLabel} id="cf-ledger-h"><span>§4</span> Claim ledger <span className={css.sheetLabelNote}>{claims.length} statements · {drafts.length} drafts</span></div>
      <ol className={css.claims}>
        {claims.map((c, i) => (
          <li key={c.id} className={css.claim}>
            <span className={css.claimNo}>C{i + 1}</span>
            <div className={css.claimBody}>
              <span className={css.badges}>{c.types.map((t) => <Badge key={t} t={t} />)}</span>
              <p className={css.claimTitle}>{c.title}</p>
              {c.body && <div className={css.claimText}>{c.body}</div>}
              <p className={css.claimSrc}><span>Source</span> {c.source}</p>
            </div>
          </li>
        ))}
        {drafts.map((d, i) => (
          <li key={d.id} className={`${css.claim} ${css.claimDraft}`}>
            <span className={css.claimNo}>D{i + 1}</span>
            <div className={css.claimBody}>
              <span className={css.badges}><span className={css.draftStamp}>DRAFT — unverified</span><Badge t={d.validity} /></span>
              <p className={css.claimTitle}>{d.claim}</p>
              <div className={css.claimText}>
                <span className={css.mono}>{d.value}</span> · {d.conditions}
                <dl className={css.scopeDl}>
                  <div><dt>Scope</dt><dd>{d.scope}</dd></div>
                  <div><dt>Not valid for</dt><dd>{d.notValidFor}</dd></div>
                </dl>
              </div>
              <p className={css.claimSrc}><span>Source</span> <a href={d.source.url} target="_blank" rel="noreferrer">{d.source.ref} ↗</a></p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
