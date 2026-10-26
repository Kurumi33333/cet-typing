import React from 'react';
import { AbsoluteFill, Easing, interpolate } from 'remotion';
import { installFonts } from '../fonts';
import { AURORA } from '../theme';

installFonts();

/**
 * V3 · "keynote" kit. A black stage, one gradient (the product's own aurora
 * stops), type that is white and heavy, and motion that arrives as light:
 * blur-in, push-through, a gradient that sweeps across a key word.
 */
export const BLACK = '#050607';
export const WHITE = '#f5f5f7';
export const DIM = 'rgba(245,245,247,0.56)';
export const FAINT = 'rgba(245,245,247,0.22)';
export const MINT = '#a9e6c9';
export const RED = '#ff5a63';
export const BLUE = '#8fb4ff';
export const GRAD = `linear-gradient(100deg, ${AURORA[0]} 0%, ${AURORA[1]} 42%, ${AURORA[2]} 78%, ${AURORA[0]} 100%)`;

export const FONT3 = {
  /** Latin display */
  en: 'Inter, "Noto Sans SC", sans-serif',
  /** Chinese display */
  zh: '"Noto Sans SC", "PingFang SC", sans-serif',
} as const;

const bez = (a: number, b: number, c: number, d: number) => Easing.bezier(a, b, c, d);
/** Apple-like: fast out of the blocks, long soft landing. */
export const expo = bez(0.16, 1, 0.3, 1);
export const silk = bez(0.22, 1, 0.36, 1);
export const inOut = bez(0.65, 0, 0.35, 1);
export const press = bez(0.2, 1.2, 0.3, 1);

export const prog = (
  f: number,
  from: number,
  dur: number,
  easing: (t: number) => number = expo,
): number =>
  interpolate(f, [from, from + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

export const letterFrames = (end: number, n: number, step: number): number[] =>
  Array.from({ length: n }, (_, i) => end - (n - 1 - i) * step);

/* ------------------------------------------------------------------ ground */

/** The stage: black, two slow light pools and a vignette. */
export const Stage: React.FC<{
  /** 0..1 slow drift of the lights */
  t?: number;
  pool?: number;
  hueA?: string;
  hueB?: string;
  ax?: number;
  ay?: number;
  bx?: number;
  by?: number;
}> = ({ t = 0, pool = 1, hueA = AURORA[0], hueB = AURORA[2], ax = 18, ay = 12, bx = 86, by = 92 }) => (
  <AbsoluteFill style={{ background: BLACK }}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          `radial-gradient(1000px 640px at ${ax + t * 6}% ${ay + t * 4}%, ${hexA(hueA, 0.20 * pool)}, rgba(0,0,0,0) 70%),` +
          `radial-gradient(1100px 700px at ${bx - t * 6}% ${by - t * 4}%, ${hexA(hueB, 0.17 * pool)}, rgba(0,0,0,0) 70%)`,
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
      }}
    />
  </AbsoluteFill>
);

