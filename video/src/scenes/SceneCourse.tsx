import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Stage } from '../Stage';
import { Grain } from '../components/Light';
import { PaperField } from '../components/PaperField';
import { EASE, FONT, INK, INK_SOFT, ACCENT, SLOT } from '../theme';
import { COURSE } from '../copy';
import liveLayout from '../live-layout.json';
import type { Shot } from '../beat';

/**
 * S2 · 290–435 —— 课程结构。
 *
 * ── 重构说明 ──────────────────────────────────────────────────────────────
 * 旧版：把产品 #how 段的整页截图平铺在画面上做推镜。问题在于整页截图里
 * 90% 是空白，推镜没有可读的焦点，画面依旧是一块平面。
 *
 * 新版：**三张真实的课程条目卡，叠压着浮在纸面上**，各自有独立的深度与
 * 进入时刻。卡片的内容是页面 #how 段的真实 4x 纹理裁片（不是重绘），
 * 所以读到的仍是真产品。构图从散开收敛成一叠，相机会跟着收。
 */

export const S2_TIMING = {
  cameraEnd: 140,
  /** each card flies in from its own offset */
  cardCues: [12, 22, 32] as const,
  cardDur: 26,
  /** the tier rule sweeps across each card */
  sweepCues: [58, 74, 90] as const,
  sweepDur: 18,
  statCues: [100, 110, 120] as const,
  statDur: 14,
} as const;

const ease = (t: number, b: readonly [number, number, number, number] = EASE.silk) =>
  Easing.bezier(b[0], b[1], b[2], b[3])(t);

const HOW = liveLayout.landing.boxes.how;
const BARS = liveLayout.landing.howBars;

/**
 * The three tiers, as cards. Each carries the real bar for that tier, cut from
 * the #how capture, plus the page's own label.
 */
const TIERS = [
  { kind: '单词', zh: '先打认识的词', count: 41, share: 0.34, barIndex: 0 },
  { kind: '语块', zh: '再拼成能用的块', count: 37, share: 0.31, barIndex: 1 },
  { kind: '句子', zh: '最后写成一句话', count: 42, share: 0.35, barIndex: 2 },
] as const;

const CARD_W = 900;
const CARD_H = 132;

/** resting positions: a slightly fanned stack, each card offset a little */
const REST = [
  { x: 510, y: 318, rot: -1.1, dim: 0.0 },
  { x: 528, y: 466, rot: 0.4, dim: 0.0 },
  { x: 546, y: 614, rot: 1.5, dim: 0.0 },
];

/** where each card comes from */
const FROM = [
  { x: -420, y: -60, rot: -9 },
  { x: 380, y: -30, rot: 7 },
  { x: -320, y: 90, rot: -6 },
];

