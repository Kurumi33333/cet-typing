import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { beatF } from '../beat';
import { FONT, INK, INK_SOFT } from '../theme';
import { PaperBg, Rise, prog, silk, inOut } from './kit';
import { T } from './time';

/**
 * COURSE · beat 12–20. One stacked bar = the 120 steps; its three segments fill
 * in sequence, each finishing on a beat, with the numbers counting up under it.
 * Counts are the product's own (41 words / 37 chunks / 42 sentences, 12 units).
 */
export const COURSE_SEGS = [
  { label: '单词', n: 41, color: '#3f7f64', endBeat: 15 },
  { label: '语块', n: 37, color: '#356b54', endBeat: 17 },
  { label: '句子', n: 42, color: '#2b5541', endBeat: 19 },
] as const;

const BAR_X = 120;
const BAR_W = 1680;
const GAP = 10;

export const Course: React.FC = () => {
  const f = useCurrentFrame();
  const base = T.course.from;
  const loc = (b: number) => beatF(b) - base;
  const head = prog(f, 0, 18);
  const unit = Math.round(prog(f, 2, 40, inOut) * 12);
  const steps = Math.round(prog(f, 2, 40, inOut) * 120);

  let cursor = BAR_X;
  let startBeat = 12;
  return (
    <AbsoluteFill>
      <PaperBg shift={4} />
      {/* headline numbers */}
      <div style={{ position: 'absolute', left: 120, top: 92, display: 'flex', alignItems: 'baseline', gap: 28, opacity: head }}>
        <span style={{ fontFamily: FONT.serif, fontSize: 230, color: INK, lineHeight: 1 }}>{unit}</span>
        <span style={{ fontFamily: FONT.serifZh, fontWeight: 600, fontSize: 88, color: INK }}>个单元</span>
        <span style={{ fontFamily: FONT.serifZh, fontSize: 88, color: INK_SOFT, margin: '0 18px' }}>·</span>
        <span style={{ fontFamily: FONT.serif, fontSize: 230, color: INK, lineHeight: 1 }}>{steps}</span>
        <span style={{ fontFamily: FONT.serifZh, fontWeight: 600, fontSize: 88, color: INK }}>步练习</span>
      </div>

      {/* the stacked bar */}
      {COURSE_SEGS.map((seg, i) => {
        const w = (seg.n / 120) * (BAR_W - GAP * 2);
        const x = cursor;
        cursor += w + GAP;
        const from = loc(startBeat);
        const to = loc(seg.endBeat);
        startBeat = seg.endBeat;
        const p = prog(f, from, to - from, (t) => 1 - Math.pow(1 - t, 2.2));
        const count = Math.round(p * seg.n);
        const lab = prog(f, from + 6, 16);
        return (
          <React.Fragment key={seg.label}>
            <div
              style={{
                position: 'absolute',
                left: x,
                top: 470,
                width: w,
                height: 150,
                borderRadius: 30,
                background: 'rgba(53,107,84,0.10)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: x,
                top: 470,
                width: w * p,
                height: 150,
                borderRadius: 30,
                background: seg.color,
              }}
            />
            <div style={{ position: 'absolute', left: x, top: 650, width: w, textAlign: 'center', opacity: lab }}>
              <div style={{ fontFamily: FONT.serif, fontSize: 210, color: INK, lineHeight: 1 }}>{count}</div>
              <Rise p={lab} size={92} color={INK_SOFT} style={{ marginTop: 18 }}>
                {seg.label}
              </Rise>
            </div>
          </React.Fragment>
        );
      })}
      {/* underline motif closes the row once the last segment lands */}
      <div
        style={{
          position: 'absolute',
          left: BAR_X,
          top: 995,
          height: 6,
          borderRadius: 6,
          width: BAR_W * prog(f, loc(19), 14, silk),
          background: '#69a68a',
        }}
      />
    </AbsoluteFill>
  );
};
