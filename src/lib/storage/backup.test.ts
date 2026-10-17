import { describe, expect, it } from "vitest";
import { parseStudyBackup } from "./backup";

const good = {
  format: "cet-typing-backup",
  version: 1,
  exportedAt: 100,
  progress: [{level: "CET4", lessonId: "cet4-01", exerciseId: "cet4-01-02", updatedAt: 50}],
  mistakes: [{id: "cet4-01-01",level: "CET4",lessonId: "cet4-01",wrongCount: 2,
    lastAttempt: "X",updatedAt: 70,resolved: false}],
};

describe("safe study backup import", () => {
  it("accepts a complete version-1 backup", () => {
    const parsed = parseStudyBackup(good);
    expect(parsed.progress[0].exerciseId).toBe("cet4-01-02");
    expect(parsed.mistakes[0].wrongCount).toBe(2);
  });
  it("rejects unsupported versions", () => {
    expect(() => parseStudyBackup({...good,version: 2})).toThrow();
  });
  it("rejects corrupted rows", () => {
    expect(() => parseStudyBackup({...good,mistakes:[{...good.mistakes[0],wrongCount: -1}]})).toThrow();
  });
  it("rejects duplicates", () => {
    expect(() => parseStudyBackup({...good,progress:[good.progress[0],good.progress[0]]})).toThrow();
  });
  it("rejects huge and invalid backups", () => {
    expect(() => parseStudyBackup({...good,mistakes:Array(5001).fill(good.mistakes[0])})).toThrow();
    expect(() => parseStudyBackup(null)).toThrow();
  });
});
