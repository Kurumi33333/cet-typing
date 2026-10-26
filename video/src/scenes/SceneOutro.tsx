import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Stage } from '../Stage';
import { Underline } from '../components/Rule';
import { Grain } from '../components/Light';
import { PaperField } from '../components/PaperField';
import { AuroraCss } from './Aurora';
import { EASE, FONT, INK, INK_SOFT, PAPER, ACCENT, FIELD_DEEP } from '../theme';
import { BRAND, TAGLINE, OUTRO } from '../copy';
import { S5_STAMP } from '../beat';
import type { Shot } from '../beat';

/**
 * S5 · 929–1103 — the group photo, then the wordmark.
 *
 * Every feature the film showed comes back as one representative element and
 * flies in from four directions (Q8): the slot rule from S1, a ladder bar from
 * S2, the finished green sentence from S3, the interval axis from S4. They
 * settle into a ring around the mark, step back, and the wordmark is stamped
 * in front of them. The film's only raise of the aurora happens here, once.
 *
 * Layout is a ring, not a corner dump: the four souvenirs sit on the four
 * diagonals around the lockup, clear of it, so the composition reads as one
 * group photo rather than debris.
 */

export const S5_TIMING = {
  flyCues: [2, 5, 8, 11] as const,
  flyDur: 16,
  stepBack: 62,
  lettersStart: S5_STAMP - 1,
  letterStep: 2.6,
  letterDur: 7,
  ruleGrow: 100,
  ruleGrowDur: 14,
  auroraRaise: 52,
  taglineIn: 96,
  hold: 130,
} as const;

const ease = (t: number, b: readonly [number, number, number, number] = EASE.silk) =>
  Easing.bezier(b[0], b[1], b[2], b[3])(t);

/** The four souvenirs: start off-frame, settle clear of the lockup's type box. */
const PIECES = [
  { id: 'rule', from: { x: -620, y: -240, rot: -10 }, to: { x: -520, y: -246, rot: -3 }, w: 250, h: 6 },
  { id: 'bar', from: { x: 620, y: -250, rot: 9 }, to: { x: 506, y: -244, rot: 2.5 }, w: 246, h: 58 },
  { id: 'sentence', from: { x: 640, y: 250, rot: -8 }, to: { x: 512, y: 232, rot: -2 }, w: 274, h: 74 },
  { id: 'axis', from: { x: -640, y: 250, rot: 7 }, to: { x: -512, y: 230, rot: 1.5 }, w: 268, h: 56 },
] as const;

