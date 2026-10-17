import type { CetLevel, Exercise, ExerciseKind, Lesson } from "../features/course/types";

type Step = readonly [ExerciseKind, string, string];

function lesson(id: string, level: CetLevel, title: string, description: string, steps: Step[]): Lesson {
  return {
    id, level, title, description,
    exercises: steps.map(([kind, chinese, english], index): Exercise => ({
      id: `${id}-${String(index + 1).padStart(2, "0")}`,
      level, kind, chinese, english,
    })),
  };
}

/**
 * Original pilot curriculum. Illustrative exercises, NOT official CET papers.
 * Progression: single word → reusable chunk → short sentence → combined sentence.
 * Do not import or relicense Earthworm's AGPL course material.
 */
export const lessons: Lesson[] = [
  lesson("cet4-01", "CET4", "从一个词开始", "先打出认识的单词，再把它们拼成第一句话。", [
    ["word", "我", "I"],
    ["word", "喜欢", "like"],
    ["phrase", "我喜欢", "I like"],
    ["word", "茶", "tea"],
    ["sentence", "我喜欢茶。", "I like tea."],
    ["word", "你", "you"],
    ["sentence", "你喜欢茶。", "You like tea."],
    ["word", "水", "water"],
    ["sentence", "我喜欢水。", "I like water."],
    ["sentence", "我们喜欢茶。", "We like tea."],
  ]),
  lesson("cet4-02", "CET4", "熟悉的校园", "把短语一点点加进句子，练习日常表达。", [
    ["phrase", "上学", "go to school"],
    ["sentence", "我上学。", "I go to school."],
    ["phrase", "乘公交车", "by bus"],
    ["sentence", "我乘公交车上学。", "I go to school by bus."],
    ["phrase", "每天", "every day"],
    ["sentence", "我每天上学。", "I go to school every day."],
    ["phrase", "学习英语", "study English"],
    ["sentence", "我每天学习英语。", "I study English every day."],
    ["phrase", "和朋友一起", "with friends"],
    ["sentence", "我和朋友一起学习英语。", "I study English with friends."],
  ]),
  lesson("cet4-03", "CET4", "习惯和计划", "学习描述习惯，逐步加入时间与目的。", [
    ["word", "阅读", "read"],
    ["phrase", "每天阅读", "read every day"],
    ["sentence", "我每天阅读。", "I read every day."],
    ["word", "健康的", "healthy"],
    ["phrase", "保持健康", "stay healthy"],
    ["word", "运动", "exercise"],
    ["sentence", "我每天运动。", "I exercise every day."],
    ["sentence", "这有助于我保持健康。", "It helps me stay healthy."],
    ["word", "计划", "plan"],
    ["sentence", "我为明天制定计划。", "I make a plan for tomorrow."],
  ]),
  lesson("cet4-04", "CET4", "说出你的观点", "使用 think、because 和 improve 表达想法。", [
    ["word", "重要的", "important"],
    ["word", "练习", "practice"],
    ["sentence", "练习很重要。", "Practice is important."],
    ["phrase", "我认为", "I think"],
    ["sentence", "我认为练习很重要。", "I think practice is important."],
    ["word", "因为", "because"],
    ["phrase", "每天练习", "practice every day"],
    ["sentence", "我每天练习，因为我想进步。", "I practice every day because I want to improve."],
    ["phrase", "提高我的英语水平", "improve my English"],
    ["sentence", "我认为每天练习可以提高我的英语水平。", "I think daily practice can improve my English."],
  ]),
  lesson("cet6-01", "CET6", "证据与观点", "从核心学术词汇开始，组合成完整论述。", [
    ["word", "证据", "evidence"],
    ["word", "充足的", "sufficient"],
    ["phrase", "充足的证据", "sufficient evidence"],
    ["word", "结论", "conclusion"],
    ["phrase", "这个结论", "this conclusion"],
    ["phrase", "有证据支持", "supported by evidence"],
    ["sentence", "这个结论有证据支持。", "This conclusion is supported by evidence."],
    ["phrase", "并非完全", "not entirely"],
    ["word", "可靠的", "reliable"],
    ["sentence", "这个结论并非完全可靠。", "This conclusion is not entirely reliable."],
  ]),
  lesson("cet6-02", "CET6", "科技与影响", "从简单概念到科技改变生活的复杂表达。", [
    ["word", "技术", "technology"],
    ["word", "进步", "progress"],
    ["phrase", "技术进步", "technological progress"],
    ["word", "影响", "influence"],
    ["phrase", "我们的生活", "our lives"],
    ["sentence", "技术影响我们的生活。", "Technology influences our lives."],
    ["phrase", "改变我们交流的方式", "change the way we communicate"],
    ["sentence", "技术改变了我们交流的方式。", "Technology has changed the way we communicate."],
    ["word", "积极的", "positive"],
    ["sentence", "技术进步具有积极影响。", "Technological progress has a positive impact."],
  ]),
  lesson("cet6-03", "CET6", "决策与挑战", "将动词与让步从句结合，形成有逻辑的表达。", [
    ["word", "决定", "decide"],
    ["word", "优先处理", "prioritize"],
    ["phrase", "一项重要任务", "an important task"],
    ["sentence", "我们应该优先处理重要任务。", "We should prioritize important tasks."],
    ["word", "尽管", "although"],
    ["word", "困难的", "difficult"],
    ["sentence", "这项任务很困难。", "The task is difficult."],
    ["sentence", "尽管任务很困难，我们还是会继续。", "Although the task is difficult, we will continue."],
    ["phrase", "克服困难", "overcome difficulties"],
    ["sentence", "我们能够克服困难。", "We can overcome difficulties."],
  ]),
];

export function getLessons(level: CetLevel): Lesson[] {
  return lessons.filter((item) => item.level === level);
}
