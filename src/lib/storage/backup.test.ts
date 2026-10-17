import { describe, expect, it } from "vitest";
import { createEmptyCard } from "ts-fsrs";
import { parseStudyBackup } from "./backup";

const good = {
  format: "cet-typing-backup",
  version: 1,
  exportedAt: 100,
  progress: [{level: "CET4", lessonId: "cet4-01", exerciseId: "cet4-01-02", updatedAt: 50}],
  mistakes: [{id: "cet4-01-01",level: "CET4",lessonId: "cet4-01",wrongCount: 2,
    lastAttempt: "X",updatedAt: 70,resolved: false}],
};

const now = new Date("2026-10-18T00:00:00.000Z");
const review = {id: "cet4-01-01",level: "CET4",card: createEmptyCard(now),
  due: now.getTime(), updatedAt: now.getTime() };
const modern = {...good, version: 2, reviews: [review]};

describe("safe study backup import", () => {
  it("upgrades version-1 backups without losing progress or mistakes", () => {
    const parsed = parseStudyBackup(good);
    expect(parsed.version).toBe(2);
    expect(parsed.progress[0].exerciseId).toBe("cet4-01-02");
    expect(parsed.mistakes[0].wrongCount).toBe(2);
    expect(parsed.reviews).toEqual([]);
  });
  it("restores FSRS Date fields after JSON export/import", () => {
    const parsed = parseStudyBackup(JSON.parse(JSON.stringify(modern)));
    expect(parsed.reviews).toHaveLength(1);
    expect(parsed.reviews[0].card.due).toBeInstanceOf(Date);
    expect(parsed.reviews[0].card.due.getTime()).toBe(now.getTime());
  });
  it("rejects unsupported versions", () => {
    expect(() => parseStudyBackup({...good,version: 3})).toThrow();
  });
  it("rejects missing review arrays and invalid review dates", () => {
    expect(() => parseStudyBackup({...good,version: 2})).toThrow();
    expect(() => parseStudyBackup({...modern,reviews:[{...review,due:0}]})).toThrow();
  });
  it("rejects corrupted rows", () => {
    expect(() => parseStudyBackup({...good,mistakes:[{...good.mistakes[0],wrongCount: -1}]})).toThrow();
  });
  it("rejects duplicates including FSRS reviews", () => {
    expect(() => parseStudyBackup({...good,progress:[good.progress[0],good.progress[0]]})).toThrow();
    expect(() => parseStudyBackup({...modern,reviews:[review, review]})).toThrow();
  });
  it("rejects huge and invalid backups", () => {
    expect(() => parseStudyBackup({...good,mistakes:Array(5001).fill(good.mistakes[0])})).toThrow();
    expect(() => parseStudyBackup(null)).toThrow();
  });
});
