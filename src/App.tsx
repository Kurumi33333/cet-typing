export default function App() {
  return (
    <div className="page-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="CET Typing 首页">
          <span className="brand-mark" aria-hidden="true">⌘</span>
          CET Typing
        </a>
        <span className="header-note">中译英 · 主动输出</span>
      </header>
      <main className="main-content">
        <div className="eyebrow"><span className="status-dot" /> 四六级英语训练</div>
        <h1>把英语<br /><em>打出来。</em></h1>
        <p className="intro">
          不只认识单词。看中文，主动写出英文；在句子和语块中，练习真正的表达能力。
        </p>
        <div className="notice" role="status">
          <span className="notice-index">00 / 基础骨架</span>
          <span>项目结构已建立。下一步接入本地示例题库和键盘练习。</span>
        </div>
      </main>
      <footer className="site-footer">
        <span>Local-first · 无账号 · 无云端存储</span>
        <span>CET-4 / CET-6</span>
      </footer>
    </div>
  );
}
