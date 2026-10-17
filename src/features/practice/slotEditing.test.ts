import { describe, expect, it } from "vitest";
import { editSlot, moveSlot } from "./slotEditing";

describe("free-navigation slot editor", () => {
  it("can jump directly to an unfinished later slot", () => {
    expect(moveSlot(0, 3, 4)).toBe(3);
    expect(editSlot(["", "", "", ""], 3, "tea", 4).values).toEqual(["", "", "", "tea"]);
  });
  it("allows changing any existing slot without affecting the others", () => {
    expect(editSlot(["I", "lik", "tea"], 1, "like", 3).values).toEqual(["I", "like", "tea"]);
  });
  it("spaces advance a slot, with no correctness gate", () => {
    expect(editSlot(["wrong", "", ""], 0, "wrong ", 3)).toEqual({
      values: ["wrong", "", ""], active: 1, moved: true,
    });
  });
  it("back and forth navigation stays inside bounds", () => {
    expect(moveSlot(0, -1, 4)).toBe(0);
    expect(moveSlot(3, 1, 4)).toBe(3);
  });
  it("supports multiword paste while preserving existing earlier slots", () => {
    expect(editSlot(["I", "", "", ""], 1, "really like tea", 4).values).toEqual(["I", "really", "like", "tea"]);
  });
  it("does not silently discard overlong paste", () => {
    expect(editSlot(["", ""], 0, "one two three", 2).values).toEqual(["one", "two three"]);
  });
  it("does not advance when typing a letter", () => {
    expect(editSlot(["", ""], 0, "T", 2)).toEqual({values:["T",""],active:0,moved:false});
  });
});
