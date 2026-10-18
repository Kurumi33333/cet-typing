# CET-4 Content QA · 2026-10-18

## Evidence hierarchy / 证据层级

1. **Official** — [教育部教育考试院 CET 考试大纲](https://cet.neea.edu.cn/html1/folder/16113/1588-1.htm)：截至核对日，官网列出《全国大学英语四、六级考试大纲（2016年修订版）》，无已确认替代它的 2026 CET-4 新版。
2. **Publisher corroboration** — [清华大学出版社《大学英语四级考试大纲词汇详解》第 5 版](https://www.tup.tsinghua.edu.cn/booksCenter/book_10653101.html)，2026-08-13 再印，说明依据 2016 大纲，约 5000 词和约 1000 词组。仅引用书目和范围，不复制受版权保护的词条/例句。
3. **Open-source reference** — KyleBing/english-vocabulary（BSD-3-Clause，版权声明见 `public/lexicon/LICENSE.txt`）：7508 行、去重 4543 个四级词头。**既不代表官方完整目录，也未逐义项核验。**
4. **Community corpus** — exam-data/CETVocabulary（CC BY-NC-SA 4.0 数据）自述基于 2016 大纲 5278 个总词头、混合考试材料词频，尚称“有空再和考纲校对”；仅做方法交叉参考，未复制数据或视为官方频率。

## Three review passes / 三轮检查

- **A · Source/provenance**：检查官方现行大纲版本、资料版权及许可；拒绝把互联网标题中的“2026最新版”当成大纲修订证明。
- **B · Machine coverage**：逐一核对 7 个四级单元共 **70 个稳定 Exercise ID**、英文格式、类型与词槽解析；23 道单词练习中，**18 个词头**能在现有参考词表找到，**5 个词头缺失**：`tea`、`you`、`time`、`understand`、`tomorrow`。缺失只证明该开源快照覆盖不足，不证明考试大纲排除这些词。
- **C · Semantic risk review (model-assisted, not external teacher certification)**：对 70 条英汉提示逐条检查，标出固定目标答案与自然译法之间的风险；详见 `src/data/cet4-audit.ts`。有 **21 条**潜在多译法、**1 条**指代语境不足、**5 条**词头缺失标记；存在一题多风险时可重叠。此轮尚未经授课教师/母语审校。

## Red flags / 典型问题

| Exercise | 观察 | 处理原则 |
|---|---|---|
| cet4-01-02 喜欢 → like | love / enjoy 在合适语境下也可能正确 | 不应把其他自然译法说成英语错误 |
| cet4-02-03 乘公交车 → by bus | take a bus 等表达存在结构差异 | 要求目标搭配或允许多解 |
| cet4-03-05 保持健康 → stay healthy | keep fit 等自然表达 | 固定拼写 ≠ 自由翻译唯一解 |
| cet4-03-08 这有助于我保持健康。 | “这”没有明确先行词 | 应补充上下文或调整提示 |
| cet4-04-08 我每天练习，因为我想进步。 | get better / improve 等合理译法 | 使用可解释的指定句型或验证等价译法 |
| cet4-06-01 明天 → tomorrow | 参考词库未收录的基本词 | 不用词表缺失作排除依据 |

## Publication gate / 发布门槛

- 当前 **70 个 CET4 练习都是原创建构的 pilot 定向拼写题，不是官方真题或完整大纲认证课程**。
- 每个新练习必须新增审校行，否则 `cet4-audit.test.ts` 失败；所有 `lexicon_gap` 必须保持与快照一致。
- **不得自动将参考词表 4543 个词转换为唯一答案的汉译英题。**后续应先核验义项、惯用搭配、歧义、自然度、语境、答案接受策略和考试相关度。
- 现有评分是 target-specific spelling check，**不是对所有可能正确译法的语义判断**。FSRS 可能因其他合理译法记下“错题”；在引入语义等价处理前，不应宣称这套题有正式考试级的准确性。
- 如官方发布新修订大纲，先更新可追溯证据及版本差异，再更新词表和课程。
