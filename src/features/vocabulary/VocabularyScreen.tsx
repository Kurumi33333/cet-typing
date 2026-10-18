import { useEffect, useMemo, useState } from "react";
import type { CetLevel } from "../course/types";
import { speakEnglish } from "../practice/speech";
import { findLexiconEntries, validateLexicon, type LexiconData } from "./lexicon";

function currentPageSize(): number {
  if (typeof window === "undefined") return 4;
  if (window.innerHeight <= 690) return 3;
  if (window.innerWidth <= 640) return 4;
  return window.innerHeight <= 820 ? 5 : 6;
}

export function VocabularyScreen({ level, onBack }: { level: CetLevel; onBack: () => void }) {
  const [data, setData] = useState<LexiconData | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(currentPageSize);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setQuery("");
    setPage(0);
    setError("");
    fetch(`/lexicon/${level.toLowerCase()}.json`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw Error("词库加载失败"); return r.json() as Promise<unknown>; })
      .then((json) => setData(validateLexicon(json, level)))
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "词库加载失败");
      });
    return () => controller.abort();
  }, [level]);

  useEffect(() => {
    const measure = () => { setPageSize(currentPageSize()); setPage(0); };
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const entries = useMemo(() => data ? findLexiconEntries(data, query, 30) : [], [data, query]);
  const pages = Math.max(1, Math.ceil(entries.length / pageSize));
  const visibleEntries = entries.slice(page * pageSize, (page + 1) * pageSize);

  return <section className="lexicon-page">
    <button className="text-button" type="button" onClick={onBack}>← 返回首页</button>
    <div className="eyebrow"><span className="status-dot"/> REFERENCE VOCABULARY</div>
    <h1>{level === "CET4" ? "四级" : "六级"}<em>参考词库。</em></h1>
    <p className="lexicon-intro">独立的词汇检索工具。按英文或中文释义查词；参考词条不等于已审校的中译英课程。</p>
    <div className="lexicon-search">
      <input type="search" aria-label="搜索单词或中文释义"
        placeholder="输入英文单词或中文释义…"
        autoComplete="off" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }}/>
      <span>{data ? `${data.uniqueWords.toLocaleString()} 词` : "加载中…"}</span>
    </div>
    {error && <p className="storage-warning" role="alert">{error}</p>}
    {!error && query.trim() && data && <p className="lexicon-hint">前 30 项匹配 · 点击喇叭试听英文发音</p>}
    <div className="lexicon-results" aria-live="polite">
      {visibleEntries.map((entry) => <article className="lexicon-result" key={entry.word}>
        <div className="lexicon-wordline">
          <strong>{entry.word}</strong>
          <button type="button" aria-label={`朗读 ${entry.word}`}
            onClick={() => speakEnglish(entry.word, "word")}>🔊</button>
        </div>
        <span>{entry.glosses.slice(0, 3).join(" / ")}</span>
      </article>)}
      {query.trim() && data && !entries.length && <p className="lexicon-empty">没有找到匹配词条。</p>}
      {!query.trim() && <p className="lexicon-empty">输入一个关键词开始检索。</p>}
    </div>
    {entries.length > pageSize && <nav className="lexicon-pagination" aria-label="词汇检索分页">
      <button type="button" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← 上一页</button>
      <span>{page + 1} / {pages}</span>
      <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>下一页 →</button>
    </nav>}
    <p className="lexicon-attribution">来源：<a href="https://github.com/KyleBing/english-vocabulary" target="_blank" rel="noopener noreferrer">KyleBing/english-vocabulary</a>，BSD-3-Clause。
      <a href="/lexicon/LICENSE.txt" target="_blank" rel="noopener noreferrer"> 查看许可</a>。
      词汇数据仅供学习参考，非官方四六级词纲。</p>
  </section>;
}
