import Link from "next/link";
import { COUNTS, SNAP } from "@/design-exploration/shared/data";
import { PRESETS } from "@/design-exploration/shared/content";

const concepts = [
  { href: "/concepts/a", key: "A", name: "Console", kind: "Environment workbench", line: "A flight-test instrument. Precise numeric controls, a condition map with a crosshair, deviation gauges and a robustness matrix." },
  { href: "/concepts/b", key: "B", name: "Atlas", kind: "Evidence landscape", line: "A scientific chart of evidence coverage. Drag a pin across the O₂ × pressure plane; each gravity regime gets its own separate sheet." },
  { href: "/concepts/c", key: "C", name: "Casefile", kind: "Investigation comparison workspace", line: "Investigations come first. An envelope ladder shows every test's range against your scenario, with a compare tray and a claim ledger." },
];

export default function Home() {
  const ea = PRESETS.find((p) => p.id === "ea")!;
  const fetched = new Date(SNAP.fetchedAt).toISOString().slice(0, 16).replace("T", " ");
  return (
    <main style={{ minHeight: "100dvh", background: "#0e1013", color: "#e9edf1", padding: "48px 20px", fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <p style={{ font: "500 12px/1 ui-monospace, monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8b97a4", margin: 0 }}>MARGIN · design exploration · not the production app</p>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: "14px 0 8px", letterSpacing: "-0.01em" }}>How close is the evidence?</h1>
        <p style={{ color: "#aab4bf", maxWidth: 700, lineHeight: 1.55, margin: 0, fontSize: 15 }}>
          Three interactive directions for the same product, built on the same data and the same deterministic engine. All three use{" "}
          <b style={{ color: "#e9edf1" }}>{COUNTS.totalRuns.toLocaleString()}</b> real PSI run rows, fetched from NASA PSI at {fetched} UTC. Of the{" "}
          {COUNTS.solidRunsWithO2} solid-material runs with a recorded O₂ value, {COUNTS.solidRunsAboveMax} were run above {COUNTS.maxSolidO2}% O₂. The Exploration Atmosphere is {ea.o2Pct}%.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 1, background: "#1f262e", border: "1px solid #1f262e", marginTop: 32 }}>
          {concepts.map((c) => (
            <Link key={c.key} href={c.href} style={{ background: "#12161b", padding: "22px 20px 24px", color: "inherit", textDecoration: "none", display: "block" }}>
              <div style={{ font: "500 12px/1 ui-monospace, monospace", color: "#5cc8ff", letterSpacing: "0.1em" }}>CONCEPT {c.key}</div>
              <div style={{ fontSize: 22, fontWeight: 600, margin: "10px 0 2px" }}>{c.name}</div>
              <div style={{ fontSize: 13, color: "#8b97a4", marginBottom: 12 }}>{c.kind}</div>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: "#c3cbd3", margin: 0 }}>{c.line}</p>
              <div style={{ marginTop: 16, font: "500 12px/1 ui-monospace, monospace", color: "#e9edf1" }}>Open {c.href} →</div>
            </Link>
          ))}
        </div>
        <p style={{ marginTop: 28, fontSize: 12.5, color: "#8b97a4", lineHeight: 1.6, maxWidth: 760 }}>
          Published (non-PSI) values are transcribed from the team&apos;s research notes and still need human verification. Insight cards are unverified drafts.
          Evidence proximity is not a safety rating.
        </p>
      </div>
    </main>
  );
}
