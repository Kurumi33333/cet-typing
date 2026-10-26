import React from 'react';
import { AbsoluteFill, Easing, interpolate } from 'remotion';
import { installFonts } from '../fonts';
import { FONT, INK, PAPER, FIELD, FIELD_INK } from '../theme';

installFonts();

export const MINT = '#a9e6c9';
export const GREEN = '#43836b';
export const GREEN_LINE = '#69a68a';
export const RED = '#db4f56';
export const FIELD_BG = '#22453a';

const bez = (a: number, b: number, c: number, d: number) => Easing.bezier(a, b, c, d);
export const silk = bez(0.22, 1, 0.36, 1);
export const inOut = bez(0.65, 0, 0.35, 1);
export const press = bez(0.2, 1.25, 0.3, 1);

/** 0..1 progress of `f` across [from, from+dur], eased. */
export const prog = (
  f: number,
  from: number,
  dur: number,
  easing: (t: number) => number = silk,
): number =>
  interpolate(f, [from, from + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

const hex = (c: string): [number, number, number] => [
  parseInt(c.slice(1, 3), 16),
  parseInt(c.slice(3, 5), 16),
  parseInt(c.slice(5, 7), 16),
];
export const mix = (a: string, b: string, t: number): string => {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(r1 + (r2 - r1) * k)},${Math.round(g1 + (g2 - g1) * k)},${Math.round(b1 + (b2 - b1) * k)})`;
};

/** Frames each of `n` letters lands on, the last one exactly on `end`. */
export const letterFrames = (end: number, n: number, step: number): number[] =>
  Array.from({ length: n }, (_, i) => end - (n - 1 - i) * step);

/* ------------------------------------------------------------------ grounds */

/** Paper with the product's two aurora blobs, kept light so type stays king. */
export const PaperBg: React.FC<{ glow?: number; shift?: number }> = ({ glow = 1, shift = 0 }) => (
  <AbsoluteFill style={{ background: PAPER }}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          `radial-gradient(900px 620px at ${18 + shift}% 8%, rgba(127,227,191,${0.34 * glow}), rgba(127,227,191,0) 70%),` +
          `radial-gradient(1000px 700px at ${88 - shift}% 2%, rgba(165,180,245,${0.28 * glow}), rgba(165,180,245,0) 70%)`,
      }}
    />
  </AbsoluteFill>
);

/** The product's deep green field with a mint glow. */
export const FieldBg: React.FC<{ glowX?: number; glowY?: number; glow?: number }> = ({
  glowX = 78,
  glowY = 18,
  glow = 1,
}) => (
  <AbsoluteFill style={{ background: FIELD_BG }}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          `radial-gradient(1100px 760px at ${glowX}% ${glowY}%, rgba(107,195,230,${0.2 * glow}), rgba(107,195,230,0) 68%),` +
          `radial-gradient(1000px 700px at ${100 - glowX}% ${100 - glowY}%, rgba(127,227,191,${0.22 * glow}), rgba(127,227,191,0) 70%)`,
      }}
    />
  </AbsoluteFill>
);

/* -------------------------------------------------------------- typed words */

export type SlotState = 'idle' | 'active' | 'correct' | 'wrong';

const SLOT_LINE: Record<SlotState, string> = {
  idle: '#cfd8d1',
  active: '#8b9dc5',
  correct: GREEN_LINE,
  wrong: RED,
};

const ADV: Record<string, number> = {
  I: 0.34, i: 0.28, l: 0.28, t: 0.33, f: 0.33, j: 0.28, r: 0.4, m: 0.82, w: 0.72, ' ': 0.25, '.': 0.25,
};
const caretX = (letters: string[], count: number, size: number): number => {
  let x = 0;
  for (let i = 0; i < Math.min(count, letters.length); i += 1) x += (ADV[letters[i]] ?? 0.5) * size;
  return x;
};

/**
 * One word in its slot. The layout is fixed from frame 0 (not-yet-typed letters
 * are laid out invisibly) so nothing shifts when a letter lands.
 */
export const SlotWord: React.FC<{
  text: string;
  /** letters currently typed (0..text.length) */
  count: number;
  /** frames since each letter landed, for the little drop-in */
  ages?: number[];
  state: SlotState;
  size: number;
  caret?: boolean;
  /** 0..1 how far the slot line has drawn */
  line?: number;
  color?: string;
  lineColor?: string;
  glow?: number;
}> = ({ text, count, ages, state, size, caret = false, line = 1, color, lineColor, glow = 0 }) => {
  const letters = [...text];
  const col = color ?? (state === 'correct' ? GREEN : state === 'wrong' ? RED : INK);
  const thick = Math.max(4, Math.round(size * 0.03));
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        padding: `0 ${size * 0.1}px ${size * 0.06}px`,
        fontFamily: FONT.serif,
        fontSize: size,
        lineHeight: 1.1,
        color: col,
        whiteSpace: 'pre',
      }}
    >
      {letters.map((ch, i) => {
        const shown = i < count;
        const age = ages?.[i] ?? 99;
        const p = shown ? Math.min(1, Math.max(0, age / 5)) : 0;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: shown ? 0.2 + 0.8 * p : 0,
              transform: `translateY(${(1 - silk(p)) * -size * 0.1}px)`,
              textShadow: glow > 0 ? `0 0 ${size * 0.35}px rgba(105,166,138,${glow})` : undefined,
            }}
          >
            {ch}
          </span>
        );
      })}
      {caret ? (
        <span
          style={{
            position: 'absolute',
            top: size * 0.12,
            bottom: size * 0.14,
            width: Math.max(3, size * 0.022),
            background: '#8b9dc5',
            left: size * 0.1 + caretX(letters, count, size),
          }}
        />
      ) : null}
      <span
        style={{
          position: 'absolute',
          left: size * 0.04,
          right: size * 0.04,
          bottom: 0,
          height: thick,
          borderRadius: thick,
          background: lineColor ?? SLOT_LINE[state],
          transformOrigin: 'left center',
          transform: `scaleX(${line})`,
        }}
      />
    </span>
  );
};

/* ---------------------------------------------------------------- text reveal */

/** Line of display type that rises out of a mask. */
export const Rise: React.FC<{
  children: React.ReactNode;
  p: number;
  size: number;
  color?: string;
  weight?: number;
  font?: string;
  style?: React.CSSProperties;
}> = ({ children, p, size, color = INK, weight = 600, font = FONT.serifZh, style }) => (
  <div style={{ overflow: 'hidden', height: size * 1.25, ...style }}>
    <div
      style={{
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1.25,
        color,
        whiteSpace: 'pre',
        transform: `translateY(${(1 - p) * 105}%)`,
      }}
    >
      {children}
    </div>
  </div>
);

export { FIELD, FIELD_INK, INK, PAPER, FONT };
