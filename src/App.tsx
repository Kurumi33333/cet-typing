import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { motion, useReducedMotion } from "motion/react";
import Magnet from "./components/reactbits/Magnet";
import Aurora from "./components/reactbits/Aurora";
import Particles from "./components/reactbits/Particles";
import type { CetLevel, Exercise } from "./features/course/types";
import { getLessons } from "./data/curriculum";
import { loadProgress, type StudyProgress } from "./lib/storage/db";
import { loadReviewOverview, loadDueReviewIds, type ReviewOverview } from "./features/review/queue";
import { clearStudyRecords, createStudyBackup, importStudyBackup, parseStudyBackup } from "./lib/storage/backup";
import { PracticeScreen } from "./features/practice/PracticeScreen";
import { VocabularyScreen } from "./features/vocabulary/VocabularyScreen";

type Session = { level: CetLevel; reviewExercises?: Exercise[]; startFromBeginning?: boolean };
const LEVELS: CetLevel[] = ["CET4", "CET6"];

export default function App() {
  const reducedMotion = useReducedMotion();
  const [session, setSession] = useState<Session | null>(null);
  const [lexiconLevel, setLexiconLevel] = useState<CetLevel | null>(null);
  const [positions, setPositions] = useState<Partial<Record<CetLevel, StudyProgress>>>({});
  const [reviewOverview, setReviewOverview] = useState<Record<CetLevel, ReviewOverview>>({
    CET4: { due: 0, later: 0, total: 0, nextDue: null },
    CET6: { due: 0, later: 0, total: 0, nextDue: null },
  });
  const [busy, setBusy] = useState<CetLevel | null>(null);
  const [notice, setNotice] = useState("");
  const [maintenance, setMaintenance] = useState(false);
  const [dataRevision, setDataRevision] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const homeRef = useRef<HTMLElement>(null);

  // GSAP owns the home entrance; no competing Motion transforms on these elements.
  useLayoutEffect(() => {
    const root = homeRef.current;
    if (!root || session || lexiconLevel || reducedMotion) return;
    const scope = gsap.context(() => {
      const sequence = gsap.timeline({ defaults: { ease: "power3.out" } });
      sequence.fromTo(".home-kicker", { opacity: 0, y: 13 }, { opacity: 1, y: 0, duration: 0.48 })
        .fromTo(".hero-line", { opacity: 0, yPercent: 92, rotateX: -20 },
          { opacity: 1, yPercent: 0, rotateX: 0, duration: 0.85, ease: "back.out(1.45)", stagger: 0.115 }, "-=0.22")
        .fromTo(".intro", { opacity: 0, y: 20, filter: "blur(6px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55 }, "-=0.55")
        .fromTo(".home-magnet", { opacity: 0, y: 30, scale: 0.93 },
          { opacity: 1, y: 0, scale: 1, duration: 0.68, ease: "back.out(1.65)", stagger: 0.1 }, "-=0.40")
        .fromTo(".home-start-over, .review-entry, .home-tools, .demo-note",
          { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.46, stagger: 0.055 }, "-=0.47");
    }, root);
    return () => scope.revert();
  }, [session, lexiconLevel, reducedMotion]);

  // Refresh the home summary after practice is closed. No online account.
  useEffect(() => {
    if (session) return;
    let active = true;
    Promise.all([
      loadProgress("CET4"), loadProgress("CET6"),
      loadReviewOverview("CET4"), loadReviewOverview("CET6"),
    ]).then(([p4, p6, m4, m6]) => {
      if (!active) return;
      setPositions({ CET4: p4, CET6: p6 });
      setReviewOverview({ CET4: m4, CET6: m6 });
    }).catch(() => {
      if (active) setNotice("当前浏览器的本地学习记录不可用；仍然可以练习。");
    });
    return () => { active = false; };
  }, [session, dataRevision]);

  async function exportRecords() {
    setMaintenance(true);
    setNotice("");
    try {
      const backup = await createStudyBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "cet-typing-backup.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setNotice("已准备好本地学习记录备份文件，请妥善保存。");
    } catch {
      setNotice("导出失败：浏览器可能不允许访问本地学习记录。");
    } finally {
      setMaintenance(false);
    }
  }

  async function importRecords(file?: File) {
    if (!file) return;
    setMaintenance(true);
    setNotice("");
    try {
      if (file.size > 1024 * 1024) throw Error("备份文件超过 1MB，已拒绝导入");
      const parsed = parseStudyBackup(JSON.parse(await file.text()) as unknown);
      await importStudyBackup(parsed);
      setDataRevision((value) => value + 1);
      setNotice("记录导入完成：同一条记录保留更新时间较新的版本。");
    } catch (error) {
      setNotice(error instanceof Error ? `导入失败：${error.message}` : "导入失败：备份文件无效。");
    } finally {
      setMaintenance(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function resetRecords() {
    if (!window.confirm("确定清空此浏览器的所有课程进度和错题记录吗？建议先导出备份。")) return;
    setMaintenance(true);
    try {
      await clearStudyRecords();
      setDataRevision((value) => value + 1);
      setNotice("本机学习进度和错题记录已清空。");
    } catch {
      setNotice("清空失败，可能是本地存储暂不可用。");
    } finally {
      setMaintenance(false);
    }
  }

  function nextReviewLabel(level: CetLevel): string {
    const due = reviewOverview[level].nextDue;
    if (due === null) return "暂无预约";
    return new Intl.DateTimeFormat("zh-CN", {
      month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(due));
  }

  function resumeLabel(level: CetLevel): string {
    const position = positions[level];
    if (!position) return "从基础单词开始";
    const lesson = getLessons(level).find((entry) => entry.id === position.lessonId);
    if (!lesson) return "从基础单词开始";
    const at = lesson.exercises.findIndex((item) => item.id === position.exerciseId);
    const target = lesson.exercises[Math.max(0, at)];
    const type = target.kind === "word" ? "单词" : target.kind === "phrase" ? "语块" : "句子";
    return `继续 · ${lesson.title} · 第 ${Math.max(0, at) + 1} 题（${type}）`;
  }

  async function startReview(level: CetLevel) {
    setNotice("");
    setBusy(level);
    try {
      const ids = await loadDueReviewIds(level);
      const byId = new Map(getLessons(level).flatMap((lesson) =>
        lesson.exercises.map((exercise) => [exercise.id, exercise] as const)));
      const exercises = ids.flatMap((id) => {
        const exercise = byId.get(id);
        return exercise ? [exercise] : [];
      });
      if (!exercises.length) {
        setNotice("这个等级当前没有到期的错题。未来的复习会在到期时自动出现。");
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
        <button className="brand brand-button" type="button" onClick={() => { setSession(null); setLexiconLevel(null); }} aria-label="返回首页">
          CET Typing
        </button>
        <span className="header-note">中译英练习</span>
      </header>

      {lexiconLevel ? (
        <main className="practice-main">
          <VocabularyScreen level={lexiconLevel} onBack={() => setLexiconLevel(null)} />
        </main>
      ) : session === null ? (
        <main className="main-content" ref={homeRef}>
          <div className="hero-webgl" aria-hidden="true">
            <Aurora colorStops={["#c3f4d7", "#6db7bd", "#9fb0ec", "#c4f6bd"]}
              lightMode amplitude={1.6} blend={0.65} speed={1.15} height={0.85}
              scale={1.15} glow={1.1} brightness={1.05} layers={3}
              mouseInteraction opacity={0.83} dpr={1.25} />
          </div>
          <div className="hero-webgl-tint" aria-hidden="true" />
          <p className="home-kicker">每天进步一点</p>
          <h1 className="kinetic-hero">
            <span className="hero-line">把英语</span>
            <em className="hero-line">打出来。</em>
          </h1>
          <p className="intro">从一个单词开始，慢慢说出完整的句子。</p>
          <div className="choice-group" aria-label="选择练习等级">
            {LEVELS.map((level) => (
              <Magnet key={level} wrapperClassName="home-magnet" innerClassName="home-magnet-inner"
                padding={54} magnetStrength={9} maxOffset={7} tilt={0.65} scale={1.008}
                spring={{ stiffness: 240, damping: 21, mass: 0.68 }}
                disabled={Boolean(reducedMotion) || (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches)}>
              <motion.button className={level === "CET4" ? "primary-button home-course" : "secondary-button home-course"}
                type="button" onClick={() => setSession({ level })}
                whileHover={reducedMotion ? undefined : { y: -3 }}
                whileTap={reducedMotion ? undefined : { scale: 0.972 }}
                transition={{ type: "spring", stiffness: 370, damping: 24, mass: 0.55 }}>
                <span className="home-course-copy">
                  <strong>{level === "CET4" ? "大学英语四级" : "大学英语六级"}</strong>
                  <small>{resumeLabel(level)}</small>
                </span>
                <span aria-hidden="true">↗</span>
              </motion.button>
              </Magnet>
            ))}
          </div>
          <div className="home-start-over" aria-label="从基础单词重新开始">
            {LEVELS.map((level) => (
              <button key={level} type="button"
                onClick={() => setSession({ level, startFromBeginning: true })}>
                {level === "CET4" ? "四级" : "六级"} · 从第一课单词开始 ↺
              </button>
            ))}
          </div>
          <section className="review-entry" aria-label="FSRS 间隔复习">
            <div className="review-entry-heading">
              <strong>到期复习</strong>
              <span>{reviewOverview.CET4.due + reviewOverview.CET6.due === 0
                ? "今天没有待复习的题目" : "挑一个等级，继续巩固"}</span>
            </div>
            {reviewOverview.CET4.due + reviewOverview.CET6.due > 0 && (
              <div className="review-entry-actions">
                {LEVELS.filter((level) => reviewOverview[level].due > 0).map((level) => (
                  <button type="button" key={level} className="review-entry-button"
                    disabled={busy !== null} onClick={() => void startReview(level)}>
                    {level === "CET4" ? "四级" : "六级"}
                    <span className="review-count">{reviewOverview[level].due}</span>
                  </button>
                ))}
              </div>
            )}
            {(reviewOverview.CET4.nextDue !== null || reviewOverview.CET6.nextDue !== null) && (
              <p className="review-future" aria-label="预计下次复习时间">
                下次复习 · {LEVELS.filter((level) => reviewOverview[level].nextDue !== null)
                  .map((level) => `${level === "CET4" ? "四级" : "六级"} ${nextReviewLabel(level)}`).join(" · ")}
              </p>
            )}
          </section>
          <details className="home-tools">
            <summary>词汇检索与数据管理 <span aria-hidden="true">⌄</span></summary>
            <div className="home-tools-inner">
              <div className="lexicon-entry" aria-label="开源参考词库">
                <div className="lexicon-entry-copy">
                  <strong>参考词库</strong>
                  <span>查词、释义与发音</span>
                </div>
                <div className="lexicon-entry-actions">
                  <button type="button" onClick={() => setLexiconLevel("CET4")}>四级词库 ↗</button>
                  <button type="button" onClick={() => setLexiconLevel("CET6")}>六级词库 ↗</button>
                </div>
              </div>
              <div className="data-tools" aria-label="学习记录管理">
                <span>本地数据</span>
                <button type="button" disabled={maintenance} onClick={() => void exportRecords()}>导出备份</button>
                <button type="button" disabled={maintenance} onClick={() => fileInputRef.current?.click()}>导入备份</button>
                <button type="button" className="danger-text" disabled={maintenance} onClick={() => void resetRecords()}>清空</button>
                <input ref={fileInputRef} type="file" accept="application/json,.json" hidden
                  aria-label="选择 CET Typing 学习备份"
                  onChange={(event) => void importRecords(event.target.files?.[0])} />
              </div>
            </div>
          </details>
          {notice && <p className="storage-warning" role="status">{notice}</p>}
          <p className="demo-note">110 个原创试验练习 + 10 个开源语料精选 · 非官方真题 · 数据仅存本机</p>
        </main>
      ) : (
        <main className="practice-main practice-stage">
          <div className="practice-webgl" aria-hidden="true">
            <Particles particleCount={220} particleSpread={12} speed={0.12}
              particleColors={["#3b9b78", "#7caca4", "#829ed7", "#8ad1a9"]}
              moveParticlesOnHover particleHoverFactor={0.8} alphaParticles
              particleBaseSize={86} sizeRandomness={1.6} cameraDistance={20}
              disableRotation={false} pixelRatio={1.15} shape="circle"
              glow={0.7} twinkle={0.5} depthOfField={0.25}
              connections connectionDistance={130} hoverEffect="parallax"
              hoverRadius={210} clickBurst drift="up" driftSpeed={0.22}
              opacity={0.56} lightMode />
          </div>
          <PracticeScreen key={session.level + (session.reviewExercises ? "-review" : "-course")}
            level={session.level} reviewExercises={session.reviewExercises}
            startFromBeginning={session.startFromBeginning}
            onBack={() => setSession(null)} />
        </main>
      )}

      <footer className="site-footer">
        <span>CET Typing</span>
        <span>轻一点，记得更牢。</span>
      </footer>
    </div>
  );
}
