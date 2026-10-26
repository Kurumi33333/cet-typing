import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Stage } from '../Stage';
import { Grain } from '../components/Light';
import { PaperField } from '../components/PaperField';
import { EASE, FONT, INK, INK_SOFT, PAPER, SLOT, ACCENT } from '../theme';
import { SENTENCE } from '../copy';
import practiceLayout from '../practice-layout.json';
import { SHOTS, type Shot } from '../beat';

/**
 * S3 · 494–755 — the long sentence, the mistake, the fix, and the hand-over.
 *
 * This is the film's proof shot, and it carries FOUR claims, each with its own
 * beat:
 *
 *   1. typing at human speed        f40–196   word by word, 3f per letter
 *   2. a wrong word turns red       f196–214  "hopes" arrives as "hopse";
 *                                              the rule and the word go #db4f56
 *   3. fix it in place, any slot    f214–252  the caret jumps back to that slot,
 *                                              the letters are corrected, it
 *                                              turns green where it stands
 *   4. all correct → next sentence  f258–290  the energy orb walks the sentence,
 *                                              the page advances on its own
 *
 * Why the mistake exists: an earlier cut of this shot showed only clean typing
 * while the caption said "打错的词原位标红，点哪个词槽都能改" — the film claimed a
 * feature it never demonstrated, and the product's error red never appeared in
 * a single frame. A promo that describes a behaviour must show it.
 *
 * The plate is `practice-long-band-clean.png`: the real page's content band at
 * 4x with its own slot row hidden in the DOM before the shutter. The film draws
 * the slots because they have to change colour per word, but they sit on real
 * page pixels — no painted rectangle anywhere.
 */

const LONG = practiceLayout.states.long;

/**
 * The page's own background, sampled from the capture (252,253,252).
 * The film's paper is #f7f9f6 = (247,249,246) — six levels darker, which drew a
 * visible rounded-nothing rectangle around the real-page plate. S3 paints its
 * frame in the PAGE's colour so the plate has no edge to show.
 */
const PAGE_BG = 'rgb(252, 253, 252)';

/** The word that gets misspelt, and how. Index into SENTENCE.words. */
const MISTAKE_INDEX = 2; // "hopes"
const MISTAKE_TYPO = 'hopse';

export const S3_TIMING = {
  bandIn: 6,
  bandDur: 34,
  /** first keystroke */
  typeStart: 30,
  /** 2.2f per letter: the 10-word sentence types out in ~4.1 s of screen time */
  perLetter: 3.0,
  /** gap between words going forward */
  wordHold: 2,
  /** the mistaken word "hopse" finishes typing here and turns red */
  typoAt: 62,
  /** forward typing of the rest of the sentence ends here */
  typeEnd: 158,
  /** the caret jumps back to the mistake and the letters are corrected */
  fixStart: 180,
  fixPerLetter: 5,
  /** the fixed word turns green — the mistake is on screen ~4.5 s in total */
  fixed: 206,
  /** all ten words correct */
  complete: 212,
  /** the energy orb walks the finished sentence */
  flowStart: 218,
  flowPerWord: 1.8,
  flowTrail: 8,
  /** the page advances on its own */
  advance: 236,
} as const;

interface WordTiming {
  word: string;
  slot: { x: number; y: number; w: number; h: number };
  /** the characters as typed in the forward pass (differs for the typo) */
  typed: string;
  letters: number[];
  /** first frame at which the word is fully correct */
  done: number;
}

/**
 * The forward typing pass. The mistaken word types out as its typo and does NOT
 * become correct there — it stays red until the fix beat. Every other word is
 * correct the instant its last letter lands, which is what the product does.
 */
function buildTimings(): WordTiming[] {
  const slots = LONG.bandSlots;
  const out: WordTiming[] = [];
  let cursor = S3_TIMING.typeStart;
  SENTENCE.words.forEach((word, i) => {
    const slot = slots[i] ?? slots[slots.length - 1];
    const typed = i === MISTAKE_INDEX ? MISTAKE_TYPO : word;
    const letters: number[] = [];
    for (let k = 0; k < typed.length; k += 1) letters.push(cursor + k * S3_TIMING.perLetter);
    const typedDone = cursor + typed.length * S3_TIMING.perLetter;
    out.push({
      word,
      slot,
      typed,
      letters,
      done: i === MISTAKE_INDEX ? S3_TIMING.fixed : typedDone,
    });
    cursor = typedDone + S3_TIMING.wordHold;
  });
  return out;
}

