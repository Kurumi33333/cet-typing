import { useEffect, useState } from "react";
import type { CetLevel, Exercise } from "./features/course/types";
import { getLessons } from "./data/curriculum";
import { loadMistakes, loadProgress, type StudyProgress } from "./lib/storage/db";
import { PracticeScreen } from "./features/practice/PracticeScreen";

type Session = { level: CetLevel; reviewExercises?: Exercise[] };
const LEVELS: CetLevel[] = ["CET4", "CET6"];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [positions, setPositions] = useState<Partial<Record<CetLevel, StudyProgress>>>({});
  const [mistakeCounts, setMistakeCounts] = useState<Record<CetLevel, number>>({ CET4: 0, CET6: 0 });
  const [busy, setBusy] = useState<CetLevel | null>(null);
  const [notice, setNotice] = useState("");

  // Refresh the home summary after practice is closed. No online account.
  useEffect(() => {
    if (session) return;
    let active = true;
    Promise.all([
      loadProgress("CET4"), loadProgress("CET6"),
      loadMistakes("CET4"), loadMistakes("CET6"),
    ]).then(([p4, p6, m4, m6]) => {
      if (!active) return;
      setPositions({ CET4: p4, CET6: p6 });
      setMistakeCounts({ CET4: m4.length, CET6: m6.length });
    }).catch(() => {
      if (active) setNotice("当前浏览器的本地学习记录不可用；仍然可以练习。");
    });
    return () => { active = false; };
  }, [session]);

  function resumeLabel(level: CetLevel): string {
    const position = positions[level];
    if (!position) return "从基础单词开始";
    const lesson = getLessons(level).find((entry) => entry.id === position.lessonId);
    return lesson ? `继续 · ${lesson.title}` : "从基础单词开始";
  }

  async function startReview(level: CetLevel) {
    setNotice("");
    setBusy(level);
    try {
      const records = await loadMistakes(level);
      const byId = new Map(getLessons(level).flatMap((lesson) =>
        lesson.exercises.map((exercise) => [exercise.id, exercise] as const)));
      const exercises = records.flatMap((entry) => {
        const exercise = byId.get(entry.id);
        return exercise ? [exercise] : [];
      });
      if (!exercises.length) {
        setNotice("这个等级暂时没有待复习的错题。先练几道题吧。");
        return;
      }
      setSession({ level, reviewExercises: exercises });
    } catch {
      setNotice("无法读取错题记录。请确认浏览器允许本地数据存储。");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page-shell">
      <header className="site-header">
        <button className="brand brand-button" type="button" onClick={() => setSession(null)} aria-label="返回首页">
          <span className="brand-mark" aria-hidden="true">⌘</span>
          CET Typing
        </button>
        <span className="header-note">中译英 · 主动输出</span>
      </header>

      {session === null ? (
        <main className="main-content">
          <div className="eyebrow"><span className="status-dot" /> 四六级英语训练</div>
          <h1>把英语<br /><em>打出来。</em></h1>
          <p className="intro">每天练几分钟。从一个单词开始，逐渐组成短语和句子；拼错的内容会留在本机，方便下次复习。</p>
          <div className="choice-group" aria-label="选择练习等级">
            <button className="primary-button" type="button" onClick={() => setSession({ level: "CET4" })}>
              四级 · {resumeLabel("CET4")} <span aria-hidden="true">↗</span>
            </button>
            <button className="secondary-button" type="button" onClick={() => setSession({ level: "CET6" })}>
              六级 · {resumeLabel("CET6")} <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="review-entry" aria-label="本机错题复习">
            <div className="review-entry-heading">
              <strong>错题回顾</strong>
              <span>写错的题留在这里，复习答对后移出待复习列表。</span>
            </div>
            <div className="review-entry-actions">
              {LEVELS.map((level) => (
                <button type="button" key={level} className="review-entry-button"
                  disabled={busy !== null || mistakeCounts[level] === 0}
                  onClick={() => void startReview(level)}>
                  {level === "CET4" ? "四级" : "六级"}错题
                  <span className="review-count">{mistakeCounts[level]}</span>
                </button>
              ))}
            </div>
          </div>
          {notice && <p className="storage-warning" role="status">{notice}</p>}
          <p className="demo-note">目前含 70 个原创渐进练习步骤，非官方四六级真题。进度与错题只保存在此浏览器。</p>
        </main>
      ) : (
        <main className="practice-main">
          <PracticeScreen key={session.level + (session.reviewExercises ? "-review" : "-course")}
            level={session.level} reviewExercises={session.reviewExercises}
            onBack={() => setSession(null)} />
        </main>
      )}

      <footer className="site-footer">
        <span>Local-first · IndexedDB · 无账号</span>
        <span>CET-4 / CET-6</span>
      </footer>
    </div>
  );
}
