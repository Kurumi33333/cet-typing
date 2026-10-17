/**
 * Fixed-answer practice: deterministic, synchronous, no network/LLM calls.
 * S2 will add token-level error feedback and correction mode.
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u2018\u2019]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?。！？]+$/u, "")
    .trim()
    .toLocaleLowerCase("en");
}

export function isCorrectAnswer(input: string, expected: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(expected);
}
