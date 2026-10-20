import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type FormEvent } from "react";
import { gsap } from "gsap";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import ClickSpark from "../../components/reactbits/ClickSpark";
import { getLessons } from "../../data/curriculum";
import { isCET4PilotFreeTranslationRisk } from "../../data/cet4-audit";
import { acceptedAnswerTexts, matchingAcceptedAnswer, selectDisplayAnswer } from "../../data/acceptedAnswers";
import { loadProgress, saveProgress, recordMistake } from "../../lib/storage/db";
import { gradeReviewAttempt } from "../review/queue";
import { resolveSavedPosition } from "../course/position";
import { playFeedback, readSoundPreference, writeSoundPreference } from "./sounds";
import {
  readPronunciationPreference, writePronunciationPreference,
  shouldPronounceWord, speakEnglish, stopPronunciation,
} from "./speech";
import { editSlot, moveSlot, nextSlotIndex } from "./slotEditing";
import { englishPhysicalLetter, insertAtCaret, deleteAtCaret, isEnglishCompositionResult, inputRouting } from "./keyboardInput";
import type { CetLevel, Exercise, Lesson } from "../course/types";
import { incorrectSlots, matchesSlot, sentenceToSlots } from "./slots";
import { sentenceEnergyTiming, SUCCESS_HOLD_MS } from "./positiveFeedback";
import { SiteKeyboard } from "./useSlotKeys";
import { FinishCelebration } from "./FinishCelebration";

type Phase = "typing" | "review" | "passed";
const DEFAULT_HINT = "空格 / 方向键切换 · Enter 检查";
const SUCCESS_CONFIRM_MS = SUCCESS_HOLD_MS; // Do not extend the confirmed typing rhythm.

interface PracticeScreenProps {
  level: CetLevel;
  onBack: () => void;
  reviewExercises?: Exercise[];
  startFromBeginning?: boolean;
}

/**
 * The single invisible input is NEVER inside a keyed Motion subtree.
 * This preserves the focused native element across questions (mobile IME).
 * Slots can always be selected, regardless of the correctness of other words.
 */
