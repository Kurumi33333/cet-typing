import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BGM, SFX, bgmVolume } from './sound3';
import { T, TOTAL } from '../v2/time';
import { expo } from './kit';
import { Cam, CamSpec, ImpactFx, splitFilter } from './fx';
import { Hook } from './Hook';
import { TitleOne } from './TitleOne';
import { Course } from './Course';
import { Sentence } from './Sentence';
import { Review } from './Review';
import { Lexicon } from './Lexicon';
import { Sound } from './Sound';
import { Local } from './Local';
import { Outro } from './Outro';

/**
 * V3 assembly. Shots hand over with a push-through: the incoming shot arrives
 * from slightly too close and out of focus and settles, while the outgoing one
 * keeps pushing forward and dissolves — a camera moving through, not a cut.
 * The incoming shot starts ON its beat; the outgoing runs on for TR frames.
 */
const TR = 9;

const ORDER: { id: string; span: typeof T.hook; C: React.FC }[] = [
  { id: 'hook', span: T.hook, C: Hook },
  { id: 'title-1', span: T.titleOne, C: TitleOne },
  { id: 'course', span: T.course, C: Course },
  { id: 'sentence', span: T.sentence, C: Sentence },
  { id: 'review', span: T.review, C: Review },
  { id: 'lexicon', span: T.lexicon, C: Lexicon },
  { id: 'sound', span: T.sound, C: Sound },
  { id: 'local', span: T.local, C: Local },
  { id: 'outro', span: T.outro, C: Outro },
];

/** Each shot's camera: a curved path, a dolly and a little roll / orbit, all on one parameter. */
const CAMS: Record<string, CamSpec & { hit?: number; seed?: number }> = {
  hook: { dur: 116, path: [[-50, 24], [-20, -10], [30, -30], [60, -22]], s: [1, 1.05], roll: [-0.5, 0.3], tiltY: [-1.5, 1], glide: 0.8 },
  'title-1': { dur: 100, path: [[0, 30], [40, 14], [-30, -8], [-20, -26]], s: [1.02, 1.07], roll: [0.5, -0.4], tiltX: [2, 0], glide: 0.7, hit: 0, seed: 3 },
  course: { dur: 230, path: [[-90, 10], [-30, -40], [40, 40], [80, -10]], s: [1.0, 1.06], roll: [-0.4, 0.5], tiltY: [-2, 2], glide: 0.85 },
  sentence: { dur: 200, path: [[70, -20], [20, 30], [-40, -30], [-70, 8]], s: [1.04, 1.0], roll: [0.4, -0.3], tiltX: [-1.5, 1.5], glide: 0.85 },
  review: { dur: 200, path: [[0, 40], [-60, 10], [50, -20], [30, -34]], s: [1.0, 1.05], roll: [0, -0.5], tiltY: [2, -1.5], glide: 0.8, hit: 0, seed: 11 },
  lexicon: { dur: 220, path: [[60, 10], [10, -40], [-50, 30], [-40, -4]], s: [0.97, 1.02], roll: [0.3, -0.3], glide: 0.85 },
  sound: { dur: 200, path: [[-40, -20], [30, 30], [-20, -30], [40, 12]], s: [1.05, 1.0], roll: [-0.3, 0.4], tiltX: [1, -1], glide: 0.85 },
  local: { dur: 180, path: [[30, 20], [-30, -10], [20, -30], [-10, 10]], s: [1.0, 1.05], roll: [0.4, -0.2], tiltY: [1.5, -1.5], glide: 0.85 },
  outro: { dur: 300, path: [[0, 26], [0, 10], [0, -6], [0, -18]], s: [0.97, 1.04], roll: [0, 0], glide: 0.9, hit: 116, seed: 23 },
};

const Shot: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const f = useCurrentFrame();
  const { hit, seed, ...spec } = CAMS[id];
  const t = hit === undefined ? -1 : f - hit;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: splitFilter(t) }}>
        <Cam f={f} spec={spec}>{children}</Cam>
      </AbsoluteFill>
      {hit !== undefined ? <ImpactFx t={t} seed={seed} power={id === 'outro' ? 0.8 : 1} /> : null}
    </AbsoluteFill>
  );
};

const Through: React.FC<{ first: boolean; last: boolean; dur: number; children: React.ReactNode }> = ({
  first, last, dur, children,
}) => {
  const f = useCurrentFrame();
  const inP = first ? 1 : expo(interpolate(f, [0, TR], [0, 1], { extrapolateRight: 'clamp' }));
  const outP = last ? 0 : interpolate(f, [dur, dur + TR], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = (1.07 - 0.07 * inP) * (1 + 0.09 * outP);
  const blur = (1 - inP) * 18 + outP * 14;
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(1, inP * 1.4) * (1 - outP),
        transform: `scale(${scale})`,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export interface Promo3Props {
  bgm?: boolean;
}

export const Promo3: React.FC<Promo3Props> = ({ bgm = true }) => (
  <AbsoluteFill style={{ background: '#050607' }}>
    {ORDER.map(({ id, span, C }, i) => {
      const last = i === ORDER.length - 1;
      return (
        <Sequence key={id} from={span.from} durationInFrames={span.duration + (last ? 0 : TR)} name={id} style={{ zIndex: ORDER.length - i }}>
          <Through first={i === 0} last={last} dur={span.duration}>
            <Shot id={id}><C /></Shot>
          </Through>
        </Sequence>
      );
    })}

    {bgm ? <Audio src={staticFile(`audio/${BGM.src}`)} volume={(f) => bgmVolume(f, TOTAL)} /> : null}
    {SFX.map((s) => (
      <Sequence key={`${s.src}-${s.from}`} from={s.from} durationInFrames={s.durationInFrames ?? 120} name={`SFX · ${s.src}`}>
        <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
