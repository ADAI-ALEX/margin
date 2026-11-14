import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "@/components/site/BrandMark";

export const metadata: Metadata = { title: "Not found", robots: { index: false } };

/** Designed not-found state: an empty plane, stated plainly, with the ways back. */
export default function NotFound() {
  return (
    <main id="main" className="ui-page nf">
      <div className="nf-plane" aria-hidden="true">
        <svg viewBox="0 0 320 180" width="320" height="180">
          {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={i * 40} x2={i * 40} y1={0} y2={180} className="nf-grid" />)}
          {Array.from({ length: 5 }, (_, i) => <line key={`h${i}`} x1={0} x2={320} y1={i * 45} y2={i * 45} className="nf-grid" />)}
          <rect x={0.5} y={0.5} width={319} height={179} className="nf-frame" />
        </svg>
        <span className="nf-mark"><BrandMark size={28} /></span>
      </div>
      <p className="caps">404 · nothing at these coordinates</p>
      <h1 className="ui-page-title">Page not found</h1>
      <p className="ui-page-lede">There is no page here. The address may be mistyped, or the investigation id may not exist in this snapshot.</p>
      <p className="nf-links">
        <Link className="ui-btn" href="/">Open the Atlas</Link>
        <Link className="ui-btn ui-btn--quiet" href="/investigations">Browse investigations</Link>
        <Link className="ui-btn ui-btn--quiet" href="/sources">Sources</Link>
      </p>
    </main>
  );
}
