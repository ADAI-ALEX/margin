/** Field label placement (lib/view/labels.ts): deterministic, inside bounds, never overlapping. */
import { describe, it, expect } from "vitest";
import { placeLabels, textWidth, type LabelRequest } from "@/lib/view/labels";

const bounds = { x: 0, y: 0, w: 400, h: 300 };
const req = (id: string, x: number, y: number, priority = 1, text = "EXPLORATION ATM."): LabelRequest => ({ id, x, y, w: textWidth(text, "caps"), h: 12, priority });

describe("placeLabels", () => {
  it("is deterministic", () => {
    const rs = [req("a", 100, 100), req("b", 104, 102), req("c", 300, 40)];
    expect(placeLabels(rs, bounds)).toEqual(placeLabels([...rs].reverse(), bounds));
  });

  it("never overlaps placed labels and keeps them inside the bounds", () => {
    const rs = Array.from({ length: 12 }, (_, i) => req(`l${i}`, 150 + (i % 3) * 6, 120 + Math.floor(i / 3) * 5));
    const out = placeLabels(rs, bounds).filter((p) => !p.hidden);
    for (const p of out) {
      expect(p.box.x).toBeGreaterThanOrEqual(0);
      expect(p.box.x + p.box.w).toBeLessThanOrEqual(400);
      for (const q of out) if (p !== q) {
        const sep = p.box.x + p.box.w <= q.box.x || q.box.x + q.box.w <= p.box.x || p.box.y + p.box.h <= q.box.y || q.box.y + q.box.h <= p.box.y;
        expect(sep, `${p.id} vs ${q.id}`).toBe(true);
      }
    }
  });

  it("places higher priority first (the probe label wins a contested spot)", () => {
    const out = placeLabels([req("landmark", 200, 150, 1), req("probe", 200, 150, 10)], bounds);
    const probe = out.find((p) => p.id === "probe")!;
    expect(probe.hidden).toBe(false);
    expect(probe.anchor).toBe("start"); // first candidate: to the right
  });

  it("respects obstacles and hides labels that fit nowhere", () => {
    const out = placeLabels([req("x", 20, 20)], { x: 0, y: 0, w: 60, h: 40 });
    expect(out[0].hidden).toBe(true);
    const blocked = placeLabels([req("y", 200, 150)], bounds, [{ x: 205, y: 130, w: 200, h: 40 }]);
    expect(blocked[0].hidden).toBe(false);
    expect(blocked[0].box.x + blocked[0].box.w <= 205 || blocked[0].box.y + blocked[0].box.h <= 130 || blocked[0].box.y >= 170).toBe(true);
  });
});
