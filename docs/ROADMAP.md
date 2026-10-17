# CET Typing · 小步开发路线

## 项目原则

- 纯前端 / local-first：React + Vite + TypeScript；Dexie + IndexedDB 存进度及错题，localStorage 存声音设置。
- 原创渐进内容，不搬运第三方课程或未确认授权的英语教材；不冒充官方四六级真题。
- 课程和记录以稳定 ID 关联；拆成小提交，每次经过单元测试、TS 检查和 Cloudflare Pages 构建。

## 当前里程碑

- [x] S0–S2：应用骨架、逐词下划线、自由选格、判错修正、移动端焦点保留。
- [x] S3：Motion 错词动画、七类 Web Audio 反馈、原生英语 TTS（含 iOS 音色筛选）。
- [x] S3a：原创渐进课程扩至 **6 个 CET4 + 4 个 CET6 单元，共 100 步**，按词 → 语块 → 句子编排。
- [x] S3b：静态题库格式质量门槛（类别、标点、唯一 ID、下划线兼容性与单元难度跨度）。
- [x] S4a：按 CET 等级保存/恢复课程断点，旧题目删除时安全降级。
- [x] S4b：错题记录错误次数，首页待复习计数，独立错题复习，复习正确才标记解决。
- [x] S4c：版本化 JSON 本机备份、结构校验、按更新时间合并导入、确认后清空。
- [ ] S5：FSRS 间隔复习，支持复习周期、熟练度和数据统计。
- [ ] S6：审核许可的 CET 词纲/例句数据、自动拆解课程、真人审校及大规模内容质量回归。
- [ ] S7：完整 iOS / Android 真机键盘、朗读与可访问性测试和性能优化。

## 验收证据（2026-10-18）

- Cloudflare Pages 主分支自动运行 `npm run build`：先执行 Vitest，再运行 TypeScript 与 Vite。
- 浏览器验证了四级从第一题完成并继续至第二题；退出后 IndexedDB 的进度指向第二题，首页显示继续学习。
- 将第一题故意拼错后恢复正确；退出后四级错题计数为 1；在错题复习里答对后计数为 0，历史记录保留且 `resolved=true`。
- 浏览器实测备份导出→清空→重新导入：错题计数 1→0→1，课程断点恢复。
- 题库质量检查覆盖全部 100 步，但仅验证结构，不等于真人校对了每一道题的语言自然度或难度。
- **真实 iPhone 软键盘保持与 TTS 音色**仍需设备手动试听；自动化浏览器不能代替真机音质验收。
- 学习记录保存在当前浏览器/设备中。无账号、无自动跨设备同步；清理网站数据可能删掉记录，请先导出备份。

## 目前数据与目录

- `src/data/curriculum.ts`：原创渐进课程（稳定 lesson / exercise IDs）。
- `src/lib/storage/db.ts`：IndexedDB 的进度、错题结构与读写。
- `src/lib/storage/backup.ts`：版本化 JSON 导入导出、安全格式检查。
- `src/features/practice/`：输入引擎、键盘状态、TTS、音效与复习交互。
- `src/data/curriculum.quality.test.ts`：静态课程的结构质量检查。

## 下一小批次

1. S5a：调度算法与错题复习数据结构，保持现有待复习体验不变。
2. S5b：到期复习队列与学习统计 UI。
3. S6a：选定许可明确的真实 CET 词汇源，逐批加入课程，不一次性引入海量未校对材料。

## 部署

Cloudflare Pages 项目 `cet-typing`，生产分支 `main`，构建命令 `npm run build`，输出 `dist`。域名：https://cet.theoryu.me 。不使用 GitHub Actions。
