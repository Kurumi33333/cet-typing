/**
 * Pure word-slot input for the landing page's live card.
 *
 * This is the practice screen's model, made explicit: values are one string per
 * word slot, a space advances the slot, and a caret inside the current slot
 * inserts or deletes. It is extracted so the landing card cannot drift from the
 * practice behaviour, and so both can be tested without a browser.
 */
import type { Slot } from "./slots";

export interface SlotInput {
  values: string[];
  active: number;
  caret: number;
}

export function emptySlotInput(slotCount: number): SlotInput {
  return { values: Array<string>(Math.max(0, slotCount)).fill(""), active: 0, caret: 0 };
}

function clampCaret(text: string, caret: number): number {
  return Math.max(0, Math.min(text.length, caret));
}

/** Type somewhere inside the active slot (a real caret, not only append). */
export function insertSlotCharacter(state: SlotInput, letter: string): SlotInput {
  const values = state.values.slice();
  const active = Math.min(state.active, Math.max(0, values.length - 1));
  const text = values[active] ?? "";
  const at = clampCaret(text, state.caret);
  values[active] = text.slice(0, at) + letter + text.slice(at);
  return { values, active, caret: at + letter.length };
}

export function deleteSlotCharacter(state: SlotInput): SlotInput {
  const values = state.values.slice();
  const active = Math.min(state.active, Math.max(0, values.length - 1));
  const text = values[active] ?? "";
  const at = clampCaret(text, state.caret);
  if (at > 0) {
    values[active] = text.slice(0, at - 1) + text.slice(at);
    return { values, active, caret: at - 1 };
  }
  if (active > 0) {
    // Backspace on an empty slot clears the word before it, as the practice page does.
    const previous = active - 1;
    return { values, active: previous, caret: (values[previous] ?? "").length };
  }
  return { values, active, caret: 0 };
}

/** Space is navigation, never a character in the answer. */
export function nextSlot(state: SlotInput): SlotInput {
  if (state.values.length < 2) return state;
  const active = (Math.min(state.active, state.values.length - 1) + 1) % state.values.length;
  return { values: state.values, active, caret: (state.values[active] ?? "").length };
}

export function previousSlot(state: SlotInput): SlotInput {
  if (state.values.length < 2) return state;
  const active = (Math.min(state.active, state.values.length - 1) - 1 + state.values.length) % state.values.length;
  return { values: state.values, active, caret: (state.values[active] ?? "").length };
}

export function selectSlot(state: SlotInput, index: number): SlotInput {
  const active = Math.max(0, Math.min(state.values.length - 1, index));
  return { values: state.values, active, caret: (state.values[active] ?? "").length };
}

/** How many characters of the slot's own word are typed correctly, for the caret. */
export function slotCaretFromPrefix(slot: Slot | undefined, typed: string): number {
  return Math.min(typed.length, slot ? slot.word.length : typed.length);
}
