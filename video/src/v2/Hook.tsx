import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { beatF } from '../beat';
import { FONT, INK, INK_SOFT } from '../theme';
import { GREEN, PaperBg, SlotWord, inOut, letterFrames, mix, press, prog, silk } from './kit';

/**
 * HOOK · beat 0–8. Two sentences typed to the grid: every word finishes ON a
 * beat, and the second sentence types faster than the first (3f → 2f a letter),
 * which is the whole pitch of the product in four seconds.
 */
export interface HookSentence {
  zh: string;
  words: string[];
  /** beat each word finishes on */
  beats: number[];
  step: number;
  size: number;
  /** local frame the Chinese prompt stamps in */
  start: number;
  /** local frame the sentence leaves */
  leave: number;
}

export const HOOK_SENTENCES: HookSentence[] = [
  { zh: '我喜欢茶。', words: ['I', 'like', 'tea.'], beats: [1, 2, 3], step: 3, size: 250, start: 0, leave: 54 },
  { zh: '我们爱英语。', words: ['We', 'love', 'English.'], beats: [5, 6, 7], step: 2, size: 200, start: 58, leave: 999 },
];

/** Every letter landing frame, flat — the sound table reads this. */
export const HOOK_LETTERS: number[] = HOOK_SENTENCES.flatMap((s) =>
  s.words.flatMap((w, i) => letterFrames(beatF(s.beats[i]), w.length, s.step)),
);
/** Frames a word turns green (its last letter + 1). */
export const HOOK_WORD_DONE: number[] = HOOK_SENTENCES.flatMap((s) => s.beats.map((b) => beatF(b) + 1));

const Sentence: React.FC<{ s: HookSentence; f: number }> = ({ s, f }) => {
  const enter = prog(f, s.start, 8, press);
  const leave = prog(f, s.leave, 8, inOut);
  const last = beatF(s.beats[s.beats.length - 1]);
  const doneP = prog(f, last + 1, 22, silk);
  const pop = f >= last + 1 ? 1 + 0.04 * Math.sin(Math.min(1, (f - last - 1) / 16) * Math.PI) : 1;
  const drift = prog(f, s.start, 70, (t) => t);
  const camScale = 1 + 0.045 * drift;

  return (
    <AbsoluteFill
      style={{
        opacity: 1 - leave,
        transform: `translateX(${-leave * 160}px) scale(${camScale})`,
        transformOrigin: '50% 52%',
      }}
    >
      {/* the Chinese prompt */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 150,
          textAlign: 'center',
          fontFamily: FONT.serifZh,
          fontWeight: 600,
          fontSize: 150,
          color: INK,
          opacity: enter,
          transform: `scale(${1.18 - 0.18 * enter})`,
        }}
      >
        {s.zh}
      </div>
      {/* the slots */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 470,
          display: 'flex',
          justifyContent: 'center',
          gap: s.size * 0.2,
          transform: `scale(${pop})`,
        }}
      >
        {s.words.map((w, i) => {
          const frames = letterFrames(beatF(s.beats[i]), w.length, s.step);
          const count = frames.filter((lf) => f >= lf).length;
          const ages = frames.map((lf) => f - lf);
          const done = f >= beatF(s.beats[i]) + 1;
          const started = f >= frames[0] - 2;
          const lineIn = prog(f, s.start + 6 + i * 4, 14, silk);
          const green = prog(f, beatF(s.beats[i]) + 1, 6, silk);
          return (
            <SlotWord
              key={w}
              text={w}
              count={count}
              ages={ages}
              size={s.size}
              state={done ? 'correct' : started ? 'active' : 'idle'}
              caret={started && !done && Math.floor(f / 3) % 2 === 0}
              line={lineIn}
              color={mix(INK, GREEN, green)}
              glow={done ? 0.55 * (1 - doneP) * green : 0}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PaperBg shift={prog(f, 0, 116, (t) => t) * 8} />
      {HOOK_SENTENCES.map((s) => (
        <Sentence key={s.zh} s={s} f={f} />
      ))}
      {/* the one line that says what is happening, readable from frame 6 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 880,
          textAlign: 'center',
          fontFamily: FONT.serifZh,
          fontWeight: 500,
          fontSize: 88,
          letterSpacing: 6,
          color: INK_SOFT,
          opacity: prog(f, 6, 10),
          transform: `translateY(${(1 - prog(f, 6, 14)) * 24}px)`,
        }}
      >
        看中文，写英文。
      </div>
    </AbsoluteFill>
  );
};
