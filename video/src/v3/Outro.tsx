import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { beatF } from '../beat';
import { AURORA } from '../theme';
import { DIM, Display, FONT3, GRAD, Grad, MINT, Reveal, Stage, WHITE, hexA, inOut, press, prog, silk } from './kit';
import { T } from '../v2/time';

/**
 * OUTRO · beat 64–76. Everything typed in the film flies in from the edges, one
 * fragment per beat, collapses into the centre and the wordmark lands on the
 * strongest kick of the window (beat 72 = local f116) — SLAM #3. After the
 * stamp only the light moves.
 */
const CX = 960;
const CY = 540;

const FRAGMENTS = [
  { text: 'I like tea.', x: 300, y: 200, size: 118 },
  { text: 'education.', x: 1430, y: 170, size: 118 },
  { text: 'hopes', x: 250, y: 560, size: 118 },
  { text: 'We love English.', x: 1400, y: 540, size: 108 },
  { text: 'her children', x: 380, y: 860, size: 118 },
  { text: 'a good', x: 1520, y: 860, size: 118 },
  { text: 'She also', x: 800, y: 130, size: 108 },
  { text: 'every day.', x: 1000, y: 900, size: 108 },
] as const;

export const STAMP = beatF(72) - T.outro.from;
/** local frames each fragment lands: packed into the first 7 beats, so all 8 are on screen together */
export const OUTRO_ARRIVALS = FRAGMENTS.map((_, i) => beatF(64 + i * 0.8) - T.outro.from + 4);

export const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const collapse = prog(f, STAMP - 14, 14, inOut);
  const stamp = prog(f, STAMP, 14, press);
  const burst = prog(f, STAMP, 30, silk);
  const breath = Math.sin((f / 30) * 1.2) * 0.5 + 0.5;
  const rule = prog(f, STAMP + 8, 26, silk);
  const tag = prog(f, STAMP + 16, 18);
  const sub = prog(f, STAMP + 30, 18);
  const flash = f >= STAMP ? Math.max(0, 1 - (f - STAMP) / 14) : 0;

  return (
    <AbsoluteFill>
      <Stage t={prog(f, 0, 175, (t) => t)} ax={30} ay={30} bx={72} by={74} pool={0.8 + burst * 0.9} />
      <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: 0.2 + burst * 0.42 }}>
        {[
          { dx: 0, dy: -20, r: 760, c: AURORA[0], o: 0.5 },
          { dx: -380, dy: 140, r: 640, c: AURORA[2], o: 0.42 },
          { dx: 380, dy: -110, r: 600, c: AURORA[1], o: 0.42 },
        ].map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: CX + b.dx - b.r,
              top: CY + b.dy - b.r,
              width: b.r * 2,
              height: b.r * 2,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${b.c} 0%, rgba(0,0,0,0) 62%)`,
              opacity: b.o * (0.85 + breath * 0.15) * (0.3 + burst * 0.7),
              transform: `scale(${0.6 + burst * 0.5 + breath * 0.04})`,
            }}
          />
        ))}
      </AbsoluteFill>

      {FRAGMENTS.map((fr, i) => {
        const land = OUTRO_ARRIVALS[i];
        const p = prog(f, land - 18, 18, silk);
        const k = 1.7 - 0.7 * p;
        const x = CX + (fr.x - CX) * k;
        const y = CY + (fr.y - CY) * k;
        const cx2 = x + (CX - x) * collapse;
        const cy2 = y + (CY - y) * collapse;
        const op = Math.min(1, p * 1.6) * (1 - collapse);
        return (
          <div
            key={fr.text}
            style={{
              position: 'absolute',
              left: cx2,
              top: cy2,
              transform: `translate(-50%, -50%) scale(${1 - collapse * 0.55})`,
              opacity: op,
              filter: `blur(${(1 - p) * 14 + collapse * 14}px)`,
              fontFamily: FONT3.en,
              fontWeight: 600,
              letterSpacing: '-0.04em',
              fontSize: fr.size,
              color: WHITE,
              whiteSpace: 'nowrap',
              paddingBottom: 14,
            }}
          >
            {fr.text}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, borderRadius: 5, background: GRAD }} />
          </div>
        );
      })}

      {/* flash on the stamp */}
      <div
        style={{
          position: 'absolute',
          left: CX - 900,
          top: CY - 8,
          width: 1800,
          height: 16,
          borderRadius: 16,
          background: `radial-gradient(closest-side, ${hexA('#ffffff', 0.95)}, rgba(255,255,255,0))`,
          opacity: flash,
          transform: `scaleX(${0.4 + (1 - flash) * 1.2})`,
        }}
      />

      <div style={{ position: 'absolute', left: 0, right: 0, top: 215, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            fontFamily: FONT3.en,
            fontWeight: 600,
            letterSpacing: '-0.05em',
            fontSize: 300,
            lineHeight: 1,
            opacity: Math.min(1, stamp * 2),
            transform: `scale(${1.2 - 0.2 * stamp})`,
            filter: stamp < 1 ? `blur(${(1 - stamp) * 12}px)` : undefined,
            textShadow: `0 0 ${80 * (1 - burst)}px ${hexA(MINT, 0.9 * (1 - burst))}`,
          }}
        >
          <Grad shift={0.1 + prog(f, STAMP, 120, (t) => t) * 0.5}>CET Typing</Grad>
        </div>
        <div style={{ margin: '58px auto 0', height: 8, width: 700 * rule, borderRadius: 8, background: GRAD, boxShadow: `0 0 30px ${hexA(MINT, 0.5)}` }} />
        <div style={{ marginTop: 42 }}>
          <Reveal p={tag}>
            <Display size={96} color={WHITE}>轻一点，记得更牢。</Display>
          </Reveal>
        </div>
        <div style={{ marginTop: 26 }}>
          <Reveal p={sub}>
            <Display size={58} weight={500} color="rgba(245,245,247,0.8)">四六级中译英 · 本地优先</Display>
          </Reveal>
        </div>
      </div>
    </AbsoluteFill>
  );
};
