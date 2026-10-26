import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { DIM, Display, FONT3, Grad, MINT, RED, Reveal, Stage, WHITE, hexA, inOut, prog, press, silk } from './kit';

/**
 * REVIEW · beat 32–44. "错的，会回来。" is SLAM #2 (kick at beat 32), then the
 * line shrinks to a heading and a log-scaled timeline draws itself: 2 → 11 → 46
 * → 163 days, one node every two beats. Intervals are the product's FSRS values.
 *
 * Local frames; shot starts at beat 32 (f465).
 */
const AXIS_Y = 760;
const X0 = 240;
const X1 = 1680;
const DAYS = [0, 2, 11, 46, 163];
const MAXLOG = Math.log(1 + 163);
const xOf = (d: number) => X0 + (Math.log(1 + d) / MAXLOG) * (X1 - X0);

/** local frame each interval node pops on (beats 35, 37, 39, 41) */
export const REVIEW_NODES = [44, 73, 102, 131] as const;

export const Review: React.FC = () => {
  const f = useCurrentFrame();
  const punch = 1.08 - 0.08 * prog(f, 0, 12);
  // big phrase → heading
  const shrink = prog(f, 29, 18, inOut);
  const phraseSize = 236 - shrink * 140;
  const phraseTop = 380 - shrink * 300;
  const phraseIn = prog(f, 0, 12, press);
  const subIn = prog(f, 40, 14);

  const axisDraw = prog(f, 30, 20, silk);

  return (
    <AbsoluteFill>
      <Stage t={prog(f, 0, 175, (t) => t)} ax={18} ay={86} bx={84} by={14} pool={1 + prog(f, 44, 90, (t) => t) * 0.6} />
      <AbsoluteFill style={{ transform: `scale(${punch})` }}>
        {/* the phrase */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: phraseTop,
            display: 'flex',
            justifyContent: 'center',
            opacity: phraseIn,
            transform: `scale(${1.1 - 0.1 * phraseIn})`,
          }}
        >
          <Display size={phraseSize} color={WHITE}>
            错的，<Grad shift={prog(f, 0, 140, (t) => t) * 0.7}>会回来</Grad>。
          </Display>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 232, display: 'flex', justifyContent: 'center' }}>
          <Reveal p={subIn}>
            <Display size={64} weight={500} color={DIM}>隔得越久，越要自己想。</Display>
          </Reveal>
        </div>

        {/* FSRS tag */}
        <div
          style={{
            position: 'absolute',
            right: 120,
            top: 96,
            padding: '8px 28px',
            borderRadius: 60,
            border: '3px solid rgba(169,230,201,0.6)',
            fontFamily: FONT3.en,
            fontWeight: 600,
            fontSize: 56,
            letterSpacing: 4,
            color: MINT,
            opacity: prog(f, 44, 12),
          }}
        >
          FSRS
        </div>

        {/* axis */}
        <div
          style={{
            position: 'absolute',
            left: X0,
            top: AXIS_Y - 3,
            width: (X1 - X0) * axisDraw,
            height: 6,
            borderRadius: 6,
            background: 'rgba(245,245,247,0.16)',
          }}
        />
        {/* progress fill, node to node */}
        {DAYS.slice(1).map((d, i) => {
          const from = xOf(DAYS[i]);
          const to = xOf(d);
          const p = prog(f, REVIEW_NODES[i] - 18, 18, silk);
          return (
            <div
              key={d}
              style={{ position: 'absolute', left: from, top: AXIS_Y - 5, width: (to - from) * p, height: 10, borderRadius: 10, background: `linear-gradient(90deg, ${MINT}, #6bc3e6)`, boxShadow: `0 0 24px ${hexA(MINT, 0.6)}` }}
            />
          );
        })}
        {/* the mistake, day 0 */}
        <div
          style={{
            position: 'absolute',
            left: X0 - 26,
            top: AXIS_Y - 26,
            width: 52,
            height: 52,
            borderRadius: 52,
            background: RED,
            opacity: axisDraw,
            boxShadow: `0 0 ${40 * axisDraw}px rgba(219,79,86,0.6)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: X0 - 100,
            width: 200,
            top: AXIS_Y + 56,
            textAlign: 'center',
            fontFamily: FONT3.zh,
            fontWeight: 500,
            fontSize: 60,
            color: DIM,
            opacity: axisDraw,
          }}
        >
          答错
        </div>

        {DAYS.slice(1).map((d, i) => {
          const t = REVIEW_NODES[i];
          const pop = prog(f, t, 12, press);
          const ring = prog(f, t, 22, silk);
          const num = Math.round(prog(f, t, 14, silk) * d);
          const x = xOf(d);
          return (
            <React.Fragment key={d}>
              <div
                style={{
                  position: 'absolute',
                  left: x - 44 - ring * 40,
                  top: AXIS_Y - 44 - ring * 40,
                  width: 88 + ring * 80,
                  height: 88 + ring * 80,
                  borderRadius: 200,
                  border: '4px solid rgba(169,230,201,0.8)',
                  opacity: f >= t ? (1 - ring) * 0.9 : 0,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: x - 30,
                  top: AXIS_Y - 30,
                  width: 60,
                  height: 60,
                  borderRadius: 60,
                  background: MINT,
                  transform: `scale(${pop})`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(x, 1650) - 220,
                  width: 440,
                  top: AXIS_Y - 300 + (1 - pop) * 40,
                  textAlign: 'center',
                  opacity: pop,
                  color: WHITE,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                <Grad shift={i * 0.22} style={{ fontFamily: FONT3.en, fontWeight: 600, fontSize: 128, letterSpacing: '-0.05em' }}>{num}</Grad>
                <span style={{ fontFamily: FONT3.zh, fontWeight: 700, fontSize: 56, marginLeft: 6, color: WHITE }}>天</span>
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: x - 140,
                  width: 280,
                  top: AXIS_Y + 56,
                  textAlign: 'center',
                  fontFamily: FONT3.zh,
                  fontWeight: 500,
                  fontSize: 60,
                  color: DIM,
                  opacity: pop,
                }}
              >
                第 {i + 2} 次
              </div>
            </React.Fragment>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
