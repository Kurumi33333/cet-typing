import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { AURORA } from '../theme';
import { beatF } from '../beat';
import { DIM, Display, FONT3, Grad, Reveal, Stage, WHITE, hexA, inOut, prog, silk } from './kit';
import { T } from '../v2/time';

/**
 * COURSE · beat 12–20. One bar = the 120 steps; its three segments fill in
 * sequence, each finishing on a beat, numerals counting up under it.
 * Counts are the product's own (41 words / 37 chunks / 42 sentences, 12 units).
 */
export const COURSE_SEGS = [
  { label: '单词', n: 41, color: AURORA[0], endBeat: 15 },
  { label: '语块', n: 37, color: AURORA[1], endBeat: 17 },
  { label: '句子', n: 42, color: AURORA[2], endBeat: 19 },
] as const;

const BAR_X = 120;
const BAR_W = 1680;
const GAP = 14;

export const Course: React.FC = () => {
  const f = useCurrentFrame();
  const base = T.course.from;
  const loc = (b: number) => beatF(b) - base;
  const head = prog(f, 0, 18);
  const unit = Math.round(prog(f, 2, 40, inOut) * 12);
  const steps = Math.round(prog(f, 2, 40, inOut) * 120);
  const sh = prog(f, 0, 110, (t) => t) * 0.5;

  let cursor = BAR_X;
  let startBeat = 12;
  return (
    <AbsoluteFill>
      <Stage t={prog(f, 0, 116, (t) => t)} ax={14} ay={10} bx={88} by={80} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 70, display: 'flex', justifyContent: 'center' }}>
        <Reveal p={head}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 26 }}>
            <Grad shift={sh} style={{ fontFamily: FONT3.en, fontWeight: 600, fontSize: 280, letterSpacing: '-0.05em', lineHeight: 1 }}>{unit}</Grad>
            <Display size={84} color={WHITE}>个单元</Display>
            <Display size={84} color={DIM} style={{ margin: '0 22px' }}>·</Display>
            <Grad shift={sh + 0.25} style={{ fontFamily: FONT3.en, fontWeight: 600, fontSize: 280, letterSpacing: '-0.05em', lineHeight: 1 }}>{steps}</Grad>
            <Display size={84} color={WHITE}>步练习</Display>
          </div>
        </Reveal>
      </div>

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
        const land = f >= to ? Math.max(0, 1 - (f - to) / 22) : 0;
        return (
          <React.Fragment key={seg.label}>
            <div style={{ position: 'absolute', left: x, top: 470, width: w, height: 120, borderRadius: 60, background: 'rgba(245,245,247,0.07)' }} />
            <div
              style={{
                position: 'absolute',
                left: x,
                top: 470,
                width: Math.max(0, w * p),
                height: 120,
                borderRadius: 60,
                background: `linear-gradient(90deg, ${hexA(seg.color, 0.55)}, ${seg.color})`,
                boxShadow: `0 0 ${30 + land * 90}px ${hexA(seg.color, 0.3 + land * 0.5)}`,
              }}
            />
            <div style={{ position: 'absolute', left: x, top: 640, width: w, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Reveal p={lab}>
                <div style={{ fontFamily: FONT3.en, fontWeight: 600, fontSize: 230, letterSpacing: '-0.05em', lineHeight: 1, color: WHITE }}>{count}</div>
                <Display size={84} color={DIM} weight={500} style={{ textAlign: 'center', marginTop: 10 }}>{seg.label}</Display>
              </Reveal>
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
