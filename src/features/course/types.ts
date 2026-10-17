export type CetLevel = "CET4" | "CET6";
export type ExerciseKind = "word" | "phrase" | "sentence";

export interface Exercise {
  /** Never derive this ID from an array index at runtime. */
  id: string;
  level: CetLevel;
  chinese: string;
  english: string;
  kind?: ExerciseKind;
  hint?: string;
}

export interface Lesson {
  id: string;
  level: CetLevel;
  title: string;
  description: string;
  /** Ordered from small words to phrases and complete sentences. */
  exercises: Exercise[];
}
