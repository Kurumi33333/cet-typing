/**
 * Entrance helpers that are byte-stable across render passes.
 *
 * Why this file exists: the film's entrances originally faded in with a CSS
 * `filter: blur(Npx)`, which is the standard "letterpress" recipe. But Chromium
 * rasterises animated blur filters slightly differently from one render pass to
 * the next — rendering the SAME composition twice with the SAME props produced
 * ~0.1% differing pixels wherever a blurred element was mid-entrance. That
 * breaks the deterministic-rendering rule and makes the two deliverables
 * (with BGM / SFX-only) non-identical.
 *
 * `pressIn` gives the same optical result — an element arriving from slightly
 * larger, slightly lower, and soft — without a blur filter: a per-element
 * `opacity` ramp plus a scale/translate, with the softness coming from the
 * element's own small size at the start of the ramp (it is tiny and faint when
 * it arrives, sharp and full-size when it lands).
 */

export interface PressIn {
  opacity: number;
  transform: string;
  /** 0..1, useful for driving colour or shadow ramps */
  t: number;
}

/**
 * @param t        progress 0..1 (already eased)
 * @param fromScale scale at t=0 (1.3 is a strong press, 1.1 a gentle rise)
 * @param risePx   vertical offset in px at t=0
 */
export const pressIn = (t: number, fromScale = 1.24, risePx = 8): PressIn => ({
  opacity: Math.max(0, Math.min(1, t)),
  transform: `scale(${fromScale - (fromScale - 1) * t}) translateY(${(1 - t) * risePx}px)`,
  t,
});
