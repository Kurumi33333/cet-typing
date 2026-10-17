import { useEffect, useRef, useState, type FormEvent } from "react";
import { starterExercises } from "../../data/starter";
import type { CetLevel } from "../course/types";
import { isCorrectAnswer } from "./answer";
import { diffWords } from "./wordDiff";

type Verdict = "correct" | "incorrect" | null;

interface PracticeScreenProps {
  level: CetLevel;
  onBack: () => void;
}

export function PracticeScreen({ level, onBack }: PracticeScreenProps) {
  const exercises = starterExercises.filter((exercise) => exercise.level === level);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [revealed, setRevealed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposing = useRef(false);

  useEffect(() => {
    if (!finished) inputRef.current?.focus();
  }, [index, finished]);

  function nextQuestion() {
    if (index + 1 >= exercises.length) {
      setFinished(true);
      return;
    }
    setIndex((previous) => previous + 1);
    setAnswer("");
    setVerdict(null);
    setRevealed(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isComposing.current) return;
    if (verdict === "correct") {
      nextQuestion();
      return;
    }
    if (!answer.trim()) return;

    setAttempts((previous) => previous + 1);
    if (isCorrectAnswer(answer, exercises[index].english)) {
      setVerdict("correct");
      setCompleted((previous) => previous + 1);
    } else {
      setVerdict("incorrect");
    }
  }

  function restart() {
    setIndex(0);
    setAnswer("");
    setVerdict(null);
    setRevealed(false);
    setAttempts(0);
    setCompleted(0);
    setFinished(false);
  }

  if (finished) {
    return (
      <section className="finished-screen" aria-labelledby="finish-title">
        <div className="eyebrow"><span className="status-dot" /> 本轮练习完成</div>
        <h2 id="finish-title">很棒，<br /><em>继续保持。</em></h2>
        <p>本轮完成 <strong>{completed}</strong> 句，共提交 <strong>{attempts}</strong> 次。</p>
        <div className="choice-group">
          <button className="primary-button" type="button" onClick={restart}>再练一次 ↗</button>
          <button className="secondary-button" type="button" onClick={onBack}>返回首页</button>
        </div>
      </section>
    );
  }

  const exercise = exercises[index];
  return (
    <section className="practice-area" aria-label={level === "CET4" ? "四级训练" : "六级训练"}>
      <div className="practice-topline">
        <button className="text-button" type="button" onClick={onBack}>← 返回</button>
        <span className="level-label">{level === "CET4" ? "大学英语四级" : "大学英语六级"} · 演示题</span>
        <span className="question-counter">{String(index + 1).padStart(2, "0")} / {String(exercises.length).padStart(2, "0")}</span>
      </div>
      <div className="progress-track" role="progressbar" aria-label="练习进度" aria-valuenow={index + 1} aria-valuemin={0} aria-valuemax={exercises.length}>
        <div className="progress-fill" style={{ width: `${((index + 1) / exercises.length) * 100}%` }} />
      </div>
      <div className="question-body">
        <div className="eyebrow"><span className="status-dot" /> 根据中文写出完整英文</div>
        <h2 className="chinese-sentence">{exercise.chinese}</h2>
        <p className="instruction">在下方输入英文句子，按 Enter 提交。大小写和句末标点不影响判定。</p>
        <form onSubmit={submit} className="answer-form">
          <label htmlFor="english-answer" className="input-label">你的英文表达</label>
          <input
            ref={inputRef}
            id="english-answer"
            className={`answer-input ${verdict === "incorrect" ? "input-error" : ""} ${verdict === "correct" ? "input-success" : ""}`}
            value={answer}
            onChange={(event) => { setAnswer(event.target.value); if (verdict === "incorrect") setVerdict(null); }}
            onCompositionStart={() => { isComposing.current = true; }}
            onCompositionEnd={() => { isComposing.current = false; }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.nativeEvent.isComposing || isComposing.current || event.keyCode === 229)) {
                event.preventDefault();
              }
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            readOnly={verdict === "correct"}
            placeholder="Type the English sentence..."
            aria-describedby="answer-feedback"
          />
          <div className="feedback" id="answer-feedback" role="status" aria-live="polite">
            {verdict === "correct" ? <span className="correct-text">✓ 回答正确，进入下一句吧。</span> : null}
            {verdict === "incorrect" ? <span className="error-text">还不正确，可以修改后重新提交。</span> : null}
            {verdict === null ? <span>你可以随时修改输入。</span> : null}
          </div>
          {verdict === "incorrect" && (
            <div className="word-review" aria-label="逐词错误提示">
              <p className="word-review-label">逐词检查 · 绿色正确，红色需要修改</p>
              <div className="word-review-list">
                {diffWords(answer, exercise.english).map((word, position) => (
                  <span key={position} className={`review-token review-${word.status}`}
                    title={word.status === "correct" ? "正确" : word.status === "missing" ? "缺少单词" : word.status === "extra" ? "多余单词" : "该词需要修改"}>
                    {word.actual ?? "＋缺词"}
                  </span>
                ))}
              </div>
            </div>
          )}
          {revealed && <div className="revealed-answer"><span>参考答案</span><strong>{exercise.english}</strong></div>}
          <div className="answer-actions">
            <button className="primary-button" type="submit" disabled={!answer.trim() && verdict !== "correct"}>
              {verdict === "correct" ? (index + 1 === exercises.length ? "完成练习 ↗" : "下一句 →") : "提交答案 ↗"}
            </button>
            {verdict !== "correct" && <button className="text-button" type="button" onClick={() => setRevealed((value) => !value)}>
              {revealed ? "隐藏参考答案" : "查看参考答案"}
            </button>}
          </div>
        </form>
      </div>
    </section>
  );
}
