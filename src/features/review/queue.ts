import type { CetLevel } from "../course/types";
import { db, type MistakeRecord, type ReviewSchedule } from "../../lib/storage/db";
import { initialReviewCard, scheduleNextReview, reviewDate } from "./scheduler";

export interface ReviewOverview {
  due: number;
  later: number;
  total: number;
}

/**
 * Keep legacy S4 mistakes without a schedule as due cards, so users upgrading
 * the browser do not lose old mistake queues. "Resolved" historical records
 * without a schedule remain historical, not resurrected as reviews.
 */
export function getDueReviewIds(
  mistakes: readonly MistakeRecord[],
  schedules: readonly ReviewSchedule[],
  now: number = Date.now(),
): string[] {
  const lookup = new Map(schedules.map((x) => [x.id, x]));
  return mistakes.filter((item) => {
    const planned = lookup.get(item.id);
    return planned ? planned.due <= now : !item.resolved;
  }).sort((a, b) =>
    (lookup.get(a.id)?.due ?? a.updatedAt) - (lookup.get(b.id)?.due ?? b.updatedAt),
  ).map((x) => x.id);
}

export function reviewOverview(
  mistakes: readonly MistakeRecord[],
  schedules: readonly ReviewSchedule[], now: number = Date.now(),
): ReviewOverview {
  const due = getDueReviewIds(mistakes, schedules, now).length;
  const future = schedules.filter((x) =>
    x.due > now && mistakes.some((m) => m.id === x.id)).length;
  return { due, later: future, total: due + future };
}

async function readLevel(level: CetLevel) {
  return Promise.all([
    db.mistakes.where("level").equals(level).toArray(),
    db.reviews.where("level").equals(level).toArray(),
  ] as const);
}

export async function loadReviewOverview(level: CetLevel, now = Date.now()): Promise<ReviewOverview> {
  const [mistakes, schedules] = await readLevel(level);
  return reviewOverview(mistakes, schedules, now);
}

export async function loadDueReviewIds(level: CetLevel, now = Date.now()): Promise<string[]> {
  const [mistakes, schedules] = await readLevel(level);
  return getDueReviewIds(mistakes, schedules, now);
}

/**
 * Rate unaided recall exactly once per review item. Spelling corrections that
 * happen after an "Again" are teaching, not a separate successful recall.
 */
export async function gradeReviewAttempt(
  id: string, level: CetLevel, correct: boolean, lastAttempt: string,
  now: Date = new Date(),
): Promise<number> {
  return db.transaction("rw", db.reviews, db.mistakes, async () => {
    const mistake = await db.mistakes.get(id);
    if (!mistake || mistake.level !== level) throw new Error("Review item is missing");
    const current = await db.reviews.get(id);
    const card = current?.card ?? initialReviewCard(now);
    const next = scheduleNextReview(card, correct, now);
    const updatedAt = now.getTime();
    await db.reviews.put({ id, level, card: next, due: reviewDate(next), updatedAt });
    await db.mistakes.put({
      ...mistake,
      wrongCount: mistake.wrongCount + (correct ? 0 : 1),
      lastAttempt: correct ? mistake.lastAttempt : lastAttempt.slice(0, 3000),
      resolved: correct,
      updatedAt,
    });
    return reviewDate(next);
  });
}
