// Workbench manifest — how the film decomposes into editable clips.
//
// `node workbench/scripts/open.mjs <this project>` reads WORKBENCH and rebuilds
// the film as tracks: shots / transitions / captions / sfx, each unit exactly
// where its <Sequence> sits in Promo.tsx. Every table here is imported, never
// re-typed, so editing the timeline cannot leave the workbench behind.
//
// Editable per-unit properties come from `schema`. The scenes read their copy
// from copy.ts as props with defaults, so editing a title card's text in the
// workbench changes exactly what the film would render.
//
// Motion timing (beat tables, cues, eases, camera keys) is deliberately NOT
// exposed — those are the film's quality and are the one thing a slider can
// only break.
import { createElement, type FC } from 'react';
import { CAPTIONS, CUTS, Promo, SHOT_LIST, TITLE_CARDS, TOTAL_FRAMES } from './Promo';
import { Caption } from './components/Caption';
import { Cut } from './components/Cut';
import { SHOTS } from './beat';
import { SFX, BGM } from './sound';
import { TitleCard } from './scenes/TitleCard';
import { SceneWord } from './scenes/SceneWord';
import { SceneCourse } from './scenes/SceneCourse';
import { SceneSentence } from './scenes/SceneSentence';
import { SceneReview } from './scenes/SceneReview';
import { SceneOutro } from './scenes/SceneOutro';
import { PAPER } from './theme';

// —— schema field helpers (plain data; shape = workbench PropField) ——
type Field = Record<string, unknown> & { type: string; key: string; label: string; default: unknown };
const text = (key: string, label: string, def: string): Field => ({ type: 'text', key, label, default: def });
const textarea = (key: string, label: string, def: string): Field => ({ type: 'textarea', key, label, default: def });
const color = (key: string, label: string, def: string): Field => ({ type: 'color', key, label, default: def });
const size = (key: string, label: string, def: number, min: number, max: number): Field => ({
  type: 'slider', key, label, default: def, min, max, step: 1, unit: 'px',
});

// —— adapters: prop-driven wrappers so the inspector can edit copy ————————
type TitleProps = { text?: string; sub?: string; duration?: number; ink?: string; accent?: string };

/** `*词*` marks the single accent word (this film's title-card DSL). */
export const TitleCardUnit: FC<TitleProps> = ({
  text = '', sub = '', duration = 58, ink, accent,
}) => createElement(TitleCard, { text, sub, duration, ink, accent });
TitleCardUnit.displayName = 'TitleCard';

type CaptionProps = { text?: string; bottom?: number };

export const CaptionUnit: FC<CaptionProps> = ({ text = '', bottom = 60 }) =>
  createElement(Caption, { text, bottom });
CaptionUnit.displayName = 'Caption';

export const CutUnit: FC<{ kind?: 'ruleWipe' | 'paperSlide' | 'lineCarry' | 'irisToField' | 'lightRise' }> = ({
  kind = 'ruleWipe',
}) => createElement(Cut, { kind });
CutUnit.displayName = 'Cut';

const SCHEMAS = {
  title: [
    textarea('text', '文案（*词* = 强调词）', ''),
    text('sub', '副标', ''),
    size('duration', '时长', 58, 30, 120),
    color('ink', '墨色', '#26342f'),
    color('accent', '强调色', '#356b54'),
  ],
  caption: [
    text('text', '解说文案', ''),
    { type: 'slider', key: 'bottom', label: '底距', default: 60, min: 20, max: 300, step: 2, unit: 'px' } as Field,
  ],
  cut: [
    {
      type: 'select', key: 'kind', label: '转场式', default: 'ruleWipe',
      options: ['ruleWipe', 'paperSlide', 'lineCarry', 'irisToField', 'lightRise'],
    } as Field,
  ],
};

/** One entry per scene, timed from the same SHOTS table Promo.tsx renders from. */
const scene = (id: keyof typeof SHOTS, label: string, component: FC<Record<string, unknown>>) => ({
  id,
  label,
  from: SHOTS[id].from,
  duration: SHOTS[id].duration,
  component,
  props: {},
  schema: [] as Field[],
});

const titleUnit = (id: 'c1' | 'c2' | 'c3', label: string, shotKey: 'c1Card' | 'c2Card' | 'c3Card') => ({
  id,
  label,
  from: SHOTS[shotKey].from,
  duration: SHOTS[shotKey].duration,
  component: TitleCardUnit as FC<Record<string, unknown>>,
  props: {
    text: TITLE_CARDS[id].text,
    sub: TITLE_CARDS[id].sub,
    duration: SHOTS[shotKey].duration,
    ink: '#26342f',
    accent: '#356b54',
  },
  schema: SCHEMAS.title,
  durationProp: 'duration',
  cardId: 'title-card',
  cardName: '字卡 · 纸墨',
  accent: '#356b54',
});

export const WORKBENCH = {
  name: 'CET Typing · 看中文，写英文',
  fps: 30,
  width: 1920,
  height: 1080,
  total: TOTAL_FRAMES,
  background: PAPER,
  revision: undefined,
  shots: [
    scene('s1Scene', 'S1 看中文，写英文', SceneWord as FC<Record<string, unknown>>),
    titleUnit('c1', 'C1 字卡① 一个词', 'c1Card'),
    scene('s2Course', 'S2 课程阶梯', SceneCourse as FC<Record<string, unknown>>),
    titleUnit('c2', 'C2 字卡② 原位改', 'c2Card'),
    scene('s3Sentence', 'S3 长句与即时反馈', SceneSentence as FC<Record<string, unknown>>),
    titleUnit('c3', 'C3 字卡③ 会回来', 'c3Card'),
    scene('s4Review', 'S4 到期复习', SceneReview as FC<Record<string, unknown>>),
    scene('s5Outro', 'S5 合影与字标', SceneOutro as FC<Record<string, unknown>>),
  ],
  transitions: CUTS.map((cut, i) => ({
    id: cut.id,
    label: `转场 ${i + 1} · ${cut.kind}`,
    from: Math.max(0, cut.at - 7),
    duration: 14,
    component: CutUnit as FC<Record<string, unknown>>,
    props: { kind: cut.kind },
    schema: SCHEMAS.cut,
    durationProp: undefined,
    cardId: 'cut',
    cardName: '场景转场',
  })),
  captions: CAPTIONS.map((cap, i) => ({
    id: `caption-${i + 1}`,
    label: cap.text,
    from: cap.from,
    duration: cap.duration,
    component: CaptionUnit as FC<Record<string, unknown>>,
    props: { text: cap.text, bottom: 60 },
    schema: SCHEMAS.caption,
    durationProp: undefined,
    cardId: 'caption',
    cardName: '解说字幕',
  })),
  overlays: [],
  sfx: SFX.map((s) => ({
    from: s.from,
    duration: s.durationInFrames ?? 90,
    src: `audio/${s.src}`,
    volume: s.volume,
  })),
  bgm: [{ from: 0, duration: TOTAL_FRAMES, src: `audio/${BGM.src}`, volume: BGM.volume }],
  order: ['transitions', 'captions', 'overlays'] as const,
  original: Promo as FC<Record<string, unknown>>,
};

export { SHOT_LIST };