const hexA = (c: string, a: number): string => {
  const n = parseInt(c.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* -------------------------------------------------------------------- type */

/** Gradient-filled text; `shift` (0..1+) slides the gradient across it. */
export const Grad: React.FC<{ children: React.ReactNode; shift?: number; style?: React.CSSProperties }> = ({
  children,
  shift = 0,
  style,
}) => (
  <span
    style={{
      backgroundImage: GRAD,
      backgroundSize: '220% 100%',
      backgroundPosition: `${(shift % 1) * 100}% 50%`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
      ...style,
    }}
  >
    {children}
  </span>
);

/** Blur-in reveal: the Keynote way type arrives. p 0..1 */
export const Reveal: React.FC<{
  p: number;
  children: React.ReactNode;
  rise?: number;
  blur?: number;
  scale?: number;
  style?: React.CSSProperties;
}> = ({ p, children, rise = 28, blur = 22, scale = 0.94, style }) => (
  <div
    style={{
      opacity: Math.min(1, p * 1.6),
      filter: p < 1 ? `blur(${(1 - p) * blur}px)` : undefined,
      transform: `translateY(${(1 - p) * rise}px) scale(${scale + (1 - scale) * p})`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Heavy display line (Chinese or mixed). */
export const Display: React.FC<{
  size: number;
  children: React.ReactNode;
  color?: string;
  weight?: number;
  style?: React.CSSProperties;
  latin?: boolean;
}> = ({ size, children, color = WHITE, weight = 700, style, latin = false }) => (
  <div
    style={{
      fontFamily: latin ? FONT3.en : FONT3.zh,
      fontWeight: latin ? Math.min(600, weight) : weight,
      fontSize: size,
      lineHeight: 1.12,
      letterSpacing: latin ? '-0.04em' : '-0.01em',
      color,
      whiteSpace: 'pre',
      ...style,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------- typed words */

export type SlotState = 'idle' | 'active' | 'correct' | 'wrong';

/**
 * One English word in its slot. Layout is fixed from frame 0 (untyped letters
 * are laid out invisibly) and the caret sits in the flow at the next letter's
 * left edge, so it is exact for any font.
 */
export const SlotWord: React.FC<{
  text: string;
  count: number;
  ages?: number[];
  state: SlotState;
  size: number;
  caret?: boolean;
  line?: number;
  color?: string;
  glow?: number;
}> = ({ text, count, ages, state, size, caret = false, line = 1, color, glow = 0 }) => {
  const letters = [...text];
  const col = color ?? (state === 'wrong' ? RED : WHITE);
  const lineCol = state === 'correct' ? MINT : state === 'wrong' ? RED : state === 'active' ? BLUE : 'rgba(245,245,247,0.28)';
  const thick = Math.max(4, Math.round(size * 0.024));
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        padding: `0 ${size * 0.06}px ${size * 0.08}px`,
        fontFamily: FONT3.en,
        fontWeight: 600,
        letterSpacing: '-0.04em',
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
              position: 'relative',
              display: 'inline-block',
              opacity: shown ? 0.15 + 0.85 * p : 0,
              transform: `translateY(${(1 - silk(p)) * -size * 0.08}px) scale(${1 + (1 - p) * 0.1})`,
              textShadow: glow > 0 ? `0 0 ${size * 0.4}px ${hexA(MINT, glow)}` : undefined,
            }}
          >
            {ch}
            {caret && i === count ? (
              <span
                style={{
                  position: 'absolute',
                  left: -size * 0.025,
                  top: size * 0.1,
                  bottom: size * 0.12,
                  width: Math.max(4, size * 0.026),
                  borderRadius: 4,
                  background: BLUE,
                  boxShadow: `0 0 ${size * 0.18}px ${hexA(BLUE, 0.7)}`,
                }}
              />
            ) : null}
          </span>
        );
      })}
      {caret && count >= letters.length ? (
        <span
          style={{
            position: 'absolute',
            right: size * 0.03,
            top: size * 0.1,
            bottom: size * 0.2,
            width: Math.max(4, size * 0.026),
            borderRadius: 4,
            background: BLUE,
            boxShadow: `0 0 ${size * 0.18}px ${hexA(BLUE, 0.7)}`,
          }}
        />
      ) : null}
      <span
        style={{
          position: 'absolute',
          left: size * 0.02,
          right: size * 0.02,
          bottom: 0,
          height: thick,
          borderRadius: thick,
          background: lineCol,
          boxShadow: state === 'correct' ? `0 0 ${size * 0.12}px ${hexA(MINT, 0.55)}` : undefined,
          transformOrigin: 'left center',
          transform: `scaleX(${line})`,
        }}
      />
    </span>
  );
};

export const mix = (a: string, b: string, t: number): string => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const k = Math.max(0, Math.min(1, t));
  const ch = (s: number) => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * k));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

export { hexA };
