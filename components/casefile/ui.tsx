/** Small presentational pieces shared by the workspace and the dossier. Usable from server components (no hooks). */
import Link from "next/link";
import type { Run } from "@/lib/schema";
import { SCALES, VERDICT_THRESHOLDS, type Verdict } from "@/lib/engine";
import { CLAIM_HELP, verification, type ClaimKind } from "./derive";
import css from "./casefile.module.css";

export function Claim({ kind }: { kind: ClaimKind }) {
  return <span className="claim" data-kind={kind} title={CLAIM_HELP[kind]}>{kind}</span>;
}

/** Verification badge for a run: DRAFT (not yet checked) / PUBLISHED (with locator) / PLANNED. Nothing for plain PSI rows. */
export function VerifyBadge({ run, compact = false }: { run: Run; compact?: boolean }) {
  const v = verification(run);
  if (!v.kind) return null;
  return (
    <span className={css.verify}>
      <Claim kind={v.kind} />
      {!compact && <span className={css.verifyText}>{v.label}</span>}
    </span>
  );
}

/** "Evidence: NEAR" — the verdict word is always written out, never carried by colour alone. */
export function EvidenceWord({ v, prefix = true }: { v: Verdict; prefix?: boolean }) {
  return <span className={css.evidence} data-v={v}>{prefix ? "Evidence: " : ""}<b>{v}</b></span>;
}

/** States that NEAR/DISTANT are MARGIN's classifications, with the thresholds and scales from the engine. */
export function MethodNote({ short = false }: { short?: boolean }) {
  const p = Math.round((SCALES.pressureRatio - 1) * 100);
  return (
    <span className={css.methodNote}>
      {short
        ? <>DIRECT / NEAR / DISTANT are MARGIN&rsquo;s classifications, not established scientific classes. </>
        : <>DIRECT / NEAR / DISTANT are classifications under MARGIN&rsquo;s chosen method (D ≤ {VERDICT_THRESHOLDS.direct} / ≤ {VERDICT_THRESHOLDS.near}; one unit = {SCALES.o2Pts} pts O₂, ×{SCALES.pressureRatio} ({p}%) pressure or {SCALES.flowCmS} cm/s flow), not established scientific classes. </>}
      <Link href="/method">Method</Link>
    </span>
  );
}

/** A run's source: file + row (PSI) or paper + locator (published), with an external link. */
export function SourceRef({ run }: { run: Run }) {
  const s = run.source;
  return (
    <span className={css.srcRef}>
      <span className={css.srcName}>{s.ref}</span>
      {s.row != null && <> · row <span className="num">{s.row}</span></>}
      {s.page && <> · {s.page}</>}
      {" · "}
      <a href={s.url} target="_blank" rel="noreferrer">{s.kind === "psi-table" ? "PSI record" : s.kind === "plan" ? "plan document" : "paper"}<span className="sr-only"> (opens in a new tab)</span> ↗</a>
    </span>
  );
}
