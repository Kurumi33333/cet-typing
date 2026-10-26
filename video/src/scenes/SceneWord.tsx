import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Stage } from '../Stage';
import { Underline, drawOn, lockPulse } from '../components/Rule';
import { Grain } from '../components/Light';
import { PaperField } from '../components/PaperField';
import { EASE, FONT, INK, INK_SOFT, SLOT, ACCENT, PAPER } from '../theme';
import type { Shot } from '../beat';
import { HERO } from '../copy';
import frameLayout from '../practice-layout.json';

/**
 * S1 · 0–232 —— 开场。
 *
 * ── 重构说明 ──────────────────────────────────────────────────────────────
 * 旧版：一整块空气白的背景上，中文和三个词居中出现。六帧并排看没有一张有
 * 空间感，读作 PPT。新版的构图是**一个有纵深的场景**：
 *
 *   后景  真实练习页的元素（弱化、失焦、偏一侧）——证明这是真产品
 *   中景  一张从纸面浮起的「练习卡」：顶部是真实页面的中文提示纹理
 *   前景  词槽与字母，落在卡上，投影落回纸面
 *
 * 相机的动作是**推近 + 轻微侧移**（不是缩放文字），三层以不同速度位移，
 * 于是画面有厚度。中文提示直接使用真实页面的 4x 纹理，不是重排的字。
 */

const SLOT_GAP = 34;

export const S1_TIMING = {
  ruleDraw: 0,
  ruleDrawDur: 30,
  chineseIn: 22,
  chineseStep: 4,
  chineseDur: 13,
  slotsOpen: 34,
  slotsStep: 7,
  slotsDur: 22,
  typeStart: 62,
  perLetter: 7,
  wordGap: 4,
  complete: 146,
} as const;

const ADVANCE: Record<string, number> = {
  I: 22, l: 17, i: 17, k: 33, e: 31, t: 22, a: 31, s: 26, h: 33, o: 33, r: 24,
};
const ADVANCE_FALLBACK = 30;
const advanceOf = (word: string): number =>
  [...word].reduce((sum, ch) => sum + (ADVANCE[ch] ?? ADVANCE_FALLBACK), 0);

interface WordTiming {
  word: string; start: number; letters: number[]; done: number; box: number;
}

export function s1WordTimings(): WordTiming[] {
  const out: WordTiming[] = [];
  let cursor = S1_TIMING.typeStart;
  for (const word of HERO.words) {
    const letters: number[] = [];
    for (let i = 0; i < word.length; i += 1) letters.push(cursor + i * S1_TIMING.perLetter);
    const done = cursor + word.length * S1_TIMING.perLetter;
    out.push({ word, start: cursor, letters, done, box: Math.round(advanceOf(word)) + 40 });
    cursor = done + S1_TIMING.wordGap;
  }
  return out;
}

const S1_TIMINGS = s1WordTimings();
export const S1_LETTERS: number[] = S1_TIMINGS.flatMap((w) => w.letters);
export const S1_WORD_DONE: number[] = S1_TIMINGS.map((w) => w.done);

const ease = (t: number, bezier: readonly [number, number, number, number] = EASE.silk) =>
  Easing.bezier(bezier[0], bezier[1], bezier[2], bezier[3])(t);

/** the real page's prompt block, used as the card's own header */
const BAND = frameLayout.states.short.band;
const BAND_BOXES = frameLayout.states.short.bandBoxes;

