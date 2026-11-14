"use client";
/**
 * Lets the page that is on screen handle a search result in place (the Atlas applies an atmosphere or
 * opens a run in its inspector) instead of navigating. Handlers unregister when their page hides.
 */
import type { SearchEntry } from "./searchIndex";

type Handler = (e: SearchEntry) => boolean;
let handler: Handler | null = null;
export function registerSearchHandler(h: Handler) { handler = h; return () => { if (handler === h) handler = null; }; }
export function handleInPlace(e: SearchEntry) { return handler ? handler(e) : false; }

/** Open the command search from anywhere (header button, rail, ⌘K). */
const openers = new Set<() => void>();
export function onOpenSearch(f: () => void) { openers.add(f); return () => { openers.delete(f); }; }
export function openSearch() { openers.forEach((f) => f()); }
