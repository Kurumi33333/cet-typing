# Multiple correct answers · 2026-10-18 pilot pass

## Why

CET Typing currently displays a word-by-word typing target, but free Chinese prompts often permit more than one correct translation. Exact-match-only grading is unfair. This review records a *conservative whitelist*, NOT an unrestricted semantic model.

## What is accepted

- `cet4-03-05 保持健康`: **stay healthy** (idiomatic default); **keep healthy** (grammatical, less common in US English); **remain healthy**; **maintain good health**.
- `keep fit` was **not** automatically approved: it can emphasise fitness rather than general health. Its use should be explained, not mislabelled a spelling mistake.
- `cet4-02-03 乘公交车`: **by bus / take a bus / take the bus**.
- `cet4-02-05 每天`: **every day / daily**.
- `cet4-07-06 节约能源`: **save energy / conserve energy**.
- `cet6-01-03 充足的证据`: **sufficient evidence / enough evidence**.
- Only curated, listed alternatives in `src/data/acceptedAnswers.ts` may auto-pass. No “close enough” edit-distance scoring and no LLM involved.

## Release constraints

1. The existing canonical `english` and stable exercise IDs are unchanged; IndexedDB progress and FSRS identifiers survive.
2. Different-length accepted answers require adaptive word slots. A prefix match selects the appropriate phrase, preserving direct input and Space navigation.
3. Displaying another target is not proof a different free translation is semantically incorrect. Unlisted reasonable answers stay flagged as **needs review**, not automatically stored as FSRS failures where CET4 audit protects them.
4. Review remaining ambiguous prompts gradually. These are model-assisted editorial decisions, **not yet independently verified by a qualified English teacher**. Avoid claiming the 120 steps are fully error-free or officially certified.
