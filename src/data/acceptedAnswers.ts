import type { Exercise } from "../features/course/types";
import { normalizeAnswer } from "../features/practice/answer";
import { sentenceToSlots, type Slot } from "../features/practice/slots";

/**
 * Reviewed alternative translations, 2026-10-18, with stable exercise IDs.
 * Content is PILOT, not official CET wording or certified teacher review.
 * Only explicit, meaning-preserving variants can receive a correct score.
 *
 * Note: "keep fit" is NOT interchangeable with overall "stay healthy":
 * fitness emphasises physical condition. "keep healthy" is acceptable but
 * "stay healthy" is generally more idiomatic in American English.
 */
export const acceptedAlternatives: Readonly<Record<string, readonly string[]>> = Object.freeze(
  {
    "cet4-02-01": [
      "attend school"
    ],
    "cet4-02-03": [
      "take a bus",
      "take the bus"
    ],
    "cet4-02-04": [
      "I take the bus to school."
    ],
    "cet4-02-05": [
      "daily"
    ],
    "cet4-02-07": [
      "learn English"
    ],
    "cet4-02-08": [
      "I learn English every day."
    ],
    "cet4-03-02": [
      "read daily"
    ],
    "cet4-03-03": [
      "I read daily."
    ],
    "cet4-03-05": [
      "keep healthy",
      "remain healthy",
      "maintain good health"
    ],
    "cet4-03-08": [
      "It helps me keep healthy.",
      "It helps me remain healthy."
    ],
    "cet4-04-03": [
      "Practicing is important."
    ],
    "cet4-04-05": [
      "I think practicing is important."
    ],
    "cet4-04-07": [
      "practice daily"
    ],
    "cet4-04-08": [
      "I practice daily because I want to improve."
    ],
    "cet4-04-09": [
      "improve my English skills"
    ],
    "cet4-05-04": [
      "I need some help."
    ],
    "cet4-05-06": [
      "additional time"
    ],
    "cet4-05-07": [
      "I need some more time."
    ],
    "cet4-05-09": [
      "understand the question"
    ],
    "cet4-06-03": [
      "tomorrow's plan"
    ],
    "cet4-06-06": [
      "get ready for the exam"
    ],
    "cet4-06-07": [
      "I am getting ready for the exam."
    ],
    "cet4-06-10": [
      "I need to get ready for next week's exam."
    ],
    "cet4-07-06": [
      "conserve energy"
    ],
    "cet4-07-07": [
      "We can conserve energy at home."
    ],
    "cet4-07-09": [
      "decrease pollution"
    ],
    "cet4-07-10": [
      "Conserving energy helps reduce pollution."
    ],
    "cet4-08-05": [
      "She also hopes that her children will receive a good education."
    ],
    "cet4-08-07": [
      "succeed"
    ],
    "cet6-01-03": [
      "enough evidence"
    ],
    "cet6-01-06": [
      "backed by evidence"
    ],
    "cet6-01-07": [
      "This conclusion is backed by evidence."
    ],
    "cet6-01-08": [
      "not completely"
    ],
    "cet6-01-10": [
      "This conclusion is not completely reliable."
    ],
    "cet6-02-03": [
      "advances in technology"
    ],
    "cet6-02-06": [
      "Technology affects our lives."
    ],
    "cet6-02-07": [
      "change how we communicate"
    ],
    "cet6-02-08": [
      "Technology has changed how we communicate."
    ],
    "cet6-03-04": [
      "We should give priority to important tasks."
    ],
    "cet6-04-03": [
      "assume responsibility"
    ],
    "cet6-04-04": [
      "a common goal"
    ],
    "cet6-04-05": [
      "A team needs a common goal."
    ],
    "cet6-04-07": [
      "foster cooperation"
    ],
    "cet6-04-08": [
      "Effective communication can foster cooperation."
    ],
    "cet6-04-09": [
      "take responsibility for the outcome"
    ],
    "cet6-04-10": [
      "Every member should take responsibility for the outcome."
    ]
  }
);

/** Prefer the first canonical target until typed evidence disambiguates.
 * An alternative can have MORE or FEWER word slots than the original target.
 */
export function acceptedAnswerTexts(exercise: Exercise): string[] {
  return [exercise.english, ...(acceptedAlternatives[exercise.id] ?? [])];
}

const trimToken = (s: string): string => normalizeAnswer(s).replace(/[,.!?;:]+$/gu, "").trim();

export function matchingAcceptedAnswer(
  values: readonly string[], answers: readonly string[],
): string | null {
  for (const answer of answers) {
    const slots = sentenceToSlots(answer);
    if (values.length > slots.length && values.slice(slots.length).some((s) => s.trim())) continue;
    if (slots.length > 0 && slots.every((slot, at) =>
      !!values[at]?.trim() && trimToken(values[at]) === trimToken(slot.word))) return answer;
  }
  return null;
}

/** Choose a display target using current typed word prefixes (no fuzzy semantic scoring).
 * Ties deliberately keep canonical answer / existing choice stable.
 */
export function selectDisplayAnswer(
  values: readonly string[], answers: readonly string[], previous = answers[0],
): string {
  let best = previous;
  let bestScore = -Infinity;
  for (const answer of answers) {
    const slots = sentenceToSlots(answer);
    let score = 0;
    let impossible = false;
    for (let at = 0; at < values.length; at++) {
      const typed = trimToken(values[at] ?? "");
      if (!typed) continue;
      const target = slots[at] ? trimToken(slots[at].word) : "";
      if (!target.startsWith(typed)) { impossible = true; break; }
      score += target === typed ? 10 : 2;
    }
    if (impossible) continue;
    // Prefer the current variant on ties, and avoid changing the underline
    // count while the prefix is still ambiguous.
    if (answer === previous) score += 0.25;
    if (score > bestScore) { best = answer; bestScore = score; }
  }
  return bestScore === -Infinity ? previous : best;
}
