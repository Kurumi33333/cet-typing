import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { beatF } from '../beat';
import {
  DIM, Display, Grad, MINT, Reveal, SlotWord, Stage, WHITE, expo, inOut, letterFrames, mix, prog, silk,
} from './kit';

/**
 * HOOK · beat 0–8. Two sentences typed to the grid: every word finishes ON a
 * beat, the second sentence types faster than the first (3f → 2f a letter).
 */
export interface HookSentence {
  zh: string;
  words: string[];
  beats: number[];
  step: number;
  size: number;
  start: number;
  leave: number;
}

export const HOOK_SENTENCES: HookSentence[] = [
  { zh: '我喜欢茶。', words: ['I', 'like', 'tea.'], beats: [1, 2, 3], step: 3, size: 300, start: 0, leave: 54 },
  { zh: '我们爱英语。', words: ['We', 'love', 'English.'], beats: [5, 6, 7], step: 2, size: 214, start: 58, leave: 999 },
];

export const HOOK_LETTERS: number[] = HOOK_SENTENCES.flatMap((s) =>
  s.words.flatMap((w, i) => letterFrames(beatF(s.beats[i]), w.length, s.step)),
);
export const HOOK_WORD_DONE: number[] = HOOK_SENTENCES.flatMap((s) => s.beats.map((b) => beatF(b) + 1));

const Sentence: React.FC<{ s: HookSentence; f: number }> = ({ s, f }) => {
  const enter = prog(f, s.start, 16);
  const leave = prog(f, s.leave, 9, inOut);
  const last = beatF(s.beats[s.beats.length - 1]);
  const doneP = prog(f, last + 1, 24, silk);
  const sweep = prog(f, last + 1, 40, silk);
  const drift = prog(f, s.start, 70, (t) => t);

  return (
    <AbsoluteFill
      style={{
        opacity: 1 - leave,
        filter: leave > 0 ? `blur(${leave * 18}px)` : undefined,
        transform: `scale(${1 + 0.05 * drift + leave * 0.12})`,
        transformOrigin: '50% 52%',
      }}
    >
      <div style={{ position: 'absolute', left: 0, right: 0, top: 120, display: 'flex', justifyContent: 'center' }}>
        <Reveal p={enter}>
          <Display size={132} color={WHITE}>{s.zh}</Display>
        </Reveal>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: s.size > 250 ? 400 : 420,
          display: 'flex',
          justifyContent: 'center',
          gap: s.size * 0.14,
        }}
      >
        {s.words.map((w, i) => {
          const frames = letterFrames(beatF(s.beats[i]), w.length, s.step);
          const count = frames.filter((lf) => f >= lf).length;
          const ages = frames.map((lf) => f - lf);
          const done = f >= beatF(s.beats[i]) + 1;
          const started = f >= frames[0] - 2;
          const lineIn = prog(f, s.start + 6 + i * 4, 16, silk);
          const green = prog(f, beatF(s.beats[i]) + 1, 8, silk);
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
              color={mix('#f5f5f7', '#a9e6c9', green * 0.85)}
              glow={done ? 0.7 * (1 - doneP) * green : 0}
            />
          );
        })}
      </div>
      {/* the gradient passes once over the finished sentence */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: s.size > 250 ? 400 + s.size * 1.26 : 420 + s.size * 1.26,
          height: 6,
          margin: '0 auto',
          width: 520 * sweep,
          borderRadius: 6,
          background: `linear-gradient(90deg, rgba(169,230,201,0), ${MINT}, rgba(143,180,255,0))`,
          opacity: sweep > 0 && sweep < 1 ? 0.9 : 0,
        }}
      />
    </AbsoluteFill>
  );
};

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage t={prog(f, 0, 116, (t) => t)} />
      {HOOK_SENTENCES.map((s) => (
        <Sentence key={s.zh} s={s} f={f} />
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 880, display: 'flex', justifyContent: 'center' }}>
        <Reveal p={prog(f, 8, 18, expo)}>
          <Display size={76} weight={500} color={DIM} style={{ letterSpacing: '0.12em' }}>
            看中文，<Grad shift={prog(f, 8, 100, (t) => t) * 0.6}>写英文</Grad>。
          </Display>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};
