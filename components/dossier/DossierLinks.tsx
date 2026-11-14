"use client";
import Link from "next/link";
import { useScenarioQuery } from "@/lib/state/useMargin";
import { usePins, withPin } from "@/components/casefile/pinStore";
import css from "./dossier.module.css";

/** "See on the Atlas" and "Add to compare", carrying the current scenario query when there is one. */
export function DossierLinks({ id }: { id: string }) {
  const q = useScenarioQuery();
  const pins = withPin(usePins(), id);
  return (
    <nav className={css.links} aria-label="Dossier actions">
      <Link href={q ? `/?${q}` : "/"} className={css.linkBtn}>See on the Atlas →</Link>
      {/* a full navigation, so the workspace always reads this `cmp` fresh */}
      <a href={`/investigations?${q ? `${q}&` : ""}cmp=${pins.map(encodeURIComponent).join(",")}`} className={css.linkBtn} data-testid="add-to-compare">Add to compare →</a>
      <Link href={q ? `/investigations?${q}` : "/investigations"} className={css.backLink}>← All investigations</Link>
    </nav>
  );
}
