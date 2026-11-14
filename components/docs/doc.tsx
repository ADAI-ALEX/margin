/**
 * Long-form page primitives for Method and Sources (server-safe, no hooks).
 * Frame: .ui-page + .ui-page-head (components/ui/ui.css); local layout and typography: docs.css (doc- prefix).
 */
import type { ReactNode } from "react";

export type TocEntry = readonly [id: string, title: string];

const no = (n: number) => String(n).padStart(2, "0");

/** Numbered table of contents. Sticky beside the article on wide screens, a compact list above it on narrow ones. */
export function DocToc({ sections, label = "On this page" }: { sections: readonly TocEntry[]; label?: string }) {
  return (
    <nav className="doc-toc" aria-labelledby="doc-toc-label">
      <p className="doc-toc-label" id="doc-toc-label">{label}</p>
      <ol className="doc-toc-list">
        {sections.map(([id, title], i) => (
          <li key={id}>
            <a href={`#${id}`}><span className="doc-toc-no num" aria-hidden="true">{no(i + 1)}</span><span>{title}</span></a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** A numbered section. The heading carries the anchor id (deep links such as /method#verdicts). */
export function DocSection({ id, n, title, children }: { id: string; n: number; title: ReactNode; children: ReactNode }) {
  return (
    <section className="doc-sec" aria-labelledby={id}>
      <h2 id={id} className="doc-h2">
        <span className="doc-secno num"><span className="sr-only">Section </span>{no(n)}</span>
        <span className="doc-h2-text">{title}</span>
      </h2>
      {children}
    </section>
  );
}

/** A table in the shared .ui-table style inside a focusable scroll region (wide tables scroll here, never the page). */
export function DocTable({ label, caption, children, className }: { label: string; caption: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`doc-table ${className ?? ""}`}>
      <div className="ui-table-scroll" tabIndex={0} role="region" aria-label={label}>
        <table className="ui-table">
          <caption className="doc-caption">{caption}</caption>
          {children}
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ formula typesetting (semantic HTML) */

/** A displayed formula: large light type in a focusable scroll region, then a <dl> defining every symbol. */
export function Formula({ label, lines, symbols, note }: {
  label: string;
  lines: { key: string; content: ReactNode; main?: boolean }[];
  symbols: { key: string; term: ReactNode; def: ReactNode }[];
  note?: ReactNode;
}) {
  return (
    <figure className="doc-formula" aria-label={label}>
      <div className="doc-formula-display" tabIndex={0} role="region" aria-label={`${label}: formula`}>
        {lines.map((l) => <p key={l.key} className={l.main ? "doc-eq doc-eq--main" : "doc-eq"}>{l.content}</p>)}
      </div>
      <figcaption className="doc-formula-cap">
        <span className="doc-formula-where">where</span>
        <dl className="doc-symbols">
          {symbols.map((s) => <div key={s.key}><dt>{s.term}</dt><dd>{s.def}</dd></div>)}
        </dl>
        {note && <p className="doc-formula-note">{note}</p>}
      </figcaption>
    </figure>
  );
}

/** Stacked fraction; screen readers hear "a divided by b". */
export function Frac({ num, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <span className="doc-frac">
      <span className="doc-frac-num">{num}</span>
      <span className="sr-only"> divided by </span>
      <span className="doc-frac-den">{den}</span>
    </span>
  );
}

/** Square root with a vinculum over the radicand. */
export function Sqrt({ children }: { children: ReactNode }) {
  return (
    <span className="doc-sqrt">
      <svg className="doc-sqrt-sign" viewBox="0 0 14 32" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0.5 19 L3.5 17.5 L7.5 31 L13 0.5 L14 0.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="sr-only">square root of (</span>
      <span className="doc-sqrt-body">{children}</span>
      <span className="sr-only">)</span>
    </span>
  );
}

/** A variable with an optional subscript, e.g. <V s="r">O₂</V>. */
export function V({ children, s }: { children: ReactNode; s?: ReactNode }) {
  return <var className="doc-var">{children}{s != null && <sub>{s}</sub>}</var>;
}

/** An operator with even spacing (−, +, =, ×, ·). */
export function Op({ children }: { children: ReactNode }) {
  return <span className="doc-op">{children}</span>;
}
