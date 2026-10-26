import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';
import { AURORA } from '../theme';

/**
 * The film's only light: the landing hero's aurora, promoted from a background
 * wash to a light source that can be raised or lowered (DESIGN.md deviation #1).
 * It is drawn once, deterministically, and every frame is a pure function of
 * frame number + props — no canvas, no time-based noise.
 */
export const Aurora: React.FC<{
  /** 0 = invisible, 1 = the hero's own intensity */
  intensity?: number;
  /** where the light sits, in 0..1 of the canvas */
  x?: number;
  y?: number;
  /** radius as a fraction of canvas width */
  radius?: number;
  /** slow internal drift, in "screens" per second */
  drift?: number;
  opacity?: number;
  mix?: 'normal' | 'screen' | 'soft-light' | 'multiply';
  style?: React.CSSProperties;
}> = ({ intensity = 1, x = 0.5, y = 0.45, radius = 0.72, drift = 0.02, opacity = 1, mix = 'normal', style }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  // Three soft blobs orbiting slowly. Radii/offsets are fixed constants, so the
  // field is identical on every render.
  const blobs = [
    { dx: 0.00, dy: 0.00, r: 1.00, c: AURORA[0] },
    { dx: -0.26, dy: 0.14, r: 0.78, c: AURORA[2] },
    { dx: 0.24, dy: -0.10, r: 0.66, c: AURORA[1] },
  ];

  return (
    <AbsoluteFill style={{ opacity: Math.max(0, Math.min(1, intensity * opacity)), mixBlendMode: mix, ...style }}>
      {blobs.map((b, i) => {
        const phase = t * drift * (i % 2 === 0 ? 1 : -1.35) + i * 1.7;
        const cx = (x + b.dx + Math.sin(phase) * 0.012) * 100;
        const cy = (y + b.dy + Math.cos(phase * 1.3) * 0.010) * 100;
        const r = radius * b.r;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${cx}%`,
              top: `${cy}%`,
              width: `${r * 200}%`,
              height: `${r * 200}%`,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle at 50% 50%, ${b.c} 0%, ${b.c} 18%, rgba(255,255,255,0) 62%)`,
              filter: 'blur(60px)',
              opacity: 0.34 / (i + 1) + 0.16,
              borderRadius: '50%',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Paper grain: a fixed, pre-generated noise tile repeated over the frame, so
 * large flat areas do not band when the encoder quantises them.
 *
 * Determinism note: this used to be an SVG `feTurbulence` filter, and the two
 * deliverables (with / without BGM) came out ~1.7% different in the S1 region
 * because the filter's rasterisation is not stable between render passes. A
 * static PNG tile is byte-identical on every pass, which is what the
 * deterministic-rendering rule and the "two versions from one timeline" rule
 * both require.
 */
export const Grain: React.FC<{ opacity?: number; shift?: number }> = ({ opacity = 0.045, shift = 0 }) => (
  <AbsoluteFill
    style={{
      opacity,
      pointerEvents: 'none',
      mixBlendMode: 'multiply',
      backgroundImage: `url(${staticFile('textures/grain.png')})`,
      backgroundRepeat: 'repeat',
      backgroundPosition: `${shift * 7}px ${shift * 11}px`,
    }}
  />
);

/** Soft vignette that keeps the page edges from glowing on the paper. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.16 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 46%, rgba(38,52,47,${strength}) 100%)`,
    }}
  />
);
