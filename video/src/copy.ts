// Every pixel of copy the film can say, in one place.
// Chapter 3 of the spec: copy is rewritten against the final picture, so it
// lives next to the timeline rather than being scattered through scenes.

export const BRAND = 'CET Typing';
export const TAGLINE = '轻一点，记得更牢。';

/** S1 · the atomic action: look at Chinese, type English one word at a time. */
export const HERO = {
  eyebrow: 'CET-4 / CET-6 · 中译英基本功',
  chinese: '我喜欢茶。',
  words: ['I', 'like', 'tea'] as const,
};

/** C1 · the course ladder. */
export const CARD_ONE = {
  text: '一个*词*，一块砖，一句话。',
  sub: '12 单元 · 120 步原创练习',
};

/** S2 · the real numbers, taken from the running product's own #how section. */
export const COURSE = {
  kicker: '课程结构',
  title: '每一个单元，走同一条路',
  rows: [
    { kind: '单词', zh: '先打认识的词', count: 41, share: 0.34 },
    { kind: '语块', zh: '再拼成能用的块', count: 37, share: 0.31 },
    { kind: '句子', zh: '最后写成一句话', count: 42, share: 0.35 },
  ],
  totals: [
    { value: '12', label: '个单元' },
    { value: '120', label: '步原创练习' },
    { value: '8,534', label: '条词库可查' },
  ],
};

/** C2 */
export const CARD_TWO = {
  text: '打错的，*原位*改。',
  sub: '点哪一个词槽都能改，不必从左到右',
};

/** S3 · the long sentence, typed word by word. */
export const SENTENCE = {
  eyebrow: '四级 · 08 教育、能力与目标',
  chinese: '她也希望她的孩子可以受到良好的教育。',
  words: ['She', 'also', 'hopes', 'her', 'children', 'will', 'get', 'a', 'good', 'education'] as const,
  counter: '04 / 10',
};

/** C3 */
export const CARD_THREE = {
  text: '错的，*会回来*。',
  sub: '错题进入到期队列，按你的回忆重新排',
};

/** S4 · FSRS. */
export const REVIEW = {
  kicker: '到期复习',
  headline: '隔得越久，越要自己想',
  due: 7,
  steps: [
    { label: '第 2 次', gap: '2 天后' },
    { label: '第 3 次', gap: '11 天后' },
    { label: '第 4 次', gap: '46 天后' },
    { label: '第 5 次', gap: '163 天后' },
  ],
  note: '间隔来自 FSRS 默认参数，是连续答对时的常见节奏，不是承诺。',
  local: '记录只留在这台设备，没有账号，也没有云端同步。',
};

/** S5 */
export const OUTRO = {
  eyebrow: '四六级中译英 · 本地优先',
  sub: '不用注册 · 断网也能继续',
};
