/** Keyboard-first English entry for CET spelling practice.
 * Physical KeyA...KeyZ work independently of the selected desktop IME.
 * Virtual/mobile keyboards may not expose reliable physical key codes.
 */
export interface PhysicalKey {
  code: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export function englishPhysicalLetter(event: PhysicalKey): string | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  const match = /^Key([A-Z])$/.exec(event.code);
  if (match) return event.shiftKey ? match[1] : match[1].toLowerCase();
  if (event.code === "Quote" && !event.shiftKey) return "'";
  if (event.code === "Minus" && !event.shiftKey) return "-";
  return null;
}

export function insertAtCaret(
  text: string, character: string, start: number | null, end: number | null,
): { text: string; caret: number } {
  const from = Math.max(0, Math.min(text.length, start ?? text.length));
  const to = Math.max(from, Math.min(text.length, end ?? from));
  return { text: text.slice(0, from) + character + text.slice(to), caret: from + character.length };
}

export function deleteAtCaret(
  text: string, start: number | null, end: number | null,
): { text: string; caret: number } {
  const from = Math.max(0, Math.min(text.length, start ?? text.length));
  const to = Math.max(from, Math.min(text.length, end ?? from));
  if (to > from) return { text: text.slice(0, from) + text.slice(to), caret: from };
  const previous = Math.max(0, from - 1);
  return { text: text.slice(0, previous) + text.slice(to), caret: previous };
}

export function isEnglishCompositionResult(text: string): boolean {
  return /^[a-zA-Z' -]*$/u.test(text);
}
