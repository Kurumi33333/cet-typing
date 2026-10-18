import { normalizeAnswer } from "./answer";

export interface Slot {
  /** Original word, without the trailing punctuation displayed separately. */
  word: string;
  punctuation: string;
  widthCh: number;
}

/** A compact visual width hint rather than one fixed length for every blank. */
export function estimateWidthCh(text: string): number {
  const narrow = "ijlI'.,!:;";
  const wide = "WwMm";
  let width = 0;
  for (const letter of text) {
    width += narrow.includes(letter) ? 0.55 : wide.includes(letter) ? 1.35 : 0.95;
  }
  return Math.max(2.1, Math.round((width + 1.35) * 10) / 10);
}

export function sentenceToSlots(sentence: string): Slot[] {
  return sentence.trim().split(/\s+/u).filter(Boolean).map((token) => {
    const parts = /^(.*?)([.,!?;:]+)?$/u.exec(token);
    const word = parts?.[1] || token;
    return {
      word,
      punctuation: parts?.[2] ?? "",
      widthCh: estimateWidthCh(word),
    };
  });
}

/**
 * Sentence input is one continuous keyboard stream; whitespace moves to the
 * next visible blank. If the user types too many words, keep the extra words
 * inside the last blank so they can be corrected instead of silently lost.
 */
export function draftToSlotValues(input: string, slotCount: number): string[] {
  if (slotCount <= 0) return [];
  const typed = input.trim().split(/\s+/u).filter(Boolean);
  const values = Array<string>(slotCount).fill("");
  for (let i = 0; i < typed.length; i++) {
    const slot = Math.min(i, slotCount - 1);
    values[slot] = values[slot] ? `${values[slot]} ${typed[i]}` : typed[i];
  }
  return values;
}

export function getActiveSlot(input: string, slotCount: number): number {
  if (slotCount <= 0 || !input.trim()) return 0;
  const count = input.trim().split(/\s+/u).length;
  return Math.min(slotCount - 1, /\s$/u.test(input) ? count : count - 1);
}

export function matchesSlot(actual: string, slot: Slot): boolean {
  const clean = (s: string) => normalizeAnswer(s).replace(/[,.!?;:]+$/gu, "");
  return clean(actual) === clean(slot.word) && actual.trim().length > 0;
}

/** Complete only when every word slot matches its target, not merely the active word.
 * Blank slots, wrong spellings, and reasonable but different free translations
 * do not auto-advance. No Enter/space is required after the final exact letter.
 */
export function allSlotsCorrect(values: readonly string[], slots: readonly Slot[]): boolean {
  return slots.length > 0 && slots.every((slot, at) => matchesSlot(values[at] ?? "", slot));
}

export function incorrectSlots(values: readonly string[], slots: readonly Slot[]): number[] {
  return slots.flatMap((slot, index) =>
    matchesSlot(values[index] ?? "", slot) ? [] : [index],
  );
}
