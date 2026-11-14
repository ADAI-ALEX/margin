"use client";
/**
 * Field tools, a vertical rail at the right edge: key, layers, zoom in / out / reset, regimes overview,
 * fullscreen and share. Every button has a visible tooltip and an accessible name. Key and Layers open a
 * small popover beside the rail (Esc or a second click closes it and returns focus).
 */
import { useEffect, useRef, useState } from "react";
import { VERDICT_THRESHOLDS } from "@/lib/engine";
import { IconButton } from "@/components/ui/IconButton";
import { IconFullscreen, IconExitFullscreen, IconKey, IconLayers, IconMinus, IconPlates, IconPlus, IconReset, IconShare, IconClose } from "@/components/ui/icons";
import { copyCurrentUrl } from "@/components/ui/Toast";
import { KeySwatch } from "./marks";
import type { FieldLayers } from "./EvidenceField";

const LAYER_ROWS: { k: keyof FieldLayers; label: string; sw: Parameters<typeof KeySwatch>[0]["kind"] }[] = [
  { k: "coverage", label: "Coverage bands (D ≤ 1, D ≤ 2.5)", sw: "direct" },
  { k: "envelopes", label: "½× / 2× scale envelopes", sw: "envelope" },
  { k: "psi", label: "PSI runs, comparable", sw: "dot" },
  { k: "other", label: "PSI runs, other fuel class", sw: "muted" },
  { k: "published", label: "Published (not in PSI)", sw: "ring" },
  { k: "limits", label: "Reported limits", sw: "limit" },
  { k: "planned", label: "Planned (not evidence)", sw: "planned" },
  { k: "landmarks", label: "Reference atmospheres", sw: "landmark" },
  { k: "gap", label: "Coverage-gap annotation", sw: "gap" },
];

export function FieldKey() {
  return (
    <ul className="ui-key fld-key">
      <li><span className="ui-key-sw"><KeySwatch kind="direct" /></span>DIRECT · D ≤ {VERDICT_THRESHOLDS.direct} to a comparable test</li>
      <li><span className="ui-key-sw"><KeySwatch kind="near" /></span>NEAR · D ≤ {VERDICT_THRESHOLDS.near}</li>
      <li><span className="ui-key-sw"><KeySwatch kind="uncharted" /></span>no comparable evidence for this question and flow (D &gt; {VERDICT_THRESHOLDS.near})</li>
      <li><span className="ui-key-sw"><KeySwatch kind="envelope" /></span>NEAR boundary if the O₂ and pressure scales were halved or doubled</li>
      <li><span className="ui-key-sw"><KeySwatch kind="dot" /></span>PSI run, comparable for this question</li>
      <li><span className="ui-key-sw"><KeySwatch kind="muted" /></span>PSI run, other fuel class</li>
      <li><span className="ui-key-sw"><KeySwatch kind="ring" /></span>published (not in PSI)</li>
      <li><span className="ui-key-sw"><KeySwatch kind="limit" /></span>reported limit: a threshold, not a tested condition</li>
      <li><span className="ui-key-sw"><KeySwatch kind="planned" /></span>planned: never counted as evidence</li>
      <li><span className="ui-key-sw"><KeySwatch kind="landmark" /></span>reference cabin atmosphere</li>
      <li><span className="ui-key-sw"><KeySwatch kind="probe" /></span>your scenario (the probe)</li>
      <li className="fld-key-note">Marks: ● solid · ◆ liquid droplet · + gas burner · ■ smoke source. Bands are computed at the scenario&rsquo;s flow, question and material, in this gravity regime only. Lightness encodes closeness of tested conditions, not hazard.</li>
    </ul>
  );
}

export default function ToolRail({ layers, setLayer, zoomIn, zoomOut, reset, canZoomIn, canZoomOut, isZoomed, overview, toggleOverview }: {
  layers: FieldLayers; setLayer: (k: keyof FieldLayers, v: boolean) => void;
  zoomIn: () => void; zoomOut: () => void; reset: () => void; canZoomIn: boolean; canZoomOut: boolean; isZoomed: boolean;
  overview: boolean; toggleOverview: () => void;
}) {
  const [pop, setPop] = useState<null | "key" | "layers">(null);
  const [fs, setFs] = useState(false);
  const keyBtn = useRef<HTMLButtonElement>(null);
  const layBtn = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  useEffect(() => {
    if (!pop) return;
    const opener = pop === "key" ? keyBtn.current : layBtn.current;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setPop(null); opener?.focus(); } };
    const onDown = (e: PointerEvent) => { const t = e.target as Node; if (!popRef.current?.contains(t) && !opener?.contains(t)) setPop(null); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [pop]);
  // transient: close when the route is hidden (Activity) so it does not reopen stale
  useEffect(() => () => setPop(null), []);

  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="rail">
      {pop && (
        <div ref={popRef} className="rail-pop" role="dialog" aria-label={pop === "key" ? "Key" : "Layers"} id="atlas-rail-pop">
          <div className="rail-pop-head">
            <span className="ui-panel-label">{pop === "key" ? "Key" : "Layers"}</span>
            <span className="ui-panel-rule" aria-hidden="true" />
            <button type="button" className="ui-sq" onClick={() => { setPop(null); (pop === "key" ? keyBtn : layBtn).current?.focus(); }} aria-label={`Close ${pop === "key" ? "key" : "layers"}`}><IconClose /></button>
          </div>
          {pop === "key" ? <FieldKey /> : (
            <ul className="rail-layers">
              {LAYER_ROWS.map((r) => (
                <li key={r.k}>
                  <label className="rail-layer">
                    <input type="checkbox" checked={layers[r.k]} onChange={(e) => setLayer(r.k, e.target.checked)} />
                    <span className="ui-key-sw"><KeySwatch kind={r.sw} /></span>
                    <span>{r.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="rail-group">
        <IconButton ref={keyBtn} label="Key" icon={<IconKey />} expanded={pop === "key"} controls={pop === "key" ? "atlas-rail-pop" : undefined} onClick={() => setPop((v) => (v === "key" ? null : "key"))} />
        <IconButton ref={layBtn} label="Layers" icon={<IconLayers />} expanded={pop === "layers"} controls={pop === "layers" ? "atlas-rail-pop" : undefined} onClick={() => setPop((v) => (v === "layers" ? null : "layers"))} />
      </div>
      <div className="rail-group">
        <IconButton label="Zoom in" icon={<IconPlus />} onClick={zoomIn} disabled={!canZoomIn || overview} shortcut="+" />
        <IconButton label="Zoom out" icon={<IconMinus />} onClick={zoomOut} disabled={!canZoomOut || overview} shortcut="−" />
        <IconButton label="Reset view" icon={<IconReset />} onClick={reset} disabled={!isZoomed || overview} shortcut="0" />
      </div>
      <div className="rail-group">
        <IconButton label="Regimes overview" icon={<IconPlates />} pressed={overview} onClick={toggleOverview} shortcut="O" />
        <IconButton label={fs ? "Exit fullscreen" : "Fullscreen"} icon={fs ? <IconExitFullscreen /> : <IconFullscreen />} onClick={toggleFs} />
        <IconButton label="Share: copy link to this view" icon={<IconShare />} onClick={copyCurrentUrl} />
      </div>
    </div>
  );
}
