"use client";
/**
 * Drawer (inspector sheet). Opens from the right on wide screens and from the bottom on narrow ones.
 * Esc closes it, focus moves to its close button on open, Tab is kept inside while it is modal, and focus
 * returns to the control that opened it.
 */
import { useEffect, useRef, type ReactNode, type KeyboardEvent as RKE } from "react";
import { IconClose } from "./icons";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  kicker?: ReactNode;
  titleId: string;
  children: ReactNode;
  side?: "right" | "bottom";
  modal?: boolean;
  testId?: string;
  closeLabel?: string;
  width?: "md" | "lg";
  className?: string;
}

export function Drawer(p: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const { open, onClose } = p;

  useEffect(() => {
    if (!open) return;
    if (!openerRef.current) openerRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  useEffect(() => {
    if (open) return;
    const el = openerRef.current;
    openerRef.current = null;
    if (el && document.contains(el)) el.focus();
  }, [open]);

  if (!open) return null;
  const modal = p.modal ?? true;
  const trap = (e: RKE) => {
    if (!modal || e.key !== "Tab" || !panelRef.current) return;
    const f = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  return (
    <div className={`ui-drawer-wrap ${p.className ?? ""}`} data-side={p.side ?? "right"} data-modal={modal || undefined}>
      {modal && <div className="ui-drawer-scrim" onClick={onClose} aria-hidden="true" />}
      <div ref={panelRef} className={`ui-drawer ui-drawer--${p.width ?? "md"}`} role="dialog" aria-modal={modal || undefined} aria-labelledby={p.titleId} data-testid={p.testId} onKeyDown={trap}>
        <header className="ui-drawer-head">
          <div className="ui-drawer-titles">
            {p.kicker && <p className="caps">{p.kicker}</p>}
            <h2 id={p.titleId} className="ui-drawer-title">{p.title}</h2>
          </div>
          <button ref={closeRef} type="button" className="ui-sq ui-sq--lg" onClick={onClose} aria-label={p.closeLabel ?? "Close"}><IconClose /></button>
        </header>
        <div className="ui-drawer-body">{p.children}</div>
      </div>
    </div>
  );
}
