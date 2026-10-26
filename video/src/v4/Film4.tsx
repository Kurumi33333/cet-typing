import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { beatF } from '../beat';
import { ACCENT, ACCENT_DEEP, AURORA, FONT, INK, INK_SOFT, PAPER, PAPER_2, SLOT } from '../theme';
import { installFonts } from '../fonts';
import { Display, FONT3, Reveal, expo, hexA, letterFrames, prog, silk } from '../v3/kit';
import { ImpactFx, splitFilter } from '../v3/fx';
import { B4 } from './time';
import { At, World, WP, camSpeed } from './world';

installFonts();

/**
 * FILM 4 · "black stage, bright product".
 * One continuous world: the product's own paper cards float in the dark, and a single
 * camera travels between them on spline paths — typing, the course, review, the
 * dictionary — then punches through the last card into the wordmark. Three hits only:
 * the first card (beat 4), the review landing (42), the wordmark (60).
 */

/** The product's own palette: paper, ink, forest green; the aurora is only the light. */
const LGRAD = `linear-gradient(100deg, ${ACCENT_DEEP} 0%, #43836b 45%, #69a68a 80%, ${ACCENT_DEEP} 100%)`;
const LG: React.FC<{ children: React.ReactNode; shift?: number }> = ({ children, shift = 0 }) => (
  <span
    style={{
      backgroundImage: LGRAD, backgroundSize: '220% 100%', backgroundPosition: `${(shift % 1) * 100}% 50%`,
      WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent',
    }}
  >
    {children}
  </span>
);
const Disp: React.FC<React.ComponentProps<typeof Display>> = ({ color = INK, ...rest }) => <Display color={color} {...rest} style={{ fontFamily: '"Noto Serif SC", serif', fontWeight: 600, ...rest.style }} />;

const LightStage: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: PAPER_2 }}>
    <div
      style={{
        position: 'absolute', inset: 0,
        background:
          `radial-gradient(1100px 700px at ${24 + t * 10}% ${18 + t * 6}%, ${hexA(AURORA[0], 0.55)}, rgba(255,255,255,0) 70%),` +
          `radial-gradient(1200px 760px at ${80 - t * 10}% ${88 - t * 6}%, ${hexA(AURORA[2], 0.2)}, rgba(255,255,255,0) 70%),` +
          `radial-gradient(900px 600px at 55% 50%, ${hexA('#ffffff', 0.7)}, rgba(255,255,255,0) 70%)`,
      }}
    />
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(38,52,47,0) 60%, rgba(38,52,47,0.12) 100%)' }} />
  </AbsoluteFill>
);

const CARD_W = 1280;
const CARD_H = 640;
const P = { x: 0, y: 0 };
const H = { x: 2300, y: 0 };
const R = { x: 4600, y: 0 };
const L = { x: 6900, y: 0 };

const HEAD_Y = -412;
const CAP_Y = 432;

/* ------------------------------------------------------------------ camera */

