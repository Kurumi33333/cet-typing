import { useState } from "react";
import type { CetLevel } from "./features/course/types";
import { PracticeScreen } from "./features/practice/PracticeScreen";

export default function App() {
  const [level, setLevel] = useState<CetLevel | null>(null);

  return (
    <div className="page-shell">
      <header className="site-header">
        <button className="brand brand-button" type="button" onClick={() => setLevel(null)} aria-label="返回首页">
          <span className="brand-mark" aria-hidden="true">⌘</span>
          CET Typing
        </button>
        <span className="header-note">中译英 · 主动输出</span>
      </header>

      {level === null ? (
        <main className="main-content">
          <div className="eyebrow"><span className="status-dot" /> 四六级英语训练</div>
          <h1>把英语<br /><em>打出来。</em></h1>
          <p className="intro">不只认识单词。看中文，主动写出英文；在句子和语块中，练习真正的表达能力。</p>
          <div className="choice-group" aria-label="选择练习等级">
            <button className="primary-button" type="button" onClick={() => setLevel("CET4")}>
              开始四级练习 <span aria-hidden="true">↗</span>
            </button>
            <button className="secondary-button" type="button" onClick={() => setLevel("CET6")}>
              六级练习 <span aria-hidden="true">↗</span>
            </button>
          </div>
          <p className="demo-note">先从一个单词开始，逐步组成语块和完整句子。现有 70 个原创渐进练习，非官方真题。</p>
        </main>
      ) : (
        <main className="practice-main">
          <PracticeScreen key={level} level={level} onBack={() => setLevel(null)} />
        </main>
      )}

      <footer className="site-footer">
        <span>Local-first · 无账号 · 无云端存储</span>
        <span>CET-4 / CET-6</span>
      </footer>
    </div>
  );
}
