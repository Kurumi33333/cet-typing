import type { CetLevel, Exercise, ExerciseKind, Lesson } from "../features/course/types";
import { cet4CuratedBatch01 } from "./cet4-curated-batch01";

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
  lesson("cet4-05", "CET4", "表达需求", "学会礼貌地表达需要，慢慢组合成具体请求。", [
    ["word", "需要", "need"],
    ["word", "帮助", "help"],
    ["phrase", "需要帮助", "need help"],
    ["sentence", "我需要帮助。", "I need help."],
    ["word", "时间", "time"],
    ["phrase", "更多时间", "more time"],
    ["sentence", "我需要更多时间。", "I need more time."],
    ["word", "理解", "understand"],
    ["phrase", "理解这个问题", "understand this question"],
    ["sentence", "我需要帮助来理解这个问题。", "I need help understanding this question."],
  ]),
  lesson("cet4-06", "CET4", "时间与安排", "从简单时间词入手，描述计划和考试安排。", [
    ["word", "明天", "tomorrow"],
    ["word", "计划", "plan"],
    ["phrase", "明天的计划", "a plan for tomorrow"],
    ["sentence", "我有一个计划。", "I have a plan."],
    ["word", "准备", "prepare"],
    ["phrase", "为考试做准备", "prepare for the exam"],
    ["sentence", "我正在为考试做准备。", "I am preparing for the exam."],
    ["phrase", "下周", "next week"],
    ["sentence", "下周有一场考试。", "There is an exam next week."],
    ["sentence", "我需要为下周的考试做准备。", "I need to prepare for the exam next week."],
  ]),
  lesson("cet6-04", "CET6", "合作与责任", "把学术表达与团队合作的真实情境连接起来。", [
    ["word", "责任", "responsibility"],
    ["word", "合作", "cooperation"],
    ["phrase", "承担责任", "take responsibility"],
    ["phrase", "共同的目标", "a shared goal"],
    ["sentence", "团队需要一个共同的目标。", "A team needs a shared goal."],
    ["phrase", "有效的沟通", "effective communication"],
    ["phrase", "促进合作", "promote cooperation"],
    ["sentence", "有效的沟通可以促进合作。", "Effective communication can promote cooperation."],
    ["phrase", "对结果负责", "be responsible for the outcome"],
    ["sentence", "每位成员都应该对结果负责。", "Every member should be responsible for the outcome."],
  ]),

  lesson("cet4-07", "CET4", "保护我们的环境", "把常见词汇组合成讨论环保的小句子。", [
    ["word", "保护", "protect"],
    ["word", "环境", "environment"],
    ["phrase", "保护环境", "protect the environment"],
    ["sentence", "我们应该保护环境。", "We should protect the environment."],
    ["word", "能源", "energy"],
    ["phrase", "节约能源", "save energy"],
    ["sentence", "我们可以在家节约能源。", "We can save energy at home."],
    ["word", "减少", "reduce"],
    ["phrase", "减少污染", "reduce pollution"],
    ["sentence", "节约能源有助于减少污染。", "Saving energy helps reduce pollution."],
  ]),
  cet4CuratedBatch01,
];

export function getLessons(level: CetLevel): Lesson[] {
  return lessons.filter((item) => item.level === level);
}
