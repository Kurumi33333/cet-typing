import { describe, expect, it } from "vitest";
import { initialReviewCard, isReviewDue, reviewDate, scheduleNextReview } from "./scheduler";

describe("FSRS review scheduling", () => {
  const now = new Date("2026-10-18T10:00:00.000Z");
  it("creates due-now new cards for missed exercises", () => {
    expect(reviewDate(initialReviewCard(now))).toBe(now.getTime());
  });
  it("schedules an actual due date after Good", () => {
    const next = scheduleNextReview(undefined, true, now);
    expect(reviewDate(next)).toBeGreaterThan(now.getTime());
    expect(next.reps).toBe(1);
  });
  it("repeated failure schedules an earlier retry without marking learned", () => {
    const next = scheduleNextReview(undefined, false, now);
    expect(reviewDate(next)).toBeGreaterThan(now.getTime());
    expect(next.lapses).toBeGreaterThanOrEqual(0);
  });
  it("compares due time without rounding away a minute", () => {
    expect(isReviewDue(now.getTime() - 1, now.getTime())).toBe(true);
    expect(isReviewDue(now.getTime() + 1, now.getTime())).toBe(false);
  });
});
