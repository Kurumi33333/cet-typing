import type { CetLevel } from "../features/course/types";
import { getLessons } from "./curriculum";

/**
 * Every figure printed on the landing page is computed from the shipped
 * curriculum and lexicon, never typed by hand, so the page cannot drift
 * away from the product it describes.
 */
const AUDIO_CLIPS = ["typing", "delete", "navigate", "select", "success", "error", "advance"];

export interface LevelFacts {
  level: CetLevel;
  label: "四级" | "六级";
  lessons: number;
  steps: number;
  words: number;
  wordSteps: number;
  phraseSteps: number;
  sentenceSteps: number;
  maxWordsInSentence: number;
}

function factsFor(level: CetLevel): LevelFacts {
  const courseList = getLessons(level);
  const exercises = courseList.flatMap((lesson) => lesson.exercises);
  const tokens = exercises.flatMap((exercise) => exercise.english.trim().split(/\s+/u));
  const uniqueWords = new Set(
    tokens.map((token) => token.toLowerCase().replace(/[.,!?;:'"]/g, "")),
  );
  return {
    level,
    label: level === "CET4" ? "四级" : "六级",
    lessons: courseList.length,
    steps: exercises.length,
    words: uniqueWords.size,
    wordSteps: exercises.filter((exercise) => exercise.kind === "word").length,
    phraseSteps: exercises.filter((exercise) => exercise.kind === "phrase").length,
    sentenceSteps: exercises.filter((exercise) => exercise.kind === "sentence").length,
    maxWordsInSentence: exercises.reduce((longest, exercise) => {
      if (exercise.kind !== "sentence") return longest;
      return Math.max(longest, exercise.english.trim().split(/\s+/u).length);
    }, 0),
  };
}

export const LEVEL_FACTS: Record<CetLevel, LevelFacts> = {
  CET4: factsFor("CET4"),
  CET6: factsFor("CET6"),
};

export const TOTAL_LESSONS = LEVEL_FACTS.CET4.lessons + LEVEL_FACTS.CET6.lessons;
export const TOTAL_STEPS = LEVEL_FACTS.CET4.steps + LEVEL_FACTS.CET6.steps;

/** Unique English words across both levels, counted the way the practice screen splits slots. */
export function uniqueWordCount(): number {
  const seen = new Set<string>();
  for (const level of ["CET4", "CET6"] as const) {
    for (const lesson of getLessons(level)) {
      for (const exercise of lesson.exercises) {
        for (const token of exercise.english.trim().split(/\s+/u)) {
          const clean = token.toLowerCase().replace(/[.,!?;:'"]/g, "");
          if (clean) seen.add(clean);
        }
      }
    }
  }
  return seen.size;
}

export const TOTAL_WORDS = uniqueWordCount();

/** Reference lexicon sizes, duplicated here from the committed JSON headers so the
 * landing page can print them without downloading a 300 KB file. The build check
 * `scripts/check-lexicon.mjs` guards the real files; `landingFacts.test.ts` guards these. */
export const LEXICON_SIZE = { CET4: 4543, CET6: 3991 } as const;
export const LEXICON_SOURCE = {
  name: "KyleBing/english-vocabulary",
  url: "https://github.com/KyleBing/english-vocabulary",
  license: "BSD-3-Clause",
} as const;

export const AUDIO_FEEDBACK_COUNT = AUDIO_CLIPS.length;
export const FSRS_INTERVALS_DAYS = [2, 11, 46, 163] as const;
