import { describe, expect, it } from "vitest";
import { LEVEL_FACTS, LEXICON_SIZE, TOTAL_LESSONS, TOTAL_STEPS, TOTAL_WORDS } from "./landingFacts";
import { lessons } from "./curriculum";

describe("landing page figures", () => {
  it("counts the shipped curriculum, not a copied number", () => {
    expect(LEVEL_FACTS.CET4).toMatchObject({ lessons: 8, steps: 80 });
    expect(LEVEL_FACTS.CET6).toMatchObject({ lessons: 4, steps: 40 });
    expect(TOTAL_LESSONS).toBe(lessons.length);
    expect(TOTAL_STEPS).toBe(lessons.flatMap((lesson) => lesson.exercises).length);
    expect(TOTAL_WORDS).toBeGreaterThan(0);
  });

  it("carries no claim the course material cannot support", () => {
    // The reference lexicon is a look-up aid, never a course or a vocabulary list.
    expect(LEXICON_SIZE.CET4).toBe(4543);
    expect(LEXICON_SIZE.CET6).toBe(3991);
    expect(LEXICON_SIZE.CET4).toBeGreaterThan(LEXICON_SIZE.CET6);
  });
});
