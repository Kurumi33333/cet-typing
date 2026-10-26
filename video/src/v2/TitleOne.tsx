import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { beatF } from '../beat';
import { FONT } from '../theme';
import { FIELD_INK, FieldBg, MINT, Rise, prog, silk } from './kit';

/**
 * TITLE ① · beat 8–12. Not a blank card: three lines of 190px type, one landing
 * on each beat, the key character of each underlined by the motif line. This is
 * SLAM #1 — the whole frame punches in on the kick at beat 8.
 */
const LINES = [
  { pre: '一个', key: '词', post: '，' },
  { pre: '一块', key: '砖', post: '，' },
  { pre: '一句', key: '话', post: '。' },
];
const SIZE = 190;

export const TITLE_ONE_BEATS = [8, 9, 10];

export const TitleOne: React.FC = () => {
  const f = useCurrentFrame();
  const t0 = beatF(8);
  const punch = 1.07 - 0.07 * prog(f, 0, 12);
  return (
    <AbsoluteFill>
      <FieldBg glowX={82} glowY={14} />
      <AbsoluteFill style={{ transform: `scale(${punch})`, transformOrigin: '30% 50%' }}>
        <div style={{ position: 'absolute', left: 170, top: 168 }}>
          {LINES.map((l, i) => {
            const start = beatF(TITLE_ONE_BEATS[i]) - t0;
            const p = prog(f, start, 14);
            const line = prog(f, start + 6, 16, silk);
            return (
              <div key={l.key} style={{ position: 'relative' }}>
                <Rise p={p} size={SIZE} color={FIELD_INK}>
                  {l.pre}
                  <span style={{ color: MINT }}>{l.key}</span>
                  {l.post}
                </Rise>
                {/* the motif line, under the key character */}
                <div
                  style={{
                    position: 'absolute',
                    left: SIZE * 2 + 8,
                    width: SIZE - 16,
                    bottom: 22,
                    height: 8,
                    borderRadius: 8,
                    background: MINT,
                    transformOrigin: 'left center',
                    transform: `scaleX(${line})`,
                    opacity: 0.9,
                  }}
                />
              </div>
            );
          })}
        </div>
        {/* a quiet ledger on the right so the frame is not just a left column */}
        <div
          style={{
            position: 'absolute',
            right: 150,
            top: 220,
            textAlign: 'right',
            fontFamily: FONT.serif,
            fontSize: 520,
            lineHeight: 1,
            color: 'rgba(238,245,239,0.16)',
            opacity: prog(f, 4, 20),
          }}
        >
          Aa
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
