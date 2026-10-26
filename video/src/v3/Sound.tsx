import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { beatF } from '../beat';
import { AURORA } from '../theme';
import { DIM, Display, FONT3, Grad, Reveal, Stage, WHITE, hexA, prog, silk } from './kit';
import { mulberry32 } from '../helpers/rand';
import { T } from '../v2/time';

/**
 * SOUND · beat 50–58. The landing page's own line, "每一次敲击，都有声音。",
 * over a bar-wave that is driven by the grid: every beat kicks the whole wave
 * up and it decays between beats, so the picture is audibly "typing in time".
 * Bars are deterministic (mulberry32, seed from index).
 */
const BARS = 56;
const BAR_W = 18;
const GAP = 14;
const BASE_Y = 930;

const heights = (() => {
  const r = mulberry32(7);
  return Array.from({ length: BARS }, (_, i) => {
    const centre = 1 - Math.abs(i - BARS / 2) / (BARS / 2);
    return 0.3 + 0.7 * (0.25 + 0.75 * r()) * (0.35 + 0.65 * centre);
  });
})();

export const SOUND_BEATS = [50, 51, 52, 53, 54, 55, 56, 57];

export const Sound: React.FC = () => {
  const f = useCurrentFrame();
  const g = T.sound.from + f; // global frame, to find the beat phase
  // beat phase: 0 right on the beat, 1 just before the next
  const perBeat = beatF(51) - beatF(50);
  const ph = ((g - beatF(50)) % perBeat + perBeat) % perBeat / perBeat;
  const kick = Math.pow(1 - ph, 2.2);
  const wave = prog(f, 0, 26, silk);
  const l1 = prog(f, 0, 16);
  const l2 = prog(f, 10, 16);
  const l3 = prog(f, beatF(54) - T.sound.from, 16);

  return (
    <AbsoluteFill>
      <Stage t={prog(f, 0, 116, (t) => t)} ax={50} ay={105} bx={50} by={-10} pool={1 + kick * 0.5} />
      <div style={{ position: 'absolute', left: 150, top: 96 }}>
        <Reveal p={l1}>
          <Display size={150} color={WHITE}>每一次敲击，</Display>
        </Reveal>
        <Reveal p={l2}>
          <Display size={150} color={WHITE}>
            都有<Grad shift={prog(f, 10, 100, (t) => t) * 0.8}>声音</Grad>。
          </Display>
        </Reveal>
      </div>
      <div style={{ position: 'absolute', right: 150, top: 96, textAlign: 'right' }}>
        <Reveal p={l3}>
          <Grad shift={0.1} style={{ fontFamily: FONT3.en, fontWeight: 600, fontSize: 300, letterSpacing: '-0.05em', lineHeight: 1 }}>7</Grad>
          <Display size={72} color={DIM} weight={500}>类键音</Display>
        </Reveal>
      </div>

      <div style={{ position: 'absolute', left: (1920 - (BARS * (BAR_W + GAP) - GAP)) / 2, top: 0, bottom: 0 }}>
        {heights.map((h, i) => {
          const wob = 0.82 + 0.18 * Math.sin((g * 0.21) + i * 0.7);
          const hh = Math.max(10, 340 * h * wave * (0.28 + 0.72 * kick) * wob);
          const c = AURORA[(i * 3 / BARS | 0) % 3];
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: i * (BAR_W + GAP),
                top: BASE_Y - hh,
                width: BAR_W,
                height: hh,
                borderRadius: BAR_W,
                background: `linear-gradient(180deg, ${c}, ${hexA(c, 0.25)})`,
                boxShadow: `0 0 ${14 + kick * 26}px ${hexA(c, 0.35)}`,
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
