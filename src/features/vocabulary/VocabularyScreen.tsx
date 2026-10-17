import { useEffect, useMemo, useState } from "react";
import type { CetLevel } from "../course/types";
import { speakEnglish } from "../practice/speech";
import { findLexiconEntries, validateLexicon, type LexiconData } from "./lexicon";

export function VocabularyScreen({ level, onBack }: { level: CetLevel; onBack: () => void }) {
  const [data, setData] = useState<LexiconData | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setQuery("");
    setError("");
    fetch(`/lexicon/${level.toLowerCase()}.json`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw Error("词库加载失败"); return r.json() as Promise<unknown>; })
      .then((json) => setData(validateLexicon(json, level)))
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "词库加载失败");
      });
    return () => controller.abort();
  }, [level]);

  const entries = useMemo(() => data ? findLexiconEntries(data, query, 30) : [], [data, query]);

  return <section className="lexicon-page">
    <button className="text-button" type="button" onClick={onBack}>← 返回首页</button>
    <div className="eyebrow"><span className="status-dot"/> REFERENCE VOCABULARY</div>
    <h1>{level === "CET4" ? "四级" : "六级"}<em>参考词库。</em></h1>
    <p className="lexicon-intro">独立的词汇检索工具。按英文或中文释义查词；参考词条不等于已审校的中译英课程。</p>
    <div className="lexicon-search">
      <input type="search" aria-label="搜索单词或中文释义"
        placeholder="输入英文单词或中文释义…"
        autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)}/>
      <span>{data ? `${data.uniqueWords.toLocaleString()} 词` : "加载中…"}</span>
    </div>
    {error && <p className="storage-warning" role="alert">{error}</p>}
    {!error && query.trim() && data && <p className="lexicon-hint">最多显示 30 项匹配结果，点击喇叭可以试听系统英语发音。</p>}
    <div className="lexicon-results" aria-live="polite">
      {entries.map((entry) => <article className="lexicon-result" key={entry.word}>
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
    <p className="lexicon-attribution">来源：<a href="https://github.com/KyleBing/english-vocabulary" target="_blank" rel="noopener noreferrer">KyleBing/english-vocabulary</a>，BSD-3-Clause。
      <a href="/lexicon/LICENSE.txt" target="_blank" rel="noopener noreferrer"> 查看许可</a>。
      词汇数据仅供学习参考，非官方四六级词纲。</p>
  </section>;
}
