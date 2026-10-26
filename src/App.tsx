import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import Particles from "./components/reactbits/Particles";
import type { CetLevel, Exercise } from "./features/course/types";
import { getLessons } from "./data/curriculum";
import { loadProgress, type StudyProgress } from "./lib/storage/db";
import { loadReviewOverview, loadDueReviewIds, type ReviewOverview } from "./features/review/queue";
import { clearStudyRecords, createStudyBackup, importStudyBackup, parseStudyBackup } from "./lib/storage/backup";
import { PracticeScreen } from "./features/practice/PracticeScreen";
import { VocabularyScreen } from "./features/vocabulary/VocabularyScreen";
import { Landing } from "./landing/Landing";
import { documentTitle, levelFromSegment, ROUTES } from "./lib/routes";

/** Shared local-record state for the landing page and review. */
function useStudyRecords() {
  const [positions, setPositions] = useState<Partial<Record<CetLevel, StudyProgress>>>({});
  const [reviewOverview, setReviewOverview] = useState<Record<CetLevel, ReviewOverview>>({
    CET4: { due: 0, later: 0, total: 0, nextDue: null },
    CET6: { due: 0, later: 0, total: 0, nextDue: null },
  });
  const [notice, setNotice] = useState("");
  const [dataRevision, setDataRevision] = useState(0);

  useEffect(() => {
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
  }, [dataRevision]);

  return { positions, reviewOverview, notice, setNotice, dataRevision, setDataRevision };
}

/** Backup import/export/reset, shared by every surface that shows the tools. */
function useRecordTools() {
  const [maintenance, setMaintenance] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

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
      setRevision((value) => value + 1);
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
      setRevision((value) => value + 1);
      setNotice("本机学习进度和错题记录已清空。");
    } catch {
      setNotice("清空失败，可能是本地存储暂不可用。");
    } finally {
      setMaintenance(false);
    }
  }

  return { maintenance, fileInputRef, notice, revision, exportRecords, importRecords, resetRecords };
}

/** Keeps the document title and scroll position honest on every navigation. */
function useRouteChrome() {
  const location = useLocation();
  const landing = location.pathname === "/";

  useEffect(() => {
    document.title = documentTitle(location.pathname, location.search);
  }, [location.pathname, location.search]);

  // A layout effect, not a passive one: ScrollSmoother measures the document the
  // moment the landing page mounts, and `html, body, #root { height: 100% }`
  // would give it a one-viewport page. The class has to be on <html> first.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("landing-mode", landing);
    if (!landing) window.scrollTo(0, 0);
  }, [landing, location.pathname]);

  useEffect(() => () => {
    document.documentElement.classList.remove("landing-mode");
  }, []);
}

function LandingRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const records = useStudyRecords();
  const tools = useRecordTools();
  // A fresh visit id per entry: React rebuilds the deck instead of resuming a
  // tree that the app shell already touched.
  const visit = useRef(0);
  if (!visit.current) visit.current = Date.now();

  async function startReview(level: CetLevel) {
    const ids = await loadDueReviewIds(level);
    const byId = new Map(getLessons(level).flatMap((lesson) =>
      lesson.exercises.map((exercise) => [exercise.id, exercise] as const)));
    if (!ids.some((id) => byId.has(id))) {
      records.setNotice("这个等级当前没有到期的错题。未来的复习会在到期时自动出现。");
      return;
    }
    navigate(ROUTES.review(level));
  }

  return (
    <Fragment key={`landing-${visit.current}-${location.key}`}>
      <Landing
        onStartLevel={(level) => navigate(ROUTES.course(level))}
        onOpenLexicon={(level) => navigate(ROUTES.lexicon(level))}
        onExport={() => void tools.exportRecords()}
        onImport={() => tools.fileInputRef.current?.click()}
        onReset={() => void tools.resetRecords()}
        onStartReview={(level) => void startReview(level)}
        busy={null}
        maintenance={tools.maintenance}
        positions={records.positions}
        review={records.reviewOverview}
        notice={tools.notice || records.notice}
      />
      <input
        ref={tools.fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="选择 CET Typing 学习备份"
        onChange={(event) => void tools.importRecords(event.target.files?.[0])}
      />
    </Fragment>
  );
}

