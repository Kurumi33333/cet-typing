import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { getLessons } from "../../data/curriculum";
import { isCET4PilotFreeTranslationRisk } from "../../data/cet4-audit";
import { loadProgress, saveProgress, recordMistake } from "../../lib/storage/db";
import { gradeReviewAttempt } from "../review/queue";
import { resolveSavedPosition } from "../course/position";
import { playFeedback, readSoundPreference, writeSoundPreference } from "./sounds";
import {
  readPronunciationPreference, writePronunciationPreference,
  shouldPronounceWord, speakEnglish, stopPronunciation,
} from "./speech";
import { editSlot, moveSlot } from "./slotEditing";
import { englishPhysicalLetter, insertAtCaret, deleteAtCaret, isEnglishCompositionResult } from "./keyboardInput";
import type { CetLevel, Exercise, Lesson } from "../course/types";
import { allSlotsCorrect, incorrectSlots, matchesSlot, sentenceToSlots } from "./slots";

type Phase = "typing" | "review" | "passed";
const DEFAULT_HINT = "空格 / 方向键切换 · Enter 检查";

interface PracticeScreenProps {
  level: CetLevel;
  onBack: () => void;
  reviewExercises?: Exercise[];
}

/**
 * The single invisible input is NEVER inside a keyed Motion subtree.
 * This preserves the focused native element across questions (mobile IME).
 * Slots can always be selected, regardless of the correctness of other words.
 */
