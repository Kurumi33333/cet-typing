import { db, type MistakeRecord, type StudyProgress, type ReviewSchedule } from "./db";
import type { Card } from "ts-fsrs";
import type { CetLevel } from "../../features/course/types";

export interface StudyBackup {
  format: "cet-typing-backup";
  version: 2;
  exportedAt: number;
  progress: StudyProgress[];
  mistakes: MistakeRecord[];
  reviews: ReviewSchedule[];
}
const validLevel = (x: unknown): x is CetLevel => x === "CET4" || x === "CET6";
const validId = (x: unknown) => typeof x === "string" && x.length > 0 && x.length <= 160;
const validTime = (x: unknown) => typeof x === "number" && Number.isFinite(x) && x >= 0;
const validDate = (x: unknown): Date | null => {
  const parsed = x instanceof Date ? x : typeof x === "string" ? new Date(x) : null;
  return parsed && Number.isFinite(parsed.getTime()) && parsed.getTime() >= 0 ? parsed : null;
};
/** Restore dates after JSON serialization; FSRS expects Date, not ISO strings. */
function parseReviewRow(input: unknown): ReviewSchedule {
  if (!input || typeof input !== "object") throw Error("复习日程数据损坏");
  const r = input as Record<string, unknown>;
  if (!validId(r.id) || !validLevel(r.level) || !validTime(r.due) || !validTime(r.updatedAt) ||
    !r.card || typeof r.card !== "object") throw Error("复习日程数据损坏");
  const raw = r.card as Record<string, unknown>;
  const due = validDate(raw.due);
  const last_review = raw.last_review === undefined || raw.last_review === null
    ? undefined : validDate(raw.last_review);
  if (!due || (raw.last_review != null && !last_review) || due.getTime() !== r.due) {
    throw Error("FSRS 日期损坏");
  }
  const numeric = ["stability","difficulty","elapsed_days","scheduled_days","reps","lapses","learning_steps"];
  if (numeric.some((field) => typeof raw[field] !== "number" || !Number.isFinite(raw[field]))) {
    throw Error("FSRS 学习参数损坏");
  }
  if (!Number.isInteger(raw.state) || (raw.state as number) < 0 || (raw.state as number) > 3 ||
    !Number.isInteger(raw.reps) || (raw.reps as number) < 0 ||
    !Number.isInteger(raw.lapses) || (raw.lapses as number) < 0 ||
    !Number.isInteger(raw.learning_steps) || (raw.learning_steps as number) < 0) {
    throw Error("FSRS 状态数据损坏");
  }
  const card = { ...raw, due, last_review } as Card;
  return { id: r.id as string, level: r.level, due: r.due as number,
    updatedAt: r.updatedAt as number, card };
}

/** Reject malformed, oversized, or incompatible backups before any DB changes. */
export function parseStudyBackup(input: unknown): StudyBackup {
  if (typeof input !== "object" || input === null) throw Error("备份文件格式错误");
  const file = input as Record<string, unknown>;
  if (file.format !== "cet-typing-backup" || (file.version !== 1 && file.version !== 2))
    throw Error("不支持的学习记录备份版本");
  if (!validTime(file.exportedAt)) throw Error("备份时间不正确");
  if (!Array.isArray(file.progress) || file.progress.length > 4 ||
    !Array.isArray(file.mistakes) || file.mistakes.length > 5000 ||
    (file.version === 2 && (!Array.isArray(file.reviews) || file.reviews.length > 5000)))
    throw Error("备份记录数量不正确");
  const progress = file.progress.map((item): StudyProgress => {
    if (typeof item !== "object" || item === null) throw Error("课程进度数据损坏");
    const p = item as Record<string, unknown>;
    if (!validLevel(p.level) || !validId(p.lessonId) || !validId(p.exerciseId) || !validTime(p.updatedAt))
      throw Error("课程进度数据损坏");
    return { level: p.level, lessonId: p.lessonId as string,
      exerciseId: p.exerciseId as string, updatedAt: p.updatedAt as number };
  });
  const mistakes = file.mistakes.map((item): MistakeRecord => {
    if (typeof item !== "object" || item === null) throw Error("错题数据损坏");
    const m = item as Record<string, unknown>;
    if (!validId(m.id) || !validId(m.lessonId) || !validLevel(m.level) ||
      typeof m.wrongCount !== "number" || !Number.isSafeInteger(m.wrongCount) || m.wrongCount < 1 ||
      typeof m.lastAttempt !== "string" || m.lastAttempt.length > 3000 ||
      !validTime(m.updatedAt) || typeof m.resolved !== "boolean") throw Error("错题数据损坏");
    return {
      id: m.id as string, level: m.level, lessonId: m.lessonId as string,
      wrongCount: m.wrongCount as number, lastAttempt: m.lastAttempt as string,
      updatedAt: m.updatedAt as number, resolved: m.resolved as boolean,
    };
  });
  const reviews = file.version === 2
    ? (file.reviews as unknown[]).map(parseReviewRow)
    : [];
  if (new Set(progress.map((p) => p.level)).size !== progress.length ||
      new Set(mistakes.map((m) => m.id)).size !== mistakes.length ||
      new Set(reviews.map((r) => r.id)).size !== reviews.length)
    throw Error("备份中包含重复记录");
  return { format: "cet-typing-backup", version: 2,
    exportedAt: file.exportedAt as number, progress, mistakes, reviews };
}

export async function createStudyBackup(): Promise<StudyBackup> {
  const [progress, mistakes, reviews] = await Promise.all([
    db.progress.toArray(), db.mistakes.toArray(), db.reviews.toArray(),
  ]);
  return { format: "cet-typing-backup", version: 2, exportedAt: Date.now(), progress, mistakes, reviews };
}

/** Merge by latest update: importing old backups cannot silently erase newer progress. */
export async function importStudyBackup(backup: StudyBackup): Promise<void> {
  const parsed = parseStudyBackup(backup);
  await db.transaction("rw", db.progress, db.mistakes, db.reviews, async () => {
    for (const item of parsed.progress) {
      const current = await db.progress.get(item.level);
      if (!current || item.updatedAt > current.updatedAt) await db.progress.put(item);
    }
    for (const item of parsed.mistakes) {
      const current = await db.mistakes.get(item.id);
      if (!current || item.updatedAt > current.updatedAt) await db.mistakes.put(item);
    }
    for (const item of parsed.reviews) {
      const current = await db.reviews.get(item.id);
      if (!current || item.updatedAt > current.updatedAt) await db.reviews.put(item);
    }
  });
}

export async function clearStudyRecords(): Promise<void> {
  await db.transaction("rw", db.progress, db.mistakes, db.reviews, async () => {
    await db.progress.clear();
    await db.mistakes.clear();
    await db.reviews.clear();
  });
}
