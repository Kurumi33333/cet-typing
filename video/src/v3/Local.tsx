import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { beatF } from '../beat';
import { FONT3, GRAD, MINT, Stage, WHITE, hexA, letterFrames, mix, prog, silk } from './kit';
import { T } from '../v2/time';

/**
 * LOCAL · beat 58–64. Three promises typed on the beat, each line stepping back
 * (dimming) as the next arrives — the one it is about to say is always brightest.
 */
const LINES = [
  { text: '不用注册。', beat: 58 },
  { text: '断网也能练。', beat: 59 },
  { text: '记录只留在这台设备。', beat: 60 },
] as const;

const SIZE = 150;

export const Local: React.FC = () => {
  const f = useCurrentFrame();
  const base = T.local.from;
  return (
    <AbsoluteFill>
      <Stage t={prog(f, 0, 87, (t) => t)} ax={20} ay={20} bx={82} by={85} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, transform: `scale(${1 + prog(f, 0, 87, (t) => t) * 0.04})` }}>
          {LINES.map((l, i) => {
            const start = beatF(l.beat) - base;
            const chars = [...l.text];
            const frames = letterFrames(start + chars.length * 2, chars.length, 2);
            const count = frames.filter((lf) => f >= lf).length;
            const nextStart = i < LINES.length - 1 ? beatF(LINES[i + 1].beat) - base : 9999;
            const back = prog(f, nextStart, 14, silk);
            const line = prog(f, frames[frames.length - 1], 20, silk);
            return (
              <div key={l.text} style={{ position: 'relative', opacity: 1 - back * 0.62 }}>
                <div
                  style={{
                    fontFamily: FONT3.zh,
                    fontWeight: 700,
                    fontSize: SIZE,
                    lineHeight: 1.18,
                    letterSpacing: '-0.01em',
                    color: WHITE,
                    whiteSpace: 'pre',
                  }}
                >
                  {chars.map((ch, k) => {
                    const age = f - frames[k];
                    const p = k < count ? Math.min(1, Math.max(0, age / 7)) : 0;
                    return (
                      <span
                        key={k}
                        style={{
                          display: 'inline-block',
                          opacity: p,
                          filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined,
                          transform: `translateY(${(1 - silk(p)) * -26}px)`,
                          color: ch === '。' ? mix('#f5f5f7', '#a9e6c9', p) : undefined,
                        }}
                      >
                        {ch}
                      </span>
                    );
                  })}
                </div>
                <div
                  style={{
                    height: 7,
                    borderRadius: 7,
                    width: '100%',
                    background: GRAD,
                    backgroundSize: '200% 100%',
                    transformOrigin: 'left center',
                    transform: `scaleX(${line})`,
                    boxShadow: `0 0 28px ${hexA(MINT, 0.5 * line)}`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
