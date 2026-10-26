import React from 'react';
import { AbsoluteFill } from 'remotion';
import { beatF } from '../beat';

/** One waypoint of the camera. `k` is how freely it passes through (0 = comes to rest). */
export interface WP {
  b: number;
  x: number;
  y: number;
  s: number;
  rz?: number;
  rx?: number;
  ry?: number;
  k?: number;
}

type Ch = 'x' | 'y' | 's' | 'rz' | 'rx' | 'ry';
const CH: Ch[] = ['x', 'y', 's', 'rz', 'rx', 'ry'];

const val = (w: WP, c: Ch): number => (c === 's' ? w.s : (w[c] ?? 0));

/**
 * Cubic Hermite through the waypoints: position, dolly, roll and orbit share one
 * parameter, tangents come from the neighbours, so velocity is continuous at every
 * waypoint — the camera never stops and restarts. `k` scales the tangent, which is
 * how a waypoint becomes an arrival (k→0) or a fly-through (k=1).
 */
export const sampleCam = (wps: WP[], f: number): Record<Ch, number> => {
  const fr = wps.map((w) => beatF(w.b));
  if (f <= fr[0]) return Object.fromEntries(CH.map((c) => [c, val(wps[0], c)])) as Record<Ch, number>;
  const last = wps.length - 1;
  if (f >= fr[last]) return Object.fromEntries(CH.map((c) => [c, val(wps[last], c)])) as Record<Ch, number>;
  let i = 0;
  while (i < last && f >= fr[i + 1]) i += 1;
  const dt = fr[i + 1] - fr[i];
  const u = (f - fr[i]) / dt;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
  const h10 = u ** 3 - 2 * u ** 2 + u;
  const h01 = -2 * u ** 3 + 3 * u ** 2;
  const h11 = u ** 3 - u ** 2;
  const out = {} as Record<Ch, number>;
  for (const c of CH) {
    const slope = (j: number): number => {
      const a = Math.max(0, j - 1);
      const b = Math.min(last, j + 1);
      if (a === b) return 0;
      return ((wps[j].k ?? 1) * (val(wps[b], c) - val(wps[a], c))) / (fr[b] - fr[a]);
    };
    out[c] = h00 * val(wps[i], c) + h10 * dt * slope(i) + h01 * val(wps[i + 1], c) + h11 * dt * slope(i + 1);
  }
  return out;
};

/** screen-space speed in px per frame, for the motion blur on fast travel */
export const camSpeed = (wps: WP[], f: number): number => {
  const a = sampleCam(wps, f - 1);
  const b = sampleCam(wps, f + 1);
  return (Math.hypot(b.x - a.x, b.y - a.y) * (a.s + b.s)) / 4 + Math.abs(b.s - a.s) * 300;
};

export const World: React.FC<{ wps: WP[]; f: number; children: React.ReactNode; blur?: number; opacity?: number }> = ({
  wps,
  f,
  children,
  blur = 0,
  opacity = 1,
}) => {
  const c = sampleCam(wps, f);
  return (
    <AbsoluteFill style={{ perspective: 2300, perspectiveOrigin: '50% 50%', opacity, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          transformStyle: 'preserve-3d',
          transform:
            `translate3d(960px, 540px, 0) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg) ` +
            `scale(${c.s}) translate3d(${-c.x}px, ${-c.y}px, 0)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** Place something in the world by its centre. */
export const At: React.FC<{ x: number; y: number; w: number; h: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  x,
  y,
  w,
  h,
  children,
  style,
}) => (
  <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, ...style }}>{children}</div>
);
