import { normalizeAnswer } from "./answer";

export type WordStatus = "correct" | "replace" | "missing" | "extra";

export interface WordDiff {
  expected: string | null;
  actual: string | null;
  status: WordStatus;
}

function splitWords(text: string): string[] {
  return text.trim() ? text.trim().split(/\s+/u) : [];
}

function normalizedWord(word: string): string {
  return normalizeAnswer(word).replace(/^["“”]+|[,;:]+$/gu, "");
}

/**
 * Word-level edit distance aligns input and reference.
 * A missing/extra word won't incorrectly mark every following word as wrong.
 * UI and keyboard state are intentionally out of scope for S2a.
 */
export function diffWords(input: string, expected: string): WordDiff[] {
  const want = splitWords(expected);
  const got = splitWords(input);
  const m = want.length;
  const n = got.length;
  const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const substitution = normalizedWord(want[i - 1]) === normalizedWord(got[j - 1]) ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + substitution,
      );
    }
  }

  const diff: WordDiff[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    const same = i > 0 && j > 0 &&
      normalizedWord(want[i - 1]) === normalizedWord(got[j - 1]);

    if (same && dp[i][j] === dp[i - 1][j - 1]) {
      diff.push({ expected: want[--i], actual: got[--j], status: "correct" });
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      diff.push({ expected: want[--i], actual: null, status: "missing" });
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      diff.push({ expected: null, actual: got[--j], status: "extra" });
    } else {
      diff.push({ expected: want[--i], actual: got[--j], status: "replace" });
    }
  }

  return diff.reverse();
}
