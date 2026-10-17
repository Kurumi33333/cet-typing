import { createEmptyCard, fsrs, Rating, type Card } from "ts-fsrs";

/** Pure FSRS planning; persist actual Card dates, not hand-calculated intervals. */
const engine = fsrs();

export function initialReviewCard(now: Date = new Date()): Card {
  return createEmptyCard(now);
}

export function scheduleNextReview(
  current: Card | undefined,
  correct: boolean,
  now: Date = new Date(),
): Card {
  const card = current ?? initialReviewCard(now);
  return engine.next(card, now, correct ? Rating.Good : Rating.Again).card;
}

export function isReviewDue(due: number, now: number = Date.now()): boolean {
  return Number.isFinite(due) && due <= now;
}

export function reviewDate(card: Card): number {
  return card.due.getTime();
}
