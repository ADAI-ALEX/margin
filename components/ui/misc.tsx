/**
 * Small server-safe primitives: ChartFrame (every chart is a module), Breadcrumb, ClaimBadge, KeyList.
 * No hooks, so they can render in server components.
 */
import Link from "next/link";
import type { ReactNode } from "react";

/** Title → one-line definition → plot → source line → actions. */
export function ChartFrame({ title, definition, source, actions, children, className, testId, id, headingLevel = 3 }: {
  title: ReactNode; definition?: ReactNode; source: ReactNode; actions?: ReactNode; children: ReactNode;
  className?: string; testId?: string; id?: string; headingLevel?: 2 | 3 | 4;
}) {
  const H = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <figure className={`ui-chart ${className ?? ""}`} data-testid={testId} id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="ui-chart-head">
        <H className="ui-chart-title" id={id ? `${id}-title` : undefined}>{title}</H>
        {actions && <div className="ui-chart-actions">{actions}</div>}
      </div>
      {definition && <p className="ui-chart-def">{definition}</p>}
      <div className="ui-chart-plot">{children}</div>
      <figcaption className="ui-chart-source">{source}</figcaption>
    </figure>
  );
}

export interface Crumb { label: ReactNode; href?: string }
export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={`ui-crumbs ${className ?? ""}`}>
      <ol>
        {items.map((c, i) => (
          <li key={i} aria-current={i === items.length - 1 ? "location" : undefined}>
            {c.href && i < items.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export type ClaimKindAny = "MEASURED" | "COMPUTED" | "NOMINAL" | "REPORTED LIMIT" | "PUBLISHED" | "STATED" | "ASSUMED" | "DRAFT" | "PLANNED";
export function ClaimBadge({ kind, title, children }: { kind: ClaimKindAny; title?: string; children?: ReactNode }) {
  return <span className="claim" data-kind={kind} title={title}>{children ?? kind}</span>;
}

/** A key (legend) list: swatch + text rows. The field is readable without it; it explains. */
export function KeyList({ items, className, label }: { items: { swatch: ReactNode; text: ReactNode }[]; className?: string; label?: string }) {
  return (
    <ul className={`ui-key ${className ?? ""}`} aria-label={label}>
      {items.map((it, i) => <li key={i}><span className="ui-key-sw" aria-hidden="true">{it.swatch}</span><span>{it.text}</span></li>)}
    </ul>
  );
}