export const CAM: WP[] = [
  { b: 0, x: 0, y: 40, s: 1.16, rz: -1.2, rx: 5, ry: -10, k: 0.3 },
  { b: 4, x: 0, y: 10, s: 1.04, rz: -0.4, rx: 2, ry: -5, k: 0.3 },
  { b: 10, x: -30, y: 0, s: 1.0, rz: 0.3, ry: 2 },
  { b: 16, x: 20, y: -8, s: 1.0, rz: 0, ry: 0 },
  { b: 22, x: 50, y: 12, s: 1.08, rz: -0.4, ry: 3 },
  { b: 28, x: 70, y: 0, s: 1.04, rz: 0.3, ry: 2, k: 0.25 },
  { b: 30, x: 1150, y: -200, s: 0.72, rz: -2.2, rx: 5, ry: -12 },
  { b: 32, x: H.x, y: 0, s: 1.0, rz: 0, rx: 0, ry: 0, k: 0.15 },
  { b: 37, x: H.x + 40, y: 10, s: 1.05, rz: 0.3, ry: 3, k: 0.5 },
  { b: 38, x: H.x + 40, y: 10, s: 1.05, rz: 0.3, ry: 3, k: 0.25 },
  { b: 40, x: 3450, y: 170, s: 0.7, rz: 2.4, rx: -4, ry: 12 },
  { b: 42, x: R.x, y: 0, s: 1.0, rz: 0, rx: 0, ry: 0, k: 0.15 },
  { b: 47, x: R.x + 50, y: -10, s: 1.05, rz: -0.3, ry: -3, k: 0.5 },
  { b: 48, x: R.x + 50, y: -10, s: 1.05, rz: -0.3, ry: -3, k: 0.25 },
  { b: 50, x: 5800, y: -160, s: 0.72, rz: -2, rx: 4, ry: -11 },
  { b: 52, x: L.x, y: 0, s: 1.0, rz: 0, rx: 0, ry: 0, k: 0.15 },
  { b: 56, x: L.x + 30, y: 10, s: 1.04, rz: 0.3, ry: 2, k: 0.6 },
  { b: 57, x: L.x + 10, y: 0, s: 1.08, rz: 0, ry: 0, k: 0.4 },
  { b: 60, x: L.x, y: 0, s: 3.4, rz: 0, ry: 0, k: 1 },
];

/* -------------------------------------------------------------- the product */

const GREEN = SLOT.correct.color;
const GREEN_LINE = SLOT.correct.border;

const Card: React.FC<{ children: React.ReactNode; glow?: number; style?: React.CSSProperties }> = ({ children, glow = 1, style }) => (
  <div
    style={{
      position: 'relative',
      width: CARD_W,
      height: CARD_H,
      borderRadius: 22,
      overflow: 'hidden',
      background: PAPER,
      boxShadow: `0 60px 120px rgba(38,52,47,0.22), 0 14px 34px rgba(38,52,47,0.10), 0 0 0 1px rgba(38,52,47,0.07), 0 0 ${160 * glow}px ${hexA(AURORA[0], 0.35 * glow)}`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** the practice screen's top bar, counter and progress line, as the product prints them */
const Chrome: React.FC<{ counter: string; fill: number; unit: string }> = ({ counter, fill, unit }) => (
  <>
    <div
      style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 64, display: 'flex', alignItems: 'center',
        padding: '0 44px', fontFamily: FONT.ui, fontSize: 18, color: '#708077', borderBottom: '1px solid rgba(38,52,47,0.07)',
      }}
    >
      <span>← 返回</span>
      <span style={{ margin: '0 auto', letterSpacing: '0.06em' }}>四级 · 练习</span>
      <span>{counter}&nbsp;&nbsp;设置 ⌄</span>
    </div>
    <div style={{ position: 'absolute', left: 44, right: 44, top: 64, height: 3, background: '#e4ebe4' }}>
      <div style={{ width: `${fill}%`, height: '100%', background: '#77a993', borderRadius: 3 }} />
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 86, textAlign: 'center', fontFamily: FONT.ui, fontSize: 18, letterSpacing: '0.1em', color: '#8b968e' }}>
      {unit}
    </div>
    <div
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 30, textAlign: 'center', fontFamily: FONT.ui, fontSize: 18,
        letterSpacing: '0.04em', color: '#9aa69d',
      }}
    >
      ⌨ 空格 / 方向键切换 · Enter 检查
    </div>
  </>
);

type SlotState = 'idle' | 'active' | 'correct' | 'wrong';

