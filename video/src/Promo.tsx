/**
 * The film, assembled.
 *
 * Overlay layers follow the template's proven order:
 *   shots → transitions → captions → audio
 * and every table it renders from is exported, so src/workbench.ts can rebuild
 * the same film as editable tracks without a second copy of the timing.
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { SHOTS, TOTAL_FRAMES } from './beat';
import { BGM, SFX } from './sound';
import { SceneWord } from './scenes/SceneWord';
import { SceneCourse } from './scenes/SceneCourse';
import { SceneSentence } from './scenes/SceneSentence';
import { SceneReview } from './scenes/SceneReview';
import { SceneOutro } from './scenes/SceneOutro';
import { TitleCard } from './scenes/TitleCard';
import { CAPTIONS, Caption } from './components/Caption';
import { Cut, CUT_SPANS } from './components/Cut';
import { CARD_ONE, CARD_TWO, CARD_THREE } from './copy';

export const SHOT_LIST = [
  { id: 's1', ...SHOTS.s1Scene, label: 'S1 看中文，写英文' },
  { id: 'c1', ...SHOTS.c1Card, label: 'C1 字卡①' },
  { id: 's2', ...SHOTS.s2Course, label: 'S2 课程阶梯' },
  { id: 'c2', ...SHOTS.c2Card, label: 'C2 字卡②' },
  { id: 's3', ...SHOTS.s3Sentence, label: 'S3 长句与即时反馈' },
  { id: 'c3', ...SHOTS.c3Card, label: 'C3 字卡③' },
  { id: 's4', ...SHOTS.s4Review, label: 'S4 到期复习' },
  { id: 's5', ...SHOTS.s5Outro, label: 'S5 合影与字标' },
] as const;

/** The card copy, as data so the workbench can edit it. */
export const TITLE_CARDS = {
  c1: { text: CARD_ONE.text, sub: CARD_ONE.sub },
  c2: { text: CARD_TWO.text, sub: CARD_TWO.sub },
  c3: { text: CARD_THREE.text, sub: CARD_THREE.sub },
} as const;

/**
 * The seams. Each cut straddles its boundary by ±7f and is carried by a 2px
 * rule that slides through — the motif doing the work of a transition, once
 * (DESIGN.md: line-carry is used exactly once, at C2→S3).
 */
export const CUTS = [
  { id: 'cut-c1', at: SHOTS.c1Card.from, kind: 'ruleWipe' as const },
  { id: 'cut-s2', at: SHOTS.s2Course.from, kind: 'paperSlide' as const },
  { id: 'cut-c2', at: SHOTS.c2Card.from, kind: 'ruleWipe' as const },
  { id: 'cut-s3', at: SHOTS.s3Sentence.from, kind: 'lineCarry' as const },
  { id: 'cut-c3', at: SHOTS.c3Card.from, kind: 'ruleWipe' as const },
  { id: 'cut-s4', at: SHOTS.s4Review.from, kind: 'irisToField' as const },
  { id: 'cut-s5', at: SHOTS.s5Outro.from, kind: 'lightRise' as const },
] as const;

export interface PromoProps {
  bgm?: boolean;
}

export const Promo: React.FC<PromoProps> = ({ bgm = true }) => (
  <AbsoluteFill>
    {/* ------------------------------------------------------------ shots */}
    <Sequence from={SHOTS.s1Scene.from} durationInFrames={SHOTS.s1Scene.duration} name="S1 看中文，写英文">
      <SceneWord shot={SHOTS.s1Scene} />
    </Sequence>

    <Sequence from={SHOTS.c1Card.from} durationInFrames={SHOTS.c1Card.duration} name="C1 字卡①">
      <TitleCard {...TITLE_CARDS.c1} duration={SHOTS.c1Card.duration} />
    </Sequence>

    <Sequence from={SHOTS.s2Course.from} durationInFrames={SHOTS.s2Course.duration} name="S2 课程阶梯">
      <SceneCourse shot={SHOTS.s2Course} />
    </Sequence>

    <Sequence from={SHOTS.c2Card.from} durationInFrames={SHOTS.c2Card.duration} name="C2 字卡②">
      <TitleCard {...TITLE_CARDS.c2} duration={SHOTS.c2Card.duration} />
    </Sequence>

    <Sequence from={SHOTS.s3Sentence.from} durationInFrames={SHOTS.s3Sentence.duration} name="S3 长句与即时反馈">
      <SceneSentence shot={SHOTS.s3Sentence} />
    </Sequence>

    <Sequence from={SHOTS.c3Card.from} durationInFrames={SHOTS.c3Card.duration} name="C3 字卡③">
      <TitleCard {...TITLE_CARDS.c3} duration={SHOTS.c3Card.duration} />
    </Sequence>

    <Sequence from={SHOTS.s4Review.from} durationInFrames={SHOTS.s4Review.duration} name="S4 到期复习">
      <SceneReview shot={SHOTS.s4Review} />
    </Sequence>

    <Sequence from={SHOTS.s5Outro.from} durationInFrames={SHOTS.s5Outro.duration} name="S5 合影与字标">
      <SceneOutro shot={SHOTS.s5Outro} />
    </Sequence>

    {/* ------------------------------------------------------ transitions */}
    {CUTS.map((cut) => {
      const span = CUT_SPANS[cut.kind];
      // straddle the boundary: `span` frames ending ON the cut for short kinds,
      // or centred for the long brightness cross-fades
      const lead = cut.kind === 'irisToField' || cut.kind === 'lightRise' ? Math.round(span * 0.42) : 7;
      return (
        <Sequence
          key={cut.id}
          from={Math.max(0, cut.at - lead)}
          durationInFrames={span}
          name={`转场 · ${cut.kind}`}
        >
          <Cut kind={cut.kind} />
        </Sequence>
      );
    })}

    {/* --------------------------------------------------------- captions */}
    {CAPTIONS.map((cap) => (
      <Sequence key={`cap-${cap.from}`} from={cap.from} durationInFrames={cap.duration} name={`字幕 · ${cap.text}`}>
        <Caption text={cap.text} duration={cap.duration} tone={cap.text.includes('FSRS') ? 'dark' : 'light'} />
      </Sequence>
    ))}

    {/* ------------------------------------------------------------ audio */}
    {bgm ? (
      <Audio src={staticFile(`audio/${BGM.src}`)} volume={BGM.volume} />
    ) : null}

    {SFX.map((s) => (
      <Sequence
        key={`${s.src}-${s.from}`}
        from={s.from}
        durationInFrames={s.durationInFrames ?? 120}
        name={`SFX · ${s.src}`}
      >
        <Audio src={staticFile(`audio/${s.src}`)} volume={s.volume} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

export { TOTAL_FRAMES, CAPTIONS };
