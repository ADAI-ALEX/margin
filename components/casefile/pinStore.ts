"use client";
/** Session-wide record of the compare selection, so a dossier's "Add to compare" can add to it rather than replace it. */
import { useSyncExternalStore } from "react";

let pins: string[] = [];
const listeners = new Set<() => void>();
export function publishPins(next: string[]) {
  if (next.join() === pins.join()) return;
  pins = next;
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const EMPTY: string[] = [];
export function usePins(): string[] {
  return useSyncExternalStore(subscribe, () => pins, () => EMPTY);
}
/** The compare list after adding `id` (kept at most `max`; the oldest pin is dropped when full). */
export function withPin(current: string[], id: string, max = 3): string[] {
  if (current.includes(id)) return current;
  return [...current, id].slice(-max);
}
