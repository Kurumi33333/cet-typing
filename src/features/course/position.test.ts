import { describe, expect, it } from "vitest";
import { getLessons } from "../../data/curriculum";
import { resolveSavedPosition } from "./position";

const lessons = getLessons("CET4");
describe("stable course position restoration", () => {
  it("starts from the first task for a new learner", () => {
    expect(resolveSavedPosition(lessons)).toEqual({ lessonIndex: 0, exerciseIndex: 0 });
  });
  it("restores the exact lesson and task ID, not old array positions", () => {
    expect(resolveSavedPosition(lessons, {
      lessonId: lessons[2].id, exerciseId: lessons[2].exercises[3].id,
    })).toEqual({ lessonIndex: 2, exerciseIndex: 3 });
  });
  it("falls back safely if content was removed", () => {
    expect(resolveSavedPosition(lessons, { lessonId: "removed", exerciseId: "old" }))
      .toEqual({ lessonIndex: 0, exerciseIndex: 0 });
  });
  it("restores the lesson start if one question was replaced", () => {
    expect(resolveSavedPosition(lessons, { lessonId: lessons[1].id, exerciseId: "gone" }))
      .toEqual({ lessonIndex: 1, exerciseIndex: 0 });
  });
});
