import { describe, expect, it } from "vitest";
import { englishPhysicalLetter, insertAtCaret, deleteAtCaret, isEnglishCompositionResult, inputRouting } from "./keyboardInput";

const physical = (code: string, overrides = {}) => ({
  code, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...overrides,
});

describe("IME-independent physical keyboard", () => {
  it("maps KeyA to an English letter even if IME reports Process or composition", () => {
    expect(englishPhysicalLetter(physical("KeyA"))).toBe("a");
    expect(englishPhysicalLetter(physical("KeyI", { shiftKey: true }))).toBe("I");
    expect(englishPhysicalLetter(physical("KeyZ"))).toBe("z");
    expect(englishPhysicalLetter(physical("Quote"))).toBe("'");
    expect(englishPhysicalLetter(physical("Minus"))).toBe("-");
  });
  it("never steals shortcuts or non-letters", () => {
    expect(englishPhysicalLetter(physical("KeyC", { ctrlKey: true }))).toBeNull();
    expect(englishPhysicalLetter(physical("KeyV", { metaKey: true }))).toBeNull();
    expect(englishPhysicalLetter(physical("KeyE", { altKey: true }))).toBeNull();
    expect(englishPhysicalLetter(physical("Space"))).toBeNull();
    expect(englishPhysicalLetter(physical("Digit1"))).toBeNull();
  });
  it("types at the caret and replaces selections", () => {
    expect(insertAtCaret("lik", "e", 3, 3)).toEqual({ text: "like", caret: 4 });
    expect(insertAtCaret("loke", "i", 1, 2)).toEqual({ text: "like", caret: 2 });
    expect(insertAtCaret("I", "a", null, null)).toEqual({ text: "Ia", caret: 2 });
  });
  it("backspaces at caret or selected text", () => {
    expect(deleteAtCaret("like", 2, 2)).toEqual({ text: "lke", caret: 1 });
    expect(deleteAtCaret("like", 1, 3)).toEqual({ text: "le", caret: 1 });
    expect(deleteAtCaret("", 0, 0)).toEqual({ text: "", caret: 0 });
  });
  it("uses a non-editable focusable input for direct desktop English keys", () => {
    expect(inputRouting(false, false, false)).toEqual({ readOnly: true, interceptPhysical: true });
    expect(inputRouting(false, false, true)).toEqual({ readOnly: false, interceptPhysical: false });
    expect(inputRouting(true, true, false)).toEqual({ readOnly: true, interceptPhysical: true });
    expect(inputRouting(true, false, false)).toEqual({ readOnly: false, interceptPhysical: false });
  });
  it("accepts Latin composition fallback only, never commits Chinese candidates", () => {
    expect(isEnglishCompositionResult("hello")).toBe(true);
    expect(isEnglishCompositionResult("don't")).toBe(true);
    expect(isEnglishCompositionResult("你好")).toBe(false);
    expect(isEnglishCompositionResult("中文abc")).toBe(false);
  });
});
