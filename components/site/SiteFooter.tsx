import Link from "next/link";
import { SNAP } from "@/lib/data";

const fetched = new Date(SNAP.fetchedAt).toISOString().slice(0, 10);

/** Global footer: data attribution (kept distinct from the code licence), disclaimer, SI disclosure pointer. */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>
        <strong>Evidence proximity, not a safety rating.</strong> MARGIN measures how close tested conditions come to a scenario. It does not predict fire
        behaviour, score safety, certify an environment, or establish that two conditions are scientifically equivalent.
      </p>
      <p>
        Data: NASA Physical Sciences Informatics (PSI), run tables fetched {fetched}; published values from the NASA Technical Reports Server and the cited
        papers. NASA data is used under its stated terms and does not imply NASA endorsement. See <Link href="/sources">Sources</Link> for every reference and
        licence. MARGIN was created by Alex de Gentile for NASA Space Apps 2026; code under Apache-2.0. AI tools assisted development (disclosed on <Link href="/sources#si">Sources</Link>).
      </p>
    </footer>
  );
}