const PaperWord: React.FC<{ text: string; count: number; ages: number[]; state: SlotState; size: number; caret: boolean; glow?: number }> = ({
  text, count, ages, state, size, caret, glow = 0,
}) => {
  const lineCol = state === 'correct' ? GREEN_LINE : state === 'wrong' ? SLOT.wrong.border : state === 'active' ? SLOT.active.border : SLOT.idle.border;
  const col = state === 'correct' ? GREEN : state === 'wrong' ? SLOT.wrong.color : INK;
  return (
    <span
      style={{
        position: 'relative', display: 'inline-block', padding: `0 ${size * 0.16}px ${size * 0.1}px`, fontFamily: FONT.serif,
        fontWeight: 500, fontSize: size, lineHeight: 1.1, color: col, whiteSpace: 'pre',
        textShadow: glow > 0 ? `0 0 ${size * 0.35}px ${hexA(AURORA[0], glow)}` : undefined,
      }}
    >
      {[...text].map((ch, i) => {
        const shown = i < count;
        const p = shown ? Math.min(1, Math.max(0, (ages[i] ?? 99) / 5)) : 0;
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block', opacity: shown ? 0.2 + 0.8 * p : 0, transform: `translateY(${Math.round((1 - silk(p)) * -size * 0.1)}px)` }}>
            {ch}
            {caret && i === count ? (
              <span style={{ position: 'absolute', left: -size * 0.03, top: size * 0.12, bottom: size * 0.16, width: Math.max(3, size * 0.03), borderRadius: 3, background: SLOT.active.border }} />
            ) : null}
          </span>
        );
      })}
      <span style={{ position: 'absolute', left: size * 0.03, right: size * 0.03, bottom: 0, height: Math.max(4, size * 0.04), borderRadius: 4, background: lineCol }} />
    </span>
  );
};

/* ---------------------------------------------------------- typing timings */

const SHORT = [
  { w: 'I', done: B4.shortDone[0], step: 3 },
  { w: 'like', done: B4.shortDone[1], step: 3 },
  { w: 'tea', done: B4.shortDone[2], step: 3 },
];
const LONG_WORDS = ['She', 'also', 'hopes', 'her', 'children', 'will', 'get', 'a', 'good', 'education'];
const TYPO = 'childern';
const FIX_F = beatF(B4.fixBeat);

const shortFrames = SHORT.map((s) => letterFrames(beatF(s.done), s.w.length, s.step));
const longFrames = LONG_WORDS.map((w, i) => letterFrames(beatF(B4.longDone[i]), w.length, 2));
const fixKeys = [FIX_F - 6, FIX_F - 3, FIX_F];

/** every key press of the film (absolute frames), for the sound table */
export const KEY_FRAMES: number[] = [...shortFrames.flat(), ...longFrames.flat(), ...fixKeys];
export const SENTENCE_DONE = [beatF(B4.shortDone[2]) + 1, FIX_F + 3];
export const FSRS_NODES = [43, 44, 45, 46].map((b) => beatF(b));

const Typed: React.FC<{ f: number; frames: number[]; text: string; done: number; size: number; wrong?: boolean; fixed?: boolean }> = ({
  f, frames, text, done, size, wrong = false, fixed = false,
}) => {
  const count = frames.filter((lf) => f >= lf).length;
  const ages = frames.map((lf) => f - lf);
  const isDone = f >= beatF(done) + 1;
  const started = f >= frames[0] - 2;
  const state: SlotState = wrong && isDone ? 'wrong' : isDone ? 'correct' : started ? 'active' : 'idle';
  const glow = isDone && !wrong ? Math.max(0, 1 - (f - beatF(done)) / 22) * 0.7 : fixed ? Math.max(0, 1 - (f - FIX_F) / 24) * 0.7 : 0;
  return <PaperWord text={text} count={count} ages={ages} state={state} size={size} caret={started && !isDone && Math.floor(f / 3) % 2 === 0} glow={glow} />;
};

/* ------------------------------------------------------------------ cards */

