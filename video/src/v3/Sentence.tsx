import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { dampedSettle } from '../helpers/motion';
import { Display, MINT, RED, Reveal, SlotWord, Stage, WHITE, inOut, letterFrames, mix, prog, silk } from './kit';

/**
 * SENTENCE · beat 20–32. The long sentence, typed at speed, with the one thing
 * the product is built around shown for real: a wrong word turns red in place,
 * the caret goes back to that slot and fixes it, and the moment every slot is
 * right the page moves on by itself.
 *
 * All frames are local to the shot (shot starts at beat 20 = f290).
 */
export const SENTENCE_ZH = '她也希望她的孩子可以受到良好的教育。';

interface W {
  text: string;
  start: number;
  step: number;
  row: 0 | 1;
}

/** Timing is hand-placed so the last word completes ON beat 29 (local f131). */
const WORDS: W[] = [
  { text: 'She', start: 8, step: 2, row: 0 },
  { text: 'also', start: 16, step: 2, row: 0 },
  { text: 'hopse', start: 25, step: 2, row: 0 }, // the typo — fixed to "hopes" at FIX_AT
  { text: 'her', start: 56, step: 2, row: 0 },
  { text: 'children', start: 63, step: 2, row: 0 },
  { text: 'will', start: 82, step: 2, row: 1 },
  { text: 'get', start: 92, step: 2, row: 1 },
  { text: 'a', start: 99, step: 2, row: 1 },
  { text: 'good', start: 102, step: 2, row: 1 },
  { text: 'education.', start: 112, step: 2, row: 1 },
];
const TYPO_INDEX = 2;
export const SENT_TIMING = {
  wrongAt: 34,
  fixAt: 46,
  allDone: 131,
  sweepStart: 132,
  pageOut: 154,
  captionTwo: 138,
} as const;

/** Local frames of every keystroke — the sound table reads this. */
export const SENT_LETTERS: number[] = [
  ...WORDS.flatMap((w) => letterFrames(w.start + (w.text.length - 1) * w.step, w.text.length, w.step)),
  // the two retyped letters of the fix
  SENT_TIMING.fixAt,
  SENT_TIMING.fixAt + 2,
];
/** Local frame each word turns green. */
export const SENT_WORD_DONE: number[] = WORDS.map((w, i) =>
  i === TYPO_INDEX ? SENT_TIMING.fixAt + 3 : w.start + (w.text.length - 1) * w.step + 1,
);

const SIZE = 128;

export const Sentence: React.FC = () => {
  const f = useCurrentFrame();
  const out = prog(f, SENT_TIMING.pageOut, 20, inOut);
  const stamp = prog(f, 0, 10);

  const shake = f >= SENT_TIMING.wrongAt ? dampedSettle(f - SENT_TIMING.wrongAt, 0.16, 0.2) * 14 : 0;
  const sweep = prog(f, SENT_TIMING.sweepStart, 18, silk);

  const rows: React.ReactNode[][] = [[], []];
  WORDS.forEach((w, i) => {
    const isTypo = i === TYPO_INDEX;
    const fixed = isTypo && f >= SENT_TIMING.fixAt;
    const text = isTypo && fixed ? 'hopes' : w.text;
    const frames = letterFrames(w.start + (w.text.length - 1) * w.step, w.text.length, w.step);
    // after the fix the last two letters are re-typed
    const effFrames = isTypo && fixed ? [frames[0], frames[1], frames[2], SENT_TIMING.fixAt, SENT_TIMING.fixAt + 2] : frames;
    const count = effFrames.filter((lf) => f >= lf).length;
    const ages = effFrames.map((lf) => f - lf);
    const lastLetter = effFrames[effFrames.length - 1];
    const done = f >= (isTypo ? SENT_TIMING.fixAt + 3 : lastLetter + 1);
    const wrong = isTypo && f >= SENT_TIMING.wrongAt && !fixed;
    const started = f >= effFrames[0] - 1;
    const state = wrong ? 'wrong' : done ? 'correct' : started ? 'active' : 'idle';
    const lineP = prog(f, 4 + i * 2, 12);
    const greenP = prog(f, (isTypo ? SENT_TIMING.fixAt + 3 : lastLetter + 1), 6);
    const sweptGreen = f >= SENT_TIMING.sweepStart ? sweep : 0;
    rows[w.row].push(
      <div key={i} style={{ transform: wrong ? `translateX(${shake}px)` : undefined }}>
        <SlotWord
          text={text}
          count={count}
          ages={ages}
          size={SIZE}
          state={state}
          caret={((started && !done) || wrong) && Math.floor(f / 3) % 2 === 0}
          line={lineP}
          color={wrong ? RED : mix('#f5f5f7', '#a9e6c9', Math.max(greenP, sweptGreen) * 0.9)}
          glow={wrong ? 0 : 0}
        />
      </div>,
    );
  });

  // captions: one for the fix, one for the finish
  const capA = prog(f, SENT_TIMING.wrongAt + 2, 14);
  const capAOut = prog(f, SENT_TIMING.allDone - 4, 8);
  const capB = prog(f, SENT_TIMING.captionTwo, 14);

  return (
    <AbsoluteFill>
      <Stage t={prog(f, 0, 175, (t) => t)} ax={50} ay={0} bx={50} by={105} />
      <AbsoluteFill
        style={{
          opacity: 1 - out,
          filter: out > 0 ? `blur(${out * 20}px)` : undefined,
          transform: `scale(${1 + out * 0.14})`,
        }}
      >
        <div style={{ position: 'absolute', left: 0, right: 0, top: 100, display: 'flex', justifyContent: 'center' }}>
          <Reveal p={stamp}>
            <Display size={92} color={WHITE}>{SENTENCE_ZH}</Display>
          </Reveal>
        </div>
        {rows.map((row, r) => (
          <div
            key={r}
            style={{ position: 'absolute', left: 0, right: 0, top: 340 + r * 220, display: 'flex', justifyContent: 'center', gap: SIZE * 0.2 }}
          >
            {row}
          </div>
        ))}

        <div style={{ position: 'absolute', left: 0, right: 0, top: 850, display: 'flex', justifyContent: 'center', opacity: 1 - capAOut }}>
          <Reveal p={capA}>
            <Display size={84} color={f >= SENT_TIMING.fixAt + 3 ? MINT : RED}>打错的，原位改。</Display>
          </Reveal>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 850, display: 'flex', justifyContent: 'center' }}>
          <Reveal p={capB}>
            <Display size={84} color={MINT}>全部拼对，立刻下一句。</Display>
          </Reveal>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
