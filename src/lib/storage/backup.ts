import { db, type MistakeRecord, type StudyProgress } from "./db";

export interface StudyBackup {
  format: "cet-typing-backup";
  version: 1;
  exportedAt: number;
  progress: StudyProgress[];
  mistakes: MistakeRecord[];
}
const validLevel = (x: unknown) => x === "CET4" || x === "CET6";
const validId = (x: unknown) => typeof x === "string" && x.length > 0 && x.length <= 160;
const validTime = (x: unknown) => typeof x === "number" && Number.isFinite(x) && x >= 0;

/** Reject malformed, oversized, or incompatible backups before any DB changes. */
export function parseStudyBackup(input: unknown): StudyBackup {
  if (typeof input !== "object" || input === null) throw Error("备份文件格式错误");
  const file = input as Record<string, unknown>;
  if (file.format !== "cet-typing-backup" || file.version !== 1)
    throw Error("不支持的学习记录备份版本");
  if (!validTime(file.exportedAt)) throw Error("备份时间不正确");
  if (!Array.isArray(file.progress) || file.progress.length > 4 ||
    !Array.isArray(file.mistakes) || file.mistakes.length > 5000)
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
  if (new Set(progress.map((p) => p.level)).size !== progress.length ||
      new Set(mistakes.map((m) => m.id)).size !== mistakes.length)
    throw Error("备份中包含重复记录");
  return { format: "cet-typing-backup", version: 1,
    exportedAt: file.exportedAt as number, progress, mistakes };
}

export async function createStudyBackup(): Promise<StudyBackup> {
  const [progress, mistakes] = await Promise.all([db.progress.toArray(), db.mistakes.toArray()]);
  return { format: "cet-typing-backup", version: 1, exportedAt: Date.now(), progress, mistakes };
}

/** Merge by latest update: importing old backups cannot silently erase newer progress. */
export async function importStudyBackup(backup: StudyBackup): Promise<void> {
  const parsed = parseStudyBackup(backup);
  await db.transaction("rw", db.progress, db.mistakes, async () => {
    for (const item of parsed.progress) {
      const current = await db.progress.get(item.level);
      if (!current || item.updatedAt > current.updatedAt) await db.progress.put(item);
    }
    for (const item of parsed.mistakes) {
      const current = await db.mistakes.get(item.id);
      if (!current || item.updatedAt > current.updatedAt) await db.mistakes.put(item);
    }
  });
}

export async function clearStudyRecords(): Promise<void> {
  await db.transaction("rw", db.progress, db.mistakes, async () => {
    await db.progress.clear();
    await db.mistakes.clear();
  });
}
