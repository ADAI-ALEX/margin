"use client";
import Link from "next/link";
import { useScenarioQuery } from "@/lib/state/useMargin";
import { usePins, withPin } from "@/components/casefile/pinStore";
import css from "./dossier.module.css";

/** Breadcrumb back to the workspace, carrying the current scenario query when there is one. */
export function DossierCrumb({ id }: { id: string }) {
  const q = useScenarioQuery();
  return (
    <nav className={css.crumb} aria-label="Breadcrumb">
      <ol>
        <li><Link href={q ? `/investigations?${q}` : "/investigations"}>Investigations</Link></li>
        <li aria-current="page"><span className="num">{id}</span></li>
      </ol>
    </nav>
  );
}

/** "See on the Atlas" and "Add to compare", carrying the current scenario query when there is one. */
export function DossierLinks({ id }: { id: string }) {
  const q = useScenarioQuery();
  const pins = withPin(usePins(), id);
  return (
    <nav className={css.links} aria-label="Dossier actions">
      <Link href={q ? `/?${q}` : "/"} className={`btn ${css.linkBtn}`}>See on the Atlas <span aria-hidden="true">→</span></Link>
      {/* a full navigation, so the workspace always reads this `cmp` fresh */}
      <a href={`/investigations?${q ? `${q}&` : ""}cmp=${pins.map(encodeURIComponent).join(",")}`} className={`btn ${css.linkBtn}`} data-testid="add-to-compare">Add to compare <span aria-hidden="true">→</span></a>
    </nav>
  );
}
