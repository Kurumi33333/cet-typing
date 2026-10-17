import { describe, expect, it } from "vitest";
import { starterExercises } from "../../data/starter";
import { isCorrectAnswer, normalizeAnswer } from "./answer";

describe("fixed-answer evaluator", () => {
  it("accepts case, whitespace, trailing punctuation variations", () => {
    expect(isCorrectAnswer("  I   USUALLY go to school by bus!  ", "I usually go to school by bus.")).toBe(true);
  });

  it("normalizes typographic apostrophes", () => {
    expect(isCorrectAnswer("I don’t know.", "I don't know.")).toBe(true);
  });

  it("rejects incorrect or missing words", () => {
    expect(isCorrectAnswer("I go to bus.", "I go to school by bus.")).toBe(false);
    expect(isCorrectAnswer("", "I like English.")).toBe(false);
  });

  it("normalization is deterministic", () => {
    expect(normalizeAnswer(" Hello  WORLD。 ")).toBe("hello world");
  });
});

describe("starter demonstration bank", () => {
  it("has unique stable IDs and both levels", () => {
    expect(new Set(starterExercises.map((exercise) => exercise.id)).size).toBe(starterExercises.length);
    expect(starterExercises.filter((exercise) => exercise.level === "CET4")).toHaveLength(5);
    expect(starterExercises.filter((exercise) => exercise.level === "CET6")).toHaveLength(5);
  });
});
