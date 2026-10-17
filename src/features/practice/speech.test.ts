import { describe, expect, it } from "vitest";
import { sentenceToSlots } from "./slots";
import { shouldPronounceWord, speakEnglish } from "./speech";

const [like] = sentenceToSlots("like");

describe("correct word pronunciation trigger", () => {
  it("fires only when the final letter makes the word correct", () => {
    expect(shouldPronounceWord("lik", "like", like)).toBe(true);
    expect(shouldPronounceWord("li", "lik", like)).toBe(false);
    expect(shouldPronounceWord("like", "like", like)).toBe(false);
  });
  it("does not pronounce a wrong or empty slot", () => {
    expect(shouldPronounceWord("", "", like)).toBe(false);
    expect(shouldPronounceWord("loke", "likee", like)).toBe(false);
    expect(shouldPronounceWord("like", "lik", like)).toBe(false);
  });
  it("can pronounce again only after a real correction", () => {
    expect(shouldPronounceWord("loke", "like", like)).toBe(true);
  });
  it("handles case-insensitivity and terminal punctuation", () => {
    const [word] = sentenceToSlots("English.");
    expect(shouldPronounceWord("Englis", "ENGLISH!", word)).toBe(true);
  });
  it("avoids multiword and paste overflow auto-read", () => {
    expect(shouldPronounceWord("", "like tea", like)).toBe(false);
  });
  it("is safe without browser speech synthesis", () => {
    expect(speakEnglish("like")).toBe(false);
  });
});
