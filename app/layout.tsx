import type { Metadata, Viewport } from "next";
import { fontVars } from "@/lib/fonts";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import CommandSearch from "@/components/ui/CommandSearch";
import { Toaster } from "@/components/ui/Toast";
import { COUNTS, SNAP } from "@/lib/data";
import "./globals.css";
import "@/components/ui/ui.css";
import "@/components/site/site.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL
      ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  title: { default: "MARGIN · How close is the evidence?", template: "%s · MARGIN" },
  description:
    "An evidence-coverage atlas of NASA PSI combustion tests. For a crewed atmosphere, see how close real NASA test conditions come, by gravity regime, with every number traced to its source. Evidence proximity, not a safety rating.",
  openGraph: { type: "website", siteName: "MARGIN", title: "MARGIN · How close is the evidence?" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#05070a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={fontVars}>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <SiteHeader status={`PSI snapshot ${SNAP.fetchedAt.slice(0, 10)} · ${COUNTS.totalRuns.toLocaleString("en-GB")} runs`} />
        {children}
        <SiteFooter />
        <CommandSearch />
        <Toaster />
      </body>
    </html>
  );
}
