import React from 'react';
import { Easing, interpolate } from 'remotion';
import { EASE, SLOT } from '../theme';

/**
 * THE UNDERLINE — the film's one recurring shape.
 *
 * It is the product's real slot rule: `.slot-word { border-bottom: 2px solid
 * #cfd8d1 }`. In S1 it draws itself under a word, in S3 it locks the whole
 * sentence green, in C1–C3 it carries the cut, and in S5 it becomes the rule
 * under the wordmark. Same thickness, same colour grammar, same draw-on easing
 * everywhere — that repetition is what makes it read as one object.
 */
export type UnderlineState = 'hidden' | 'idle' | 'active' | 'correct' | 'wrong';

export const Underline: React.FC<{
  /** how much of the line is drawn, 0..1 */
  progress?: number;
  width: number;
  state?: UnderlineState;
  thickness?: number;
  /** flick a brighter band along the line once (0..1 intensity) */
  lock?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ progress = 1, width, state = 'idle', thickness = 2.4, lock = 0, color, style }) => {
  const palette = SLOT[state === 'hidden' ? 'idle' : state];
  const stroke = color ?? palette.border;
  const drawn = Math.max(0, Math.min(1, progress));

  return (
    <div
      style={{
        position: 'relative',
        width,
        height: thickness,
        borderRadius: thickness / 2,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* the rule itself: grows from its left end, like a pen laying ink.
          NO CSS transition anywhere in this component: a transition advances on
          wall-clock time, and Remotion samples a frame at an arbitrary instant
          of that clock, so a transitioning element can render differently
          between two passes of the SAME frame. Colour is driven purely by the
          caller's interpolated `state`. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: `${drawn * 100}%`,
          background: stroke,
          borderRadius: thickness / 2,
        }}
      />
      {/* the lock light: a travelling highlight, only while `lock` > 0 */}
      {lock > 0.001 ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${Math.max(-0.3, Math.min(1, lock * 1.35 - 0.35)) * 100}%`,
            width: '34%',
            background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${0.95 * (1 - Math.abs(lock * 1.35 - 1.35))}) 50%, rgba(255,255,255,0) 100%)`,
            mixBlendMode: 'screen',
          }}
        />
      ) : null}
    </div>
  );
};

/** Draw-on progress for a rule that starts at `from` and takes `dur` frames. */
export const drawOn = (frame: number, from: number, dur: number, ease = EASE.silk) =>
  interpolate(frame, [from, from + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(ease[0], ease[1], ease[2], ease[3]),
  });

/** A one-shot bright sweep across a rule and back, peaking at `at`. */
export const lockPulse = (frame: number, at: number, dur = 9) =>
  interpolate(frame, [at, at + dur * 0.45, at + dur], [0, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.3, 0, 0.2, 1),
  });
