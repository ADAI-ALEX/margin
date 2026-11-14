"use client";
import Link from "next/link";
import { useScenarioQuery } from "@/lib/state/useMargin";
import { Breadcrumb } from "@/components/ui/misc";
import { usePins, withPin } from "@/components/casefile/pinStore";
import css from "./dossier.module.css";

/** Atlas › Investigations › acronym, carrying the current scenario query when there is one. */
export function DossierCrumb({ acronym }: { acronym: string }) {
  const q = useScenarioQuery();
  return (
    <Breadcrumb className={css.crumb} items={[
      { label: "Atlas", href: q ? `/?${q}` : "/" },
      { label: "Investigations", href: q ? `/investigations?${q}` : "/investigations" },
      { label: acronym },
    ]} />
  );
}

/** "View on Atlas with this scenario" and "Add to compare", carrying the current scenario query when there is one. */
export function DossierLinks({ id }: { id: string }) {
  const q = useScenarioQuery();
  const pins = withPin(usePins(), id);
  return (
    <nav className={css.actions} aria-label="Dossier actions">
      <Link href={q ? `/?${q}` : "/"} className="ui-btn">View on Atlas with this scenario</Link>
      {/* a full navigation, so the workspace always reads this `cmp` fresh */}
      <a href={`/investigations?${q ? `${q}&` : ""}cmp=${pins.map(encodeURIComponent).join(",")}`} className="ui-btn" data-testid="add-to-compare">Add to compare</a>
    </nav>
  );
}
