import type { Lesson } from "../features/course/types";

/**
 * Carefully selected source examples from KyleBing/english-vocabulary.
 * Upstream: https://github.com/KyleBing/english-vocabulary
 * Source snapshot: master@c4c6c80879ff17d7025c28fb853a4991c8e6be6a
 * File: full_line_jsonl/sentence/正序/四级.jsonl (BSD-3-Clause)
 * These are fixed-expression typing targets, not certified official questions.
 * Each entry has manually checked English/Chinese alignment; automatic free
 * translation scoring and FSRS failure collection remain DISABLED by CET4 audit.
 */
export const cet4CuratedBatch01: Lesson = {
  id: "cet4-08",
  level: "CET4",
  title: "教育、能力与目标",
  description: "从四级参考语料中筛选的单词、搭配和例句；按目标表达练习，不作自由翻译评分。",
  exercises: [
    { id: "cet4-08-01", level: "CET4", kind: "word", chinese: "能力", english: "ability" },
    { id: "cet4-08-02", level: "CET4", kind: "word", chinese: "教育", english: "education" },
    { id: "cet4-08-03", level: "CET4", kind: "phrase", chinese: "高等教育", english: "higher education" },
    { id: "cet4-08-04", level: "CET4", kind: "phrase", chinese: "职业教育", english: "vocational education" },
    { id: "cet4-08-05", level: "CET4", kind: "sentence", chinese: "她也希望她的孩子可以受到良好的教育。", english: "She also hopes her children will get a good education." },
    { id: "cet4-08-06", level: "CET4", kind: "word", chinese: "实现", english: "achieve" },
    { id: "cet4-08-07", level: "CET4", kind: "phrase", chinese: "取得成功", english: "achieve success" },
    { id: "cet4-08-08", level: "CET4", kind: "sentence", chinese: "她终于实现目标，当上了教授。", english: "She eventually achieved her goal of becoming a professor." },
    { id: "cet4-08-09", level: "CET4", kind: "word", chinese: "适应", english: "adapt" },
    { id: "cet4-08-10", level: "CET4", kind: "sentence", chinese: "适应能力是做这份工作的绝对有利条件。", english: "The ability to adapt is a definite asset in this job." },
  ],
};
