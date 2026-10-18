import { describe, expect, it } from "vitest";
import { acceptedAlternatives, acceptedAnswerTexts, matchingAcceptedAnswer, selectDisplayAnswer } from "./acceptedAnswers";
import { getLessons } from "./curriculum";
import { sentenceToSlots } from "../features/practice/slots";

const phrase = { id:"cet4-03-05", level:"CET4" as const, chinese:"保持健康", english:"stay healthy", kind:"phrase" as const };
const answers = acceptedAnswerTexts(phrase);

describe("reviewed multiple-answer grading", () => {
  it("accepts keep healthy and other verified natural variants, but not an arbitrary synonym", () => {
    expect(matchingAcceptedAnswer(["keep","healthy"],answers)).toBe("keep healthy");
    expect(matchingAcceptedAnswer(["stay","healthy"],answers)).toBe("stay healthy");
    expect(matchingAcceptedAnswer(["maintain","good","health"],answers)).toBe("maintain good health");
    expect(matchingAcceptedAnswer(["keep","fit"],answers)).toBeNull();
    expect(matchingAcceptedAnswer(["keep","healthy","now"],answers)).toBeNull();
    expect(matchingAcceptedAnswer(["keep","health"],answers)).toBeNull();
  });
  it("chooses an alternate slot layout as soon as a distinctive prefix is typed", () => {
    expect(selectDisplayAnswer(["k"],answers)).toBe("keep healthy");
    expect(selectDisplayAnswer(["keep","h"],answers)).toBe("keep healthy");
    expect(selectDisplayAnswer(["m"],answers)).toBe("maintain good health");
    expect(sentenceToSlots(selectDisplayAnswer(["m"],answers))).toHaveLength(3);
    expect(selectDisplayAnswer(["s"],answers)).toBe("stay healthy");
  });
  it("changes word count for transport or daily adverb without scoring wrong", () => {
    const bus=["by bus","take a bus","take the bus"];
    expect(selectDisplayAnswer(["t"],bus)).toBe("take a bus");
    expect(matchingAcceptedAnswer(["take","a","bus"],bus)).toBe("take a bus");
    expect(matchingAcceptedAnswer(["by","bus"],bus)).toBe("by bus");
    expect(selectDisplayAnswer(["d"],["every day","daily"])).toBe("daily");
    expect(matchingAcceptedAnswer(["daily"],["every day","daily"])).toBe("daily");
  });
  it("matches case and trailing sentence punctuation only, never partial answers", () => {
    expect(matchingAcceptedAnswer(["we","can","conserve","energy","at","home"],["We can conserve energy at home."])).toBe("We can conserve energy at home.");
    expect(matchingAcceptedAnswer(["we","can","conserve","energy","at"],["We can conserve energy at home."])).toBeNull();
  });
  it("pins every alternative to a real stable exercise ID and rejects duplicate answer spellings", () => {
    const items=getLessons("CET4").concat(getLessons("CET6")).flatMap(x=>x.exercises);
    const byId=new Map(items.map(x=>[x.id,x]));
    for (const [id,list] of Object.entries(acceptedAlternatives)) {
      const exercise=byId.get(id);
      expect(exercise,id).toBeDefined();
      expect(list.length).toBeGreaterThan(0);
      const normalized=[exercise!.english,...list].map(s=>s.toLowerCase().replace(/[.!?]+$/,"").trim());
      expect(new Set(normalized).size,id).toBe(normalized.length);
      expect(list.every(s=>s.trim().length>0 && !s.includes("\n")),id).toBe(true);
    }
  });
});
