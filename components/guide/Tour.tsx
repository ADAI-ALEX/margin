"use client";
/**
 * A short guided tour of the live Atlas: a spotlight on one part of the screen at a time with a card that
 * explains it in plain words. Modal while open (Esc or Skip closes it, focus returns to whatever opened
 * it); a step whose target is not on screen (a collapsed panel, a phone layout) is shown as a centred card.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { IconClose } from "@/components/ui/icons";

export interface TourStep { id: string; title: string; body: ReactNode; targets?: string[] }
type Box = { x: number; y: number; w: number; h: number };

const PAD = 6;
const GAP = 14;

function findTarget(sels: string[] | undefined): Element | null {
  for (const s of sels ?? []) {
    const els = Array.from(document.querySelectorAll(s));
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== "hidden") return el;
    }
  }
  return null;
}

export default function Tour({ steps, open, onClose, onFinish }: { steps: TourStep[]; open: boolean; onClose: () => void; onFinish?: () => void }) {
  const [i, setI] = useState(0);
  const [spot, setSpot] = useState<Box | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  useEffect(() => {
    if (open) { opener.current = document.activeElement; setI(0); } // eslint-disable-line react-hooks/set-state-in-effect
  }, [open]);

  const close = useCallback((finished: boolean) => {
    onClose();
    if (finished) onFinish?.();
    const o = opener.current as HTMLElement | null;
    if (o && document.contains(o) && typeof o.focus === "function") requestAnimationFrame(() => o.focus());
  }, [onClose, onFinish]);

  const place = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const el = findTarget(step?.targets);
    if (!el) {
      setSpot(null);
      setPos({ left: Math.max(16, (vw - cw) / 2), top: Math.max(16, (vh - ch) / 2) });
      return;
    }
    const r = el.getBoundingClientRect();
    const b: Box = { x: Math.max(4, r.left - PAD), y: Math.max(4, r.top - PAD), w: Math.min(vw - 8, r.width + 2 * PAD), h: Math.min(vh - 8, r.height + 2 * PAD) };
    setSpot(b);
    const fits = (l: number, t: number) => l >= 12 && t >= 12 && l + cw <= vw - 12 && t + ch <= vh - 12;
    const midY = Math.min(Math.max(12, b.y + b.h / 2 - ch / 2), vh - ch - 12);
    const midX = Math.min(Math.max(12, b.x + b.w / 2 - cw / 2), vw - cw - 12);
    const cands = [
      { left: b.x + b.w + GAP, top: midY },
      { left: b.x - GAP - cw, top: midY },
      { left: midX, top: b.y + b.h + GAP },
      { left: midX, top: b.y - GAP - ch },
    ];
    const hit = cands.find((c) => fits(c.left, c.top));
    // A target that fills most of the screen (the field): the card sits inside it, bottom left.
    setPos(hit ?? { left: Math.min(Math.max(12, b.x + 24), vw - cw - 12), top: Math.max(12, Math.min(b.y + b.h - ch - 24, vh - ch - 12)) });
  }, [step]);

  // Bring the target into view (phone layout scrolls), then measure.
  useLayoutEffect(() => {
    if (!open) return;
    const el = findTarget(step?.targets);
    if (el && window.innerWidth < 768) el.scrollIntoView({ block: "center", behavior: "auto" });
    place(); // eslint-disable-line react-hooks/set-state-in-effect -- measures the DOM, then positions the card before paint
    const id = requestAnimationFrame(place);
    return () => cancelAnimationFrame(id);
  }, [open, i, step, place]);

  useEffect(() => {
    if (!open) return;
    const on = () => place();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("scroll", on, true); };
  }, [open, place]);

  useEffect(() => { if (open) (nextRef.current ?? cardRef.current)?.focus(); }, [open, i]);

  if (!open || !step) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(false); return; }
    if (e.key === "ArrowRight" && !last) { e.preventDefault(); setI(i + 1); return; }
    if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); setI(i - 1); return; }
    if (e.key === "Tab") {
      const f = Array.from(cardRef.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? []).filter((x) => !x.hasAttribute("disabled"));
      if (!f.length) return;
      const first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
  };

  return (
    <>
      <div className={spot ? "tour-spot" : "tour-spot tour-spot--none"} aria-hidden="true"
        style={spot ? { left: spot.x, top: spot.y, width: spot.w, height: spot.h } : { left: "50%", top: "50%", width: 0, height: 0 }} />
      <div ref={cardRef} className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text"
        tabIndex={-1} onKeyDown={onKeyDown} data-testid="tour" data-step={step.id}
        style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }}>
        <p className="tour-step">Tour · {i + 1} of {steps.length}</p>
        <h2 id="tour-title" className="tour-title">{step.title}</h2>
        <div id="tour-text" className="tour-text">{step.body}</div>
        <div className="tour-foot">
          <span className="tour-dots" aria-hidden="true">{steps.map((s, k) => <span key={s.id} data-on={k === i || undefined} />)}</span>
          {i > 0 && <button type="button" className="ui-btn ui-btn--quiet" onClick={() => setI(i - 1)}>Back</button>}
          <button ref={nextRef} type="button" className="ui-btn tour-next" onClick={() => (last ? close(true) : setI(i + 1))}>{last ? "Start exploring" : "Next"}</button>
        </div>
        <button type="button" className="ui-sq tour-x" onClick={() => close(false)} aria-label="Close the tour"><IconClose /></button>
      </div>
    </>
  );
}
