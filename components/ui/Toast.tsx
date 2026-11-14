"use client";
/** Transient status message ("Link copied"). One live region for the whole app. */
import { useEffect, useState, useSyncExternalStore } from "react";

let current: { id: number; text: string } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export function toast(text: string) { current = { id: Date.now(), text }; emit(); }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function Toaster() {
  const t = useSyncExternalStore(subscribe, () => current, () => null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!t) return;
    setVisible(true); // eslint-disable-line react-hooks/set-state-in-effect
    const h = window.setTimeout(() => setVisible(false), 2400);
    return () => window.clearTimeout(h);
  }, [t]);
  return (
    <div className="ui-toast-region" role="status" aria-live="polite">
      {t && visible ? <div key={t.id} className="ui-toast">{t.text}</div> : null}
    </div>
  );
}

/** Copy the current URL (the whole state lives in it) and confirm with a toast. */
export async function copyCurrentUrl() {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied: this view, with every setting, is in the URL");
  } catch {
    toast("Copy the address bar to share this view");
  }
}
