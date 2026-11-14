/**
 * View-only URL parameters for the Atlas. Optional, validated and independent of the scenario contract
 * in ./scenarioQuery (which they never touch): an old link without them opens exactly as before.
 *
 *   run   the selected run (inspector open), e.g. "PSI-25:r0001"; ignored unless it names a known run
 *   view  "overview" shows the four gravity regimes as separate plates; absent = the single field
 */
export const VIEW_KEYS = ["run", "view"] as const;
export type AtlasView = "field" | "overview";
export interface ViewState { run: string | null; view: AtlasView }
export const DEFAULT_VIEW: ViewState = { run: null, view: "field" };

const RUN_RE = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,63}$/;

/** Parse; `isKnownRun` (optional) rejects ids that are well-formed but not in the data. */
export function parseViewQuery(q: URLSearchParams, isKnownRun?: (id: string) => boolean): ViewState {
  const raw = q.get("run");
  const run = raw != null && RUN_RE.test(raw) && (!isKnownRun || isKnownRun(raw)) ? raw : null;
  const view: AtlasView = q.get("view") === "overview" ? "overview" : "field";
  return { run, view };
}

/** Write the view keys into `base` (every other key is preserved untouched). Defaults are omitted. */
export function viewToQuery(v: ViewState, base: URLSearchParams): string {
  const q = new URLSearchParams(base);
  if (v.run && RUN_RE.test(v.run)) q.set("run", v.run); else q.delete("run");
  if (v.view === "overview") q.set("view", "overview"); else q.delete("view");
  return q.toString();
}
