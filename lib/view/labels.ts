/**
 * Direct-label placement for the evidence field. Greedy, deterministic (same input → same output, on the
 * server and the client): labels are placed in priority order, each at its first candidate position that
 * stays inside the bounds and clears every box already placed (marks, labels, reserved areas). A label
 * that fits nowhere is reported as hidden; its mark still renders and its name stays in the accessible
 * summary and the key.
 */
export interface Box { x: number; y: number; w: number; h: number }
export type Anchor = "start" | "middle" | "end";
export interface LabelRequest {
  id: string;
  /** Anchor point (the mark) in screen coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Higher places first. */
  priority: number;
  /** Candidate offsets, tried in order. Default: right, above, below, left. */
  candidates?: { dx: number; dy: number; anchor: Anchor }[];
}
export interface PlacedLabel { id: string; x: number; y: number; anchor: Anchor; box: Box; hidden: boolean }

/** Approximate rendered text widths for the field's label styles (deterministic; no DOM measuring). */
export const TEXT_STYLE = {
  /** Landmarks: 11 px, 600, tracked 0.2 em, uppercase. */
  caps: { size: 11, em: 0.69, track: 0.2 },
  /** Run labels: 12 px, 400, sentence case. */
  body: { size: 12, em: 0.53, track: 0 },
  /** Readouts: 12 px tabular figures. */
  value: { size: 12, em: 0.56, track: 0 },
} as const;
export function textWidth(text: string, style: keyof typeof TEXT_STYLE) {
  const s = TEXT_STYLE[style];
  return Math.ceil(text.length * s.size * (s.em + s.track));
}

export const defaultCandidates = (gap = 9, h = 12) => [
  { dx: gap, dy: h * 0.35, anchor: "start" as const },
  { dx: 0, dy: -gap - 2, anchor: "middle" as const },
  { dx: 0, dy: gap + h * 0.8, anchor: "middle" as const },
  { dx: -gap, dy: h * 0.35, anchor: "end" as const },
  { dx: gap, dy: -gap, anchor: "start" as const },
  { dx: -gap, dy: -gap, anchor: "end" as const },
  { dx: gap, dy: gap + h * 0.6, anchor: "start" as const },
  { dx: -gap, dy: gap + h * 0.6, anchor: "end" as const },
  { dx: 0, dy: -gap - h - 6, anchor: "middle" as const },
  { dx: 0, dy: gap + h * 1.8 + 6, anchor: "middle" as const },
  { dx: gap + 12, dy: -gap - h, anchor: "start" as const },
  { dx: -gap - 12, dy: -gap - h, anchor: "end" as const },
  { dx: gap + 12, dy: gap + h * 1.6, anchor: "start" as const },
  { dx: -gap - 12, dy: gap + h * 1.6, anchor: "end" as const },
];

const overlaps = (a: Box, b: Box, pad = 2) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const inside = (a: Box, bounds: Box) => a.x >= bounds.x && a.y >= bounds.y && a.x + a.w <= bounds.x + bounds.w && a.y + a.h <= bounds.y + bounds.h;

/** Text box for an anchor point given a baseline offset (SVG text: y is the baseline). */
function boxFor(r: LabelRequest, c: { dx: number; dy: number; anchor: Anchor }): Box {
  const bx = r.x + c.dx, by = r.y + c.dy;
  const left = c.anchor === "start" ? bx : c.anchor === "middle" ? bx - r.w / 2 : bx - r.w;
  return { x: left, y: by - r.h * 0.8, w: r.w, h: r.h };
}

/**
 * `obstacles` are never covered; `soft` obstacles (e.g. data marks) are avoided when possible, and a label
 * is allowed over them only when no candidate clears them.
 */
export function placeLabels(reqs: LabelRequest[], bounds: Box, obstacles: Box[] = [], soft: Box[] = []): PlacedLabel[] {
  const placed: Box[] = [...obstacles];
  const out: PlacedLabel[] = [];
  const order = [...reqs].sort((a, b) => b.priority - a.priority || a.x - b.x || a.y - b.y || a.id.localeCompare(b.id));
  for (const r of order) {
    const cands = r.candidates ?? defaultCandidates(9, r.h);
    let done: PlacedLabel | null = null;
    for (const avoidSoft of [true, false]) {
      for (const c of cands) {
        const box = boxFor(r, c);
        if (!inside(box, bounds)) continue;
        if (placed.some((p) => overlaps(box, p))) continue;
        if (avoidSoft && soft.some((p) => overlaps(box, p, 0))) continue;
        done = { id: r.id, x: Math.round((r.x + c.dx) * 10) / 10, y: Math.round((r.y + c.dy) * 10) / 10, anchor: c.anchor, box, hidden: false };
        break;
      }
      if (done) break;
    }
    if (done) { placed.push(done.box); out.push(done); }
    else out.push({ id: r.id, x: r.x, y: r.y, anchor: "start", box: { x: r.x, y: r.y, w: 0, h: 0 }, hidden: true });
  }
  return out;
}
