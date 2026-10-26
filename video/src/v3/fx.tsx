import React from 'react';
import { AbsoluteFill } from 'remotion';
import { mulberry32 } from '../helpers/rand';
import { AURORA } from '../theme';
import { MINT, hexA, prog } from './kit';

/* ------------------------------------------------------------------ camera */

export interface CamSpec {
  /** frames the move spans (it holds its end pose afterwards) */
  dur: number;
  /** cubic Bézier path in px: start, two handles, end — the curve IS the move */
  path: [[number, number], [number, number], [number, number], [number, number]];
  /** dolly: scale at start / end */
  s: [number, number];
  /** roll in degrees */
  roll?: [number, number];
  /** orbit tilt in degrees (rotateX / rotateY) */
  tiltX?: [number, number];
  tiltY?: [number, number];
  /** 0 = pure smoothstep (soft stops), 1 = nearly linear (keeps velocity) */
  glide?: number;
  origin?: string;
}

const smooth = (u: number) => u * u * (3 - 2 * u);

const bez = (p: CamSpec['path'], u: number): [number, number] => {
  const k = 1 - u;
  const a = k * k * k;
  const b = 3 * k * k * u;
  const c = 3 * k * u * u;
  const d = u * u * u;
  return [
    a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0],
    a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1],
  ];
};

const lerp = (r: [number, number] | undefined, u: number, d = 0) => (r ? r[0] + (r[1] - r[0]) * u : d);

/**
 * A camera that travels a curved path with a continuous (never stop-start)
 * speed: position follows a Bézier, the dolly / roll / orbit follow the same
 * parameter, so everything arrives together and nothing mechanically eases.
 */
export const Cam: React.FC<{ f: number; spec: CamSpec; children: React.ReactNode }> = ({ f, spec, children }) => {
  const raw = Math.min(1, Math.max(0, f / spec.dur));
  const g = spec.glide ?? 0.55;
  const u = g * raw + (1 - g) * smooth(raw);
  const [x, y] = bez(spec.path, u);
  const s = lerp(spec.s, u, 1);
  return (
    <AbsoluteFill style={{ perspective: 2400, perspectiveOrigin: '50% 50%' }}>
      <AbsoluteFill
        style={{
          transformOrigin: spec.origin ?? '50% 50%',
          transform:
            `translate3d(${x}px, ${y}px, 0) ` +
            `rotateX(${lerp(spec.tiltX, u)}deg) rotateY(${lerp(spec.tiltY, u)}deg) rotateZ(${lerp(spec.roll, u)}deg) ` +
            `scale(${s})`,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ----------------------------------------------------------------- impacts */

/**
 * The hit that goes with a slam: a flash, a shockwave ring, a burst of light
 * rays and a spray of sparks (all deterministic), plus — through `splitStyle` —
 * an RGB split that decays over a few frames. `t` is frames since the hit.
 */
export const ImpactFx: React.FC<{ t: number; cx?: number; cy?: number; seed?: number; power?: number; light?: boolean }> = ({
  t,
  cx = 960,
  cy = 540,
  seed = 3,
  power = 1,
  light = false,
}) => {
  if (t < 0 || t > 60) return null;
  const ink = light ? '43,85,65' : '255,255,255';
  const ringCol = light ? '#43836b' : MINT;
  const flash = Math.max(0, 1 - t / 9) ** 1.6;
  const ring = prog(t, 0, 34);
  const rays = prog(t, 0, 26);
  const r = mulberry32(seed);
  const sparks = Array.from({ length: 46 }, () => ({
    a: r() * Math.PI * 2,
    v: 380 + r() * 980,
    w: 4 + r() * 9,
    c: AURORA[(r() * 3) | 0],
    life: 26 + r() * 22,
  }));
  const rayList = Array.from({ length: 28 }, (_, i) => ({ a: (i / 28) * Math.PI * 2 + r() * 0.12, l: 520 + r() * 900, w: 3 + r() * 6 }));
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: light ? 'normal' : 'screen' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at ${cx}px ${cy}px, ${light ? 'rgba(127,227,191,' : 'rgba(255,255,255,'}${(light ? 0.5 : 0.75) * flash * power}), ${hexA(MINT, 0.35 * flash * power)} 28%, rgba(0,0,0,0) 62%)`,
        }}
      />
      {rayList.map((q, i) => {
        const len = q.l * rays;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: cx,
              top: cy,
              width: len,
              height: q.w,
              transformOrigin: '0 50%',
              transform: `rotate(${q.a}rad) translateX(${120 + rays * 160}px)`,
              background: `linear-gradient(90deg, rgba(${ink},0.0), rgba(${ink},${(light ? 0.4 : 0.55) * (1 - rays) * power}))`,
              opacity: 1 - rays,
            }}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: cx - 90 - ring * 1250,
          top: cy - 90 - ring * 1250,
          width: 180 + ring * 2500,
          height: 180 + ring * 2500,
          borderRadius: '50%',
          border: `${Math.max(2, 22 * (1 - ring))}px solid ${hexA(ringCol, 0.85 * (1 - ring) * power)}`,
          boxShadow: `0 0 ${60 * (1 - ring)}px ${hexA(MINT, 0.5 * (1 - ring))}`,
        }}
      />
      {sparks.map((s, i) => {
        const age = t / s.life;
        if (age > 1) return null;
        const d = s.v * (1 - Math.pow(1 - Math.min(1, t / 30), 2)) * 0.9;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: cx + Math.cos(s.a) * d - s.w / 2,
              top: cy + Math.sin(s.a) * d - s.w / 2 + age * age * 90,
              width: s.w,
              height: s.w,
              borderRadius: s.w,
              background: s.c,
              opacity: (1 - age) * power,
              boxShadow: `0 0 ${s.w * 3}px ${s.c}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** CSS filter that splits red / cyan for a few frames after a hit. */
export const splitFilter = (t: number, px = 14): string | undefined => {
  if (t < 0 || t > 10) return undefined;
  const k = (1 - t / 10) ** 2 * px;
  return `drop-shadow(${k}px 0 0 rgba(255,60,90,0.55)) drop-shadow(${-k}px 0 0 rgba(60,210,255,0.55))`;
};
