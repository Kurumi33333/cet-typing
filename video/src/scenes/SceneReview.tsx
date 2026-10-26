import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Stage } from '../Stage';
import { Grain } from '../components/Light';
import { EASE, FONT, FIELD, FIELD_DEEP, FIELD_INK, FIELD_SOFT, AURORA } from '../theme';
import { REVIEW } from '../copy';
import type { Shot } from '../beat';

/**
 * S4 · 842–958 — the review queue.
 *
 * The product's one dark field (`--field #2f5c48`), used exactly once in the
 * film so it reads as a different room, not a different film. On it: the due
 * count rolls up, then the four real FSRS intervals stretch out along an axis
 * that keeps growing — 2 → 11 → 46 → 163 days. The axis is the whole point of
 * the shot, so it is the only thing moving.
 */

/** The S4 shot is 116 frames; every cue has to fit inside it with a breath
 *  left over, so the axis is compressed and read as one continuous pull. */
export const S4_TIMING = {
  kicker: 1,
  headline: 6,
  countStart: 12,
  countDur: 20,
  axisStart: 30,
  stepCues: [38, 54, 70, 86] as const,
  stepDur: 12,
  noteIn: 74,
  localIn: 86,
} as const;

const ease = (t: number, b: readonly [number, number, number, number] = EASE.silk) =>
  Easing.bezier(b[0], b[1], b[2], b[3])(t);

/** 2 · 11 · 46 · 163 days mapped onto a growing log axis. */
const AXIS_X0 = 250;
const AXIS_X1 = 1660;
const STEP_DAYS = [2, 11, 46, 163];

