"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScenarioQuery } from "@/lib/state/useMargin";
import BrandMark from "./BrandMark";

const NAV = [
  { href: "/", label: "Atlas", match: (p: string) => p === "/" },
  { href: "/investigations", label: "Investigations", match: (p: string) => p.startsWith("/investigations") },
  { href: "/method", label: "Method", match: (p: string) => p.startsWith("/method") },
  { href: "/sources", label: "Sources", match: (p: string) => p.startsWith("/sources") },
];

/** Global header. Atlas and Investigations links carry the current scenario query so the scenario survives navigation. */
export default function SiteHeader({ status }: { status: string }) {
  const pathname = usePathname() ?? "/";
  const q = useScenarioQuery();
  return (
    <header className="site-header">
      <Link href={q ? `/?${q}` : "/"} className="site-brand" aria-label="MARGIN home">
        <BrandMark size={22} />
        <span className="site-wordmark">MARGIN</span>
        <span className="site-tagline">How close is the evidence?</span>
      </Link>
      <nav className="site-nav" aria-label="Primary">
        {NAV.map((n) => {
          const carry = q && (n.href === "/" || n.href === "/investigations");
          return (
            <Link key={n.href} href={carry ? `${n.href}?${q}` : n.href} aria-current={n.match(pathname) ? "page" : undefined}>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <span className="site-status" title="Bundled NASA PSI snapshot; the app makes no calls to NASA at run time"><span className="dot" aria-hidden="true" />{status}</span>
      <a className="site-gh" href="https://github.com/ADAI-ALEX/margin" target="_blank" rel="noreferrer" aria-label="Source code on GitHub">
        <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      </a>
    </header>
  );
}
