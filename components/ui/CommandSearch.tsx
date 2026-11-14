"use client";
/**
 * Command search (⌘K / Ctrl K): investigations, reference atmospheres, source-checked findings and runs,
 * all from local data. The index loads on first open (dynamic import), so pages that never search never
 * download it. Combobox + listbox pattern: arrows move, Enter opens, Esc closes and restores focus.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchEntry, SearchKind } from "@/lib/view/searchIndex";
import { handleInPlace, onOpenSearch } from "@/lib/view/searchBus";
import { IconSearch } from "./icons";

type Mod = typeof import("@/lib/view/searchIndex");
const KIND_LABEL: Record<SearchKind, string> = { atmosphere: "Atmosphere", investigation: "Investigation", finding: "Finding", run: "Run" };

export default function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mod, setMod] = useState<Mod | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const uid = useId();
  const listId = `cmd-list-${uid}`;

  const show = useCallback(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    setOpen(false);
    setQ("");
    setActive(0);
    const el = openerRef.current;
    openerRef.current = null;
    if (el && document.contains(el)) requestAnimationFrame(() => el.focus());
  }, []);

  useEffect(() => onOpenSearch(show), [show]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (open) hide(); else show(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, show, hide]);
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    if (!mod) import("@/lib/view/searchIndex").then(setMod);
  }, [open, mod]);

  const results: SearchEntry[] = mod ? mod.search(q) : [];
  const choose = (e: SearchEntry | undefined) => {
    if (!e) return;
    hide();
    if (!handleInPlace(e)) router.push(e.href);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); hide(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(results[active]); }
  };
  useEffect(() => { document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, listId]);

  if (!open) return null;
  return (
    <div className="ui-cmd-wrap">
      <div className="ui-drawer-scrim" onClick={hide} aria-hidden="true" />
      <div className="ui-cmd" role="dialog" aria-modal="true" aria-label="Search MARGIN">
        <div className="ui-cmd-field">
          <IconSearch />
          <input
            ref={inputRef}
            className="ui-cmd-input"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            aria-label="Search investigations, atmospheres, findings and runs"
            placeholder="Search investigations, atmospheres, findings, runs…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKey}
          />
          <kbd className="ui-kbd">Esc</kbd>
        </div>
        <ul id={listId} className="ui-cmd-list" role="listbox" aria-label="Results">
          {!mod && <li className="ui-cmd-empty" role="presentation">Loading the local index…</li>}
          {mod && results.length === 0 && <li className="ui-cmd-empty" role="presentation">No match in the local data.</li>}
          {results.map((r, i) => (
            <li key={`${r.kind}:${r.id}`} id={`${listId}-${i}`} role="option" aria-selected={i === active} className="ui-cmd-item"
              onMouseMove={() => setActive(i)} onClick={() => choose(r)}>
              <span className="ui-cmd-kind caps">{KIND_LABEL[r.kind]}</span>
              <span className="ui-cmd-title">{r.title}</span>
              <span className="ui-cmd-meta">{r.meta}</span>
            </li>
          ))}
        </ul>
        <p className="ui-cmd-foot">Searches the bundled snapshot and curated sources on this device; nothing is sent anywhere.</p>
      </div>
    </div>
  );
}
