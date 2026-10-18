import { describe, expect, it } from "vitest";
import { sentenceEnergyTiming, SUCCESS_HOLD_MS } from "./positiveFeedback";

describe("positive feedback visual cadence", () => {
  it("finishes an eleven-word energy sweep before automatic advancement", () => {
    const timing = sentenceEnergyTiming(11);
    expect(timing.flowMs).toBeGreaterThan(0);
    expect(timing.stepMs * 10).toBeCloseTo(timing.flowMs);
    expect(timing.flowMs + timing.trailMs).toBeLessThan(SUCCESS_HOLD_MS);
  });
  it("can handle a one-word answer without division by zero", () => {
    expect(sentenceEnergyTiming(1).stepMs).toBe(0);
    expect(sentenceEnergyTiming(0).stepMs).toBe(0);
  });
  it("does not extend the existing hold even for twenty-word answers", () => {
    const x = sentenceEnergyTiming(20);
    expect(Number.isFinite(x.stepMs)).toBe(true);
    expect(x.flowMs + x.trailMs).toBeLessThan(SUCCESS_HOLD_MS);
  });
});