/** `/app/:level` and `/app/:level/review`. */
function PracticeRoute({ review }: { review: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { level: segment } = useParams();
  const level = levelFromSegment(segment);
  const [reviewExercises, setReviewExercises] = useState<Exercise[] | null>(review ? null : []);
  const [error, setError] = useState("");
  const fresh = new URLSearchParams(location.search).get("fresh") === "1";

  useEffect(() => {
    if (!level || !review) return;
    let active = true;
    loadDueReviewIds(level).then((ids) => {
      if (!active) return;
      const byId = new Map(getLessons(level).flatMap((lesson) =>
        lesson.exercises.map((exercise) => [exercise.id, exercise] as const)));
      setReviewExercises(ids.flatMap((id) => {
        const exercise = byId.get(id);
        return exercise ? [exercise] : [];
      }));
    }).catch(() => {
      if (active) setError("无法读取错题记录。请确认浏览器允许本地数据存储。");
    });
    return () => { active = false; };
  }, [level, review]);

  if (!level) return <Navigate to={ROUTES.landing} replace />;

  if (review && reviewExercises === null) {
    return (
      <div className="page-shell">
        <main className="practice-main">
          <section className="finished-screen" role="status" aria-live="polite">
            {error || "正在读取到期错题…"}
          </section>
        </main>
      </div>
    );
  }

  if (review && reviewExercises && reviewExercises.length === 0) {
    return (
      <div className="page-shell">
        <header className="site-header">
          <button className="brand brand-button" type="button"
            onClick={() => navigate(ROUTES.landing)} aria-label="返回介绍页">
            CET Typing
          </button>
          <span className="header-note">错题复习</span>
        </header>
        <main className="practice-main">
          <section className="finished-screen" aria-labelledby="empty-review">
            <h2 id="empty-review">今天<em>没有到期错题。</em></h2>
            <p>{level === "CET4" ? "四级" : "六级"}当前没有到期的复习卡。答错一道题，它就会进入这条队列。</p>
            <div className="choice-group">
              <button className="primary-button" type="button" onClick={() => navigate(ROUTES.course(level))}>
                去练{level === "CET4" ? "四级" : "六级"}
              </button>
              <button className="secondary-button" type="button" onClick={() => navigate(ROUTES.landing)}>
                返回介绍页
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="viewport-scene viewport-scene-practice" aria-hidden="true">
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
      <header className="site-header">
        <button className="brand brand-button" type="button"
          onClick={() => navigate(ROUTES.landing)} aria-label="返回介绍页">
          CET Typing
        </button>
        <span className="header-note">{review ? "错题复习" : "中译英练习"}</span>
      </header>
      <main className="practice-main practice-stage">
        <PracticeScreen
          key={`${level}-${review ? "review" : "course"}-${reviewExercises?.length ?? 0}`}
          level={level}
          reviewExercises={review ? reviewExercises ?? [] : undefined}
          startFromBeginning={fresh}
          onBack={() => navigate(ROUTES.landing)}
        />
      </main>
      <footer className="site-footer">
        <span>CET Typing</span>
        <span>轻一点，记得更牢。</span>
      </footer>
    </div>
  );
}

/** `/lexicon/:level`. */
function LexiconRoute() {
  const navigate = useNavigate();
  const { level: segment } = useParams();
  const level = levelFromSegment(segment);
  if (!level) return <Navigate to={ROUTES.landing} replace />;

  return (
    <div className="page-shell">
      <header className="site-header">
        <button className="brand brand-button" type="button"
          onClick={() => navigate(ROUTES.landing)} aria-label="返回介绍页">
          CET Typing
        </button>
        <span className="header-note">参考词库</span>
      </header>
      <main className="practice-main">
        <VocabularyScreen level={level} onBack={() => navigate(-1)} />
      </main>
      <footer className="site-footer">
        <span>CET Typing</span>
        <span>轻一点，记得更牢。</span>
      </footer>
    </div>
  );
}

function NotFoundRoute() {
  const navigate = useNavigate();
  return (
    <div className="page-shell">
      <header className="site-header">
        <button className="brand brand-button" type="button" onClick={() => navigate(ROUTES.landing)}>
          CET Typing
        </button>
      </header>
      <main className="main-content">
        <h1 className="kinetic-hero"><span className="hero-line">这一页</span><em className="hero-line">不存在。</em></h1>
        <p className="intro">地址可能写错了，或者这条练习已经更新。</p>
        <div className="choice-group">
          <button type="button" className="primary-button" onClick={() => navigate(ROUTES.landing)}>回介绍页</button>
          <button type="button" className="secondary-button" onClick={() => navigate(ROUTES.course("CET4"))}>直接练四级</button>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  useRouteChrome();
  return (
    <Routes>
      {/* Keyed on the visit count: returning from practice rebuilds the deck
          from a clean DOM, so ScrollSmoother measures a fresh document instead
          of reusing a wrapper it sized while the practice shell was mounted. */}
      <Route path={ROUTES.landing} element={<LandingRoute />} />
      {/* Old link shapes kept alive: a shared /landing or /app URL still lands. */}
      <Route path="/landing" element={<Navigate to={ROUTES.landing} replace />} />
      <Route path="/app" element={<Navigate to={ROUTES.landing} replace />} />
      <Route path="/app/:level" element={<PracticeRoute review={false} />} />
      <Route path="/app/:level/review" element={<PracticeRoute review />} />
      <Route path="/lexicon/:level" element={<LexiconRoute />} />
      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  );
}
