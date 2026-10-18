/**
 * CET4 PILOT audit register, 2026-10-18. Every stable ID is explicitly listed.
 * This is a quality-control inventory, NOT an official syllabus certification.
 * `alternative_translation` = fixed-English-target cannot grade free translation.
 * `lexicon_gap` = reference headword missing; NOT proof of syllabus exclusion.
 * `context_needed` = pronoun or sense underspecified in Chinese prompt.
 * No item is marked exam-verified without independently confirmed evidence.
 */
export type Cet4AuditFlag = "alternative_translation" | "lexicon_gap" | "context_needed";
export interface Cet4AuditRow { id: string; reviewStage: "pilot"; flags: Cet4AuditFlag[] }
export const cet4Audit: Cet4AuditRow[] = [
  {
    "id": "cet4-01-01",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-01-02",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-01-03",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-01-04",
    "reviewStage": "pilot",
    "flags": [
      "lexicon_gap"
    ]
  },
  {
    "id": "cet4-01-05",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-01-06",
    "reviewStage": "pilot",
    "flags": [
      "lexicon_gap"
    ]
  },
  {
    "id": "cet4-01-07",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-01-08",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-01-09",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-01-10",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-02-01",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-02-02",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-02-03",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-02-04",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-02-05",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-02-06",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-02-07",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-02-08",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-02-09",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-02-10",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-03-01",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-03-02",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-03-03",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-03-04",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-03-05",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-03-06",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-03-07",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-03-08",
    "reviewStage": "pilot",
    "flags": [
      "context_needed",
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-03-09",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-03-10",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-04-01",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-04-02",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-04-03",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-04-04",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-04-05",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-04-06",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-04-07",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-04-08",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-04-09",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-04-10",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-05-01",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-05-02",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-05-03",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-05-04",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-05-05",
    "reviewStage": "pilot",
    "flags": [
      "lexicon_gap"
    ]
  },
  {
    "id": "cet4-05-06",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-05-07",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-05-08",
    "reviewStage": "pilot",
    "flags": [
      "lexicon_gap"
    ]
  },
  {
    "id": "cet4-05-09",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-05-10",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-06-01",
    "reviewStage": "pilot",
    "flags": [
      "lexicon_gap"
    ]
  },
  {
    "id": "cet4-06-02",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-06-03",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-06-04",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-06-05",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-06-06",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-06-07",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-06-08",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-06-09",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-06-10",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-07-01",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-07-02",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-07-03",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-07-04",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-07-05",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-07-06",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-07-07",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-07-08",
    "reviewStage": "pilot",
    "flags": []
  },
  {
    "id": "cet4-07-09",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  },
  {
    "id": "cet4-07-10",
    "reviewStage": "pilot",
    "flags": [
      "alternative_translation"
    ]
  }
];

/**
 * A fixed answer cannot fairly score free translation when alternatives or
 * missing context have been explicitly flagged. Practice may still show the
 * target spelling; do not treat a mismatch as a learning failure in FSRS.
 */
const uncertainTargets = new Set(cet4Audit.filter((row) =>
  row.flags.includes("alternative_translation") || row.flags.includes("context_needed"),
).map((row) => row.id));

export function isCET4PilotFreeTranslationRisk(level: string, exerciseId: string): boolean {
  return level === "CET4" && uncertainTargets.has(exerciseId);
}
