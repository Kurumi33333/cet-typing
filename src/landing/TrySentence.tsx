import { useEffect, useMemo, useRef, useState } from "react";
import { getLessons } from "../data/curriculum";
import { playFeedback, readSoundPreference, writeSoundPreference } from "../features/practice/sounds";
import {
  readPronunciationPreference, speakEnglish, stopPronunciation, writePronunciationPreference,
} from "../features/practice/speech";
import { matchesSlot, sentenceToSlots } from "../features/practice/slots";
import {
  deleteSlotCharacter, emptySlotInput, insertSlotCharacter, nextSlot, previousSlot,
  selectSlot, type SlotInput,
} from "../features/practice/slotInput";
import { SiteKeyboard, useSlotKeys, useTouchDevice } from "../features/practice/useSlotKeys";

/**
 * The landing page's one live thing: the real exercise surface, not a picture of it.
 *
 * It runs the practice screen's own model — one string per word slot, a space to
 * advance, a read-only capture input that can never wake a Chinese IME's
 * candidate window, letters taken from physical key codes, and the shared
 * on-page keyboard on touch. English entry is not re-implemented here.
 */
type Phase = "typing" | "checked" | "passed" | "done";

const DEMO_IDS = ["cet4-01-05", "cet4-02-04", "cet4-03-08"] as const;

interface Demo {
  id: string;
  chinese: string;
  english: string;
}

function loadDemos(): Demo[] {
  const byId = new Map(
    getLessons("CET4").flatMap((lesson) => lesson.exercises).map((exercise) => [exercise.id, exercise] as const),
  );
  const found = DEMO_IDS.flatMap((id) => {
    const exercise = byId.get(id);
    return exercise
      ? [{ id: exercise.id, chinese: exercise.chinese, english: exercise.english }]
      : [];
  });
  return found.length ? found : [{ id: "demo", chinese: "我喜欢茶。", english: "I like tea." }];
}

export interface TrySentenceProps {
  onStart: () => void;
  onOpenLexicon: () => void;
  nextDueLabel: string;
  dueTotal: number;
  review: Record<"CET4" | "CET6", { due: number; later: number }>;
  busy: "CET4" | "CET6" | null;
  onStartReview: (level: "CET4" | "CET6") => void;
}

