import { describe, expect, it } from "vitest";
import { diffWords } from "./wordDiff";

describe("word-level alignment", () => {
  it("recognizes identical words despite case and punctuation", () => {
    expect(diffWords("I like english!", "I like English.").map((x) => x.status))
      .toEqual(["correct", "correct", "correct"]);
  });

  it("identifies a missing word without shifting later matches", () => {
    const diff = diffWords("I go to school", "I usually go to school");
    expect(diff.map((x) => x.status)).toEqual(["correct", "missing", "correct", "correct", "correct"]);
    expect(diff[2].actual).toBe("go");
  });

  it("marks an extra word", () => {
    expect(diffWords("I really really like it", "I really like it").filter((x) => x.status === "extra"))
      .toHaveLength(1);
  });

  it("handles empty input", () => {
    expect(diffWords("", "Good morning.").map((x) => x.status)).toEqual(["missing", "missing"]);
  });

  it("handles word replacement", () => {
    expect(diffWords("I like cats", "I like dogs").map((x) => x.status))
      .toEqual(["correct", "correct", "replace"]);
  });
});
