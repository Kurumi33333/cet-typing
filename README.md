# CET Typing

一个专注 CET-4 / CET-6 **中译英主动输出**的 React 打字练习项目。

## 原则
- 从零实现，只借鉴渐进语块、键盘输入和复习的产品思路。
- 本地优先，无登录、无 Supabase；学习记录计划保存至 IndexedDB。
- 静态题库与训练逻辑分离，优先审核题目质量。
- 小步提交；完整阶段见 [开发路线](docs/ROADMAP.md)。

## 本地运行

要求 Node.js 20.19+ 或 22.12+。

```bash
npm install
npm run dev
```

质量检查：

```bash
npm run typecheck
npm run build
```

当前 S0：React 工程骨架（尚无练习逻辑）；请参阅 ROADMAP。
