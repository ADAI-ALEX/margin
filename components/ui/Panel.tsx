"use client";
/**
 * Floating panel: an opaque surface over the field with a light label whose hairline runs out to the
 * edge, and an optional square collapse control. When collapsed only the head (or `summary`) remains.
 */
import type { ReactNode } from "react";
import { IconCollapse, IconExpand, IconChevronDown, IconChevronUp } from "./icons";

export interface PanelProps {
  id: string;
  label: ReactNode;
  /** Accessible name of the panel region. */
  name: string;
  children: ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  /** Which way the collapse control points: "side" (« / ») or "vertical" (˄ / ˅). */
  collapseAxis?: "side" | "vertical";
  /** Shown in the head when collapsed (e.g. a one-line scenario summary). */
  summary?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "aside";
  testId?: string;
}

export function Panel(p: PanelProps) {
  const Tag = p.as ?? "section";
  const bodyId = `${p.id}-body`;
  const side = (p.collapseAxis ?? "side") === "side";
  return (
    <Tag className={`ui-panel ${p.className ?? ""}`} data-collapsed={p.collapsed || undefined} aria-label={p.name} id={p.id} data-testid={p.testId}>
      <div className="ui-panel-head">
        <span className="ui-panel-label">{p.label}</span>
        {p.collapsed && p.summary ? <span className="ui-panel-summary">{p.summary}</span> : <span className="ui-panel-rule" aria-hidden="true" />}
        {p.actions}
        {p.onToggle && (
          <button type="button" className="ui-sq" onClick={p.onToggle} aria-expanded={!p.collapsed} aria-controls={bodyId} aria-label={`${p.collapsed ? "Expand" : "Collapse"} ${p.name}`}>
            {side ? (p.collapsed ? <IconExpand /> : <IconCollapse />) : (p.collapsed ? <IconChevronUp /> : <IconChevronDown />)}
          </button>
        )}
      </div>
      <div id={bodyId} className={`ui-panel-body ${p.bodyClassName ?? ""}`} hidden={p.collapsed}>{p.children}</div>
    </Tag>
  );
}