/**
 * The foley tables for this shot, derived from the same timing the scene uses.
 * `src/sound.ts` imports these. The review's other finding was that the typing
 * action — the product's atom, ten words long — had no per-keystroke foley at
 * all while S1's three words got twelve; these tables fix that.
 */
const S3_WORDS = buildTimings();
export const S3_WORD_EVENTS = {
  /** absolute shot-local frames of every keystroke, typing order */
  letters: S3_WORDS.flatMap((w) => w.letters.map((f) => Math.round(f))),
  /** when each word becomes fully correct, with its text */
  done: S3_WORDS.map((w) => ({ frame: Math.round(w.done), word: w.word })),
};

const ease = (t: number, b: readonly [number, number, number, number] = EASE.silk) =>
  Easing.bezier(b[0], b[1], b[2], b[3])(t);

/**
 * Advance widths of the film's UI face (Inter 500) at the slot type size, so the
 * underline matches the word it sits under. Same idea as SceneWord's ADVANCE
 * table: the rule must be as long as the type, not as long as the page's box.
 */
const ADVANCE: Record<string, number> = {
  S: 20, h: 19, e: 17, a: 17, l: 8, s: 15, o: 18, p: 19,
  c: 16, d: 19, r: 12, i: 8, n: 19, w: 25, g: 18, t: 11,
  u: 19, y: 16, '.': 8, ',': 8,
};
const ADVANCE_FALLBACK = 18;