export function PracticeScreen({ level, onBack, reviewExercises, startFromBeginning = false }: PracticeScreenProps) {
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
  const [desktopNativeInput, setDesktopNativeInput] = useState(() => {
    try { return window.localStorage.getItem("cet-typing:desktop-input-mode") === "system"; }
    catch { return false; }
  });
  const [shiftEnabled, setShiftEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(readSoundPreference);
  const [pronunciationEnabled, setPronunciationEnabled] = useState(readPronunciationPreference);
  const [lastCorrectEnglish, setLastCorrectEnglish] = useState("");
  const [errorPulse, setErrorPulse] = useState(0);
  const [reviewGraded, setReviewGraded] = useState(false);
  const reducedMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const compositionStart = useRef("");
  const physicalComposed = useRef(false);
  // Keep consecutive keydown events in sync even before React re-renders.
  const valuesRef = useRef<string[]>([]);
  const activeRef = useRef(0);
  // Re-selecting a word in read-only mode should replace it on the next key.
  const replaceSelectedSlotRef = useRef(false);
  const completedExerciseRef = useRef<string | null>(null);
  const successTimerRef = useRef<number | null>(null);

  const exercise = exercises[index];
  const targetOnly = !reviewMode && (
    isCET4PilotFreeTranslationRisk(level, exercise.id) ||
    (level === "CET6" && exercise.kind !== "word")
  );
  const acceptedAnswers = acceptedAnswerTexts(exercise);
  const displayAnswer = selectDisplayAnswer(values, acceptedAnswers);
  const slots = sentenceToSlots(displayAnswer);
  const displayValues = slots.map((_, at) => values[at] ?? "");
  // Event handlers read valuesRef so rapid physical key events can adopt
  // an alternative with a different number of word slots immediately.
  const liveSlots = () => sentenceToSlots(selectDisplayAnswer(valuesRef.current, acceptedAnswers));

  // Multiword-only: the positive pulse literally travels between typed word
  // centers, including wrapped lines. Layout and word targets never move.
  useLayoutEffect(() => {
    if (phase !== "passed" || reducedMotion || !stageRef.current || slots.length < 2) return;
    const stage = stageRef.current;
    const words = Array.from(stage.querySelectorAll<HTMLElement>(".slot-unit"));
    const glints = Array.from(stage.querySelectorAll<HTMLElement>(".sentence-energy-node"));
    const orb = stage.querySelector<HTMLElement>(".sentence-flow-orb");
    const aura = stage.querySelector<HTMLElement>(".sentence-flow-aura");
    if (!orb || !aura || words.length !== glints.length) return;

    const origin = stage.getBoundingClientRect();
    const centers = words.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left - origin.left + rect.width / 2 - 6,
        y: rect.top - origin.top + rect.height / 2 - 6 };
    });
    const { flowMs, stepMs, trailMs } = sentenceEnergyTiming(words.length);
    const timeline = gsap.timeline();
    timeline.set(orb, { x: centers[0].x, y: centers[0].y, opacity: 0, scale: 0.55 });
    timeline.fromTo(aura, { opacity: 0, scale: 0.7 },
      { opacity: 0.62, scale: 1.2, duration: 0.14, ease: "power2.out" }, 0);
    centers.forEach((center, at) => {
      const when = at * stepMs / 1000;
      timeline.to(orb, { x: center.x, y: center.y, opacity: 0.92, scale: 1,
        duration: Math.min(0.09, stepMs / 1000 + 0.018), ease: "sine.inOut" }, when);
      timeline.fromTo(glints[at], { scaleX: 0.06, opacity: 0 },
        { scaleX: 1, opacity: 0.97, duration: 0.08, ease: "power2.out" }, when);
      timeline.to(glints[at], { opacity: 0, duration: 0.11, ease: "power2.in" }, when + 0.075);
    });
    timeline.to(orb, { opacity: 0, scale: 2.3, duration: trailMs / 1000 }, flowMs / 1000);
    timeline.to(aura, { opacity: 0, scale: 1.48, duration: 0.18 }, 0.15);
    return () => { timeline.kill(); };
  }, [phase, exercise.id, reducedMotion, slots.length]);
  const wrong = phase === "review" ? incorrectSlots(displayValues, slots) : [];
  const entered = displayValues[activeIndex] ?? "";
  const routing = inputRouting(isTouchDevice, useSiteKeyboard, desktopNativeInput);

  useEffect(() => { completedExerciseRef.current = null; }, [exercise.id]);

  const ping = (type: Parameters<typeof playFeedback>[0]) => {
    if (soundEnabled) playFeedback(type);
  };

  useEffect(() => () => stopPronunciation(), []);
  // A delayed success must never advance a different lesson after restart or unmount.
  useEffect(() => () => {
    if (successTimerRef.current !== null) window.clearTimeout(successTimerRef.current);
  }, []);

  useEffect(() => {
    let alive = true;
    if (reviewMode || startFromBeginning) {
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
  }, [level, reviewMode, startFromBeginning]);

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
    const selected = Math.max(0, Math.min(liveSlots().length - 1, to));
    activeRef.current = selected;
    replaceSelectedSlotRef.current = true;
    setActiveIndex(selected);
    ping(type);
    // Selection makes it easy to overwrite a misspelling, not a requirement.
    focusInput();
    window.requestAnimationFrame(() => inputRef.current?.select());
  }

  function clearQuestion(preserveSpeech = false) {
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    if (!preserveSpeech) stopPronunciation();
    valuesRef.current = [];
    activeRef.current = 0;
    replaceSelectedSlotRef.current = false;
    setValues([]);
    setActiveIndex(0);
    setReviewGraded(false);
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

  function completeCorrectQuestion(acceptedEnglish: string) {
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
    setLastCorrectEnglish(acceptedEnglish);
    setCompleted((previous) => previous + 1);
    // Render the last typed letter and green correct state before leaving.
    // Keep the focused input mounted and let its word TTS finish naturally.
    setPhase("passed");
    setFeedback(acceptedEnglish === exercise.english ? "正确" : "正确 · 另一种自然表达");
    const completedId = exercise.id;
    successTimerRef.current = window.setTimeout(() => {
      successTimerRef.current = null;
      if (completedExerciseRef.current === completedId) advanceQuestion(true);
    }, SUCCESS_CONFIRM_MS);
  }

  function checkAnswer() {
    if (phase === "passed" || completedExerciseRef.current === exercise.id) return;
    const currentValues = valuesRef.current;
    const accepted = matchingAcceptedAnswer(currentValues, acceptedAnswers);
    if (accepted) {
      completeCorrectQuestion(accepted);
      return;
    }
    const errors = incorrectSlots(currentValues, liveSlots());
    setAttempts((previous) => previous + 1);
    if (reviewMode && !reviewGraded) {
      setReviewGraded(true);
      void gradeReviewAttempt(exercise.id, level, false, currentValues.join(" "))
        .catch(() => setStorageNotice("复习日程保存失败，请检查本地存储权限。"));
    }
    const sourceLessonId = reviewMode
      ? getLessons(level).find((entry) => entry.exercises.some((item) => item.id === exercise.id))?.id ?? lesson.id
      : lesson.id;
    if (!reviewMode && !targetOnly) {
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
      : targetOnly
        ? "尚未匹配到已审校的表达；合理译法不会自动计入错题。可查看其他答案。"
        : `有 ${errors.length} 个词槽与目标拼写不同，点击对应词槽修改。`);
  }

  function applyText(text: string, previousValue?: string) {
    if (phase === "passed" || completedExerciseRef.current === exercise.id) return;
    const at = activeRef.current;
    const beforeSlots = liveSlots();
    const previous = beforeSlots.map((_, index) => valuesRef.current[index] ?? "");
    const before = previousValue ?? previous[at];
    const result = editSlot(previous, at, text, beforeSlots.length);
    valuesRef.current = result.values;
    activeRef.current = result.active;
    setValues(result.values);
    setActiveIndex(result.active);

    const updatedSlots = sentenceToSlots(selectDisplayAnswer(result.values, acceptedAnswers));
    const updatedWord = updatedSlots[at]?.word;
    const justCorrect = updatedSlots[at] &&
      shouldPronounceWord(before, result.values[at] ?? "", updatedSlots[at]);
    if (justCorrect && updatedWord && pronunciationEnabled) {
      const spoken = speakEnglish(updatedWord, "word");
      if (!spoken) ping("typing");
    } else if (result.moved) {
      ping("navigate");
    } else if (text.length > before.length) {
      ping("typing");
    } else if (text.length < before.length) {
      ping("delete");
    }
    const accepted = matchingAcceptedAnswer(result.values, acceptedAnswers);
    if (accepted) completeCorrectQuestion(accepted);
    else if (justCorrect && at < updatedSlots.length - 1) {
      // A word that just became right moves on by itself; no Space needed.
      activeRef.current = at + 1;
      replaceSelectedSlotRef.current = true;
      setActiveIndex(at + 1);
      window.requestAnimationFrame(() => inputRef.current?.select());
    }
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
    // In read-only direct mode a clicked/selected word is replaced on the
    // first keypress. Subsequent rapid keys append, never overwrite again.
    if (routing.readOnly && replaceSelectedSlotRef.current) {
      replaceSelectedSlotRef.current = false;
      applyText(letter);
      focusInput();
      return;
    }
    const synced = !input?.readOnly && input?.value === current;
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
      chooseSlot(moveSlot(at, -1, liveSlots().length), "navigate");
      return;
    }
    if (routing.readOnly && replaceSelectedSlotRef.current) {
      replaceSelectedSlotRef.current = false;
      applyText("");
      focusInput();
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
    const count = liveSlots().length;
    if (count < 2) return;
    // Space only navigates. Alternative translations may contain more/fewer words.
    chooseSlot(nextSlotIndex(activeRef.current, count), "navigate");
  }

  function handleSiteKey(key: string) {
    if (key === "Backspace") backspaceLetter();
    else if (key === "Space") nextSlotOrCheck();
    else if (key === "Enter" && phase !== "passed") checkAnswer();
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

  function toggleDesktopInputMode() {
    const next = !desktopNativeInput;
    setDesktopNativeInput(next);
    composing.current = false;
    physicalComposed.current = false;
    replaceSelectedSlotRef.current = false;
    try { window.localStorage.setItem("cet-typing:desktop-input-mode", next ? "system" : "direct"); }
    catch { /* optional browser preference */ }
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
    const interceptPhysical = routing.interceptPhysical;
    const letter = interceptPhysical ? englishPhysicalLetter(event.nativeEvent) : null;
    if (letter) {
      event.preventDefault(); // no pinyin pre-edit / browser text insertion
      if (composing.current || event.nativeEvent.isComposing) physicalComposed.current = true;
      typeLetter(letter);
      return;
    }
    // Physical Space is a navigation key, even if a Chinese IME reports
    // key="Process", isComposing=true and keyCode=229. Never let the IME
    // consume Space as "select a Chinese candidate".
    if (interceptPhysical && (code === "Space" || event.key === " ")) {
      event.preventDefault();
      // Do not let compositionend apply an IME candidate to the newly selected
      // slot after we have handled physical Space ourselves.
      if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) {
        physicalComposed.current = true;
      }
      nextSlotOrCheck();
      return;
    }
    // Once a physical English key was captured, also route control keys even
    // if the desktop IME still marks the event as composing/Process/229.
    const composingNow = composing.current || event.nativeEvent.isComposing || event.keyCode === 229;
    if (composingNow && interceptPhysical && physicalComposed.current) {
      if (code === "Backspace") { event.preventDefault(); backspaceLetter(); return; }
      if (code === "Enter") {
        event.preventDefault();
        if (phase !== "passed") checkAnswer();
        return;
      }
    }
    if (composingNow) return;
    if (phase === "passed") {
      if (event.key === "Enter" || event.key === " ") event.preventDefault();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      checkAnswer();
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      chooseSlot(moveSlot(activeRef.current, 1, liveSlots().length), "navigate");
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      chooseSlot(moveSlot(activeRef.current, -1, liveSlots().length), "navigate");
    } else if (event.key === " " || code === "Space") {
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
    if (phase !== "passed") checkAnswer();
    focusInput();
  }

  function restart() {
    setIndex(0);
    clearQuestion();
    setAttempts(0);
    setCompleted(0);
    setFinished(false);
    completedExerciseRef.current = null;
    setLastCorrectEnglish("");
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
    const hasNext = !reviewMode && lessonIndex + 1 < courseList.length;
    return (
      <FinishCelebration
        completed={completed}
        reducedMotion={Boolean(reducedMotion)}
        actionLabel={hasNext ? "进入下一单元" : "返回首页"}
        onAction={hasNext ? () => switchLesson(lessonIndex + 1) : onBack}
      />
    );
  }

  return (
    <section className="practice-area" aria-label={level === "CET4" ? "四级训练" : "六级训练"}>
      <div className="practice-topline">
        <button className="text-button" type="button" onClick={onBack}>← 返回</button>
        <span className="level-label">{level === "CET4" ? "四级" : "六级"} · {reviewMode ? "复习" : "练习"}</span>
        <div className="practice-top-actions">
          <motion.span className="question-counter" key={`${lesson.id}-${index}`}
            initial={reducedMotion ? false : { opacity: 0.25, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 29, mass: 0.6 }}>
            {String(index + 1).padStart(2, "0")} / {String(exercises.length).padStart(2, "0")}
          </motion.span>
          <details className="practice-settings">
            <summary aria-label="打开输入与声音设置">设置 <span aria-hidden="true">⌄</span></summary>
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
              {!isTouchDevice && (
                <button type="button" className="sound-toggle" aria-pressed={!desktopNativeInput}
                  aria-label={desktopNativeInput ? "开启物理键盘英文直输，减少中文候选框" : "切换到系统原生输入模式"}
                  onClick={toggleDesktopInputMode}>
                  <span aria-hidden="true">⌨</span>
                  <span>{desktopNativeInput ? "系统输入 · 兼容模式" : "英文直输 · 防拼音候选"}</span>
                </button>
              )}
              <button type="button" className="sound-toggle" disabled={!lastCorrectEnglish}
                onClick={() => { if (lastCorrectEnglish) speakEnglish(lastCorrectEnglish, "sentence"); focusInput(); }}>
                <span aria-hidden="true">↻</span>
                <span>重听上一句</span>
              </button>
            </div>
          </details>
        </div>
      </div>

      <div className="progress-track" role="progressbar" aria-label="练习进度"
        aria-valuenow={index} aria-valuemin={0} aria-valuemax={exercises.length}>
        <motion.div className="progress-fill" initial={false}
          animate={{ width: `${(index / exercises.length) * 100}%` }}
          transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 210, damping: 34, mass: 0.7 }} />
      </div>

      {!reviewMode && <div className="lesson-navigation">
        <ClickSpark className="lesson-spark" style={{ width: "fit-content", height: "auto" }}
          sparkColor="#7fa58e" sparkCount={5} sparkRadius={21} sparkSize={7}
          sparkWidth={1.3} duration={300} easing="spring"
          disabled={Boolean(reducedMotion)}>
        <motion.button className="lesson-toggle" type="button" aria-expanded={showLessonPicker}
          aria-controls="lesson-options" onClick={() => setShowLessonPicker((value) => !value)}
          whileHover={reducedMotion ? undefined : { y: -2, scale: 1.012 }}
          whileTap={reducedMotion ? undefined : { scale: 0.955 }}
          transition={{ type: "spring", stiffness: 460, damping: 27, mass: 0.6 }}>
          <span className="lesson-toggle-index">{String(lessonIndex + 1).padStart(2, "0")} / {String(courseList.length).padStart(2, "0")}</span>
          <span className="lesson-toggle-title">{lesson.title}</span>
          <motion.span aria-hidden="true" animate={{ rotate: showLessonPicker ? 180 : 0 }}
            transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 26 }}>
            ⌄
          </motion.span>
        </motion.button>
        </ClickSpark>
        <AnimatePresence initial={false}>
          {showLessonPicker && <motion.div id="lesson-options" className="lesson-options" aria-label="选择训练单元"
            initial={reducedMotion ? false : { opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -3 }}
            transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeOut" }}>
            {courseList.map((entry, at) => (
              <motion.button key={entry.id} type="button" className={`lesson-option ${at === lessonIndex ? "selected" : ""}`}
                onClick={() => switchLesson(at)}
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 390, damping: 31, mass: 0.65, delay: reducedMotion ? 0 : Math.min(at * 0.018, 0.14) }}
                whileHover={reducedMotion ? undefined : { x: 3 }}
                whileTap={reducedMotion ? undefined : { scale: 0.975 }}>
                <span className="lesson-option-number">{String(at + 1).padStart(2, "0")}</span>
                <span className="lesson-option-copy"><strong>{entry.title}</strong><small>{entry.description}</small></span>
                <span aria-hidden="true">{at === lessonIndex ? "✓" : "↗"}</span>
              </motion.button>
            ))}
          </motion.div>}
        </AnimatePresence>
      </div>}

      {storageNotice && <p className="storage-warning" role="alert">{storageNotice}</p>}
      <div className="question-body centered-practice">
        {/* Prompt and answer slots must update in the same React commit.
            Waiting for an exit animation would briefly show the previous
            Chinese question beside the new answer slots. */}
        <motion.div className="question-prompt" key={exercise.id}
          initial={reducedMotion ? false : { opacity: 0.12, y: 11, scale: 0.982, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={reducedMotion ? { duration: 0 } : {
            y: { type: "spring", stiffness: 360, damping: 28, mass: 0.65 },
            scale: { type: "spring", stiffness: 360, damping: 28, mass: 0.65 },
            opacity: { duration: 0.17 }, filter: { duration: 0.2 },
          }}>
          <div className="eyebrow">
            {targetOnly ? "目标表达 · " : ""}{exercise.kind === "word" ? "单词" : exercise.kind === "phrase" ? "语块" : "句子"}
            {acceptedAnswers.length > 1 ? " · 多种表达可用" : ""}
          </div>
          <h2 className="chinese-sentence">{exercise.chinese}</h2>
        </motion.div>

        <form className="slot-form" onSubmit={handleSubmit}>
          <div ref={stageRef} className={`slot-stage ${focused ? "stage-focused" : ""}`} onClick={focusInput}
            aria-label="逐词下划线填空区域">
            <input ref={inputRef} id="english-answer" className="slot-capture" type="text"
              aria-label="输入当前选中的英文词，左右方向键或空格切换词，Enter 检查或进入下一题"
              aria-describedby="practice-feedback"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              lang="en" inputMode={routing.readOnly ? "none" : "text"} readOnly={routing.readOnly}
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
            {phase === "passed" && !reducedMotion && slots.length > 1 && (
              <div className="sentence-flow" aria-hidden="true">
                <span className="sentence-flow-aura" />
                <span className="sentence-flow-orb" />
              </div>
            )}
            <div className="slot-list">
              {slots.map((slot, at) => {
                const visible = (displayValues[at] ?? "").replace(/[.,!?;:]+$/gu, "");
                const incorrect = wrong.includes(at);
                const active = focused && phase !== "passed" && at === activeIndex;
                const correctlySpelled = matchesSlot(displayValues[at] ?? "", slot);
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
                      animate={reducedMotion ? { x: 0, y: 0, scale: 1 }
                        : phase === "review" && incorrect && !targetOnly
                          ? { x: [0, -5, 4, -2, 0], y: 0, scale: 1 }
                          : correctlySpelled
                            ? { x: 0, y: [0, -4, 1, 0], scale: [1, 1.075, 0.995, 1] }
                            : { x: 0, y: 0, scale: 1 }}
                      transition={{
                        duration: reducedMotion ? 0 : phase === "review" && incorrect && !targetOnly ? 0.28 : 0.24,
                        ease: [0.22, 1, 0.36, 1],
                      }}>
                      {visible || "\u00a0"}
                    </motion.span>
                    {correctlySpelled && !reducedMotion && <motion.span
                      className="word-lock-light" aria-hidden="true"
                      key={`lock-${exercise.id}-${at}-${displayAnswer}`}
                      initial={{ opacity: 0, scaleX: 0.04 }}
                      animate={{ opacity: [0, 0.94, 0], scaleX: [0.04, 1, 1] }}
                      transition={{ duration: 0.28, times: [0, 0.52, 1], ease: "easeOut" }}
                    />}
                    {phase === "passed" && slots.length > 1 && !reducedMotion && (
                      <span className="sentence-energy-node" aria-hidden="true" />
                    )}
                    {active && <motion.span
                      className="slot-focus-marker" aria-hidden="true"
                      layoutId={reducedMotion ? undefined : "cet-typing-slot-focus"}
                      initial={false}
                      transition={reducedMotion ? { duration: 0 }
                        : { type: "spring", stiffness: 440, damping: 38, mass: 0.55 }}
                    />}
                    {slot.punctuation && <span className="slot-punctuation">{slot.punctuation}</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <motion.p key={`${exercise.id}-${phase}-${errorPulse}`} id="practice-feedback"
            className={`slot-feedback ${phase === "review" ? (targetOnly ? "feedback-target" : "feedback-error") : phase === "passed" ? "feedback-success" : ""}`}
            initial={reducedMotion || phase === "passed" ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion || phase === "passed" ? 0 : 0.2 }} role="status" aria-live="polite">
            {phase === "passed" ? (
              <motion.span className="feedback-glyph" aria-hidden="true"
                initial={reducedMotion ? false : { opacity: 0.3, scale: 0.65, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 490, damping: 21, mass: 0.42 }}>✓</motion.span>
            ) : <span aria-hidden="true">{phase === "review" ? (targetOnly ? "◇" : "●") : "⌨"}</span>}
            {" "}{feedback}
          </motion.p>
          {revealed && <div className="revealed-answer">
            <span>本题目标表达</span><strong>{exercise.english}</strong>
            {acceptedAnswers.length > 1 && <span>也接受：{acceptedAnswers.slice(1).join(" / ")}</span>}
          </div>}
          <div className="slot-actions">
            {phase !== "passed" && matchesSlot(displayValues[activeIndex] ?? "", slots[activeIndex]) && (
              <button className="text-button replay-button" type="button"
                onClick={() => {
                  const word = displayValues[activeIndex] ?? "";
                  if (matchesSlot(word, slots[activeIndex])) speakEnglish(slots[activeIndex].word, "word");
                  focusInput();
                }}
                aria-label="重播当前选中单词">🔉 重播单词</button>
            )}
            <button className="submit-minimal" type="submit" disabled={phase === "passed"}>
              {phase === "passed" ? "✓ 正确" : "检查答案 →"}
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
              <SiteKeyboard
                onLetter={(letter) => handleSiteKey(shiftEnabled ? letter.toUpperCase() : letter)}
                onBackspace={() => handleSiteKey("Backspace")}
                onSpace={() => handleSiteKey("Space")}
                onEnter={() => handleSiteKey("Enter")}
                shift={shiftEnabled}
                onShift={() => handleSiteKey("Shift")}
                onApostrophe={() => handleSiteKey("'")}
                onHyphen={() => handleSiteKey("-")}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
