import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { PAPER, PAPER_2, PAPER_3, LINE, ACCENT } from '../theme';

/**
 * 纸面背景 —— 片子所有镜头的「地面」。
 *
 * ── 为什么必须有这一层 ────────────────────────────────────────────────────
 * 上一版每个镜头都是「一块纯白底 + 居中内容」，六帧并排看没有任何一张有
 * 空间感：没有前景、没有背景、没有焦点落差。观众读到的是一页 PPT，而不是
 * 一支片子。补上这三层，画面才有「东西在哪里」：
 *
 *   背景（本组件）  纸的层理、极缓的光、网格刻度
 *   中景           真实页面截图，有透视和景深
 *   前景           产品元素（词槽、字母、光标），投影落回纸面
 *
 * 背景不是装饰：它给出**固定的参照系**，让运镜可读。没有参照系，平移和
 * 缩放都看不出来。
 */
export const PaperField: React.FC<{
  /** 0 = flat paper, 1 = the full grid/ruling */
  intensity?: number;
  /** where the light sits (0..1 of the canvas) */
  lightX?: number;
  lightY?: number;
  /** grid pitch in px; 0 hides the ruling */
  pitch?: number;
  /** slow drift of the whole field, in px */
  drift?: number;
}> = ({ intensity = 1, lightX = 0.5, lightY = 0.34, pitch = 96, drift = 0 }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  // the paper's own light: one wide, very soft highlight, no gradient soup
  const glow = interpolate(intensity, [0, 1], [0, 1]);

  /**
   * 永不停止的呼吸 —— 「不丝滑」的根因在这里。
   *
   * 实测：整片 35% 的帧**完全静止**，最长一段连着 1.07 秒（f770–802）。画面先
   * 冻结、再猛地动一下，观众读到的就是"卡""抖""不连续"。上一版我把所有缓慢
   * 位移都删掉了（为了躲开文字栅格化的闪烁），结果把片子变成了幻灯片。
   *
   * 正确的解法不是让画面不动，而是**让不动的东西不再是文字**：纸面地板持续
   * 呼吸，文字可以在它上面保持锐利。
   *
   * 幅度是量出来的，不是拍脑袋：9px 的漂移在 480×270 的判读分辨率下几乎
   * 产生不了像素变化，实测死帧仍在 47%。这里把网格的地面速度提到约
   * 0.55 px/帧（网格周期 132px，所以每 30 帧约 16px，明显可读），同时用一个
   * 更慢的第二正弦让它永不完全重复。两个周期互质，画面不会周期性"归位"。
   */
  const breatheX = Math.sin(t * 0.62) * 26 + Math.sin(t * 0.23 + 1.7) * 11;
  const breatheY = Math.cos(t * 0.47) * 21 + Math.sin(t * 0.83 + 0.5) * 8;
  const breatheS = 1 + Math.sin(t * 0.17 + 0.9) * 0.010;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {/* base stock */}
      <AbsoluteFill style={{ background: PAPER }} />

      {/* tooth: a very large, very soft tonal shift so the paper is never flat.
          It also carries the breathing, so the ground is never a frozen frame. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 120% 90% at ${lightX * 100 + breatheX * 0.5}% ${lightY * 100 + breatheY * 0.5}%, ${PAPER_2} 0%, ${PAPER} 46%, ${PAPER_3} 100%)`,
          opacity: 0.9 * glow,
        }}
      />

      {/* ruling: the page's own grid language, at 3% — a reference system, not decor.
          DrawD with repeating gradients so it costs nothing per frame.
          The grid is the thing that makes camera movement readable: if it never
          moves, a slow push has nothing to push against. */}
      {pitch > 0 ? (
        <AbsoluteFill
          style={{
            opacity: 0.5 * glow,
            backgroundImage: `
              repeating-linear-gradient(0deg, ${LINE} 0 1px, transparent 1px ${pitch}px),
              repeating-linear-gradient(90deg, ${LINE} 0 1px, transparent 1px ${pitch}px)
            `,
            backgroundPosition: `${drift + breatheX * 3}px ${drift * 0.6 + breatheY * 3}px`,
            transform: `scale(${breatheS})`,
            maskImage: 'radial-gradient(ellipse 78% 70% at 50% 46%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 62%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 78% 70% at 50% 46%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 62%, rgba(0,0,0,0) 100%)',
          }}
        />
      ) : null}

      {/* a single hairline horizon: gives the field a scale, like a ruled sheet */}
      <div
        style={{
          position: 'absolute',
          left: '6%',
          right: '6%',
          top: `${lightY * 100}%`,
          height: 2,
          background: ACCENT,
          opacity: 0.10 * glow,
          transform: `scaleX(${0.9 + Math.sin(t * 0.4) * 0.02})`,
        }}
      />

      {/* vignette: keeps the eye off the corners without dimming the type */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 88% 82% at 50% 48%, rgba(0,0,0,0) 58%, rgba(38,52,47,0.09) 100%)`,
          mixBlendMode: 'multiply',
        }}
      />
    </AbsoluteFill>
  );
};