export const SceneOutro: React.FC<{ shot?: Shot }> = ({ shot }) => {
  const frame = useCurrentFrame();

  /**
   * The shot ARRIVES out of the dark field, which it must: the previous shot is
   * field-green at ~70/255 and this one is paper at ~240. A hard cut between the
   * two measured as a 548x motion spike and read as a flashbulb going off. The
   * first 14 frames now rise out of the field colour, so "the lights come back
   * up" is the shot's own opening move rather than a separate effect.
   */
  const arrive = interpolate(frame, [0, 14], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.35, 0, 0.3, 1),
  });

  const aurora = interpolate(
    frame,
    [S5_TIMING.auroraRaise, S5_TIMING.auroraRaise + 14, S5_TIMING.auroraRaise + 26, S5_TIMING.auroraRaise + 56],
    [0, 0.36, 0.62, 0.5],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1) },
  );

  // crane: the group settles from a 4° tilt to level, then holds dead still
  const crane = interpolate(frame, [0, 46], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => ease(t),
  });
  const craneScale = 1.05 - 0.05 * (1 - crane);
  const craneRotX = crane * 4;

  const stepBack = interpolate(frame, [S5_TIMING.stepBack, S5_TIMING.stepBack + 14], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => ease(t),
  });

  const stampT = interpolate(frame, [S5_TIMING.lettersStart - 2, S5_TIMING.lettersStart + 6], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (v) => ease(v, EASE.press),
  });

  const ruleT = interpolate(frame, [S5_TIMING.ruleGrow, S5_TIMING.ruleGrow + S5_TIMING.ruleGrowDur], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.15, 0, 0.2, 1),
  });

  const letters = [...BRAND];

  return (
    <Stage>
      {/* the same paper ground the film opens on: the outro returns to the room
          the film started in, so the ending reads as closure rather than as a
          different graphic pasted at the end */}
      <PaperField intensity={0.95} lightX={0.5} lightY={0.44} pitch={112} drift={0} />
      <AuroraCss intensity={aurora} x={0.5} y={0.46} radius={0.6} />
      <Grain opacity={0.04} />

      {/* the opening lift out of the dark field — see the note on `arrive`.
          Sits above the picture so it starts exactly at the cut's brightness. */}
      {arrive > 0.001 ? (
        <AbsoluteFill style={{ background: FIELD_DEEP, opacity: arrive, pointerEvents: 'none' }} />
      ) : null}

      {/* ---------------------------------------------------- the souvenirs */}
      <AbsoluteFill style={{ perspective: 1600, perspectiveOrigin: '50% 48%' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `rotateX(${craneRotX}deg) scale(${craneScale})`,
            transformStyle: 'preserve-3d',
          }}
        >
          {PIECES.map((piece, i) => {
            const cue = S5_TIMING.flyCues[i];
            const air = interpolate(frame, [cue, cue + S5_TIMING.flyDur], [1, 0], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.34, 1.22, 0.44, 1),
            });
            const opacity = interpolate(frame, [cue, cue + 5], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            // the souvenirs drift outward as the mark takes the stage
            const x = 960 + piece.to.x * (1 + stepBack * 0.16) + piece.from.x * air;
            const y = 540 + piece.to.y * (1 + stepBack * 0.16) + piece.from.y * air;
            const rot = piece.to.rot + (piece.from.rot - piece.to.rot) * air;
            return (
              <div
                key={piece.id}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: piece.w,
                  height: piece.h,
                  transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${1 + air * 0.13})`,
                  opacity: opacity * (1 - stepBack * 0.18),
                  filter: `saturate(${1 - stepBack * 0.1})`,
                  boxShadow: air > 0.02 ? `0 ${air * 22}px ${air * 40}px rgba(38,52,47,0.13)` : 'none',
                }}
              >
                <Souvenir id={piece.id} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* --------------------------------------------------- the wordmark */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              fontFamily: FONT.ui,
              fontSize: 23,
              letterSpacing: '0.2em',
              color: ACCENT,
              marginBottom: 40,
              opacity: interpolate(frame, [S5_TIMING.lettersStart + 4, S5_TIMING.lettersStart + 22], [0, 1], {
                extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
              }),
            }}
          >
            {OUTRO.eyebrow}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              fontFamily: FONT.serif,
              fontWeight: 500,
              fontSize: 172,
              lineHeight: 0.94,
              letterSpacing: '-0.012em',
              color: INK,
              whiteSpace: 'pre',
              opacity: stampT > 0 ? 1 : 0,
            }}
          >
            {letters.map((ch, i) => {
              const at = S5_TIMING.lettersStart + i * S5_TIMING.letterStep;
              const t = interpolate(frame, [at, at + S5_TIMING.letterDur], [0, 1], {
                extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (v) => ease(v, EASE.press),
              });
              return (
                <span
                  key={`${ch}-${i}`}
                  style={{
                    display: 'inline-block',
                    opacity: t,
                    transform: `scale(${1.25 - 0.25 * t}) translateY(${(1 - t) * 6}px)`,
                    transformOrigin: 'center bottom',
                    // no blur filter — see components/entrance.ts
                  }}
                >
                  {ch === ' ' ? '\u00a0' : ch}
                </span>
              );
            })}
          </div>

          {/* the motif's last appearance: the rule under the wordmark.
              Sits clear of the descenders (y, p) — 44px, not 24. */}
          <div style={{ marginTop: 46, width: 512, display: 'flex', justifyContent: 'center' }}>
            <Underline width={512} progress={ruleT} color={ACCENT} thickness={3.2} />
          </div>

          <div
            style={{
              marginTop: 34,
              fontFamily: FONT.serifZh,
              fontWeight: 500,
              fontSize: 46,
              letterSpacing: '0.02em',
              color: INK_SOFT,
              opacity: interpolate(frame, [S5_TIMING.taglineIn, S5_TIMING.taglineIn + 20], [0, 1], {
                extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
              }),
            }}
          >
            {TAGLINE}
          </div>

          <div
            style={{
              marginTop: 16,
              fontFamily: FONT.ui,
              fontSize: 27,
              letterSpacing: '0.09em',
              color: '#7d8f84',
              opacity: interpolate(frame, [S5_TIMING.taglineIn + 8, S5_TIMING.taglineIn + 22], [0, 1], {
                extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
              }),
            }}
          >
            {OUTRO.sub}
          </div>
        </div>
      </AbsoluteFill>

      <span style={{ display: 'none' }}>{((shot?.duration) ?? 0)}</span>
    </Stage>
  );
};

/** One representative element per feature the film already showed. */
const Souvenir: React.FC<{ id: (typeof PIECES)[number]['id'] }> = ({ id }) => {
  switch (id) {
    case 'rule':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
          <Underline width={286} progress={1} state="correct" color={ACCENT} thickness={4} />
        </div>
      );
    case 'bar':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 8,
            background: 'rgba(247,249,246,0.97)',
            border: '1px solid #dfe7df',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', left: 0, bottom: 0, height: 2.4, width: '54%', background: ACCENT }} />
          <span style={{ paddingLeft: 18, fontFamily: FONT.serifZh, fontWeight: 600, fontSize: 28, color: INK }}>句子</span>
          <span style={{ marginLeft: 'auto', paddingRight: 18, fontFamily: FONT.ui, fontWeight: 600, fontSize: 32, color: INK }}>42</span>
        </div>
      );
    case 'sentence':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 8,
            background: 'rgba(247,249,246,0.97)',
            border: '1px solid #dfe7df',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingInline: 22,
            gap: 9,
          }}
        >
          <span style={{ fontFamily: FONT.ui, fontSize: 27, color: '#43836b', whiteSpace: 'nowrap' }}>
            a good education
          </span>
          <div style={{ height: 2.4, background: '#69a68a', borderRadius: 2 }} />
        </div>
      );
    case 'axis':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 8,
            background: '#2f5c48',
            display: 'flex',
            alignItems: 'center',
            paddingInline: 20,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <span style={{ fontFamily: FONT.ui, fontSize: 24, color: '#eef5ef', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
            2 · 11 · 46 · 163 天
          </span>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 9, height: 2, background: '#7fe3bf', opacity: 0.75 }} />
        </div>
      );
    default:
      return null;
  }
};
