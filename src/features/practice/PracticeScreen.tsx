import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type FormEvent } from "react";
import { getLessons } from "../../data/curriculum";
import type { CetLevel } from "../course/types";
import {
  draftToSlotValues,
  getActiveSlot,
  incorrectSlots,
  matchesSlot,
  sentenceToSlots,
} from "./slots";

type Phase = "typing" | "review" | "fix" | "passed";

interface PracticeScreenProps {
  level: CetLevel;
  onBack: () => void;
}

/**
 * One keyboard stream, many visible underlined word slots.
 * The input stays visually transparent; the slot UI is the only visible typing surface.
 */
export function PracticeScreen({ level, onBack }: PracticeScreenProps) {
  const courseList = getLessons(level);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [showLessonPicker, setShowLessonPicker] = useState(false);
  const lesson = courseList[lessonIndex];
  const exercises = lesson.exercises;
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("typing");
  const [fixIndex, setFixIndex] = useState(0);
  const [fixValue, setFixValue] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState("按空格切换到下一格，按 Enter 检查答案");
  const [focused, setFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const exercise = exercises[index];
  const slots = sentenceToSlots(exercise.english);
  const displayValues = phase === "typing" ? draftToSlotValues(draft, slots.length) : values;
  const wrong = phase === "typing" || phase === "passed" ? [] : incorrectSlots(displayValues, slots);
  const activeIndex = phase === "typing" ? getActiveSlot(draft, slots.length) : fixIndex;

  useEffect(() => {
    if (!finished) inputRef.current?.focus();
  }, [index, finished]);

  useEffect(() => {
    if (phase !== "passed") return;
    const timer = window.setTimeout(() => {
      if (index + 1 === exercises.length) {
        setFinished(true);
      } else {
        setIndex((previous) => previous + 1);
        setDraft("");
        setValues([]);
        setPhase("typing");
        setFixValue("");
        setFixIndex(0);
        setRevealed(false);
        setFeedback("按空格切换到下一格，按 Enter 检查答案");
      }
    }, 850);
    return () => window.clearTimeout(timer);
  }, [phase, index, exercises.length]);

  function focusInput() {
    inputRef.current?.focus();
    if (phase === "typing") {
      const el = inputRef.current;
      el?.setSelectionRange(el.value.length, el.value.length);
    }
  }

  function nextQuestion() {
    if (index + 1 === exercises.length) {
      setFinished(true);
      return;
    }
    setIndex((previous) => previous + 1);
    setDraft("");
    setValues([]);
    setPhase("typing");
    setFixValue("");
    setFixIndex(0);
    setRevealed(false);
    setFeedback("按空格切换到下一格，按 Enter 检查答案");
  }

  function check(candidate: string[]) {
    setAttempts((previous) => previous + 1);
    setValues(candidate);
    const errors = incorrectSlots(candidate, slots);
    if (errors.length === 0) {
      setPhase("passed");
      setCompleted((previous) => previous + 1);
      setFeedback("正确！即将进入下一题");
    } else {
      setPhase("review");
      setFeedback(`有 ${errors.length} 个单词需要修正。直接打字，或点一下红色单词。`);
    }
  }

  function startFix(at: number, initial = "") {
    if (phase !== "review" && phase !== "fix") return;
    if (phase === "review" && !wrong.includes(at)) return;
    setFixIndex(at);
    setFixValue(initial);
    setValues((previous) => previous.map((word, i) => i === at ? initial : word));
    setPhase("fix");
    setFeedback("重新输入标出的单词，按空格继续修复");
    inputRef.current?.focus();
  }

  function advanceFix(candidate: string[]) {
    if (!matchesSlot(candidate[fixIndex] ?? "", slots[fixIndex])) {
      setFeedback("这个单词还不正确，继续修改，或按 Enter 再检查");
      return;
    }
    const following = incorrectSlots(candidate, slots).find((at) => at > fixIndex);
    if (following !== undefined) {
      setFixIndex(following);
      setFixValue("");
      setValues(candidate.map((word, i) => i === following ? "" : word));
      setFeedback("很好，继续修复下一个单词");
      return;
    }
    if (incorrectSlots(candidate, slots).length === 0) {
      check(candidate);
    } else {
      setValues(candidate);
      setPhase("review");
      setFeedback("还有单词需要修复，可以点击红色下划线重新输入");
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    if (phase === "typing") {
      setDraft(next.replace(/[\r\n]/gu, " "));
    } else if (phase === "review") {
      if (next.length > 0) {
        const first = wrong[0];
        if (first !== undefined) startFix(first, next);
      }
    } else if (phase === "fix") {
      if (/\s/u.test(next) && !composing.current) {
        const firstWord = next.trim().split(/\s+/u)[0] ?? "";
        const candidate = [...values];
        candidate[fixIndex] = firstWord;
        setValues(candidate);
        setFixValue(firstWord);
        advanceFix(candidate);
      } else {
        setFixValue(next);
        setValues((previous) => previous.map((word, i) => i === fixIndex ? next : word));
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) {
      if (event.key === "Enter") event.preventDefault();
      return;
    }

    if (phase === "passed") {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        nextQuestion();
      }
      return;
    }

    if (phase === "typing") {
      if (event.key === "Enter") {
        event.preventDefault();
        if (draft.trim()) check(draftToSlotValues(draft, slots.length));
      }
      // Normal spaces/backspace edit the invisible sentence input naturally.
      return;
    }

    if (phase === "review") {
      const first = wrong[0];
      if (first === undefined) return;
      if (event.key === "Enter" || event.key === " " || event.key === "Backspace") {
        event.preventDefault();
        startFix(first);
      } else if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        startFix(first, event.key);
      }
      return;
    }

    if (phase === "fix") {
      if (event.key === "Enter") {
        event.preventDefault();
        check(values);
      } else if (event.key === " ") {
        event.preventDefault();
        advanceFix(values);
      } else if (event.key === "Backspace" && fixValue.length === 0) {
        const before = incorrectSlots(values, slots).filter((at) => at < fixIndex).pop();
        if (before !== undefined) {
          event.preventDefault();
          startFix(before);
        }
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (composing.current) return;
    if (phase === "typing" && draft.trim()) {
      check(draftToSlotValues(draft, slots.length));
    } else if (phase === "fix") {
      check(values);
    } else if (phase === "review") {
      if (wrong[0] !== undefined) startFix(wrong[0]);
    } else if (phase === "passed") {
      nextQuestion();
    }
    focusInput();
  }

  function switchLesson(to: number) {
    if (to === lessonIndex) { setShowLessonPicker(false); return; }
    restart();
    setLessonIndex(to);
    setShowLessonPicker(false);
  }

  function restart() {
    setIndex(0);
    setDraft("");
    setValues([]);
    setPhase("typing");
    setFixIndex(0);
    setFixValue("");
    setRevealed(false);
    setAttempts(0);
    setCompleted(0);
    setFinished(false);
    setFeedback("按空格切换到下一格，按 Enter 检查答案");
  }

  if (finished) {
    return (
      <section className="finished-screen" aria-labelledby="finish-title">
        <div className="eyebrow"><span className="status-dot" /> 本轮练习完成</div>
        <h2 id="finish-title">很棒，<br /><em>继续保持。</em></h2>
        <p>你已完成「{lesson.title}」的 <strong>{completed}</strong> 个练习步骤，共提交 <strong>{attempts}</strong> 次。</p>
        <div className="choice-group">
          {lessonIndex + 1 < courseList.length && (
            <button className="primary-button" type="button" onClick={() => switchLesson(lessonIndex + 1)}>
              进入下一单元 →
            </button>
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
        <span className="level-label">{level === "CET4" ? "大学英语四级" : "大学英语六级"} · 渐进课程</span>
        <span className="question-counter">{String(index + 1).padStart(2, "0")} / {String(exercises.length).padStart(2, "0")}</span>
      </div>
      <div className="progress-track" role="progressbar" aria-label="练习进度"
        aria-valuenow={index} aria-valuemin={0} aria-valuemax={exercises.length}>
        <div className="progress-fill" style={{ width: `${(index / exercises.length) * 100}%` }} />
      </div>
      <div className="lesson-navigation">
        <button className="lesson-toggle" type="button"
          aria-expanded={showLessonPicker} aria-controls="lesson-options"
          onClick={() => setShowLessonPicker((v) => !v)}>
          <span className="lesson-toggle-index">{String(lessonIndex + 1).padStart(2, "0")} / {String(courseList.length).padStart(2, "0")}</span>
          <span className="lesson-toggle-title">{lesson.title}</span>
          <span aria-hidden="true">{showLessonPicker ? "⌃" : "⌄"}</span>
        </button>
        {showLessonPicker && <div id="lesson-options" className="lesson-options" aria-label="选择训练单元">
          {courseList.map((entry, at) => (
            <button key={entry.id} type="button"
              className={`lesson-option ${at === lessonIndex ? "selected" : ""}`}
              onClick={() => switchLesson(at)}>
              <span className="lesson-option-number">{String(at + 1).padStart(2, "0")}</span>
              <span className="lesson-option-copy"><strong>{entry.title}</strong><small>{entry.description}</small></span>
              <span aria-hidden="true">{at === lessonIndex ? "✓" : "↗"}</span>
            </button>
          ))}
        </div>}
      </div>
      <div className="question-body centered-practice">
        <div className="eyebrow"><span className="status-dot" /> {exercise.kind === "word" ? "01 · 词汇" : exercise.kind === "phrase" ? "02 · 语块" : "03 · 造句"} · {lesson.title}</div>
        <h2 className="chinese-sentence">{exercise.chinese}</h2>
        <p className="instruction">{exercise.kind === "word" ? "只练一个单词，从简单开始。" : exercise.kind === "phrase" ? "将刚学的单词连接起来。" : "用学过的词语，组成一句完整的英语。"} · {index + 1}/{exercises.length}</p>

        <form className="slot-form" onSubmit={handleSubmit}>
          <div className={`slot-stage ${focused ? "stage-focused" : ""}`}
            onClick={focusInput} aria-label="逐词下划线填空区域">
            <input
              ref={inputRef}
              id="english-answer"
              className="slot-capture"
              type="text"
              aria-label="键盘输入英文句子，空格换词，回车检查"
              aria-describedby="practice-feedback"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="text"
              value={phase === "typing" ? draft : phase === "fix" ? fixValue : ""}
              onChange={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onCompositionStart={() => { composing.current = true; }}
              onCompositionEnd={() => { composing.current = false; }}
              onKeyDown={handleKeyDown}
            />
            <div className="slot-list">
              {slots.map((slot, at) => {
                const value = displayValues[at] ?? "";
                const visible = value.replace(/[.,!?;:]+$/gu, "");
                const incorrect = wrong.includes(at);
                const isActive = focused && (phase === "typing" || phase === "fix") && at === activeIndex;
                const appearance = phase === "passed" ? "slot-correct" :
                  isActive ? "slot-active" :
                  incorrect ? "slot-incorrect" :
                  phase === "review" || phase === "fix" ? "slot-verified" : "slot-idle";

                return (
                  <div className={`slot-unit ${incorrect ? "slot-needs-fix" : ""}`} key={at}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (phase === "review" && incorrect) startFix(at);
                      else if (phase === "fix" && incorrect) startFix(at);
                      else focusInput();
                    }}
                    title={phase === "review" && incorrect ? "点击修改这个单词" : undefined}>
                    <span className={`slot-word ${appearance}`}
                      style={{ minWidth: `${slot.widthCh}ch` }}>
                      {visible || "\u00a0"}
                    </span>
                    {slot.punctuation && <span className="slot-punctuation">{slot.punctuation}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <p id="practice-feedback" className={`slot-feedback ${phase === "review" ? "feedback-error" : phase === "passed" ? "feedback-success" : ""}`} role="status" aria-live="polite">
            {phase === "review" ? "● " : phase === "passed" ? "✓ " : "⌨ "}{feedback}
          </p>

          {revealed && <div className="revealed-answer"><span>参考答案</span><strong>{exercise.english}</strong></div>}

          <div className="slot-actions">
            <button className="submit-minimal" type="submit">
              {phase === "review" ? "开始修正 ↗" : phase === "fix" ? "再次检查 ↗" :
                phase === "passed" ? "下一句 →" : "Enter · 检查答案"}
            </button>
            {phase !== "passed" && (
              <button className="text-button" type="button" onClick={() => {
                setRevealed((value) => !value);
                focusInput();
              }}>{revealed ? "隐藏答案" : "显示答案"}</button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
