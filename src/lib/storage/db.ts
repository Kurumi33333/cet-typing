import { Dexie, type EntityTable } from "dexie";
import type { CetLevel } from "../../features/course/types";

export interface StudyProgress {
  level: CetLevel;
  lessonId: string;
  exerciseId: string;
  updatedAt: number;
}
export interface MistakeRecord {
  id: string; // Stable Exercise.id, not positional index
  level: CetLevel;
  lessonId: string;
  wrongCount: number;
  lastAttempt: string;
  updatedAt: number;
  resolved: boolean;
}

// Device-local only. Separate from browser settings kept in localStorage.
export const db = new Dexie("cet-typing-study") as Dexie & {
  progress: EntityTable<StudyProgress, "level">;
  mistakes: EntityTable<MistakeRecord, "id">;
};

db.version(1).stores({
  progress: "level, updatedAt",
  mistakes: "id, level, lessonId, updatedAt",
});

export async function loadProgress(level: CetLevel): Promise<StudyProgress | undefined> {
  return db.progress.get(level);
}

export async function saveProgress(
  level: CetLevel,
  lessonId: string,
  exerciseId: string,
): Promise<void> {
  await db.progress.put({ level, lessonId, exerciseId, updatedAt: Date.now() });
}

export async function recordMistake(
  level: CetLevel, lessonId: string, exerciseId: string, lastAttempt: string,
): Promise<void> {
  await db.transaction("rw", db.mistakes, async () => {
    const previous = await db.mistakes.get(exerciseId);
    await db.mistakes.put({
      id: exerciseId, level, lessonId,
      wrongCount: (previous?.wrongCount ?? 0) + 1,
      lastAttempt,
      updatedAt: Date.now(),
      resolved: false,
    });
  });
}

export async function resolveMistake(exerciseId: string): Promise<void> {
  const previous = await db.mistakes.get(exerciseId);
  if (!previous || previous.resolved) return;
  await db.mistakes.update(exerciseId, { resolved: true, updatedAt: Date.now() });
}

export async function loadMistakes(level?: CetLevel): Promise<MistakeRecord[]> {
  const records = level
    ? await db.mistakes.where("level").equals(level).toArray()
    : await db.mistakes.toArray();
  return records.filter((item) => !item.resolved).sort((a, b) => b.updatedAt - a.updatedAt);
}
