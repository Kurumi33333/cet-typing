import { describe, expect, it } from "vitest";
import { getLessons } from "./curriculum";
import { cet4Audit, isCET4PilotFreeTranslationRisk } from "./cet4-audit";
import lexicon from "../../public/lexicon/cet4.json";

describe("CET4 content release gate", () => {
  const exercises = getLessons("CET4").flatMap((l) => l.exercises);
  const auditedIds = new Set(cet4Audit.map((r) => r.id));
  const lexiconWords = new Set(lexicon.words.map((w) => w.word));
  it("rejects any added/removed CET4 question without an explicit audit entry", () => {
    expect(cet4Audit).toHaveLength(exercises.length);
    expect(auditedIds.size).toBe(cet4Audit.length);
    expect(exercises.map((e) => e.id).sort()).toEqual([...auditedIds].sort());
  });
  it("never misrepresents pilot content as official verified material", () => {
    expect(cet4Audit.every((r) => r.reviewStage === "pilot")).toBe(true);
    expect(cet4Audit.flatMap((r) => r.flags).every((flag) =>
      ["alternative_translation", "lexicon_gap", "context_needed"].includes(flag))).toBe(true);
  });
  it("flags each lexical headword gap without claiming the word is out of syllabus", () => {
    const uncovered = exercises.filter((e) => e.kind === "word" &&
      !lexiconWords.has(e.english.toLowerCase())).map((e) => e.id).sort();
    const flagged = cet4Audit.filter((r) => r.flags.includes("lexicon_gap")).map((r) => r.id).sort();
    expect(flagged).toEqual(uncovered);
    expect(uncovered).toHaveLength(5);
  });
  it("does not penalize flagged multi-answer CET4 items in regular practice", () => {
    expect(isCET4PilotFreeTranslationRisk("CET4", "cet4-01-02")).toBe(true);
    expect(isCET4PilotFreeTranslationRisk("CET4", "cet4-03-08")).toBe(true);
    expect(isCET4PilotFreeTranslationRisk("CET4", "cet4-01-01")).toBe(false);
    expect(isCET4PilotFreeTranslationRisk("CET6", "cet4-01-02")).toBe(false);
    expect(isCET4PilotFreeTranslationRisk("CET4", "cet4-01-04")).toBe(false);
  });
  it("keeps potential free-translation ambiguities visible for future review", () => {
    expect(cet4Audit.filter((r) => r.flags.includes("alternative_translation")).length)
      .toBeGreaterThanOrEqual(15);
  });
});
