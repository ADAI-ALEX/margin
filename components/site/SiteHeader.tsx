"use client";
/**
 * Application shell header. Over the Atlas it floats transparently above the full-bleed field; on
 * document routes it is solid. Atlas and Investigations links carry the current scenario query so the
 * scenario survives navigation. The header never imports the PSI snapshot: its status line is a prop.
 */
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScenarioQuery } from "@/lib/state/useMargin";
import { openSearch } from "@/lib/view/searchBus";
import { copyCurrentUrl } from "@/components/ui/Toast";
import { IconGithub, IconSearch, IconShare } from "@/components/ui/icons";
import BrandMark from "./BrandMark";

const NAV = [
  { href: "/", label: "Atlas", match: (p: string) => p === "/" },
  { href: "/investigations", label: "Investigations", match: (p: string) => p.startsWith("/investigations") },
  { href: "/method", label: "Method", match: (p: string) => p.startsWith("/method") },
  { href: "/sources", label: "Sources", match: (p: string) => p.startsWith("/sources") },
];

export default function SiteHeader({ status }: { status: string }) {
  const pathname = usePathname() ?? "/";
  const q = useScenarioQuery();
  const overlay = pathname === "/";
  useEffect(() => { document.body.dataset.route = overlay ? "atlas" : "doc"; }, [overlay]);
  return (
    <header className="site-header" data-mode={overlay ? "overlay" : "solid"}>
      <Link href={q ? `/?${q}` : "/"} className="site-brand" aria-label="MARGIN home">
        <BrandMark size={24} />
        <span className="site-wordmark">MARGIN</span>
        <span className="site-tagline">How close is the evidence?</span>
      </Link>
      <nav className="site-nav" aria-label="Primary">
        {NAV.map((n) => {
          const carry = q && (n.href === "/" || n.href === "/investigations");
          return (
            <Link key={n.href} href={carry ? `${n.href}?${q}` : n.href} aria-current={n.match(pathname) ? "page" : undefined}>{n.label}</Link>
          );
        })}
      </nav>
      <div className="site-actions">
        <span className="site-status" title="Bundled NASA PSI snapshot; the app makes no calls to NASA at run time">
          <span className="site-status-glyph" aria-hidden="true" />{status}
        </span>
        <button type="button" className="site-action" onClick={openSearch} aria-keyshortcuts="Meta+K Control+K" aria-label="Search (Ctrl K)">
          <IconSearch /><span className="site-action-text">Search</span><kbd className="ui-kbd site-kbd" aria-hidden="true">⌘K</kbd>
        </button>
        <button type="button" className="site-action" onClick={copyCurrentUrl} aria-label="Share: copy the link to this view">
          <IconShare /><span className="site-action-text">Share</span>
        </button>
        <a className="site-action site-gh" href="https://github.com/ADAI-ALEX/margin" target="_blank" rel="noreferrer" aria-label="Source code on GitHub (opens in a new tab)">
          <IconGithub />
        </a>
      </div>
    </header>
  );
}
