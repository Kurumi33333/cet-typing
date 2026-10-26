import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { beatF } from '../beat';
import { FONT, INK } from '../theme';
import { GREEN, PaperBg, SlotWord, mix, prog, silk, letterFrames } from './kit';
import { T } from './time';

/**
 * LOCAL · beat 58–64. Three promises, typed into slots on the beat — the same
 * grammar as the hook, so the film closes the loop on what the product is.
 * Chinese copy is rendered as display type with the slot line drawn under it.
 */
const LINES = [
  { text: '不用注册。', beat: 58 },
  { text: '断网也能练。', beat: 59 },
  { text: '记录只留在这台设备。', beat: 60 },
] as const;

const SIZE = 160;

export const Local: React.FC = () => {
  const f = useCurrentFrame();
  const base = T.local.from;
  return (
    <AbsoluteFill>
      <PaperBg shift={6} glow={1.1} />
      <div style={{ position: 'absolute', left: 210, top: 150 }}>
        {LINES.map((l, i) => {
          const start = beatF(l.beat) - base;
          const chars = [...l.text];
          const frames = letterFrames(start + chars.length * 2, chars.length, 2);
          const count = frames.filter((lf) => f >= lf).length;
          const done = f >= frames[frames.length - 1] + 1;
          const line = prog(f, start, 18, silk);
          const green = prog(f, frames[frames.length - 1] + 1, 8);
          return (
            <div key={l.text} style={{ marginBottom: 54, position: 'relative', height: SIZE * 1.3 }}>
              <div
                style={{
                  fontFamily: FONT.serifZh,
                  fontWeight: 600,
                  fontSize: SIZE,
                  lineHeight: 1.2,
                  color: mix(INK, GREEN, green),
                  whiteSpace: 'pre',
                }}
              >
                {chars.map((ch, k) => (
                  <span
                    key={k}
                    style={{
                      opacity: k < count ? 1 : 0,
                      display: 'inline-block',
                      transform: `translateY(${k < count ? Math.max(0, 1 - (f - frames[k]) / 5) * -18 : 0}px)`,
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: 0,
                  height: 8,
                  width: chars.length * SIZE * 0.98 * line,
                  borderRadius: 8,
                  background: done ? '#69a68a' : '#8b9dc5',
                }}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export { SlotWord };
