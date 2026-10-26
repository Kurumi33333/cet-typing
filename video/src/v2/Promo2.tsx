import React from 'react';
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BGM, SFX } from './sound2';
import { T, WIPE } from './time';
import { MINT } from './kit';
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
 * V2 assembly. Each shot after the first opens as a wipe over the previous one
 * (WIPE frames, clip-path only — nothing is darkened), and the previous shot
 * runs on underneath for exactly those frames. A 10px mint edge leads the wipe,
 * which is the film's underline motif doing the job of the transition.
 */
type Dir = 'r' | 'b';

const ORDER: { id: string; span: typeof T.hook; C: React.FC; dir?: Dir }[] = [
  { id: 'hook', span: T.hook, C: Hook },
  { id: 'title-1', span: T.titleOne, C: TitleOne, dir: 'r' },
  { id: 'course', span: T.course, C: Course, dir: 'b' },
  { id: 'sentence', span: T.sentence, C: Sentence, dir: 'r' },
  { id: 'review', span: T.review, C: Review, dir: 'b' },
  { id: 'lexicon', span: T.lexicon, C: Lexicon, dir: 'r' },
  { id: 'sound', span: T.sound, C: Sound, dir: 'b' },
  { id: 'local', span: T.local, C: Local, dir: 'r' },
  { id: 'outro', span: T.outro, C: Outro, dir: 'b' },
];

const wipeEase = Easing.bezier(0.7, 0, 0.2, 1);

const Wiped: React.FC<{ dir?: Dir; children: React.ReactNode }> = ({ dir, children }) => {
  const f = useCurrentFrame();
  if (!dir || f >= WIPE) return <AbsoluteFill>{children}</AbsoluteFill>;
  const p = interpolate(f, [0, WIPE], [0, 1], { extrapolateRight: 'clamp', easing: wipeEase });
  const x = (1 - p) * 100;
  const clip = dir === 'r' ? `inset(0 0 0 ${x}%)` : `inset(${x}% 0 0 0)`;
  const edge =
    dir === 'r'
      ? { left: `${x}%`, top: 0, bottom: 0, width: 10, transform: 'translateX(-5px)' }
      : { top: `${x}%`, left: 0, right: 0, height: 10, transform: 'translateY(-5px)' };
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip }}>{children}</AbsoluteFill>
      <div style={{ position: 'absolute', background: MINT, opacity: 0.95, ...edge }} />
    </AbsoluteFill>
  );
};

export interface Promo2Props {
  bgm?: boolean;
}

export const Promo2: React.FC<Promo2Props> = ({ bgm = true }) => (
  <AbsoluteFill style={{ background: '#f7f9f6' }}>
    {ORDER.map(({ id, span, C, dir }, i) => (
      <Sequence
        key={id}
        from={span.from}
        durationInFrames={span.duration + (i < ORDER.length - 1 ? WIPE : 0)}
        name={id}
      >
        <Wiped dir={dir}>
          <C />
        </Wiped>
      </Sequence>
    ))}

    {bgm ? <Audio src={staticFile(`audio/${BGM.src}`)} volume={BGM.volume} /> : null}
    {SFX.map((s) => (
      <Sequence key={`${s.src}-${s.from}`} from={s.from} durationInFrames={s.durationInFrames ?? 120} name={`SFX · ${s.src}`}>
        <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
