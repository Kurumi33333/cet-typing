/**
 * Independent word-slot editing. Keyboard navigation never requires a correct
 * answer in an earlier slot. The same slot model is shared by touch and keys.
 */
export interface SlotEdit {
  values: string[];
  active: number;
  moved: boolean;
}

export function moveSlot(index: number, delta: number, count: number): number {
  return Math.max(0, Math.min(count - 1, index + delta));
}

/** Space navigation is cyclic and never submits a partially typed answer. */
export function nextSlotIndex(index: number, count: number): number {
  return count > 1 ? (index + 1) % count : 0;
}

export function editSlot(
  current: readonly string[],
  active: number,
  raw: string,
  count: number,
): SlotEdit {
  if (!count) return { values: [], active: 0, moved: false };
  const values = Array.from({ length: count }, (_, at) => current[at] ?? "");
  const text = raw.replace(/[\t\r\n\u00a0]+/gu, " ");
  if (!text.includes(" ")) {
    values[active] = text;
    return { values, active, moved: false };
  }
  const parts = text.split(/ +/u);
  values[active] = parts[0];
  let position = active;
  for (const part of parts.slice(1)) {
    if (!part) continue;
    position = Math.min(count - 1, position + 1);
    values[position] = values[position] ? `${values[position]} ${part}` : part;
  }
  if (text.endsWith(" ")) position = moveSlot(position, 1, count);
  return { values, active: position, moved: position !== active };
}
