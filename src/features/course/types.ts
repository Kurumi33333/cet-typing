export type CetLevel = "CET4" | "CET6";

export interface Exercise {
  /** Stable ID; learning progress must never depend on array indexes. */
  id: string;
  level: CetLevel;
  chinese: string;
  english: string;
  hint?: string;
}
