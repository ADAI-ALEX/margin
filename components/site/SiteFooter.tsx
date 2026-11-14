import Link from "next/link";
import { SNAP } from "@/lib/data";
import BrandMark from "./BrandMark";

const fetched = new Date(SNAP.fetchedAt).toISOString().slice(0, 10);

/**
 * Global footer on scrolling routes: disclaimer, data attribution (kept distinct from the code licence),
 * creator, competition, licence and the AI-assistance pointer. On the desktop Atlas it is hidden and the
 * same attribution sits in the field's credit line and About entry.
 */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <BrandMark size={20} />
          <span className="site-wordmark">MARGIN</span>
        </div>
        <div className="site-footer-text">
          <p>
            <strong>Evidence proximity, not a safety rating.</strong> MARGIN measures how close tested conditions come to a scenario. It does not predict fire
            behaviour, score safety, certify an environment, or establish that two conditions are scientifically equivalent.
          </p>
          <p>
            Data: NASA Physical Sciences Informatics (PSI), run tables fetched {fetched}; published values from the NASA Technical Reports Server and the cited
            papers. NASA data is used under its stated terms and does not imply NASA endorsement. See <Link href="/sources">Sources</Link> for every reference and
            licence. MARGIN was created by Alex de Gentile for NASA Space Apps 2026; code under Apache-2.0. AI tools assisted development (disclosed on <Link href="/sources#si">Sources</Link>).
          </p>
        </div>
      </div>
    </footer>
  );
}
