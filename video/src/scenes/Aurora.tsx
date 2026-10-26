import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { AURORA } from '../theme';

/**
 * The aurora as pure CSS — the same three-blob field as components/Light.tsx
 * but without the frame-time drift, for the outro where the light itself is
 * the subject and must not wobble under the wordmark.
 */
export const AuroraCss: React.FC<{
  intensity?: number;
  x?: number;
  y?: number;
  radius?: number;
}> = ({ intensity = 1, x = 0.5, y = 0.44, radius = 0.62 }) => {
  const frame = useCurrentFrame();
  /**
   * A very slow, fully deterministic breathing (pure sin of frame number, no
   * clock, no random). The wordmark hold is 55 frames of otherwise-completely-
   * static frame — measured as 1.8 s of frozen picture, which reads as a
   * dropped frame rather than as a held shot. The light keeps living while the
   * type stays dead still.
   */
  const breath = Math.sin((frame / 30) * 1.1) * 0.5 + 0.5; // 0..1, ~5.7 s period
  const blobs = [
    { dx: 0, dy: 0, r: 1.0, c: AURORA[0] },
    { dx: -0.24, dy: 0.12, r: 0.76, c: AURORA[2] },
    { dx: 0.22, dy: -0.09, r: 0.62, c: AURORA[1] },
  ];
  return (
    <AbsoluteFill style={{ opacity: Math.max(0, Math.min(1, intensity)), mixBlendMode: 'multiply' }}>
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${(x + b.dx) * 100}%`,
            top: `${(y + b.dy) * 100}%`,
            width: `${radius * b.r * (200 + breath * 2.5)}%`,
            height: `${radius * b.r * (200 + breath * 2.5)}%`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle at 50% 50%, ${b.c} 0%, ${b.c} 16%, rgba(255,255,255,0) 60%)`,
            filter: 'blur(90px)',
            opacity: (0.2 / (i + 1) + 0.1) * (0.94 + breath * 0.06),
            borderRadius: '50%',
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