export const SceneSentence: React.FC<{ shot?: Shot }> = ({ shot }) => {
  // the workbench can mount this scene standalone (no shot prop): fall back to
  // the real length from the beat table so the exit animation still resolves
  const shotDuration = shot?.duration ?? SHOTS.s3Sentence.duration;
  const frame = useCurrentFrame();
  const words = buildTimings();
  /** same timings, exposed for the row-layout helpers above */
  const words2 = words;

  // Framing.
  //
  // The words are the reason this shot exists, so they have to be readable at
  // phone size: the rule is a 56 px minimum ink height for anything the audience
  // must read. At the page's own 22 px (scaled with the band) the English set is
  // only ~27 px of cap height — legible on a desktop monitor, unreadable in a
  // 480 px-wide re-encode. Ten words at 56 px do not fit on one line of 1080p,
  // and neither do they in the real product: the practice stage wraps long
  // sentences onto a second row. So this shot wraps the same way — two rows of
  // five — which lets the type run at the readable size while still sitting in
  // the page's captured slot geometry.
  const ROW_BREAK_AT = 5;

  /** rows of word indices, mirroring how the real stage wraps a long sentence */
  const rows: number[][] = [];
  for (let i = 0; i < SENTENCE.words.length; i += 1) {
    const r = Math.floor(i / ROW_BREAK_AT);
    rows[r] = rows[r] ?? [];
    rows[r].push(i);
  }

  const BAND_SCALE = 1.85;
  /**
   * Type size in canvas px. 56 px of cap height ≈ 84 px of font size for the
   * UI face; we use 76 px, which measures ~57 px of cap height after the
   * anti-aliasing and still leaves the two rows inside the frame.
   */
  // 88px overflowed the card (row 0 measured x=127..1793 against a card of
  // 170..1750). 72px keeps the same two-row layout inside the card and still
  // measures ~69px of ink — well past the 56px readability floor.
  const SLOT_FONT = 72;
  /** extra vertical gap between the two wrapped rows */
  const ROW_GAP = 44;

  /** rendered width of a word at the film's slot type size, in canvas px */
  const wordWidth = (word: string): number => {
    const perChar = SLOT_FONT / 22; // the ADVANCE table is in page px at 22px
    return [...word].reduce((sum, ch) => sum + (ADVANCE[ch] ?? ADVANCE_FALLBACK) * perChar, 0);
  };
  /** total width of a wrapped row, including the gaps between slots */
  const rowWidth = (indices: number[]): number => {
    const gap = 22 * (SLOT_FONT / 22) * 0.55;
    return indices.reduce((sum, i) => sum + Math.max(24, wordWidth(words2[i].word)), 0) + gap * (indices.length - 1);
  };

  /**
   * Row layout: the film wraps the sentence onto two rows exactly as the real
   * practice stage does for a long sentence. Each word gets a row and an x
   * inside that row; the captured plate behind is kept only for the Chinese
   * prompt, which stays the product's own pixels.
   */
  const SLOT_GAP_PX = 22 * (SLOT_FONT / 22) * 0.55;
  const layout = rows.map((indices) => {
    const widths = indices.map((i) => Math.max(24, wordWidth(words2[i].word)));
    const total = widths.reduce((a, b) => a + b, 0) + SLOT_GAP_PX * (indices.length - 1);
    let x = (1920 - total) / 2;
    return indices.map((i, n) => {
      const item = { index: i, x, w: widths[n] };
      x += widths[n] + SLOT_GAP_PX;
      return item;
    });
  });
  const rowTop = (rowIdx: number) => 430 + rowIdx * (SLOT_FONT + ROW_GAP);
  /** where a given word sits, by index */
  const slotOf = (i: number) => {
    for (let r = 0; r < layout.length; r += 1) {
      const hit = layout[r].find((it) => it.index === i);
      if (hit) return { ...hit, row: r, top: rowTop(r) };
    }
    return { index: i, x: 0, w: 0, row: 0, top: rowTop(0) };
  };
  void rowWidth;

  const bandW = LONG.band.w * BAND_SCALE;
  const bandH = LONG.band.h * BAND_SCALE;
  const bandLeft = (1920 - bandW) / 2;
  // the plate only carries the Chinese prompt now; the English is drawn on the
  // canvas itself (see the layer note in the JSX), so the plate sits higher.
  const bandTop = 168;

  // one slow continuous push, no reversals
  const push = interpolate(frame, [0, 260], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.33, 0, 0.24, 1),
  });
  /**
   * A slow SCALE is the one camera move that is safe on live text: scaling is a
   * resample of the composited layer, so Chromium never re-snaps individual
   * glyphs — there is no flicker. A slow TRANSLATE is the one that is not: the
   * type re-rasterises at every half-pixel crossing.
   *
   * History: this shot used to have both (a 1.05 scale and a 30px drift). The
   * drift caused 63,000 changed pixels in a single frame, so both were removed —
   * and the shot went completely static, which is what read as "不丝滑". The
   * correct fix is to keep the scale, drop the drift.
   */
  const zoom = 0.985 + push * 0.045;
  /** no translate, ever, on type that has already landed */
  const drift = 0;

  const bandIn = interpolate(frame, [S3_TIMING.bandIn, S3_TIMING.bandIn + S3_TIMING.bandDur], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => ease(t),
  });

  // the error state: red from the moment the typo completes until it is fixed
  const isWrong = (i: number) =>
    i === MISTAKE_INDEX && frame >= S3_TIMING.typoAt && frame < S3_TIMING.fixed;
  const wrongBlend = (i: number) =>
    i === MISTAKE_INDEX
      ? interpolate(frame, [S3_TIMING.typoAt, S3_TIMING.typoAt + 4, S3_TIMING.fixed, S3_TIMING.fixed + 4], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        })
      : 0;
  const allComplete = frame >= S3_TIMING.complete;

  // the energy orb (product: .sentence-flow-orb) walks the finished sentence
  const flowSpan = words.length * S3_TIMING.flowPerWord;
  const flowActive = frame >= S3_TIMING.flowStart && frame < S3_TIMING.flowStart + flowSpan + S3_TIMING.flowTrail;
  const flowIndex = Math.min(
    words.length - 1,
    Math.max(0, Math.floor((frame - S3_TIMING.flowStart) / S3_TIMING.flowPerWord)),
  );
  const flowFade = interpolate(
    frame,
    [S3_TIMING.flowStart, S3_TIMING.flowStart + 4, S3_TIMING.flowStart + flowSpan, S3_TIMING.flowStart + flowSpan + S3_TIMING.flowTrail],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // the page advances: the band lifts and eases out, the next question would come
  const advance = interpolate(frame, [S3_TIMING.advance, shotDuration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => ease(t, EASE.inOut),
  });

  const orbX = flowActive ? (words[flowIndex].slot.x + words[flowIndex].slot.w / 2) * BAND_SCALE : 0;
  const orbY = flowActive ? (words[flowIndex].slot.y + words[flowIndex].slot.h / 2) * BAND_SCALE : 0;

  // the caret: sits at the end of the word currently being typed, and returns
  // to the mistaken slot for the fix — this is the "点哪个词槽都能改" moment
  const caretWordIndex = frame < S3_TIMING.typoAt
    ? words.findIndex((w, i) => frame >= w.letters[0] && frame < w.done)
    : frame < S3_TIMING.fixed
      ? MISTAKE_INDEX
      : -1;
  const caretOn = Math.floor(frame / 3) % 2 === 0;

  /**
   * How far into the active word the caret sits, in canvas px.
   * Derived from the keystrokes actually delivered so far: during the forward
   * pass that is the count of landed letters of the typo, during the fix it is
   * how many corrected letters have been replaced.
   */
  const caretAdvance = (() => {
    if (caretWordIndex < 0) return 0;
    const w = words[caretWordIndex];
    const typed = caretWordIndex === MISTAKE_INDEX ? MISTAKE_TYPO : w.word;
    let n = 0;
    if (caretWordIndex === MISTAKE_INDEX && frame >= S3_TIMING.fixStart) {
      // during the fix the caret walks forward with each corrected letter
      n = Math.min(
        w.word.length,
        Math.max(0, Math.floor((frame - S3_TIMING.fixStart) / S3_TIMING.fixPerLetter) + 1),
      );
    } else {
      n = w.letters.filter((lf) => frame >= lf + 1).length;
    }
    const perChar = SLOT_FONT / 22;
    return [...typed].slice(0, n).reduce((sum, ch) => sum + (ADVANCE[ch] ?? ADVANCE_FALLBACK) * perChar, 0);
  })();

  return (
    <Stage>
      {/* the same paper ground as the rest of the film, so this shot belongs to
          the same film rather than being a screenshot pasted on white */}
            {/* pitch=0 here meant NO grid, so the breathing field produced almost no
          pixel change and the shot froze between keystrokes (51% dead frames).
          The grid is the thing that makes a still frame feel alive. */}
      <PaperField intensity={1.0} lightX={0.5} lightY={0.4} pitch={78} />

      {/* the practice card, at its own depth: everything (real page strip, the
          two rows of words, the caret) lives on this surface and rises out of
          the paper together, so the shot has a subject with a position */}
      <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: '50% 46%' }}>
        <div
          style={{
            position: 'absolute',
            left: 170,
            top: 96,
            width: 1580,
            height: 812,
            borderRadius: 16,
            background: PAPER,
            boxShadow: `
              0 30px 70px rgba(38,52,47,0.14),
              0 1px 0 rgba(255,255,255,0.9) inset,
              0 0 0 1px rgba(38,52,47,0.05)
            `,
            transform: `rotateX(${(1 - bandIn) * 5}deg) scale(${1 + (1 - bandIn) * 0.02})`,
            transformStyle: 'preserve-3d',
            opacity: bandIn,
            overflow: 'hidden',
          }}
        >
          {/* the page's own top bar, matching S1's card */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: 62,
              borderBottom: '1px solid rgba(38,52,47,0.07)',
              display: 'flex',
              alignItems: 'center',
              paddingInline: 36,
              fontFamily: FONT.ui,
              fontSize: 16,
              color: '#708077',
            }}
          >
            <span>← 返回</span>
            <span style={{ marginInline: 'auto', color: '#8b968e', letterSpacing: '0.06em' }}>四级 · 练习</span>
            <span>04 / 10&nbsp;&nbsp;&nbsp;设置 ⌄</span>
          </div>
          <div style={{ position: 'absolute', left: 36, right: 36, top: 62, height: 3, background: '#e4ebe4' }}>
            <div style={{ height: '100%', width: '40%', background: '#77a993', borderRadius: 3 }} />
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
        {/* the real-page strip: the Chinese prompt only. It sits inside the card
            above, so it inherits the card's position and depth. */}
        <div
          style={{
            position: 'absolute',
            left: bandLeft,
            top: bandTop,
            width: bandW,
            height: bandH,
            opacity: bandIn * (1 - advance * 0.55),
          }}
        >
          {/* the REAL page: eyebrow + Chinese prompt, in the page's own pixels
              (captured with the slot row hidden in the DOM) */}
          <Img
            src={staticFile('textures/live/practice-long-band-clean.png')}
            style={{ position: 'absolute', inset: 0, width: bandW, height: bandH, display: 'block' }}
          />
        </div>

        {/* the words layer: canvas coordinates, two wrapped rows */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: bandIn * (1 - advance * 0.55),
            /**
             * ⚠ 这里曾经是 translateY(advance * -46)——整行词槽连续上移。
             *
             * 连续位移会让每个字形每一帧都重新栅格化，实测单帧 39,752 个像素
             * 在跳（f743），观感是"字在抖"。整像素量化能治闪烁，但会变成每几帧
             * 跳 1px 的"卡"。两条路都不对。
             *
             * 结论：**已经在读的文字不许平移。** 翻页的动感交给不透明度和卡片
             * 本身（卡片位移是整层重采样，安全）。产品自己的交互也是这样：读的
             * 时候字不动，动的时候不看字。
             */
            transform: 'none',
          }}
        >

          {/* the slots, laid out on the two wrapped rows. Rule grammar is the
              product's own: idle grey → active purple while being typed →
              correct green when the word is right → error red when it is wrong.
              The rule is measured from the WORD's own rendered width, not from
              the page's slot box (the film sets type larger than the page, so
              the captured box is too wide and the underline ran past the last
              letter — visible as a red rule dangling after "hop"). */}
          {words.map((w, i) => {
            const started = frame >= w.letters[0];
            const finished = frame >= w.done;
            const wrong = isWrong(i);
            const blend = wrongBlend(i);
            const pos = slotOf(i);
            const ruleColor = wrong
              ? SLOT.wrong.border
              : finished
                ? SLOT.correct.border
                : started
                  ? SLOT.active.border
                  : SLOT.idle.border;
            return (
              <div
                key={`rule-${i}`}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.top + SLOT_FONT + 10,
                  width: pos.w,
                  height: 4,
                  borderRadius: 2,
                  background: ruleColor,
                  boxShadow: wrong ? `0 0 ${10 * blend}px rgba(219,79,86,${0.55 * blend})` : undefined,
                }}
              />
            );
          })}

          {/* the words, on the two wrapped rows */}
          {words.map((w, i) => {
            const finished = frame >= w.done;
            const wrong = isWrong(i);
            const typed = i === MISTAKE_INDEX ? MISTAKE_TYPO : w.word;
            const pos = slotOf(i);
            // the fix: letters are replaced one by one from the first wrong one
            const firstDiff = (() => {
              for (let k = 0; k < Math.max(typed.length, w.word.length); k += 1) {
                if (typed[k] !== w.word[k]) return k;
              }
              return typed.length;
            })();
            return (
              <div
                key={`${w.word}-${i}`}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.top,
                  width: pos.w,
                  height: SLOT_FONT * 1.28,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-start',
                }}
              >
                <div
                  style={{
                    fontFamily: FONT.ui,
                    fontWeight: 500,
                    fontSize: SLOT_FONT,
                    lineHeight: 1,
                    letterSpacing: 0,
                    whiteSpace: 'nowrap',
                    color: wrong ? SLOT.wrong.color : finished ? SLOT.correct.color : INK,
                    paddingBottom: 8,
                    display: 'flex',
                    // the error shake: the product's own .slot-incorrect motion
                    transform: wrong
                      ? `translateX(${interpolate(frame, [S3_TIMING.typoAt, S3_TIMING.typoAt + 8], [0, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`
                      : undefined,
                  }}
                >
                  {w.word.split('').map((_, k) => {
                    // Each position shows EITHER the typo letter or the correct
                    // one — never both. The old code kept the previous glyph
                    // mounted and cross-faded, so during the fix you could read
                    // "hopse" and "hopes" superimposed at the same time.
                    const fixAt = S3_TIMING.fixStart + Math.max(0, k - firstDiff) * S3_TIMING.fixPerLetter;
                    const isMistake = i === MISTAKE_INDEX;
                    const beforeFix = isMistake && frame < fixAt;
                    const shownChar = beforeFix ? (typed[k] ?? '') : (w.word[k] ?? '');
                    const enterT = interpolate(frame, [w.letters[k] ?? 0, (w.letters[k] ?? 0) + 4], [0, 1], {
                      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (v) => ease(v, EASE.press),
                    });
                    // the corrected letter gets its own tiny pop when it swaps in
                    const swapAt = isMistake ? fixAt : -1;
                    const swapT = isMistake && frame >= swapAt
                      ? interpolate(frame, [swapAt, swapAt + 5], [0, 1], {
                          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (v) => ease(v, EASE.press),
                        })
                      : 1;
                    const visible = isMistake ? (frame >= w.letters[0] ? 1 : enterT) : enterT;
                    const lift = isMistake && frame >= swapAt ? (1 - swapT) * -8 : 0;
                    return (
                      <span
                        key={k}
                        style={{
                          display: 'inline-block',
                          opacity: visible,
                          // rounded: a sub-pixel lift re-snaps the glyph to the pixel
                          // grid, so the letter flickers crisp/soft while it rises
                          transform: `translateY(${Math.round(lift)}px) scale(${0.9 + 0.1 * (isMistake ? Math.min(1, visible) : visible)})`,
                        }}
                      >
                        {shownChar}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* the caret: where the next keystroke lands */}
          {caretWordIndex >= 0 ? (() => {
            const pos = slotOf(caretWordIndex);
            return (
              <div
                style={{
                  position: 'absolute',
                  // rides the END OF WHAT HAS BEEN TYPED so far — it tracks the
                  // actual keystrokes, including while the typo is being fixed
                  left: pos.x + Math.max(6, caretAdvance) + 3,
                  top: pos.top + 6,
                  width: 4,
                  height: SLOT_FONT * 0.92,
                  borderRadius: 2,
                  background: isWrong(MISTAKE_INDEX) && caretWordIndex === MISTAKE_INDEX ? SLOT.wrong.color : SLOT.active.border,
                  opacity: caretOn ? 0.95 : 0.2,
                }}
              />
            );
          })() : null}

          {/* the energy orb + its halo, straight from the product's own grammar */}
          {flowActive ? (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #ffffff 0%, #7fe3bf 38%, rgba(127,227,191,0) 72%)',
                boxShadow: '0 0 30px rgba(127,227,191,0.75)',
                transform: `translate(${orbX}px, ${orbY}px) scale(${0.7 + flowFade * 0.5})`,
                opacity: flowFade * 0.95,
                mixBlendMode: 'screen',
              }}
            />
          ) : null}

          {/* the completion wash across the whole band */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse at 50% 62%, rgba(105,166,138,${0.18 * interpolate(frame, [S3_TIMING.complete, S3_TIMING.complete + 8, S3_TIMING.complete + 34], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}) 0%, rgba(105,166,138,0) 58%)`,
              pointerEvents: 'none',
            }}
          />
        </div>
      </AbsoluteFill>

      {/* the film's own type: a small eyebrow ABOVE the card, never on it.
          (It used to sit at top:92 — exactly the card's top edge — so the two
          lines of film type landed on the card's own chrome and read as a
          collision.) */}
      <div
        style={{
          position: 'absolute',
          left: 174,
          top: 30,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 18,
          opacity: interpolate(frame, [S3_TIMING.bandIn + 8, S3_TIMING.bandIn + 30], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          }) * (1 - advance * 0.8),
        }}
      >
        <span style={{ fontFamily: FONT.ui, fontSize: 19, letterSpacing: '0.18em', color: ACCENT }}>
          四级 · 中译英练习
        </span>
        <span style={{ fontFamily: FONT.serifZh, fontWeight: 500, fontSize: 23, letterSpacing: '0.01em', color: INK_SOFT }}>
          一个词槽一个词，打完自己跳下一句
        </span>
      </div>

      {/* The error beat's explanation is the CAPTION's job (components/Caption
          already says "打错的词原位标红，点哪个词槽都能改"), timed to this beat.
          An earlier cut also put a second label here, and the two lines collided
          — one claim, one line of type, never both. */}

      {/* the "every word correct" moment, stated once */}
      <div
        style={{
          position: 'absolute',
          left: 118,
          bottom: 104,
          fontFamily: FONT.ui,
          fontSize: 34,
          letterSpacing: '0.02em',
          color: ACCENT,
          opacity: interpolate(frame, [S3_TIMING.advance - 22, S3_TIMING.advance], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          }) * (1 - advance * 0.85),
        }}
      >
        {allComplete ? '全部拼对 · 立刻进入下一句' : ''}
      </div>

    </Stage>
  );
};
