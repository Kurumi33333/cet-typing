/** Positive feedback is entirely visual and never controls grading timers.
 * All choreography must finish before the existing 360ms auto-advance.
 */
export const SUCCESS_HOLD_MS = 360;

export function sentenceEnergyTiming(wordCount: number, holdMs = SUCCESS_HOLD_MS) {
  const count = Math.max(1, Math.floor(wordCount));
  // Leave room for each glint to brighten and fade (75ms + 110ms).
  const flowMs = Math.min(165, Math.max(0, holdMs - 195));
  const stepMs = count > 1 ? flowMs / (count - 1) : 0;
  const trailMs = Math.min(100, Math.max(0, holdMs - flowMs - 65));
  return { flowMs, stepMs, trailMs };
}
