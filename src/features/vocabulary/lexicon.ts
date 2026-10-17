import type { CetLevel } from "../course/types";

export interface LexiconEntry {
  word: string;
  glosses: string[];
}
export interface LexiconData {
  schema: 1;
  level: CetLevel;
  source: string;
  license: string;
  rawRows: number;
  uniqueWords: number;
  words: LexiconEntry[];
}

/** Reject incompatible static reference data before rendering. */
export function validateLexicon(input: unknown, expected: CetLevel): LexiconData {
  if (!input || typeof input !== "object") throw Error("词库格式错误");
  const data = input as Partial<LexiconData>;
  if (data.schema !== 1 || data.level !== expected || data.license !== "BSD-3-Clause" ||
    !Array.isArray(data.words) || typeof data.rawRows !== "number" || !Number.isInteger(data.rawRows) ||
    data.uniqueWords !== data.words.length) throw Error("词库版本或数据不匹配");
  if (!data.words.every((e) => typeof e?.word === "string" &&
    /^[a-z][a-z' -]*$/u.test(e.word) && Array.isArray(e.glosses) &&
    e.glosses.length > 0 && e.glosses.every((x) => typeof x === "string" && x.trim()))) {
    throw Error("词库包含无效词条");
  }
  return data as LexiconData;
}

export function findLexiconEntries(
  data: LexiconData, text: string, limit = 25,
): LexiconEntry[] {
  const q = text.trim().toLocaleLowerCase();
  if (!q) return [];
  const start: LexiconEntry[] = [];
  const partial: LexiconEntry[] = [];
  for (const entry of data.words) {
    if (entry.word.startsWith(q)) start.push(entry);
    else if (entry.word.includes(q) || entry.glosses.some((gloss) => gloss.includes(q))) partial.push(entry);
  }
  start.sort((a, b) => a.word.localeCompare(b.word));
  partial.sort((a, b) => a.word.localeCompare(b.word));
  return [...start, ...partial].slice(0, Math.max(1, Math.min(100, limit)));
}