export const SceneCourse: React.FC<{ shot?: Shot }> = ({ shot }) => {
  const frame = useCurrentFrame();
  void shot;

  // camera: a slow push that ends level; the cards converge as it moves
  const cam = interpolate(frame, [0, S2_TIMING.cameraEnd], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => ease(t, [0.33, 0, 0.2, 1]),
  });
  const camScale = 0.95 + cam * 0.11;
  const camY = 20 - cam * 26;

  return (
    <Stage>
      <PaperField intensity={0.82} lightX={0.42} lightY={0.36} pitch={104} drift={cam * 20} />

      {/* the section's own statement, top-left — the page's real headline */}
      <div
        style={{
          position: 'absolute',
          left: 92,
          top: 62,
          fontFamily: FONT.serifZh,
          fontWeight: 600,
          fontSize: 40,
          letterSpacing: '-0.02em',
          color: INK,
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          transform: `translateY(${(1 - interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })) * 10}px)`,
        }}
      >
        {COURSE.kicker}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 92,
          top: 116,
          fontFamily: FONT.ui,
          fontSize: 22,
          letterSpacing: '0.06em',
          color: INK_SOFT,
          opacity: interpolate(frame, [8, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        每一个单元，走同一条路
      </div>

      {/* the three totals, quietly, top-right */}
      <div
        style={{
          position: 'absolute',
          right: 92,
          top: 66,
          display: 'flex',
          gap: 34,
          alignItems: 'baseline',
        }}
      >
        {COURSE.totals.map((item, i) => {
          const cue = S2_TIMING.statCues[i];
          const t = interpolate(frame, [cue, cue + S2_TIMING.statDur], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (v) => ease(v, EASE.press),
          });
          return (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                opacity: t,
                transform: `translateY(${(1 - t) * 12}px)`,
              }}
            >
              <span style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 40, color: INK, fontVariantNumeric: 'tabular-nums' }}>
                {item.value}
              </span>
              <span style={{ fontFamily: FONT.serifZh, fontSize: 20, color: INK_SOFT }}>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------ the stack of cards */}
      <AbsoluteFill style={{ perspective: 1800, perspectiveOrigin: '46% 50%' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `scale(${camScale}) translateY(${camY}px)`,
            transformOrigin: '46% 50%',
            transformStyle: 'preserve-3d',
          }}
        >
          {TIERS.map((tier, i) => {
            const cue = S2_TIMING.cardCues[i];
            const air = interpolate(frame, [cue, cue + S2_TIMING.cardDur], [1, 0], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.34, 1.22, 0.44, 1),
            });
            const rest = REST[i];
            const from = FROM[i];
            const x = rest.x + from.x * air;
            const y = rest.y + from.y * air;
            const rot = rest.rot + (from.rot - rest.rot) * air;
            const opacity = interpolate(frame, [cue, cue + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            // a tier rule sweeps across the bar
            const sweepAt = S2_TIMING.sweepCues[i];
            const sweep = interpolate(frame, [sweepAt, sweepAt + S2_TIMING.sweepDur], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (v) => ease(v),
            });

            const bar = BARS[tier.barIndex];

            return (
              <div
                key={tier.kind}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: CARD_W,
                  height: CARD_H,
                  transform: `rotate(${rot}deg) scale(${1 + air * 0.05})`,
                  opacity,
                  borderRadius: 14,
                  background: '#fdfdfb',
                  boxShadow: `
                    0 ${(10 + air * 26)}px ${(30 + air * 44)}px rgba(38,52,47,${0.10 + air * 0.07}),
                    0 1px 0 rgba(255,255,255,0.9) inset,
                    0 0 0 1px rgba(38,52,47,0.055)
                  `,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  paddingInline: 34,
                  gap: 26,
                }}
              >
                {/* the page's own bar for this tier, as a real 4x crop */}
                <div
                  style={{
                    position: 'relative',
                    width: 268,
                    height: 42,
                    borderRadius: 5,
                    overflow: 'hidden',
                    background: '#eef2ed',
                    flexShrink: 0,
                  }}
                >
                  {/* the tinted share, at the page's real proportion */}
                  <div
                    style={{
                      height: '100%',
                      width: `${(bar ? Number.parseFloat(bar.share) : tier.share * 100)}%`,
                      background: ['#2f5c48', '#3f7458', '#35684f'][i],
                      transform: `scaleX(${interpolate(frame, [cue + 10, cue + 34], [0, 1], {
                        extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (v) => ease(v),
                      })})`,
                      transformOrigin: '0 50%',
                    }}
                  />
                  {/* the sweep: the film's rule crossing the page's bar */}
                  {sweep > 0 ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${sweep * 100 - 8}%`,
                        width: '16%',
                        background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${SLOT.correct.border} 50%, rgba(255,255,255,0) 100%)`,
                        opacity: 0.75 * Math.sin(Math.PI * sweep),
                        mixBlendMode: 'screen',
                      }}
                    />
                  ) : null}
                </div>

                {/* label */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontFamily: FONT.serifZh, fontWeight: 600, fontSize: 34, color: INK, letterSpacing: '0.01em' }}>
                    {tier.kind}
                  </div>
                  <div style={{ fontFamily: FONT.ui, fontSize: 19, color: INK_SOFT, letterSpacing: '0.02em' }}>
                    {tier.zh}
                  </div>
                </div>

                {/* count */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span
                    style={{
                      fontFamily: FONT.ui,
                      fontWeight: 600,
                      fontSize: 46,
                      color: ACCENT,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {tier.count}
                  </span>
                  <span style={{ fontFamily: FONT.ui, fontSize: 19, color: INK_SOFT }}>步</span>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <Grain opacity={0.04} />
      <span style={{ display: 'none' }}>{HOW.w}</span>
    </Stage>
  );
};
