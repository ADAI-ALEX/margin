"use client";
/**
 * The provenance drawer: the shared Drawer (Esc closes, focus returns to the opener) around the single
 * run inspector. Used by the Investigations page (claim ledger, catalogue, partial gravity) and dossiers.
 */
import type { Run, Scenario } from "@/lib/schema";
import { Drawer } from "@/components/ui/Drawer";
import RunInspector, { runTitle } from "@/components/run/RunInspector";

export function Provenance({ run, s, onClose }: { run: Run | null; s: Scenario; onClose: () => void }) {
  return (
    <Drawer open={!!run} onClose={onClose} title={run ? runTitle(run) : ""} kicker="Provenance" titleId="inv-prov-title" testId="provenance" closeLabel="Close provenance">
      {run && <RunInspector run={run} scenario={s} hideTitle />}
    </Drawer>
  );
}
