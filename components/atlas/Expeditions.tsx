"use client";
/**
 * Expeditions: curated entry points (like featured stories), each a complete, shareable state of the
 * field. A large light title, the values in tracked capitals, and the source. The active one carries the
 * amber scenario rule, because it is the user's scenario.
 */
import type { Scenario } from "@/lib/schema";
import { EXPEDITIONS, isExpeditionActive, type Expedition } from "@/lib/view/expeditions";

const GROUPS: { kind: Expedition["kind"][]; label: string }[] = [
  { kind: ["gap", "atmosphere"], label: "Reference atmospheres" },
  { kind: ["finding"], label: "Findings checked against primary sources" },
];

export default function Expeditions({ scenario, preset, onGo }: { scenario: Scenario; preset: string | null; onGo: (x: Expedition) => void }) {
  return (
    <div className="exp">
      {GROUPS.map((g) => {
        const items = EXPEDITIONS.filter((x) => g.kind.includes(x.kind));
        if (!items.length) return null;
        return (
          <section key={g.label} className="exp-group" aria-label={g.label}>
            <h3 className="exp-group-label caps">{g.label}</h3>
            <ul className="exp-list">
              {items.map((x) => {
                const on = isExpeditionActive(x, scenario, preset);
                return (
                  <li key={x.id}>
                    <button type="button" className={`ui-card exp-card exp-card--${x.kind}`} aria-pressed={on} onClick={() => onGo(x)}>
                      <span className="ui-card-title">{x.title}{x.assumed && <span className="exp-assumed"> (assumed)</span>}</span>
                      <span className="ui-card-meta">{x.values}</span>
                      <span className="ui-card-source">{x.source}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