export function TrySentence({
  onStart, onOpenLexicon, nextDueLabel, dueTotal, review, busy, onStartReview,
}: TrySentenceProps) {
  const demos = useMemo(loadDemos, []);
  const [round, setRound] = useState(0);
  const demo = demos[Math.min(round, demos.length - 1)];
  const slots = useMemo(() => sentenceToSlots(demo.english), [demo.english]);

  const [input, setInput] = useState<SlotInput>(() => emptySlotInput(slots.length));
  const [phase, setPhase] = useState<Phase>("typing");
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(0);
  const [shift, setShift] = useState(false);
  const [soundOn, setSoundOn] = useState(readSoundPreference);
  const [voiceOn, setVoiceOn] = useState(readPronunciationPreference);
  const touch = useTouchDevice();
  const inputRef = useRef<HTMLInputElement>(null);
  const spoken = useRef("");
  const composition = useRef(false);

  const done = phase === "passed" || phase === "done";
  const allCorrect = slots.length > 0 &&
    slots.every((slot, at) => matchesSlot(input.values[at] ?? "", slot));
  const active = Math.min(input.active, Math.max(0, slots.length - 1));

  const reset = (nextRound: number) => {
    const next = demos[Math.min(nextRound, demos.length - 1)];
    setInput(emptySlotInput(sentenceToSlots(next.english).length));
    setPhase("typing");
    setAttempts(0);
    setShift(false);
    spoken.current = "";
    setRound(nextRound);
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    if (!voiceOn) stopPronunciation();
  }, [voiceOn]);

  useEffect(() => () => stopPronunciation(), []);

  const ping = (kind: Parameters<typeof playFeedback>[0]) => {
    if (soundOn) playFeedback(kind);
  };

  const typeLetter = (letter: string) => {
    if (done) return;
    setInput((current) => insertSlotCharacter(current, letter));
    if (phase === "checked") setPhase("typing");
    ping("typing");
    inputRef.current?.focus({ preventScroll: true });
  };

  const erase = () => {
    if (done) return;
    setInput((current) => deleteSlotCharacter(current));
    if (phase === "checked") setPhase("typing");
    ping("delete");
  };

  const advanceSlot = () => {
    if (done) return;
    setInput((current) => nextSlot(current));
    ping("navigate");
  };

  const retreatSlot = () => {
    if (done) return;
    setInput((current) => previousSlot(current));
    ping("navigate");
  };

  const check = () => {
    if (done) return;
    if (slots.length && allCorrect) {
      setPhase("passed");
      setSolved((count) => count + 1);
      ping("success");
      if (voiceOn) speakEnglish(demo.english, "sentence");
      return;
    }
    setAttempts((count) => count + 1);
    setPhase("checked");
    ping("error");
  };

  const goNext = () => {
    if (round + 1 >= demos.length) {
      setPhase("done");
      return;
    }
    ping("advance");
    reset(round + 1);
  };

  useSlotKeys(inputRef, {
    onLetter: typeLetter,
    onSpace: advanceSlot,
    onEnter: () => (phase === "passed" ? goNext() : check()),
    onBackspace: erase,
    onArrow: (direction) => (direction > 0 ? advanceSlot() : retreatSlot()),
  }, true);

  // A word is pronounced once, the moment it becomes completely right.
  useEffect(() => {
    if (!voiceOn || done) return;
    for (let at = 0; at < slots.length; at++) {
      const value = input.values[at] ?? "";
      if (!value || value.includes(" ")) continue;
      const key = `${demo.id}:${at}:${value}`;
      if (matchesSlot(value, slots[at]) && spoken.current !== key) {
        spoken.current = key;
        speakEnglish(value, "word");
        break;
      }
    }
  }, [input.values, slots, demo.id, voiceOn, done]);

  const focusCard = () => {
    if (done) return;
    inputRef.current?.focus({ preventScroll: true });
  };

  const stage = phase === "done" ? "done"
    : phase === "passed" ? "passed"
      : phase === "checked" && !allCorrect ? "checked"
        : "typing";

  return (
    <section className="try" id="try" data-panel aria-labelledby="try-title">
      <div className="try__grid">
        <div className="try__intro">
        <h2 className="try__title" id="try-title" data-reveal>先打一句。</h2>
        <p className="try__note">
          这一格是真的：按键、空格、回车与判错都和练习页同一套逻辑。中文在上，英文由你写出来。
        </p>
        <p className="try__note try__note--quiet">
          输入框是只读的，中文输入法不会弹出候选框；字母取自物理键位，拼音开着也能直接打。
        </p>

        <dl className="try__due">
          <div className="try__due-head">
            <dt>到期复习</dt>
            <dd>{nextDueLabel}</dd>
          </div>
          {(["CET4", "CET6"] as const).map((item) => (
            <div className="try__due-row" key={item}>
              <dt>{item === "CET4" ? "四级" : "六级"}</dt>
              <dd>
                <span className="try__due-count">{review[item].due}</span>
                <span className="try__due-sub">未来 {review[item].later}</span>
                <button
                  type="button"
                  className="try__due-button"
                  disabled={busy !== null || review[item].due === 0}
                  onClick={() => onStartReview(item)}
                >
                  {review[item].due > 0 ? "复习" : "无到期"}
                </button>
              </dd>
            </div>
          ))}
          <p className="try__due-note">
            {dueTotal > 0 ? "数字来自这台浏览器里的真实记录。" : "还没有本地记录，所以两项都是 0。"}
          </p>
        </dl>
      </div>

      <div className={`try__card is-${stage}`} data-ui onClick={focusCard}>
        <div className="try__meta">
          <span className="try__round">第 {Math.min(round + 1, demos.length)} 句，共 {demos.length} 句</span>
          <div className="try__switches">
            <button type="button" className="try__switch" aria-pressed={voiceOn}
              onClick={(event) => {
                event.stopPropagation();
                setVoiceOn((on) => { writePronunciationPreference(!on); return !on; });
              }}>
              发音 {voiceOn ? "开" : "关"}
            </button>
            <button type="button" className="try__switch" aria-pressed={soundOn}
              onClick={(event) => {
                event.stopPropagation();
                const next = !soundOn;
                setSoundOn(next);
                writeSoundPreference(next);
                if (next) playFeedback("select");
              }}>
              键音 {soundOn ? "开" : "关"}
            </button>
          </div>
        </div>

        <p className="try__chinese" lang="zh-CN">{demo.chinese}</p>

        <div className="try__stage">
          <input
            ref={inputRef}
            className="try__capture"
            type="text"
            value={input.values[active] ?? ""}
            aria-label="输入这个中文句子的英文，空格换词，回车检查"
            aria-describedby="try-help"
            /* Read-only is the point: an editable field wakes the Chinese IME's
               candidate window. Letters come from physical key codes instead. */
            readOnly
            inputMode={touch ? "none" : "text"}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            lang="en"
            enterKeyHint="enter"
            onChange={() => { /* read-only: keystrokes are handled by useSlotKeys */ }}
            onCompositionStart={() => { composition.current = true; }}
            onCompositionEnd={() => { composition.current = false; }}
          />
          <ol className="try__slots" aria-live="polite">
            {slots.map((slot, at) => {
              const value = input.values[at] ?? "";
              const correct = matchesSlot(value, slot);
              // An empty slot is never wrong; only a mistakenly typed word is stamped.
              const wrong = value.length > 0 && !correct &&
                (phase === "checked" || value.length > slot.word.length + 1);
              return (
                <li
                  key={`${demo.id}-${at}`}
                  className={[
                    "try__slot",
                    correct ? "is-correct" : "",
                    wrong ? "is-wrong" : "",
                    value && !correct && phase === "typing" ? "is-typing" : "",
                    at === active && !done ? "is-active" : "",
                  ].filter(Boolean).join(" ")}
                  style={{ ["--w" as string]: `${slot.widthCh + 0.6}ch` }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setInput((current) => selectSlot(current, at));
                    inputRef.current?.focus({ preventScroll: true });
                  }}
                >
                  <span className="try__word">{value || "\u00a0"}</span>
                  {slot.punctuation && <span className="try__punct">{slot.punctuation}</span>}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="try__status" id="try-help" aria-live="polite">
          {phase === "done" ? (
            <span className="try__line">三句都完成了。课程里还有 117 句。</span>
          ) : phase === "passed" ? (
            <span className="try__line is-good">对了。{voiceOn ? "正在读整句。" : "打开上方的发音，可以听整句。"}</span>
          ) : phase === "checked" ? (
            <span className="try__line is-bad">还不是这句。点一下红色的词，改完再按回车。</span>
          ) : (
            <span className="try__line">
              按空格换词，回车检查{attempts > 1 ? `，这是第 ${attempts} 次尝试` : ""}。
            </span>
          )}
        </div>

        {touch && phase !== "done" && (
          <div className="try__keys" onClick={(event) => event.stopPropagation()}>
            <SiteKeyboard
              onLetter={(letter) => typeLetter(shift ? letter.toUpperCase() : letter)}
              onBackspace={erase}
              onSpace={advanceSlot}
              onEnter={() => (phase === "passed" ? goNext() : check())}
              shift={shift}
              onShift={() => setShift((on) => !on)}
              onApostrophe={() => typeLetter("'")}
              onHyphen={() => typeLetter("-")}
            />
          </div>
        )}

        <div className="try__actions">
          {phase === "done" ? (
            <>
              <button type="button" className="try__primary" onClick={onStart}>进入完整课程</button>
              <button type="button" className="try__ghost" onClick={() => reset(0)}>再打一遍</button>
            </>
          ) : phase === "passed" ? (
            <>
              <button type="button" className="try__primary" onClick={goNext}>
                {round + 1 >= demos.length ? "看完成了什么" : "下一句"}
              </button>
              <button type="button" className="try__ghost"
                onClick={() => { if (voiceOn) speakEnglish(demo.english, "sentence"); }}>
                再听一遍
              </button>
            </>
          ) : (
            <>
              <button type="button" className="try__primary" onClick={check}>检查</button>
              <button type="button" className="try__ghost" onClick={() => reset(round)}>重打这句</button>
            </>
          )}
          <span className="try__tally" aria-live="polite">已答对 {solved} 句</span>
        </div>
      </div>

        <p className="try__footnote">
          试的三句来自四级课程的三个单元。完整课程共十二个单元、一百二十步；参考词库另有八千五百余条可查。
          <button type="button" className="landing-link" onClick={onOpenLexicon}>去查一个词</button>
        </p>
      </div>
    </section>
  );
}
