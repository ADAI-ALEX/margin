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
      ?? (process.env.VERCEL_ENV === "production" ? "https://margin.adai.systems"
        : process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  title: { default: "MARGIN · How close is the evidence?", template: "%s · MARGIN" },
  description:
    "An evidence-coverage atlas of NASA PSI combustion tests. For a crewed atmosphere, see how close real NASA test conditions come, by gravity regime, with every number traced to its source. Evidence proximity, not a safety rating.",
  openGraph: { type: "website", siteName: "MARGIN", title: "MARGIN · How close is the evidence?" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#05070a" };

const PENDING_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search),k=["preset","o2","p","u","g","h","m","pub"],path=location.pathname.replace(/\\/$/,"")||"/";if((path==="/"||path==="/investigations")&&k.some(function(x){return q.has(x)})){var d=document.documentElement;d.setAttribute("data-pending","");setTimeout(function(){d.removeAttribute("data-pending")},8000)}}catch(e){}})();`;

/** Hide the first-visit welcome before paint once it has been dismissed on this device (components/guide/Welcome). */
const WELCOME_SCRIPT = `(function(){try{if(localStorage.getItem("margin.welcome")==="off")document.documentElement.setAttribute("data-welcome","off")}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={fontVars} suppressHydrationWarning>
      <body>
        {/* A shared link's scenario is applied on the client (the pages are static). Until then, hide the
            scenario-dependent views so a default verdict is never shown or clickable (see lib/state/useMargin). */}
        <script dangerouslySetInnerHTML={{ __html: PENDING_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: WELCOME_SCRIPT }} />
        <a href="#main" className="skip-link">Skip to content</a>
        <SiteHeader status={`PSI snapshot ${SNAP.fetchedAt.slice(0, 10)} · ${COUNTS.totalRuns.toLocaleString("en-GB")} runs`} />
        {children}
        <SiteFooter />
        <p className="pending-note" aria-hidden="true">Opening the shared view…</p>
        <CommandSearch />
        <Toaster />
      </body>
    </html>
  );
}