export const SceneWord: React.FC<{ shot?: Shot }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const f = frame;
  void shot;

  const words = S1_TIMINGS;
  const caretOn = Math.floor(f / 3) % 2 === 0;

  // ---- camera ----
  //
  // ⚠ 这里是整支片子"抖动"的根因，解法是反直觉的：**卡片不许漂**。
  //
  // 两种让卡片动起来的做法都有问题：
  //   A 连续亚像素位移 → Chromium 对字形整像素重排，字一会儿糊一会儿锐。
  //     实测文字边缘的帧间变化是平坦区的 8.8 倍，观感是"抖"。
  //   B 位移 round 到整像素 → 每 ~7 帧跳 1px，观感是"卡"。
  //
  // 所以：**文字钉死在整像素上，一直保持最锐**，运动交给别的层——纸面地板
  // 在呼吸、光在移动、投影在变。观众看到画面一直在动，而字永远是干净的。
  // 这与产品自身的 UI 做法一致：读的时候不动，动的时候不看。
  //
  // 卡片仍然可以 scale（缩放是重采样，不会触发字形重排），所以推镜感保留。
  const push = interpolate(f, [0, 232], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.33, 0, 0.24, 1),
  });
  const camScale = 0.93 + push * 0.13;
  const camX = 0;
  const camY = 0;

  // the card rises out of the paper at the start and settles
  const rise = interpolate(f, [4, 46], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => ease(t),
  });

  const pulse = interpolate(
    f,
    [S1_TIMING.complete, S1_TIMING.complete + 12, S1_TIMING.complete + 34],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0, 0.4, 1) },
  );

  const landedCount = (i: number) => words[i].letters.filter((lf) => f >= lf + 1).length;

  // the card's on-screen geometry (canvas px)
  const CARD_W = 1280;
  const CARD_H = 560;
  const CARD_X = (1920 - CARD_W) / 2;
  const CARD_Y = 150;

  return (
    <Stage>
      {/* ---------------------------------------------- back: the paper itself */}
      <PaperField intensity={0.9} lightX={0.5} lightY={0.32} pitch={88} drift={push * 26} />

      <AbsoluteFill style={{ perspective: 2000, perspectiveOrigin: '50% 44%' }}>
        {/* ---------------------------------------- mid: the card, in space */}
        <div
          style={{
            position: 'absolute',
            left: CARD_X + camX * 0.4,
            top: CARD_Y + camY * 0.4 + (1 - rise) * 90,
            width: CARD_W,
            height: CARD_H,
            transform: `scale(${camScale}) rotateX(${(1 - rise) * 7 + 2.6 - push * 2.2}deg) rotateY(${-9 + push * 7}deg) rotateZ(${(1 - rise) * -0.5 + push * 0.35}deg)`,
            transformStyle: 'preserve-3d',
            opacity: 0.4 + rise * 0.6,
            borderRadius: 10,
            background: PAPER,
            boxShadow: `
              0 ${(34 - rise * 10)}px ${86 - rise * 26}px rgba(38,52,47,${0.16 + (1 - rise) * 0.06}),
              0 1px 0 rgba(255,255,255,0.9) inset,
              0 0 0 1px rgba(38,52,47,0.055)
            `,
            overflow: 'hidden',
          }}
        >
          {/* ── the card is the REAL practice screen, rebuilt at card scale ──
              A blank card with one line of Chinese in it reads as a slide. The
              product's screen has a top bar (level · counter · settings), a
              progress track, the unit name and the instruction line; without
              them the card is furniture, not a product. Everything here is the
              page's own copy, at the page's own colours. */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: 74,
              borderBottom: '1px solid rgba(38,52,47,0.07)',
              display: 'flex',
              alignItems: 'center',
              paddingInline: 44,
              fontFamily: FONT.ui,
              fontSize: 17,
              color: '#708077',
              opacity: interpolate(f, [6, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            <span style={{ letterSpacing: '0.02em' }}>← 返回</span>
            <span style={{ marginInline: 'auto', color: '#8b968e', letterSpacing: '0.06em' }}>四级 · 练习</span>
            <span style={{ letterSpacing: '0.04em' }}>01 / 10&nbsp;&nbsp;&nbsp;设置 ⌄</span>
          </div>

          {/* progress track: the page's own 3px line, filled to 1/10 */}
          <div style={{ position: 'absolute', left: 44, right: 44, top: 74, height: 3, background: '#e4ebe4' }}>
            <div
              style={{
                height: '100%',
                width: `${interpolate(f, [10, 40], [0, 10], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}%`,
                background: '#77a993',
                borderRadius: 3,
              }}
            />
          </div>

          {/* unit name */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 92,
              textAlign: 'center',
              fontFamily: FONT.ui,
              fontSize: 17,
              letterSpacing: '0.1em',
              color: '#8b968e',
              opacity: interpolate(f, [12, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            01 / 08&nbsp;&nbsp;从一个词开始&nbsp;&nbsp;⌄
          </div>

          {/* the card's header is the REAL page's prompt block, at 4x, cropped */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 122,
              height: 168,
              overflow: 'hidden',
            }}
          >
            <Img
              src={staticFile('textures/live/practice-short-band-clean.png')}
              style={{
                position: 'absolute',
                // scale the 850px-wide band to the card, crop to its prompt rows
                width: CARD_W * (850 / BAND.w),
                left: -(CARD_W / BAND.w) * 0,
                top: -(BAND_BOXES.eyebrow.y - 4) * (CARD_W / BAND.w),
                display: 'block',
              }}
            />
            {/* fade the very bottom of the header into the card so the film's
                own slot row can begin without a seam */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 60,
                background: `linear-gradient(180deg, rgba(247,249,246,0) 0%, ${PAPER} 92%)`,
              }}
            />
          </div>

          {/* the card's own ruling: the product's slot grammar, drawn large */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 290 }}>
            {/* the page's own hint line, exactly as it prints it */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 34,
                textAlign: 'center',
                fontFamily: FONT.ui,
                fontSize: 15,
                letterSpacing: '0.04em',
                color: '#9aa69d',
                opacity: interpolate(f, [26, 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              }}
            >
              ⌨ 空格 / 方向键切换 · Enter 检查
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 84,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SLOT_GAP,
              }}
            >
              {words.map((w, wi) => {
                const openAt = S1_TIMING.slotsOpen + wi * S1_TIMING.slotsStep;
                const open = drawOn(f, openAt, S1_TIMING.slotsDur);
                const typed = f >= w.start;
                const correct = f >= w.done;
                const lock = correct ? lockPulse(f, w.done, 11) : 0;
                const isActive = typed && !correct;
                const caretX = isActive
                  ? 20 + [...w.word].slice(0, landedCount(wi)).reduce((s, ch) => s + (ADVANCE[ch] ?? ADVANCE_FALLBACK), 0)
                  : 0;

                return (
                  <div
                    key={w.word}
                    style={{ position: 'relative', width: w.box, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                  >
                    <div
                      style={{
                        height: 104,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'flex-start',
                        paddingLeft: 20,
                        paddingBottom: 14,
                        fontFamily: FONT.serif,
                        fontWeight: 500,
                        // 72 measured only 48px of ink — under the 56px readability floor.
                        // The card is 1280 wide and the row needs 428, so there is room.
                        fontSize: 86,
                        lineHeight: 1,
                        color: correct ? SLOT.correct.color : typed ? INK : 'transparent',
                        // the letters sit ON the card: a soft contact shadow
                        textShadow: correct ? '0 2px 0 rgba(105,166,138,0.10)' : '0 2px 0 rgba(38,52,47,0.05)',
                      }}
                    >
                      {w.letters.map((letterFrame, li) => {
                        const t = interpolate(f, [letterFrame, letterFrame + 11], [0, 1], {
                          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (v) => ease(v, EASE.press),
                        });
                        return (
                          <span
                            key={li}
                            style={{
                              display: 'inline-block',
                              opacity: t,
                              /**
                               * 曾经是 translateY(-12px → 0) + scale(0.94 → 1)。
                               * 两者都在动「已经要读的字」：位移是亚像素的，缩放让
                               * 字形每一帧重新栅格化。实测 f60–100 的 edge/flat
                               * 变化比 9.02x，是全片最抖的一段。
                               * 现在只做不透明度和整像素位移——出现即最终形态。
                               */
                              transform: `translateY(${Math.round((1 - t) * -10)}px)`,
                            }}
                          >
                            {w.word[li]}
                          </span>
                        );
                      })}
                    </div>

                    <Underline
                      width={w.box}
                      progress={open}
                      state={correct ? 'correct' : typed ? 'active' : 'idle'}
                      thickness={3}
                      lock={lock}
                    />

                    {isActive ? (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          left: caretX,
                          width: 3,
                          height: 48,
                          borderRadius: 2,
                          background: SLOT.active.border,
                          opacity: caretOn ? 0.95 : 0.18,
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* ---------------------------------------------- front: the film's voice */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          padding: '64px 0 0 92px',
        }}
      >
        <div
          style={{
            fontFamily: FONT.ui,
            fontSize: 22,
            letterSpacing: '0.2em',
            color: ACCENT,
            opacity: interpolate(f, [10, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          {HERO.eyebrow}
        </div>
      </AbsoluteFill>

      {/* the completion light, on the paper beneath everything */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background: `radial-gradient(ellipse at 50% 58%, rgba(105,166,138,${0.13 * pulse}) 0%, rgba(105,166,138,0) 50%)`,
        }}
      />
      <Grain opacity={0.04} />
      <span style={{ display: 'none', }}>{INK_SOFT}</span>
    </Stage>
  );
};
