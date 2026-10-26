# CET Typing · 宣传片工程

一支 36.8 秒的产品宣传片，用 [video-shotcraft](https://vincentwei1021.github.io/video-shotcraft/)
的自主自由创作模式制作。全部产物都在这个文件夹里 —— 产品项目本身**零改动**
（`git status` 只多出这一个 `video/` 目录）。

## 成片

| 文件 | 内容 |
|------|------|
| `out/promo-bgm.mp4` | **带音乐版**（36.8 s · 1920×1080 · 30fps · 6.9 MB） |
| `out/promo-nobgm.mp4` | **纯音效版**，同一个时间线渲染，画面逐帧 0 差异；方便自己配乐 |

两版都从 `src/Promo.tsx` 的 `bgm` 开关渲出（`--props=props-nobgm.json`）。

## 片子讲什么

一条下划线贯穿全片 —— 它就是产品里每个英文词下面那道填空线。开场它自己画出来，
中段锁住整句变成绿色，收尾缩成字标下面那条强调线。

| 时间 | 镜头 | 展示的功能 |
|------|------|-----------|
| 0.0–7.7 s | S1 看中文，写英文 | 逐词下划线输入、拼对即转绿（核心动作，全片最长一镜） |
| 7.7–9.7 s | C1 字卡 | 一个词，一块砖，一句话 |
| 9.7–14.5 s | S2 课程阶梯 | 真实页面 `#how` 段：单词/语块/句子三层 + 12 单元 120 步 |
| 14.5–16.5 s | C2 字卡 | 打错的，原位改 |
| 16.5–25.2 s | S3 长句与即时反馈 | 11 词长句逐词打出、全部拼对立刻跳题 |
| 25.2–27.1 s | C3 字卡 | 错的，会回来 |
| 27.1–31.0 s | S4 到期复习 | FSRS 间隔 2 / 11 / 46 / 163 天 |
| 31.0–36.8 s | S5 合影与字标 | 四个功能各抽一个元素飞入合影，字标落印 + 34 帧静置 |

## 目录

```text
video/
├── DESIGN.md              设计规格：产品简报、需求→决策表、视觉 tokens、
│                          功能→镜头映射、分镜、帧级时间轴、SFX 计划
├── src/
│   ├── beat.ts            ★ 时间线唯一事实源（拍号 beatF(n)、hold 预算、slam 预算）
│   ├── sound.ts           ★ SFX 钉帧表（按实测击弦点对齐，非文件头）
│   ├── copy.ts            全片文案
│   ├── theme.ts           设计 tokens（全部取自产品自身的 CSS）
│   ├── Promo.tsx          镜头装配 + 转场 + 字幕 + 音频
│   ├── Root.tsx           Composition 注册
│   ├── workbench.ts       动效工作台清单（拆成镜头/转场/字幕/音效多轨）
│   ├── scenes/            S1–S5 与字卡
│   ├── components/        Rule（母题横线）、Cut（转场）、Caption、Light
│   └── layout json        live-layout.json / practice-layout.json（真实页面坐标）
├── scripts/
│   ├── capture.mjs        从运行中的产品抓真实页面纹理（2x/4x）+ 元素坐标
│   ├── prepare-fonts.py   字体子集化（EB Garamond + Noto Serif/Sans SC + Inter）
│   └── peek.mjs           单页截图小工具
├── analysis/              节拍网格、渲染音轨偏移、SFX 击弦点/可听度等实测脚本
├── public/
│   ├── textures/live/     真实页面截图（landing-full / how-4x / practice-*-band）
│   ├── fonts/             子集字体（329 KB）
│   └── audio/             BGM 切片 + 20 个 Mixkit SFX
└── out/                   成片 + out/qa/ 逐版本静帧档案
```

## 重新生成

```bash
# 1. 起产品 dev server（只读消费，不改产品项目）
cd ..                      && npm run dev -- --port 5199

# 2. 抓素材（会写 public/textures/live 与 src/*-layout.json）
cd video                   && node scripts/capture.mjs

# 3. 渲染
npx remotion studio src/index.ts                       # 预览
npx remotion render src/index.ts CetTypingPromo out/promo-bgm.mp4
npx remotion render src/index.ts CetTypingPromo out/promo-nobgm.mp4 --props=props-nobgm.json
```

`npx tsc --noEmit` 全绿。

## 校验（都可复跑）

```bash
# 1. 拆解无损：工作台清单重建的时间线 vs 成片，逐像素比对
#    （skill 自带 parity.mjs 依赖 rsync，Windows 没有；下面这个等价）
cd "C:/Users/THEO/.agents/skills/video-shotcraft/workbench"
node scripts/open.mjs "D:/Code_project/cet-typing/video"        # 链接工程 + 起 5198
robocopy public .render-public /E /NFL /NDL /NJH /NJS /NP       # 代替 rsync -aL
node scripts/parity-windows.mjs --frames 150,262,330,430,520,620,700,745,860,905,960,1005,1060,1095
# → 14 帧全部 0% 差异

# 2. 节拍网格 / 渲染音轨偏移 / 每个 SFX 的击弦点与可听度
cd D:/Code_project/cet-typing/video
python analysis/final-beat.py        # 切 BGM 并写 src/analysis/beat-data.json
python analysis/render-offset.py     # 成片音轨 vs 源 BGM 互相关（本管线 = 0 样本）
python analysis/sfx-peaks.py         # 每个音效的真实攻击位置
python analysis/sfx-lags.py          # → src/analysis/sfx-lags.json
python analysis/sfx-audibility.py    # 每个钉点在成片里是否真的听得见
```

实测结论：

- 同一份 props 渲两次：**逐帧 0 差异**
- 带 BGM 版 vs 纯音效版：**逐帧 0 差异**（文件大小也相同）
- 字标 hold f1062→f1098：像素差 **0.0016%**
- 字幕字形高 **57px**（门槛 56px）
- 渲染音轨偏移 **0 样本**（相关系数 0.968）——没有照抄其他管线的 1.28 帧

## 几个刻意的决定（详见 DESIGN.md）

- **视觉语言全部从产品自身长出来**：纸底色、墨绿、语法定/对/错三色、EB Garamond +
  宋体、Inter，全部是产品 `landing.css` / `styles.css` 里的真实值。唯一偏离是把首页
  hero 的极光提成全片唯一的光源，已在 spec 里记录。
- **真实页面用真实截图**：S2 是产品 `#how` 段的 4x 元素截图；S3 的中文提示也是真实
  4x 截图。S3 的英文词与词槽线由片子重画 —— 因为线条要逐词变色，截图做不到，
  但坐标直接取自采集到的真实 DOM bbox，字号与产品一致。
- **音乐卡点**：BGM 选自库里的 tech-house，实测 124.00 BPM、每拍 14.52 帧、拟合残差
  ±11.4 ms；所有镜头边界都写在拍号 `beatF(n)` 上，全是小节线。
- **确定性渲染**：全片禁 `Math.random` / `Date.now`；并且实测发现 CSS `filter: blur()`
  过渡与 CSS `transition` 会让同一帧在两次渲染中不一致（两版成片差 2% 像素），已全部
  换成 opacity/scale 驱动，现在用同一 props 渲两次逐帧 0 差异。

## 素材授权

- 字体：EB Garamond（SIL OFL，产品自带）、Noto Serif SC / Noto Sans SC（SIL OFL）、
  Inter（SIL OFL）。
- 音效：Mixkit Sound Effects Free License（免署名可商用），逐条原始 URL 见
  `C:\Users\THEO\.agents\skills\video-shotcraft\assets\audio\ATTRIBUTION.md`。
- BGM：Mixkit Stock Music Free License。`bgm-tech-house.mp3` 是 skill 库里首批沿用的
  曲目，**原始条目无法逐个反查**，商用发布前建议复核；如需换成授权链更干净的曲子，
  按 `analysis/final-beat.py` 重新切一段并更新 `src/analysis/beat-data.json` 即可
  （时间线全用拍号表达，换曲只改两个常量）。
- 渲染引擎：[Remotion](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)
  个人与小团队免费，公司使用可能需要独立授权。
