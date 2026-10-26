// The film's design tokens — every value is lifted from the product's own CSS
// (src/landing/landing.css, src/styles.css) rather than invented for the film.
// Read DESIGN.md §阶段 1 for the two deliberate deviations (the aurora is
// promoted from a hero background to the film's only light source).

export const PAPER = '#f7f9f6';
export const PAPER_2 = '#eef2ed';
export const PAPER_3 = '#dfe7df';
export const LINE = '#b9cec2';
export const INK = '#26342f';
export const INK_SOFT = '#55685f';
export const FIELD = '#2f5c48';
export const FIELD_DEEP = '#244637';
export const FIELD_INK = '#eef5ef';
export const FIELD_SOFT = '#cfe3d7';
export const ACCENT = '#356b54';
export const ACCENT_DEEP = '#2b5541';

/** The product's own slot grammar: idle / active / correct / incorrect. */
export const SLOT = {
  idle: { color: '#54615a', border: '#cfd8d1' },
  active: { color: '#54615a', border: '#8b9dc5' },
  correct: { color: '#43836b', border: '#69a68a' },
  wrong: { color: '#db4f56', border: '#db4f56' },
} as const;

/** The one decorative light in the film — the landing hero's Aurora stops. */
export const AURORA = ['#7fe3bf', '#6bc3e6', '#a5b4f5', '#9be8b0'] as const;

/** Font stacks. Families are registered in src/fonts.ts. */
export const FONT = {
  serifZh: '"Noto Serif SC", "Songti SC", serif',
  sansZh: '"Noto Sans SC", "PingFang SC", sans-serif',
  serif: '"EB Garamond", "Noto Serif SC", serif',
  serifItalic: '"EB Garamond", "Noto Serif SC", serif',
  ui: 'Inter, "Noto Sans SC", sans-serif',
} as const;

/**
 * Easing vocabulary — DESIGN.md §阶段 1 "动效性格 tokens".
 * Everything moves on EASE_SILK; only landing/stamping takes the overshoot.
 */
export const EASE = {
  /** zero initial velocity, long tail — every camera move and reveal */
  silk: [0.22, 1, 0.36, 1] as const,
  /** symmetric in-out — transitions, two-way travel */
  inOut: [0.65, 0, 0.35, 1] as const,
  /** overshoot: ONLY letters landing and the wordmark stamp (y1 > 1) */
  press: [0.2, 1.25, 0.3, 1] as const,
  outSoft: [0.4, 0, 0.25, 1] as const,
  linear: [0, 0, 1, 1] as const,
};

export const SIZE = {
  /** 1920x1080 canvas; safe margin kept at 120px on every side */
  w: 1920,
  h: 1080,
  margin: 120,
} as const;
