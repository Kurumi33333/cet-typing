import { readFileSync, writeFileSync } from "node:fs";

const BAD_EN = /[(){}\[\]<>¦=]|\b(?:something|somebody|somewhere)\b|\s{2,}/iu;
const BAD_ZH = /[A-Za-z]{4,}|[\[\]{}<>]|（?[^）]*\b(?:n|vt|vi|adj|adv)\.[^）]*）?/iu;
const EN = /^[A-Za-z][A-Za-z0-9 ,.'!?;:’-]*[A-Za-z.!?]$/u;
const CJK = /[\u3400-\u9fff]/u;

export function candidateQuality(item) {
  if (!item || typeof item !== "object") return "bad_shape";
  const english = item.sentence ?? item.phrase;
  const chinese = item.translation;
  if (typeof english !== "string" || typeof chinese !== "string") return "missing_translation";
  const words = english.trim().split(/\s+/u);
  if (words.length < 2 || words.length > 15 || english.length > 115) return "bad_length";
  if (!EN.test(english) || BAD_EN.test(english) || /\d/u.test(english)) return "dictionary_artifact";
  if (!CJK.test(chinese) || BAD_ZH.test(chinese) || chinese.length > 75 || chinese.length < 2) return "bad_chinese";
  return null;
}

/** Streaming-friendly design: pass one parsed JSONL record at a time. */
export function filterRecord(record, seen) {
  if (!record || typeof record.word !== "string") return [];
  const result = [];
  for (const [kind, field] of [["phrase", "phrases"], ["sentence", "sentences"]]) {
    for (const item of Array.isArray(record[field]) ? record[field] : []) {
      if (candidateQuality(item)) continue;
      const english = (item.sentence ?? item.phrase).trim();
      const key = english.toLowerCase().replace(/[.!?]$/u,"").trim();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ kind, headword: record.word, chinese: item.translation.trim(),
        english, source: "KyleBing/english-vocabulary" });
    }
  }
  return result;
}

if (process.argv[1]?.endsWith("filter-cet4-jsonl.mjs") && process.argv[2]) {
  const source = process.argv[2];
  const output = process.argv[3] ?? "cet4-candidates.json";
  const seen = new Set();
  const accepted = [];
  let rows = 0, invalid = 0;
  for (const line of readFileSync(source, "utf8").split(/\r?\n/u)) {
    if (!line.trim()) continue;
    rows++;
    try { accepted.push(...filterRecord(JSON.parse(line), seen)); }
    catch { invalid++; }
  }
  writeFileSync(output, JSON.stringify({
    schema: 1, status: "unreviewed-candidates", sourceFile: source,
    sourceRevision: "c4c6c80879ff17d7025c28fb853a4991c8e6be6a",
    rows, invalid, count: accepted.length, entries: accepted,
  }, null, 2), "utf8");
  process.stdout.write(`Source rows: ${rows}, unparseable: ${invalid}, filtered candidates: ${accepted.length}\n`);
  process.stdout.write("Review candidates before including them in curriculum.\n");
}
