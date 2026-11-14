"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScenarioQuery } from "@/lib/state/useMargin";

const NAV = [
  { href: "/", label: "Atlas", match: (p: string) => p === "/" },
  { href: "/investigations", label: "Investigations", match: (p: string) => p.startsWith("/investigations") },
  { href: "/method", label: "Method", match: (p: string) => p.startsWith("/method") },
  { href: "/sources", label: "Sources", match: (p: string) => p.startsWith("/sources") },
];

/** Global header. Atlas and Investigations links carry the current scenario query so the scenario survives navigation. */
export default function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const q = useScenarioQuery();
  return (
    <header className="site-header">
      <Link href={q ? `/?${q}` : "/"} className="site-brand" aria-label="MARGIN home">
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
    </header>
  );
}
