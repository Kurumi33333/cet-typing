import { describe, it, expect } from "vitest";
import { lessons, getLessons } from "./curriculum";

describe("pilot progressive curriculum", () => {
  it("starts both levels with a single-word exercise", () => {
    for (const level of ["CET4", "CET6"] as const) {
      const first = getLessons(level)[0].exercises[0];
      expect(first.kind).toBe("word");
      expect(first.english.trim().split(/\s+/u).length).toBe(1);
    }
  });
  it("keeps stable unique lesson and exercise IDs", () => {
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
    const all = lessons.flatMap((l) => l.exercises);
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
    expect(all).toHaveLength(120);
  });
  it("contains progressive mixed exercises in every lesson", () => {
    for (const l of lessons) {
      expect(l.exercises.length).toBeGreaterThanOrEqual(8);
      expect(l.exercises.some((e) => e.kind === "phrase")).toBe(true);
      expect(l.exercises.at(-1)?.kind).toBe("sentence");
      expect(l.exercises.every((e) => e.level === l.level && !!e.chinese && !!e.english)).toBe(true);
    }
  });
});
