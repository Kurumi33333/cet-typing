import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { beatF } from '../beat';
import { AURORA, FONT } from '../theme';
import { FIELD_INK, FieldBg, MINT, press, prog, silk, inOut, Rise } from './kit';
import { T } from './time';

/**
 * OUTRO · beat 64–76. Everything typed in the film flies in from the edges, one
 * fragment per beat, then collapses into the centre and the wordmark stamps on
 * the strongest kick of the window (beat 72 = local f116) — SLAM #3. The
 * stamp is followed by 58 frames in which only the light breathes.
 */
const CX = 960;
const CY = 540;

const FRAGMENTS = [
  { text: 'I like tea.', x: 250, y: 190, size: 120 },
  { text: 'education.', x: 1480, y: 150, size: 120 },
  { text: 'hopes', x: 190, y: 560, size: 120 },
  { text: 'We love English.', x: 1330, y: 530, size: 110 },
  { text: 'her children', x: 300, y: 890, size: 120 },
  { text: 'a good', x: 1500, y: 880, size: 120 },
  { text: 'She also', x: 760, y: 120, size: 110 },
  { text: 'every day.', x: 1000, y: 930, size: 110 },
] as const;

export const STAMP = beatF(72) - T.outro.from; // local frame of the wordmark stamp
/** local frames each fragment lands */
export const OUTRO_ARRIVALS = FRAGMENTS.map((_, i) => beatF(64 + i * 0.85) - T.outro.from + 4);

export const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const collapse = prog(f, STAMP - 12, 12, inOut);
  const stamp = prog(f, STAMP, 12, press);
  const burst = prog(f, STAMP, 26, silk);
  const breath = Math.sin((f / 30) * 1.2) * 0.5 + 0.5;
  const rule = prog(f, STAMP + 10, 24, silk);
  const tag = prog(f, STAMP + 16, 16);
  const sub = prog(f, STAMP + 28, 16);
  const glow = 0.25 + burst * 0.75;

  return (
    <AbsoluteFill>
      <FieldBg glowX={50} glowY={45} glow={0.8} />
      {/* aurora: only light source of the finale */}
      <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: glow }}>
        {[
          { dx: 0, dy: 0, r: 900, c: AURORA[0], o: 0.5 },
          { dx: -330, dy: 120, r: 700, c: AURORA[2], o: 0.4 },
          { dx: 320, dy: -90, r: 620, c: AURORA[1], o: 0.4 },
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
              background: `radial-gradient(circle, ${b.c} 0%, rgba(255,255,255,0) 62%)`,
              opacity: b.o * (0.88 + breath * 0.12) * (0.4 + burst * 0.6),
              transform: `scale(${0.7 + burst * 0.45 + breath * 0.04})`,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* the fragments */}
      {FRAGMENTS.map((fr, i) => {
        const land = OUTRO_ARRIVALS[i];
        const p = prog(f, land - 20, 20, silk);
        const dx = fr.x - CX;
        const dy = fr.y - CY;
        const from = 1.9;
        const k = from - (from - 1) * p; // far at first, then settled
        const x = CX + dx * k;
        const y = CY + dy * k;
        // collapse toward the centre
        const cx2 = x + (CX - x) * collapse;
        const cy2 = y + (CY - y) * collapse;
        const op = Math.min(1, p * 1.4) * (1 - collapse);
        return (
          <div
            key={fr.text}
            style={{
              position: 'absolute',
              left: cx2,
              top: cy2,
              transform: `translate(-50%, -50%) scale(${1 - collapse * 0.6})`,
              opacity: op,
              fontFamily: FONT.serif,
              fontSize: fr.size,
              color: FIELD_INK,
              whiteSpace: 'nowrap',
              paddingBottom: 14,
            }}
          >
            {fr.text}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, borderRadius: 6, background: MINT, opacity: 0.9 }} />
          </div>
        );
      })}

      {/* the wordmark */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 270, textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            fontFamily: FONT.serif,
            fontWeight: 500,
            fontSize: 290,
            lineHeight: 1,
            color: FIELD_INK,
            opacity: Math.min(1, stamp * 2),
            transform: `scale(${1.22 - 0.22 * stamp})`,
            textShadow: `0 0 ${60 * (1 - burst)}px rgba(169,230,201,${0.8 * (1 - burst)})`,
          }}
        >
          CET Typing
        </div>
        <div style={{ margin: '50px auto 0', height: 12, width: 720 * rule, borderRadius: 12, background: MINT }} />
        <div style={{ marginTop: 44 }}>
          <Rise p={tag} size={104} color={FIELD_INK} style={{ margin: '0 auto', width: 'fit-content' }}>
            轻一点，记得更牢。
          </Rise>
        </div>
        <div style={{ marginTop: 10 }}>
          <Rise p={sub} size={64} weight={500} color="rgba(238,245,239,0.75)" style={{ margin: '0 auto', width: 'fit-content' }}>
            四六级中译英 · 本地优先
          </Rise>
        </div>
      </div>
    </AbsoluteFill>
  );
};