export function PracticeScreen({ level, onBack, reviewExercises }: PracticeScreenProps) {
  const reviewMode = reviewExercises !== undefined;
  const reviewLesson: Lesson = {
    id: `review-${level}`, level, title: "错题复习", description: "回顾容易拼错的单词与句子",
    exercises: reviewExercises ?? [],
  };
  const courseList = reviewMode ? [reviewLesson] : getLessons(level);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const [showLessonPicker, setShowLessonPicker] = useState(false);
  const lesson = courseList[lessonIndex];
  const exercises = lesson.exercises;
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [revealed, setRevealed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState(DEFAULT_HINT);
  const [focused, setFocused] = useState(false);
  const [isTouchDevice] = useState(() =>
    typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches);
  const [useSiteKeyboard, setUseSiteKeyboard] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia?.("(pointer: coarse)").matches) return false;
    try { return window.localStorage.getItem("cet-typing:keyboard-mode") !== "system"; }
    catch { return true; }
  });
  const [shiftEnabled, setShiftEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(readSoundPreference);
  const [pronunciationEnabled, setPronunciationEnabled] = useState(readPronunciationPreference);
  const [sentencePlayback, setSentencePlayback] = useState(false);
  const [errorPulse, setErrorPulse] = useState(0);
  const [reviewGraded, setReviewGraded] = useState(false);
  const reducedMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const compositionStart = useRef("");
  const physicalComposed = useRef(false);
  // Keep consecutive keydown events in sync even before React re-renders.
  const valuesRef = useRef<string[]>([]);
  const activeRef = useRef(0);
  const completedExerciseRef = useRef<string | null>(null);

  const exercise = exercises[index];
  const targetOnly = isCET4PilotFreeTranslationRisk(level, exercise.id) && !reviewMode;
  const slots = sentenceToSlots(exercise.english);
  const displayValues = slots.map((_, at) => values[at] ?? "");
  const wrong = phase === "review" ? incorrectSlots(displayValues, slots) : [];
  const entered = displayValues[activeIndex] ?? "";

  const ping = (type: Parameters<typeof playFeedback>[0]) => {
    if (soundEnabled) playFeedback(type);
  };

  useEffect(() => () => stopPronunciation(), []);

  useEffect(() => {
    let alive = true;
    if (reviewMode) {
      setReady(true);
      return () => { alive = false; };
    }
    loadProgress(level).then((saved) => {
      if (!alive) return;
      const restored = resolveSavedPosition(getLessons(level), saved);
      setLessonIndex(restored.lessonIndex);
      setIndex(restored.exerciseIndex);
      setReady(true);
    }).catch(() => {
      if (!alive) return;
      setStorageNotice("此浏览器无法读取本地进度，本次练习可能不会保存。");
      setReady(true);
    });
    return () => { alive = false; };
  }, [level, reviewMode]);

  useEffect(() => {
    if (!ready || finished || reviewMode) return;
    void saveProgress(level, lesson.id, exercise.id).catch(() => {
      setStorageNotice("当前浏览器无法保存进度，请检查无痕浏览/存储权限。");
    });
  }, [ready, level, lesson.id, exercise.id, finished, reviewMode]);

  useEffect(() => {
    // The input is not mounted until async local progress restoration finishes.
    // Including ready restores initial focus even when the saved index is zero.
    if (ready && !finished) inputRef.current?.focus({ preventScroll: true });
  }, [ready, index, lessonIndex, finished]);

  useEffect(() => {
    if (phase === "review") inputRef.current?.select();
  }, [phase, errorPulse]);

  function focusInput() {
    inputRef.current?.focus({ preventScroll: true });
  }

  function chooseSlot(to: number, type: "navigate" | "select" = "select") {
    if (phase === "passed") return;
    const selected = Math.max(0, Math.min(slots.length - 1, to));
    activeRef.current = selected;
    setActiveIndex(selected);
    ping(type);
    // Selection makes it easy to overwrite a misspelling, not a requirement.
    focusInput();
    window.requestAnimationFrame(() => inputRef.current?.select());
  }

  function clearQuestion(preserveSpeech = false) {
    if (!preserveSpeech) stopPronunciation();
    setSentencePlayback(false);
    valuesRef.current = [];
    activeRef.current = 0;
    setValues([]);
    setActiveIndex(0);
    setReviewGraded(false);
    completedExerciseRef.current = null;
    setPhase("typing");
    setRevealed(false);
    setFeedback(DEFAULT_HINT);
  }

  function advanceQuestion(instant = false) {
    if (index + 1 >= exercises.length) {
      if (!reviewMode && lessonIndex + 1 < courseList.length) {
        const following = courseList[lessonIndex + 1];
        void saveProgress(level, following.id, following.exercises[0].id).catch(() => {});
      }
      setFinished(true);
      return;
    }
    if (!instant) ping("advance");
    setIndex((previous) => previous + 1);
    clearQuestion(instant);
    // No blur, no new input, no keyboard dismissal.
  }

  function completeCorrectQuestion() {
    // Physical and touch key events can be batched. Do not count/advance twice.
    if (completedExerciseRef.current === exercise.id) return;
    completedExerciseRef.current = exercise.id;
    setAttempts((previous) => previous + 1);
    if (reviewMode && !reviewGraded) {
      setReviewGraded(true);
      // An answer revealed before recall is not independent recall.
      void gradeReviewAttempt(exercise.id, level, !revealed, valuesRef.current.join(" "))
        .catch(() => setStorageNotice("复习日程保存失败，请检查本地存储权限。"));
    }
    ping("success");
    setCompleted((previous) => previous + 1);
    // No success screen, no animation delay, and preserve the last word's TTS.
    advanceQuestion(true);
  }

  function checkAnswer() {
    if (phase === "passed" || completedExerciseRef.current === exercise.id) return;
    const currentValues = slots.map((_, at) => valuesRef.current[at] ?? "");
    const errors = incorrectSlots(currentValues, slots);
    if (errors.length === 0) {
      completeCorrectQuestion();
      return;
    }
    setAttempts((previous) => previous + 1);
    if (reviewMode && !reviewGraded) {
      setReviewGraded(true);
      void gradeReviewAttempt(exercise.id, level, false, currentValues.join(" "))
        .catch(() => setStorageNotice("复习日程保存失败，请检查本地存储权限。"));
    }
    const sourceLessonId = reviewMode
      ? getLessons(level).find((entry) => entry.exercises.some((item) => item.id === exercise.id))?.id ?? lesson.id
      : lesson.id;
    if (!reviewMode && !isCET4PilotFreeTranslationRisk(level, exercise.id)) {
      void recordMistake(level, sourceLessonId, exercise.id, currentValues.join(" ")).catch(() => {
        setStorageNotice("错题记录失败，请检查本地存储权限。");
      });
    }
    ping(targetOnly ? "navigate" : "error");
    setPhase("review");
    activeRef.current = errors[0];
    setActiveIndex(errors[0]);
    setErrorPulse((n) => n + 1);
    setFeedback(reviewMode
      ? `有 ${errors.length} 个词槽与目标不一致。本次按目标拼写回忆评分，修正后继续。`
      : isCET4PilotFreeTranslationRisk(level, exercise.id)
        ? "与本题目标表达不同。其他合理译法不会自动计入错题。"
        : `有 ${errors.length} 个词槽与目标拼写不同，点击对应词槽修改。`);
  }

  function applyText(text: string, previousValue?: string) {
    if (phase === "passed") return;
    const at = activeRef.current;
    const previous = slots.map((_, index) => valuesRef.current[index] ?? "");
    const before = previousValue ?? previous[at];
    const result = editSlot(previous, at, text, slots.length);
    valuesRef.current = result.values;
    activeRef.current = result.active;
    setValues(result.values);
    setActiveIndex(result.active);

    const justCorrect = shouldPronounceWord(before, result.values[at] ?? "", slots[at]);
    if (justCorrect && pronunciationEnabled) {
      const spoken = speakEnglish(slots[at].word, "word");
      if (!spoken) ping("typing");
    } else if (result.moved) {
      ping("navigate");
    } else if (text.length > before.length) {
      ping("typing");
    } else if (text.length < before.length) {
      ping("delete");
    }
    if (allSlotsCorrect(result.values, slots)) completeCorrectQuestion();
  }

  function restoreCaret(position: number) {
    window.requestAnimationFrame(() => {
      const element = inputRef.current;
      if (!element || element.readOnly) return;
      try { element.setSelectionRange(position, position); } catch { /* optional */ }
    });
  }

  function typeLetter(letter: string) {
    if (phase === "passed") return;
    const at = activeRef.current;
    const current = valuesRef.current[at] ?? "";
    const input = inputRef.current;
    // Consecutive keydown events may arrive before controlled DOM has re-rendered.
    const synced = input?.value === current;
    const next = insertAtCaret(current, letter,
      synced ? input?.selectionStart ?? null : null,
      synced ? input?.selectionEnd ?? null : null);
    applyText(next.text);
    restoreCaret(next.caret);
    focusInput();
  }

  function backspaceLetter() {
    if (phase === "passed") return;
    const at = activeRef.current;
    const current = valuesRef.current[at] ?? "";
    if (!current) {
      chooseSlot(moveSlot(at, -1, slots.length), "navigate");
      return;
    }
    const input = inputRef.current;
    const synced = input?.value === current;
    const next = deleteAtCaret(current,
      synced ? input?.selectionStart ?? null : null,
      synced ? input?.selectionEnd ?? null : null);
    applyText(next.text);
    restoreCaret(next.caret);
    focusInput();
  }

  function nextSlotOrCheck() {
    if (activeRef.current + 1 < slots.length) chooseSlot(activeRef.current + 1, "navigate");
    else if (valuesRef.current.some((word) => word.trim())) checkAnswer();
  }

  function handleSiteKey(key: string) {
    if (key === "Backspace") backspaceLetter();
    else if (key === "Space") nextSlotOrCheck();
    else if (key === "Enter") phase === "passed" ? advanceQuestion() : checkAnswer();
    else if (key === "Shift") { setShiftEnabled((prev) => !prev); return; }
    else {
      typeLetter(shiftEnabled ? key.toUpperCase() : key);
      if (shiftEnabled) setShiftEnabled(false);
    }
    focusInput();
  }

  function setKeyboardMode(site: boolean) {
    setUseSiteKeyboard(site);
    try { window.localStorage.setItem("cet-typing:keyboard-mode", site ? "site" : "system"); }
    catch { /* optional preference */ }
    focusInput();
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (phase === "passed" || composing.current) return;
    if (!isEnglishCompositionResult(event.target.value)) {
      setFeedback("此处只接收英文字母。手机可使用下方网页英文键盘直接输入。");
      event.target.value = valuesRef.current[activeRef.current] ?? "";
      return;
    }
    applyText(event.target.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const code = event.nativeEvent.code;
    // A real hardware keyboard exposes KeyA..KeyZ even while a Chinese pinyin
    // IME reports event.key="Process", isComposing=true, or keyCode=229.
    // On a mobile SYSTEM keyboard we must not assume code means a physical key.
    const interceptPhysical = !isTouchDevice || useSiteKeyboard;
    const letter = interceptPhysical ? englishPhysicalLetter(event.nativeEvent) : null;
    if (letter) {
      event.preventDefault(); // no pinyin pre-edit / browser text insertion
      if (composing.current || event.nativeEvent.isComposing) physicalComposed.current = true;
      typeLetter(letter);
      return;
    }
    // Once a physical English key was captured, also route control keys even
    // if the desktop IME still marks the event as composing/Process/229.
    const composingNow = composing.current || event.nativeEvent.isComposing || event.keyCode === 229;
    if (composingNow && interceptPhysical && physicalComposed.current) {
      if (code === "Backspace") { event.preventDefault(); backspaceLetter(); return; }
      if (code === "Space") { event.preventDefault(); nextSlotOrCheck(); return; }
      if (code === "Enter") {
        event.preventDefault();
        if (phase === "passed") advanceQuestion();
        else checkAnswer();
        return;
      }
    }
    if (composingNow) return;
    if (phase === "passed") {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        advanceQuestion();
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      checkAnswer();
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      chooseSlot(moveSlot(activeRef.current, 1, slots.length), "navigate");
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      chooseSlot(moveSlot(activeRef.current, -1, slots.length), "navigate");
    } else if (event.key === " ") {
      event.preventDefault();
      nextSlotOrCheck();
    } else if (event.key === "Backspace" && interceptPhysical) {
      event.preventDefault();
      backspaceLetter();
    }
    // Non-physical system keyboard input and paste still use onChange.
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (composing.current) return;
    if (phase === "passed") advanceQuestion();
    else checkAnswer();
    focusInput();
  }

  function restart() {
    setIndex(0);
    clearQuestion();
    setAttempts(0);
    setCompleted(0);
    setFinished(false);
  }

  function switchLesson(to: number) {
    if (to === lessonIndex) { setShowLessonPicker(false); return; }
    restart();
    setLessonIndex(to);
    setShowLessonPicker(false);
  }

  if (!ready) {
    return <section className="finished-screen" role="status" aria-live="polite">正在恢复本地学习进度…</section>;
  }

  if (finished) {
    return (
      <section className="finished-screen" aria-labelledby="finish-title">
        <div className="eyebrow"><span className="status-dot" /> 本轮练习完成</div>
        <h2 id="finish-title">很棒，<br /><em>继续保持。</em></h2>
        <p>你已完成「{lesson.title}」的 <strong>{completed}</strong> 个练习步骤，共提交 <strong>{attempts}</strong> 次。</p>
        <div className="choice-group">
          {!reviewMode && lessonIndex + 1 < courseList.length && (
            <button className="primary-button" type="button" onClick={() => switchLesson(lessonIndex + 1)}>进入下一单元 →</button>
          )}
          <button className="secondary-button" type="button" onClick={restart}>再练一次 ↗</button>
          <button className="text-button" type="button" onClick={onBack}>返回首页</button>
        </div>
      </section>
    );
  }

  return (
    <section className="practice-area" aria-label={level === "CET4" ? "四级训练" : "六级训练"}>
      <div className="practice-topline">
        <button className="text-button" type="button" onClick={onBack}>← 返回</button>
        <span className="level-label">{level === "CET4" ? "四级" : "六级"} · {reviewMode ? "复习" : "练习"}</span>
        <div className="practice-top-actions">
          <span className="question-counter">{String(index + 1).padStart(2, "0")} / {String(exercises.length).padStart(2, "0")}</span>
          <details className="practice-settings">
            <summary aria-label="打开声音设置">声音 <span aria-hidden="true">⌄</span></summary>
            <div className="practice-settings-options">
              <button type="button" className="sound-toggle" aria-pressed={soundEnabled}
                aria-label={soundEnabled ? "关闭提示音效" : "开启提示音效"}
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  writeSoundPreference(next);
                  if (next) playFeedback("select");
                  focusInput();
                }}>
                <span aria-hidden="true">{soundEnabled ? "♫" : "♪"}</span>
                <span>{soundEnabled ? "打字音 · 开" : "打字音 · 关"}</span>
              </button>
              <button type="button" className="sound-toggle speech-toggle"
                aria-pressed={pronunciationEnabled}
                aria-label={pronunciationEnabled ? "关闭正确单词自动朗读" : "开启正确单词自动朗读"}
                onClick={() => {
                  const next = !pronunciationEnabled;
                  setPronunciationEnabled(next);
                  writePronunciationPreference(next);
                  if (!next) stopPronunciation();
                  focusInput();
                }}>
                <span aria-hidden="true">{pronunciationEnabled ? "🔊" : "🔇"}</span>
                <span>{pronunciationEnabled ? "单词朗读 · 开" : "单词朗读 · 关"}</span>
              </button>
            </div>
          </details>
        </div>
      </div>

      <div className="progress-track" role="progressbar" aria-label="练习进度"
        aria-valuenow={index} aria-valuemin={0} aria-valuemax={exercises.length}>
        <motion.div className="progress-fill" initial={false}
          animate={{ width: `${(index / exercises.length) * 100}%` }}
          transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 170, damping: 27 }} />
      </div>

      {!reviewMode && <div className="lesson-navigation">
        <button className="lesson-toggle" type="button" aria-expanded={showLessonPicker}
          aria-controls="lesson-options" onClick={() => setShowLessonPicker((value) => !value)}>
          <span className="lesson-toggle-index">{String(lessonIndex + 1).padStart(2, "0")} / {String(courseList.length).padStart(2, "0")}</span>
          <span className="lesson-toggle-title">{lesson.title}</span>
          <span aria-hidden="true">{showLessonPicker ? "⌃" : "⌄"}</span>
        </button>
        <AnimatePresence initial={false}>
          {showLessonPicker && <motion.div id="lesson-options" className="lesson-options" aria-label="选择训练单元"
            initial={reducedMotion ? false : { opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}>
            {courseList.map((entry, at) => (
              <button key={entry.id} type="button" className={`lesson-option ${at === lessonIndex ? "selected" : ""}`}
                onClick={() => switchLesson(at)}>
                <span className="lesson-option-number">{String(at + 1).padStart(2, "0")}</span>
                <span className="lesson-option-copy"><strong>{entry.title}</strong><small>{entry.description}</small></span>
                <span aria-hidden="true">{at === lessonIndex ? "✓" : "↗"}</span>
              </button>
            ))}
          </motion.div>}
        </AnimatePresence>
      </div>}

      {storageNotice && <p className="storage-warning" role="alert">{storageNotice}</p>}
      <div className="question-body centered-practice">
        {/* ONLY the prompt is keyed. The input + slots below keep their DOM identity. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div className="question-prompt" key={exercise.id}
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: reducedMotion ? 0 : 0.25, ease: "easeOut" }}>
            <div className="eyebrow">
              {targetOnly ? "目标表达 · " : ""}{exercise.kind === "word" ? "单词" : exercise.kind === "phrase" ? "语块" : "句子"}
            </div>
            <h2 className="chinese-sentence">{exercise.chinese}</h2>
          </motion.div>
        </AnimatePresence>

        <form className="slot-form" onSubmit={handleSubmit}>
          <div className={`slot-stage ${focused ? "stage-focused" : ""}`} onClick={focusInput}
            aria-label="逐词下划线填空区域">
            <input ref={inputRef} id="english-answer" className="slot-capture" type="text"
              aria-label="输入当前选中的英文词，左右方向键或空格切换词，Enter 检查或进入下一题"
              aria-describedby="practice-feedback"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              lang="en" inputMode={useSiteKeyboard ? "none" : "text"} readOnly={useSiteKeyboard}
              enterKeyHint="enter" value={entered}
              onChange={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onCompositionStart={() => {
                compositionStart.current = valuesRef.current[activeRef.current] ?? "";
                physicalComposed.current = false;
                composing.current = true;
              }}
              onCompositionEnd={(event) => {
                composing.current = false;
                const committed = event.currentTarget.value;
                if (!physicalComposed.current && isEnglishCompositionResult(committed)) {
                  applyText(committed, compositionStart.current);
                } else if (!physicalComposed.current) {
                  setFeedback("中文候选词不会写入答案。请使用网页英文键盘直接打字。");
                  event.currentTarget.value = valuesRef.current[activeRef.current] ?? "";
                } else {
                  event.currentTarget.value = valuesRef.current[activeRef.current] ?? "";
                }
                physicalComposed.current = false;
              }}
              onKeyDown={handleKeyDown}
            />
            <div className="slot-list">
              {slots.map((slot, at) => {
                const visible = (displayValues[at] ?? "").replace(/[.,!?;:]+$/gu, "");
                const incorrect = wrong.includes(at);
                const active = focused && phase !== "passed" && at === activeIndex;
                const appearance = phase === "passed" ? "slot-correct" :
                  incorrect ? (targetOnly ? "slot-target-diff" : "slot-incorrect") : active ? "slot-active" : phase === "review" ? "slot-verified" : "slot-idle";
                return (
                  <div role="button" tabIndex={-1}
                    aria-label={`第${at + 1}个空，${displayValues[at] ? "已填 " + displayValues[at] : "未填"}，点击可选中`}
                    aria-current={active ? "true" : undefined}
                    className={`slot-unit ${incorrect ? "slot-needs-fix" : ""}`} key={at}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => {
                      event.stopPropagation();
                      chooseSlot(at);
                    }}>
                    <motion.span key={`${exercise.id}-${at}-${phase === "review" && incorrect ? errorPulse : 0}`}
                      className={`slot-word ${appearance}`}
                      style={{ minWidth: `${slot.widthCh}ch` }}
                      initial={false}
                      animate={phase === "review" && incorrect && !targetOnly && !reducedMotion
                        ? { x: [0, -9, 7, -5, 3, 0], scale: [1, 1.045, 1] } : { x: 0, scale: 1 }}
                      transition={{ duration: phase === "review" && incorrect && !targetOnly ? 0.45 : 0, ease: "easeOut" }}>
                      {visible || "\u00a0"}
                    </motion.span>
                    {slot.punctuation && <span className="slot-punctuation">{slot.punctuation}</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <motion.p key={`${exercise.id}-${phase}-${errorPulse}`} id="practice-feedback"
            className={`slot-feedback ${phase === "review" ? (targetOnly ? "feedback-target" : "feedback-error") : phase === "passed" ? "feedback-success" : ""}`}
            initial={reducedMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }} role="status" aria-live="polite">
            {phase === "review" ? (targetOnly ? "◇ " : "● ") : phase === "passed" ? "✓ " : "⌨ "}{feedback}
          </motion.p>
          {revealed && <div className="revealed-answer"><span>本题目标表达</span><strong>{exercise.english}</strong></div>}
          <div className="slot-actions">
            {phase === "passed" && (
              <button className="text-button replay-button" type="button"
                onClick={() => {
                  if (speakEnglish(exercise.english, "sentence")) setSentencePlayback(true);
                  focusInput();
                }}
                aria-label="朗读本句的完整英文发音">🔊 朗读整句</button>
            )}
            {phase !== "passed" && matchesSlot(displayValues[activeIndex] ?? "", slots[activeIndex]) && (
              <button className="text-button replay-button" type="button"
                onClick={() => {
                  const word = displayValues[activeIndex] ?? "";
                  if (matchesSlot(word, slots[activeIndex])) speakEnglish(slots[activeIndex].word, "word");
                  focusInput();
                }}
                aria-label="重播当前选中单词">🔉 重播单词</button>
            )}
            <button className="submit-minimal" type="submit">
              {phase === "passed" ? "下一句 →" : "检查答案 →"}
            </button>
            {phase !== "passed" && <button className="text-button" type="button" onClick={() => {
              setRevealed((value) => !value);
              focusInput();
            }}>{revealed ? "隐藏答案" : "显示答案"}</button>}
          </div>
        </form>
        {isTouchDevice && (
          <div className="keyboard-panel">
            <div className="keyboard-mode-bar">
              <span>{useSiteKeyboard ? "英文直输 · 无需切换拼音" : "系统输入法 · 可能需要切换英文模式"}</span>
              <button type="button" onClick={() => setKeyboardMode(!useSiteKeyboard)}>
                {useSiteKeyboard ? "使用系统键盘" : "使用网页英文键盘"}
              </button>
            </div>
            {useSiteKeyboard && (
              <div className="site-english-keyboard" role="group" aria-label="英文直接输入键盘">
                {["qwertyuiop", "asdfghjkl"].map((row) => (
                  <div className="site-key-row" key={row}>
                    {[...row].map((letter) => (
                      <button type="button" className="site-key" key={letter}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSiteKey(letter)}
                        aria-label={letter}>{shiftEnabled ? letter.toUpperCase() : letter}</button>
                    ))}
                  </div>
                ))}
                <div className="site-key-row">
                  <button type="button" className={`site-key site-key-special ${shiftEnabled ? "site-key-selected" : ""}`}
                    aria-label="大写切换" aria-pressed={shiftEnabled}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSiteKey("Shift")}>⇧</button>
                  {[..."zxcvbnm"].map((letter) => (
                    <button type="button" className="site-key" key={letter}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSiteKey(letter)}
                      aria-label={letter}>{shiftEnabled ? letter.toUpperCase() : letter}</button>
                  ))}
                  <button type="button" className="site-key site-key-special"
                    aria-label="删除" onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSiteKey("Backspace")}>⌫</button>
                </div>
                <div className="site-key-row site-key-controls">
                  <button type="button" className="site-key site-key-small"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSiteKey("'")}>{"'"}</button>
                  <button type="button" className="site-key site-key-small"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSiteKey("-")}>−</button>
                  <button type="button" className="site-key site-key-space"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSiteKey("Space")}>空格 / 下一词</button>
                  <button type="button" className="site-key site-key-enter"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSiteKey("Enter")}>Enter ↵</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
