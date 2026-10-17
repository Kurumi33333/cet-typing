import { describe, expect, it } from "vitest";
import { sentenceToSlots } from "./slots";
import { pronunciationText, selectEnglishVoice, shouldPronounceWord, speakEnglish } from "./speech";

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

describe("iOS voice selection", () => {
  const voice = (name: string, lang = "en-US", fallback = false) =>
    ({ name, lang, default: fallback } as SpeechSynthesisVoice);

  it("never picks Cellos or Albert just because it appears first", () => {
    const preferred = voice("Samantha");
    const selected = selectEnglishVoice([
      voice("Albert"), voice("Cellos"), voice("Bubbles"), preferred,
    ]);
    expect(selected).toBe(preferred);
  });

  it("chooses another human English voice over novelty voices", () => {
    const daniel = voice("Daniel", "en-GB");
    expect(selectEnglishVoice([voice("Boing"), daniel, voice("Zarvox")])).toBe(daniel);
  });

  it("falls back without forcing a novelty effect", () => {
    expect(selectEnglishVoice([voice("Albert"), voice("Cellos")])).toBeNull();
  });

  it("prefers the default non-novelty US voice when no preferred names exist", () => {
    const preferred = voice("Some device voice", "en-US", true);
    expect(selectEnglishVoice([voice("Trinoids"), voice("Another", "en-GB"), preferred])).toBe(preferred);
  });

  it("treats the pronoun I as its audible homophone", () => {
    expect(pronunciationText("I", "word")).toBe("eye");
    expect(pronunciationText("i", "word")).toBe("eye");
    expect(pronunciationText("I like tea.", "sentence")).toBe("I like tea.");
    expect(pronunciationText("like", "word")).toBe("like");
  });
});