export const SceneReview: React.FC<{ shot?: Shot }> = ({ shot }) => {
  const frame = useCurrentFrame();

  /**
   * A camera, even on a title-like shot. The previous cut had NO camera at all:
   * it drew the axis and then held a completely static frame for ~60 frames,
   * which reads as a frozen image rather than a shot. Now the whole field drifts
   * and creeps in for the full 116 frames — slow enough to stay calm, always
   * moving enough that the eye knows it is watching footage.
   */
  const cam = interpolate(frame, [0, 116], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.33, 0, 0.3, 1),
  });
  // translate-only (see SceneSentence): scaling live text shimmers
  // a pure scale is the one camera move that is safe on live type (resample, not
  // re-snap). Push in 5.5% across the shot so the frame is always travelling.
  const camScale = 1 + cam * 0.055;
  // No slide on this card. Continuous travel re-rasterises the type; rounded
  // travel hops the whole block 1px every ~4 frames (6,385 px jumping at f846).
  const camDriftX = 0;
  const camDriftY = 0;

  const axis = interpolate(frame, [S4_TIMING.axisStart, S4_TIMING.axisStart + 30], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => ease(t),
  });

  const countT = interpolate(frame, [S4_TIMING.countStart, S4_TIMING.countStart + S4_TIMING.countDur], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.8, 0.25, 1),
  });
  const shown = Math.round(REVIEW.due * countT);

  // log spacing: positions compress so 163 days still lands inside the frame
  const positions = STEP_DAYS.map((d) => {
    const norm = Math.log(d) / Math.log(163);
    return AXIS_X0 + (AXIS_X1 - AXIS_X0) * norm;
  });

  return (
    <AbsoluteFill
      style={{
        /* The whole shot fades itself in — this is what makes the paper → field
           transition work WITHOUT a full-frame overlay. A veil has to go from
           invisible to covering the frame, and its first visible frame tints 100%
           of the picture at once (measured 12.9 levels in one frame, against a
           film median of 0.40). Fading the SHOT spreads the same brightness
           change over 22 frames, carried by the picture itself. */
        opacity: interpolate(frame, [0, 22], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.6, 1),
        }),
      }}
    >
    <Stage background={FIELD_DEEP}>
      {/* ── the dark room, with a floor ──────────────────────────────────────
         旧版是一整片深绿渐变，读作"换了个背景色"，没有空间。新版给这个镜头
         一个体积：远处一片暗、近处一张深色卡片浮着、一束光从右上打下来。
         深色不是"另一个主题"，是**同一个纸的世界在灯下**——所以卡片本身仍
         用纸的材质，只是被压暗了。 */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 72% 18%, rgba(120,170,147,0.20) 0%, rgba(36,70,55,0) 62%),
            radial-gradient(ellipse 90% 80% at 46% 46%, ${FIELD} 0%, ${FIELD_DEEP} 78%),
            ${FIELD_DEEP}
          `,
        }}
      />
      <Grain opacity={0.06} />

      {/* the camera lives on ONE wrapper, so every layer shares the same move */}
      <AbsoluteFill
        style={{
          transform: `scale(${camScale}) translate(${camDriftX}px, ${camDriftY}px)`,
          transformOrigin: '50% 46%',
        }}
      >
      {/* the light pool the card sits in: a soft cone from the upper right */}
      <div
        style={{
          position: 'absolute',
          right: -160,
          top: -260,
          width: 1180,
          height: 980,
          background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(206,232,217,0.13) 0%, rgba(206,232,217,0) 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      {/* the card itself: a page from the same world, lit from one side */}
      <div
        style={{
          position: 'absolute',
          left: 132,
          top: 96,
          width: 1656,
          height: 856,
          borderRadius: 18,
          background: `linear-gradient(154deg, ${FIELD} 0%, #274d3c 58%, ${FIELD_DEEP} 100%)`,
          boxShadow: `
            0 44px 110px rgba(6,18,13,0.55),
            0 1px 0 rgba(255,255,255,0.10) inset,
            0 0 0 1px rgba(206,232,217,0.10)
          `,
          opacity: interpolate(frame, [0, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          transform: `rotateX(${(1 - interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })) * 3.2}deg)`,
          transformStyle: 'preserve-3d',
        }}
      />

      <AbsoluteFill style={{ padding: '150px 212px' }}>
        <div
          style={{
            fontFamily: FONT.ui,
            fontSize: 26,
            letterSpacing: '0.18em',
            color: FIELD_SOFT,
            opacity: interpolate(frame, [S4_TIMING.kicker, S4_TIMING.kicker + 18], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }),
          }}
        >
          {REVIEW.kicker}
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: FONT.serifZh,
            fontWeight: 600,
            fontSize: 76,
            letterSpacing: '-0.03em',
            color: FIELD_INK,
            opacity: interpolate(frame, [S4_TIMING.headline, S4_TIMING.headline + 22], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }),
            // rounded to whole pixels: a 76px headline moving by fractions of a
            // pixel re-rasterises every glyph each frame — measured 1,584 flipping
            // pixels per frame in a shot whose overall motion is 0.47 levels.
            transform: `translateY(${Math.round(interpolate(frame, [S4_TIMING.headline, S4_TIMING.headline + 22], [18, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => ease(t) }))}px)`,
          }}
        >
          {REVIEW.headline}
        </div>

        {/* the due count, the one number that matters here */}
        <div
          style={{
            marginTop: 54,
            display: 'flex',
            alignItems: 'baseline',
            gap: 22,
            opacity: interpolate(frame, [S4_TIMING.countStart - 8, S4_TIMING.countStart + 10], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }),
          }}
        >
          <span
            style={{
              fontFamily: FONT.ui,
              fontWeight: 600,
              fontSize: 118,
              lineHeight: 1,
              color: FIELD_INK,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            {shown}
          </span>
          <span style={{ fontFamily: FONT.serifZh, fontSize: 34, color: FIELD_SOFT }}>题到期</span>
        </div>
      </AbsoluteFill>

      {/* the axis: the shot's single moving subject */}
      <AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            left: AXIS_X0 - 60,
            top: 560,
            width: AXIS_X1 - AXIS_X0 + 260,
            height: 220,
          }}
        >
          {/* the base rule */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 96,
              height: 2.5,
              width: `${axis * 100}%`,
              background: `linear-gradient(90deg, ${FIELD_SOFT} 0%, ${AURORA[0]} 78%, rgba(127,227,191,0) 100%)`,
              borderRadius: 2,
            }}
          />
          {positions.map((px, i) => {
            const cue = S4_TIMING.stepCues[i];
            const t = interpolate(frame, [cue, cue + S4_TIMING.stepDur], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (v) => ease(v),
            });
            const x = px - (AXIS_X0 - 60);
            return (
              <div key={STEP_DAYS[i]} style={{ position: 'absolute', left: x, top: 0, transform: 'translateX(-50%)' }}>
                {/* the tick */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 96 - 34 * t + 34,
                    width: 2.5,
                    height: 34 * t,
                    background: FIELD_SOFT,
                    opacity: 0.85,
                  }}
                />
                {/* the day count above the tick */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: -14,
                    transform: `translate(-50%, ${(1 - t) * 12}px)`,
                    opacity: t,
                    fontFamily: FONT.ui,
                    fontWeight: 600,
                    fontSize: 52,
                    lineHeight: 1,
                    color: FIELD_INK,
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {STEP_DAYS[i]}
                  <span style={{ fontSize: 30, fontWeight: 400, color: FIELD_SOFT, marginLeft: 8 }}>天</span>
                </div>
                {/* its ordinal under the axis */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 110,
                    transform: 'translateX(-50%)',
                    opacity: t * 0.9,
                    fontFamily: FONT.serifZh,
                    fontSize: 31,
                    color: FIELD_SOFT,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {REVIEW.steps[i].label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ padding: '0 212px' }}>
        {/* the two footnotes sit BELOW the axis, inside the card, where the card
            has empty room. They used to be at canvas y=472/520, which is exactly
            where the big due number and the axis label land — measured as three
            lines of type superimposed on each other. */}
        <div
          style={{
            position: 'absolute',
            left: 212,
            top: 792,
            fontFamily: FONT.ui,
            fontSize: 26,
            color: FIELD_SOFT,
            opacity: interpolate(frame, [S4_TIMING.noteIn, S4_TIMING.noteIn + 18], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }),
          }}
        >
          {REVIEW.note}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 212,
            top: 836,
            fontFamily: FONT.ui,
            fontSize: 26,
            color: FIELD_INK,
            opacity: interpolate(frame, [S4_TIMING.localIn, S4_TIMING.localIn + 18], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }) * 0.86,
          }}
        >
          {REVIEW.local}
        </div>
      </AbsoluteFill>
      </AbsoluteFill>
      <span style={{ display: 'none' }}>{((shot?.duration) ?? 0)}</span>
    </Stage>
    </AbsoluteFill>
  );
};