const PracticeCard: React.FC<{ f: number }> = ({ f }) => {
  const shortOut = prog(f, beatF(B4.longStart) - 4, 12, silk);
  const longIn = prog(f, beatF(B4.longStart) + 2, 14, silk);
  const fixed = f >= FIX_F;
  return (
    <Card>
      <Chrome counter={f < beatF(B4.longStart) ? '05 / 10' : '06 / 10'} fill={f < beatF(B4.longStart) ? 40 : 50} unit={f < beatF(B4.longStart) ? '01 / 08  从一个词开始  ⌄' : '08 / 08  教育、能力与目标  ⌄'} />
      {/* short sentence */}
      <div style={{ position: 'absolute', inset: 0, opacity: 1 - shortOut, filter: shortOut > 0 ? `blur(${shortOut * 12}px)` : undefined }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center', fontFamily: FONT.ui, fontSize: 20, color: '#8b968e', letterSpacing: '0.08em' }}>目标表达 · 句子</div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 190, textAlign: 'center', fontFamily: '"Noto Serif SC", serif', fontWeight: 600, fontSize: 84, color: INK }}>我喜欢茶。</div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 340, display: 'flex', justifyContent: 'center', gap: 16 }}>
          {SHORT.map((s, i) => (
            <Typed key={s.w} f={f} frames={shortFrames[i]} text={s.w} done={s.done} size={128} />
          ))}
        </div>
      </div>
      {/* long sentence */}
      <div style={{ position: 'absolute', inset: 0, opacity: longIn, filter: longIn < 1 ? `blur(${(1 - longIn) * 12}px)` : undefined }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 140, textAlign: 'center', fontFamily: FONT.ui, fontSize: 20, color: '#8b968e', letterSpacing: '0.08em' }}>目标表达 · 句子 · 多种表达可用</div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 178, textAlign: 'center', fontFamily: '"Noto Serif SC", serif', fontWeight: 600, fontSize: 56, color: INK }}>她也希望她的孩子可以受到良好的教育。</div>
        {[LONG_WORDS.slice(0, 5), LONG_WORDS.slice(5)].map((row, ri) => (
          <div key={ri} style={{ position: 'absolute', left: 0, right: 0, top: 296 + ri * 112, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {row.map((w, j) => {
              const i = ri * 5 + j;
              const typo = i === B4.typoIndex;
              return (
                <Typed key={w} f={f} frames={longFrames[i]} text={typo && !fixed ? TYPO : w} done={B4.longDone[i]} size={74} wrong={typo && !fixed} fixed={typo && fixed} />
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
};

const BAR_ROWS = [
  { level: '四级', note: '8 个单元，80 步', rows: [['单词', 27], ['语块', 23], ['句子', 30]] as const },
  { level: '六级', note: '4 个单元，40 步', rows: [['单词', 14], ['语块', 14], ['句子', 12]] as const },
];
const BAR_COLORS = ['#356b54', '#43836b', '#5c9a7f'];

const CourseCard: React.FC<{ f: number }> = ({ f }) => {
  const t0 = beatF(B4.courseIn);
  const track = CARD_W - 128;
  return (
    <Card>
      <div style={{ position: 'absolute', left: 64, top: 42, fontFamily: '"Noto Serif SC", serif', fontWeight: 600, fontSize: 58, color: INK, letterSpacing: '-0.01em' }}>
        一个词，一块砖，一句话。
      </div>
      {BAR_ROWS.map((g, gi) => (
        <div key={g.level} style={{ position: 'absolute', left: 64, right: 64, top: 150 + gi * 238 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 14, fontFamily: '"Noto Serif SC", serif', color: INK }}>
            <span style={{ fontSize: 34, fontWeight: 600 }}>{g.level}</span>
            <span style={{ fontSize: 20, color: '#8b968e', fontFamily: FONT.ui }}>{g.note}</span>
          </div>
          {g.rows.map(([label, n], ri) => {
            const p = prog(f, t0 + 6 + (gi * 3 + ri) * 5, 20, expo);
            return (
              <div key={label} style={{ height: 48, marginBottom: 10, borderRadius: 8, background: '#edf1ec', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%', width: (n / 70) * track * p, minWidth: 0, borderRadius: 8, background: BAR_COLORS[ri],
                    color: '#eef5ef', fontFamily: '"Noto Serif SC", serif', fontSize: 24, fontWeight: 500, display: 'flex', alignItems: 'center',
                    paddingLeft: 18, whiteSpace: 'pre', overflow: 'hidden', opacity: p > 0.2 ? 1 : p * 5,
                  }}
                >
                  {label} {n}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </Card>
  );
};

/** the interval curve: a smooth rise, four nodes on it */
const NODES = [
  { x: 330, y: 400, l: '第 2 次', g: '2 天后' },
  { x: 600, y: 330, l: '第 3 次', g: '11 天后' },
  { x: 880, y: 235, l: '第 4 次', g: '46 天后' },
  { x: 1150, y: 120, l: '第 5 次', g: '163 天后' },
];
const START = { x: 110, y: 480 };
const curvePath = `M ${START.x} ${START.y} C 230 470, 250 410, ${NODES[0].x} ${NODES[0].y} S 520 355, ${NODES[1].x} ${NODES[1].y} S 790 270, ${NODES[2].x} ${NODES[2].y} S 1040 170, ${NODES[3].x} ${NODES[3].y}`;

const ReviewCard: React.FC<{ f: number }> = ({ f }) => {
  const t0 = beatF(B4.slam2);
  const draw = prog(f, t0 + 2, beatF(46) - t0, (t) => t);
  const red = Math.max(0, 1 - (f - t0) / 24);
  return (
    <Card>
      <div style={{ position: 'absolute', left: 64, top: 44, fontFamily: FONT.ui, fontSize: 20, letterSpacing: '0.14em', color: '#8b968e' }}>到期复习</div>
      <svg width={CARD_W} height={CARD_H} style={{ position: 'absolute', inset: 0 }}>
        <line x1={80} y1={540} x2={1210} y2={540} stroke="#dfe7df" strokeWidth={3} />
        <path d={curvePath} fill="none" stroke="#dfe7df" strokeWidth={6} strokeLinecap="round" />
        <path d={curvePath} fill="none" stroke={GREEN_LINE} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        <circle cx={START.x} cy={START.y} r={14 + red * 14} fill="none" stroke={SLOT.wrong.color} strokeWidth={3} opacity={red} />
        <circle cx={START.x} cy={START.y} r={14} fill={SLOT.wrong.color} />
      </svg>
      <div style={{ position: 'absolute', left: START.x - 40, top: START.y + 28, fontFamily: '"Noto Serif SC", serif', fontWeight: 600, fontSize: 30, color: SLOT.wrong.color }}>答错</div>
      {NODES.map((n, i) => {
        const p = prog(f, FSRS_NODES[i], 16, expo);
        return (
          <div key={n.l} style={{ opacity: p }}>
            <div style={{ position: 'absolute', left: n.x - 15, top: n.y - 15, width: 30, height: 30, borderRadius: 30, background: GREEN, boxShadow: `0 0 0 ${8 * (1 - p) + 4}px ${hexA(AURORA[0], 0.35)}`, transform: `scale(${0.6 + 0.4 * p})` }} />
            <div style={{ position: 'absolute', left: n.x - 90, width: 180, top: n.y + 28, textAlign: 'center', fontFamily: '"Noto Serif SC", serif', fontWeight: 600, fontSize: 40, color: INK }}>{n.g}</div>
            <div style={{ position: 'absolute', left: n.x - 90, width: 180, top: n.y - 62, textAlign: 'center', fontFamily: FONT.ui, fontSize: 20, color: '#8b968e' }}>{n.l}</div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 64, bottom: 28, fontFamily: FONT.ui, fontSize: 17, color: '#9aa69d' }}>间隔来自 FSRS 默认参数，是连续答对时的常见节奏，不是承诺。</div>
    </Card>
  );
};

const TEX_W = 5760;
const CROP = { x: 300, y: 70, w: 840 };
const K = CARD_W / CROP.w;

const LexiconCard: React.FC<{ f: number }> = ({ f }) => {
  const t0 = beatF(B4.lexIn);
  return (
    <Card>
      <Img
        src={staticFile('textures/live/lexicon-full-4x.png')}
        style={{ position: 'absolute', width: (TEX_W / 4) * K, left: -CROP.x * K, top: -CROP.y * K, display: 'block' }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, background: `linear-gradient(180deg, rgba(247,249,246,0), ${PAPER})` }} />
    </Card>
  );
};

/* ------------------------------------------------------------------- film */

const Caption: React.FC<{ y: number; x: number; p: number; children: React.ReactNode }> = ({ y, x, p, children }) => (
  <At x={x} y={y} w={1600} h={110} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <Reveal p={p} rise={24} blur={18}>
      <Disp size={76} weight={700} color={INK} style={{ letterSpacing: '0.02em' }}>
        {children}
      </Disp>
    </Reveal>
  </At>
);

const Count: React.FC<{ f: number; from: number; to: number; at: number }> = ({ f, from, to, at }) => {
  const p = prog(f, at, 22, expo);
  return <>{Math.round(from + (to - from) * p)}</>;
};

export const Film4: React.FC = () => {
  const f = useCurrentFrame();
  const bf = (b: number) => beatF(b);
  const speed = camSpeed(CAM, f);
  const worldBlur = Math.min(9, speed * 0.13);
  const worldOut = prog(f, bf(B4.slam3) - 8, 8, (t) => t);

  const introRule = prog(f, 4, bf(4) - 8, silk);
  const cardPop = prog(f, bf(B4.slam1), 12, expo);

  const hits = [B4.slam1, B4.slam2, B4.slam3].map((b) => f - bf(b));

  const outT = f - bf(B4.slam3);

  return (
    <AbsoluteFill style={{ background: PAPER_2 }}>
      <LightStage t={f / 990} />

      {/* opening: a single line of light, waiting */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: f < bf(4) ? 1 : 0 }}>
        <div style={{ width: 760 * introRule, height: 5, borderRadius: 5, background: `linear-gradient(90deg, rgba(43,85,65,0), ${ACCENT}, #4f86c6, rgba(43,85,65,0))`, boxShadow: `0 0 30px ${hexA(AURORA[0], 0.8)}` }} />
        <div style={{ position: 'absolute', top: 590, opacity: prog(f, 18, 18) * (1 - prog(f, bf(4) - 6, 6)) }}>
          <Disp size={56} weight={500} color={INK_SOFT} style={{ letterSpacing: '0.16em' }}>CET-4 / CET-6 · 中译英基本功</Disp>
        </div>
      </AbsoluteFill>

      <World wps={CAM} f={f} blur={worldBlur} opacity={1 - worldOut}>
        {/* ---- 1 · the practice card */}
        <At x={P.x} y={P.y} w={CARD_W} h={CARD_H} style={{ opacity: cardPop, transform: `scale(${0.88 + 0.12 * cardPop})`, filter: splitFilter(hits[0]) }}>
          <PracticeCard f={f} />
        </At>
        <Caption x={P.x} y={CAP_Y} p={Math.min(prog(f, bf(9), 18), 1 - prog(f, bf(B4.longStart) - 4, 10, silk))}>
          看中文，<LG shift={prog(f, bf(9), 90, (t) => t) * 0.6}>写英文</LG>。
        </Caption>
        <Caption x={P.x} y={CAP_Y} p={prog(f, bf(24) + 8, 18)}>
          打错的，<LG shift={prog(f, bf(24), 90, (t) => t) * 0.6}>原位</LG>改。
        </Caption>

        {/* ---- 2 · the course */}
        <At x={H.x} y={HEAD_Y} w={1600} h={140} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Reveal p={prog(f, bf(B4.courseIn) - 6, 20)} rise={30} blur={22}>
            <Disp size={104} weight={700}>
              <LG shift={0.1}><Count f={f} from={0} to={12} at={bf(B4.courseIn)} /></LG> 个单元 <span style={{ color: INK_SOFT }}>·</span>{' '}
              <LG shift={0.35}><Count f={f} from={0} to={120} at={bf(B4.courseIn)} /></LG> 步练习
            </Disp>
          </Reveal>
        </At>
        <At x={H.x} y={H.y} w={CARD_W} h={CARD_H} style={{ opacity: prog(f, bf(B4.travel1), 16), filter: undefined }}>
          <CourseCard f={f} />
        </At>
        <Caption x={H.x} y={CAP_Y} p={prog(f, bf(B4.courseIn) + 26, 18)}>
          一个<LG shift={0.15}>词</LG>，一块<LG shift={0.3}>砖</LG>，一句<LG shift={0.45}>话</LG>。
        </Caption>

        {/* ---- 3 · review */}
        <At x={R.x} y={HEAD_Y} w={1600} h={150} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', filter: splitFilter(hits[1]) }}>
          <Reveal p={prog(f, bf(B4.slam2) - 3, 10)} rise={20} blur={26} scale={1.1}>
            <Disp size={120} weight={700}>
              错的，<LG shift={prog(f, bf(B4.slam2), 90, (t) => t) * 0.7}>会回来</LG>。
            </Disp>
          </Reveal>
        </At>
        <At x={R.x} y={R.y} w={CARD_W} h={CARD_H} style={{ opacity: prog(f, bf(B4.travel2), 16) }}>
          <ReviewCard f={f} />
        </At>
        <Caption x={R.x} y={CAP_Y} p={prog(f, bf(46) + 8, 18)}>
          隔得越久，越要<LG shift={0.2}>自己想</LG>。
        </Caption>

        {/* ---- 4 · dictionary */}
        <At x={L.x} y={HEAD_Y} w={1600} h={140} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Reveal p={prog(f, bf(B4.lexIn) - 6, 20)} rise={30} blur={22}>
            <Disp size={104} weight={700}>
              词库，<LG shift={0.3}>随手可查</LG>。
            </Disp>
          </Reveal>
        </At>
        <At x={L.x} y={L.y} w={CARD_W} h={CARD_H} style={{ opacity: prog(f, bf(B4.travel3), 16) }}>
          <LexiconCard f={f} />
        </At>
        <Caption x={L.x} y={CAP_Y} p={prog(f, bf(B4.lexIn) + 24, 18)}>
          四级 4,543 词 · 六级 3,991 词
        </Caption>
      </World>

      {/* ---- 5 · wordmark */}
      {outT >= -2 ? (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', filter: splitFilter(outT) }}>
          <div style={{ textAlign: 'center', transform: `scale(${1.1 - 0.1 * prog(outT, 0, 26) + 0.04 * prog(outT, 26, beatF(8))})` }}>
            <div style={{ opacity: prog(outT, 0, 8), filter: outT < 14 ? `blur(${(1 - prog(outT, 0, 14)) * 22}px)` : undefined }}>
              <div style={{ fontFamily: FONT3.en, fontWeight: 600, fontSize: 250, letterSpacing: '-0.045em', lineHeight: 1.05 }}>
                <LG shift={prog(outT, 0, 140, (t) => t) * 0.7}>CET Typing</LG>
              </div>
            </div>
            <div style={{ width: 460 * prog(outT, 22, 26, silk), height: 6, margin: '58px auto 40px', borderRadius: 6, background: `linear-gradient(90deg, ${ACCENT}, #69a68a)`, opacity: 0.9 }} />
            <Reveal p={prog(outT, 26, 22)} rise={24} blur={16}>
              <Disp size={88} weight={700}>轻一点，记得更牢。</Disp>
            </Reveal>
            <div style={{ marginTop: 34 }}>
              <Reveal p={prog(outT, 40, 22)} rise={20} blur={14}>
                <Disp size={56} weight={500} color={INK_SOFT} style={{ letterSpacing: '0.04em' }}>
                  四六级中译英 · 本地优先 · 不用注册 · 断网也能继续
                </Disp>
              </Reveal>
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      {/* the three hits */}
      <ImpactFx light t={hits[0]} seed={3} power={0.9} />
      <ImpactFx light t={hits[1]} seed={11} power={0.8} />
      <ImpactFx light t={hits[2]} seed={23} power={1} />
    </AbsoluteFill>
  );
};
