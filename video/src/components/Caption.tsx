import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { FONT, INK, INK_SOFT, ACCENT } from '../theme';

export interface CaptionEntry {
  from: number;
  duration: number;
  text: string;
}

/**
 * 字幕。
 *
 * ── 为什么推倒重来 ────────────────────────────────────────────────────────
 * 上一版是一个白色圆角胶囊 + 圆点 + 投影：那是网页 toast 的视觉语言，和全片的
 * 纸墨排版完全不在一个世界。它看起来像贴上去的一张标签，而不是这部电影在
 * 说话。用户的一句「狗屎」是对的。
 *
 * 现在它按片子自己的排版语言来做：
 *  · 没有胶囊、没有底、没有圆角、没有投影——只有纸和字；
 *  · 一条 2px 的墨线压在文字上方，就是全片那条母题线（词槽线 / 落款线 / 字幕
 *    装饰线是同一条），字幕因此属于同一个版式系统；
 *  · 中文用片子自己的衬线（Noto Serif SC），不是 UI 无衬线；
 *  · 字距与正文对齐、左对齐贴着安全边，像书页下方的说明文字；
 *  · 入场：字从墨线下方轻轻落进来（4px），出场：整行向上淡出 6px。
 *
 * 关键：它压在画面底部很暗的地方，靠字重和对比度读，不靠一块白色底板。
 */
const S = {
  s1: { from: 0, dur: 232 },
  c1: { from: 232, dur: 58 },
  s2: { from: 290, dur: 145 },
  c2: { from: 435, dur: 59 },
  s3: { from: 494, dur: 261 },
  c3: { from: 755, dur: 58 },
  s4: { from: 813, dur: 116 },
  s5: { from: 929, dur: 174 },
};

export const CAPTIONS: CaptionEntry[] = [
  // S1 — the atomic action, after the sentence has begun to fill
  { from: S.s1.from + 108, duration: 120, text: '看一句中文，把英文一个词一个词打出来。' },
  // S2 — the course ladder
  { from: S.s2.from + 22, duration: 54, text: '每个单元走同一条路：单词、语块、句子。' },
  { from: S.s2.from + 80, duration: 63, text: '12 个单元，120 步原创练习。' },
  // S3 — the error beat ONLY, over the frames where a slot is actually red
  { from: S.s3.from + 64, duration: 142, text: '打错的词原位标红，点哪个词槽都能改。' },
  // S4 — spacing
  { from: S.s4.from + 16, duration: 96, text: '错题按 FSRS 排队：2 天、11 天、46 天、163 天。' },
];

export const Caption: React.FC<{
  text: string;
  bottom?: number;
  duration?: number;
  /** 'light' for paper shots, 'dark' when the shot under it is the deep field */
  tone?: 'light' | 'dark';
}> = ({
  text,
  bottom = 74,
  duration = 120,
  tone = 'light',
}) => {
  const frame = useCurrentFrame();

  // 18f in, 16f out — long enough to read as a dissolve, short enough not to lag
  const enter = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  const exit = interpolate(frame, [duration - 16, duration], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.6, 1),
  });
  const opacity = Math.min(enter, exit);

  // the rule draws in with the words, then retracts on the way out
  const rule = Math.min(enter, exit);

  // S4's shot is the deep field. Ink on field green is unreadable — the caption
  // has to invert with the room, exactly like the type inside the card does.
  const dark = tone === 'dark';
  const ink = dark ? '#eef5ef' : INK;
  const halo = dark ? 'rgba(36,70,55,0.85)' : 'rgba(247,249,246,0.9)';

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', justifyContent: 'flex-end', alignItems: 'center' }}>
      <div
        style={{
          position: 'absolute',
          bottom,
          left: 118,
          right: 118,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          opacity,
          transform: `translateY(${(1 - enter) * 8 - (1 - exit) * 10}px)`,
        }}
      >
        {/* the motif: a 2px rule above the line, the same line as the slot rules */}
        <div
          style={{
            width: 64,
            height: 2,
            borderRadius: 1,
            background: ACCENT,
            opacity: 0.9 * rule,
            transform: `scaleX(${rule})`,
            transformOrigin: '0 50%',
          }}
        />
        <div
          style={{
            fontFamily: FONT.serifZh,
            fontWeight: 500,
            // 46 measured only 43px of ink on the real render; the caption is the
            // one line every viewer must read, so it clears the 56px floor.
            fontSize: 60,
            lineHeight: 1.45,
            letterSpacing: '0.03em',
            color: ink,
            // no pill: the type carries itself; the halo keeps it readable over a
            // busy shot and flips on the dark one
            textShadow: `0 1px 0 ${halo}, 0 0 18px ${halo}`,
          }}
        >
          {text}
        </div>
      </div>
      <span style={{ display: 'none' }}>{INK_SOFT}</span>
    </AbsoluteFill>
  );
};
