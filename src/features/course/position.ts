import type { Lesson } from "./types";
import type { StudyProgress } from "../../lib/storage/db";

/** Ignore stale course IDs when the curated static content changes. */
export function resolveSavedPosition(
  lessons: readonly Lesson[], progress?: Pick<StudyProgress, "lessonId" | "exerciseId">,
): { lessonIndex: number; exerciseIndex: number } {
  if (!progress) return { lessonIndex: 0, exerciseIndex: 0 };
  const lessonIndex = lessons.findIndex((lesson) => lesson.id === progress.lessonId);
  if (lessonIndex < 0) return { lessonIndex: 0, exerciseIndex: 0 };
  const exerciseIndex = lessons[lessonIndex].exercises.findIndex(
    (exercise) => exercise.id === progress.exerciseId,
  );
  return { lessonIndex, exerciseIndex: Math.max(0, exerciseIndex) };
}
