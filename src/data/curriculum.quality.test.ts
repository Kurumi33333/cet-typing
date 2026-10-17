import { describe, expect, it } from "vitest";
import { lessons } from "./curriculum";
import { sentenceToSlots } from "../features/practice/slots";

describe("pilot question-bank quality gates", () => {
  it("all exercises have unique stable IDs, valid texts and sensible per-word blanks", () => {
    const all = lessons.flatMap((lesson) => lesson.exercises);
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
    expect(all).toHaveLength(70);
    for (const e of all) {
      expect(e.chinese.trim()).toBe(e.chinese);
      expect(e.english.trim()).toBe(e.english);
      expect(/[\u3400-\u9fff]/u.test(e.chinese)).toBe(true);
      expect(/^[A-Za-z][A-Za-z\s,'!?;:.\-]*$/u.test(e.english)).toBe(true);
      expect(sentenceToSlots(e.english).every((slot) => slot.word.length > 0)).toBe(true);
      if (e.kind === "word") expect(e.english.trim().split(/\s+/u).length).toBe(1);
      if (e.kind === "phrase") expect(e.english.trim().split(/\s+/u).length).toBeGreaterThanOrEqual(2);
      if (e.kind === "sentence") {
        expect(/[.!?]$/u.test(e.english)).toBe(true);
        expect(/[。？！]$/u.test(e.chinese)).toBe(true);
      }
    }
  });
  it("each lesson intentionally builds from short words or chunks toward longer sentences", () => {
    for (const lesson of lessons) {
      expect(lesson.exercises).toHaveLength(10);
      expect(lesson.exercises.some((item) => item.kind === "phrase")).toBe(true);
      expect(lesson.exercises.at(-1)?.kind).toBe("sentence");
      const first = sentenceToSlots(lesson.exercises[0].english).length;
      const last = sentenceToSlots(lesson.exercises.at(-1)!.english).length;
      expect(last).toBeGreaterThan(first);
      expect(lesson.exercises.every((e) => e.level === lesson.level)).toBe(true);
    }
  });
});
