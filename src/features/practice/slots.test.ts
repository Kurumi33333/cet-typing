import { describe, it, expect } from "vitest";
import {
  sentenceToSlots,
  estimateWidthCh,
  draftToSlotValues,
  getActiveSlot,
  incorrectSlots,
  matchesSlot,
} from "./slots";

describe("underlined typing slots", () => {
  it("shows variable blank widths and keeps punctuation outside the blank", () => {
    const slots = sentenceToSlots("I like English.");
    expect(slots.map(({ word }) => word)).toEqual(["I", "like", "English"]);
    expect(slots.map(({ punctuation }) => punctuation)).toEqual(["", "", "."]);
    expect(estimateWidthCh("I")).toBeLessThan(estimateWidthCh("English"));
  });

  it("advances the highlighted blank on whitespace", () => {
    expect(getActiveSlot("", 4)).toBe(0);
    expect(getActiveSlot("I", 4)).toBe(0);
    expect(getActiveSlot("I ", 4)).toBe(1);
    expect(getActiveSlot("I like ", 4)).toBe(2);
    expect(getActiveSlot("I like this food", 4)).toBe(3);
  });

  it("preserves extra words so an accidental append is marked wrong", () => {
    expect(draftToSlotValues("I like the food now", 4)).toEqual(["I", "like", "the", "food now"]);
    expect(incorrectSlots(draftToSlotValues("I like the food now", 4), sentenceToSlots("I like the food.")))
      .toEqual([3]);
  });

  it("allows case and trailing punctuation variations", () => {
    expect(matchesSlot("ENGLISH!", sentenceToSlots("English.")[0])).toBe(true);
    expect(matchesSlot("englih", sentenceToSlots("English.")[0])).toBe(false);
  });

  it("identifies only incorrect or unfilled slots", () => {
    expect(incorrectSlots(["I", "love", "English", ""], sentenceToSlots("I like English now.")))
      .toEqual([1, 3]);
  });

  it("handles empty input and long words", () => {
    expect(draftToSlotValues("", 3)).toEqual(["", "", ""]);
    expect(estimateWidthCh("communication")).toBeGreaterThan(estimateWidthCh("an"));
  });
});
