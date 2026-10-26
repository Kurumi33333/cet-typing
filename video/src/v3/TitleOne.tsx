import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { beatF } from '../beat';
import { Display, Grad, Reveal, Stage, WHITE, prog } from './kit';

/**
 * TITLE ① · beat 8–12. Three lines of 210px type, one landing on each beat,
 * the key character of each filled with the aurora. SLAM #1: the whole frame
 * punches in on the kick at beat 8.
 */
const LINES = [
  { pre: '一个', key: '词', post: '，' },
  { pre: '一块', key: '砖', post: '，' },
  { pre: '一句', key: '话', post: '。' },
];
const SIZE = 210;

export const TITLE_ONE_BEATS = [8, 9, 10];

export const TitleOne: React.FC = () => {
  const f = useCurrentFrame();
  const t0 = beatF(8);
  const punch = 1.09 - 0.09 * prog(f, 0, 14);
  return (
    <AbsoluteFill>
      <Stage t={prog(f, 0, 60, (t) => t)} ax={80} ay={20} bx={20} by={88} />
      <AbsoluteFill style={{ transform: `scale(${punch})`, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          {LINES.map((l, i) => {
            const start = beatF(TITLE_ONE_BEATS[i]) - t0;
            const p = prog(f, start, 16);
            return (
              <Reveal key={l.key} p={p} rise={46} blur={26}>
                <Display size={SIZE} color={WHITE} style={{ lineHeight: 1.14 }}>
                  {l.pre}
                  <Grad shift={prog(f, start, 70, (t) => t) * 0.5}>{l.key}</Grad>
                  {l.post}
                </Display>
              </Reveal>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
