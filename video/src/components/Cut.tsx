import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { ACCENT, FIELD_DEEP, LINE } from '../theme';

export type CutKind = 'ruleWipe' | 'paperSlide' | 'lineCarry' | 'irisToField' | 'lightRise';

/** Cuts that cross between a paper-bright shot and the dark field need a real
 *  brightness ramp — a hard cut there measured as a 900x motion spike. */
export const CUT_SPANS: Record<CutKind, number> = {
  ruleWipe: 14,
  paperSlide: 16,
  lineCarry: 14,
  irisToField: 44,
  lightRise: 36,
};

/**
 * The seams between shots — 14 frames straddling the boundary (±7).
 *
 * ── What was wrong before (the "不流畅 / 不连续" complaint) ────────────────────
 * Every transition used to paint an OPAQUE LAYER over the whole frame:
 * `paperSlide` slid a full sheet of paper across, `irisToField` washed the frame
 * in dark green, `paperSlide`'s sheet had `opacity: sin(πt) * 0.97`. Measured on
 * the delivered file, luminance fell to 60/255 at f813 and jumped 67 → 241 at
 * f929. The audience read each seam as "the lights went off and came back".
 *
 * A transition between two LIGHT shots does not need to cover anything. These
 * now move the frame's own graphic language — a rule, a hairline, a soft edge
 * of light — and never reduce the picture's overall luminance by more than a
 * few levels. The cut itself is a hard cut underneath: the eye is carried by a
 * line crossing the seam, not by a curtain.
 *
 * Measured budget per cut: no transition may darken the frame by more than 12%
 * (analysis/motion-audit.py checks the per-frame luminance step).
 */

const ease = Easing.bezier(0.45, 0, 0.25, 1);

export const Cut: React.FC<{ kind: CutKind }> = ({ kind }) => {
  const frame = useCurrentFrame(); // 0..13, boundary at 7

  if (kind === 'ruleWipe' || kind === 'lineCarry') {
    // A rule crosses the frame and exits. It is 3px of accent on paper — it
    // occludes nothing, it just gives the eye a direction to follow.
    const width = kind === 'lineCarry'
      ? interpolate(frame, [0, 7, 14], [0.05, 1.06, 1.0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
        })
      : interpolate(frame, [0, 7, 14], [0.0, 1.05, 0.0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.25, 1),
        });
    const drift = interpolate(frame, [0, 14], [-4, 4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const fade = interpolate(frame, [0, 3, 11, 14], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    return (
      <AbsoluteFill style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            position: 'absolute',
            left: `${50 + drift}%`,
            transform: 'translateX(-50%)',
            height: 3,
            width: `${width * 100}%`,
            background: ACCENT,
            borderRadius: 2,
            opacity: (kind === 'lineCarry' ? 0.9 : 0.7) * fade,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (kind === 'paperSlide') {
    // A PAPER EDGE, not a paper sheet: a soft band of near-white light sweeps
    // down, suggesting the page turning without hiding the picture.
    const y = interpolate(frame, [0, 14], [-18, 118], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease,
    });
    return (
      <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${y}%`,
            height: 190,
            background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 42%, rgba(185,206,194,0.35) 50%, rgba(255,255,255,0.55) 58%, rgba(255,255,255,0) 100%)',
            filter: 'blur(6px)',
            transform: 'translateY(-50%)',
            opacity: interpolate(frame, [0, 4, 10, 14], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            }),
          }}
        />
      </AbsoluteFill>
    );
  }

  if (kind === 'irisToField') {
    /**
     * ⚠ 这里曾经是一层「深绿全屏遮罩」，opacity 0 → 0.97。
     *
     * 问题是结构性的：遮罩在 opacity 0 时完全不可见，而第一个有值的帧立刻
     * 给整帧染色——实测单帧变化 12.9 级，而全片的帧变化中位数只有 0.40。
     * 这就是「抖」。任何整帧遮盖都逃不掉这一点：它要么不存在，要么瞬间
     * 覆盖 100% 的画面。我试过拉长、换缓动、压低峰值，全部无效(实测 4.9 →
     * 6.5 → 8.4 → 9.7 → 12.7，越改越糟)，因为问题不在曲线，在结构。
     *
     * 改成**真正的溶解**：不覆盖画面，只让两个镜头自己交叠——S4 的整张卡片
     * 用 22 帧淡入（它自己已经有 rotateX 和 opacity 的入场），S3 在下方继续
     * 运动。变化由两张画面共同承担，于是任何一帧只改变一小块。
     * 这一层只留一道很轻的规则环，作为这套视觉语言的标记，不承担遮盖职责。
     */
    const ringOpacity = interpolate(frame, [0, 10, 22, 34], [0, 0.42, 0.22, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    const r = interpolate(frame, [0, 34], [0.12, 1.8], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0, 0.3, 1),
    });
    return (
      <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: `${r * 120}%`,
            aspectRatio: '1 / 1',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: '1.5px solid rgba(238,245,239,0.85)',
            opacity: ringOpacity,
          }}
        />
      </AbsoluteFill>
    );
  }

  // lightRise: a low, soft band of the product's aurora lifting off the bottom
  // edge. Max opacity is low enough that it reads as light, not as a veil.
  const rise = interpolate(frame, [0, 13, 26], [0, 0.3, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.25, 1),
  });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: `${14 + rise * 34}%`,
          background: 'linear-gradient(0deg, rgba(127,227,191,0.55) 0%, rgba(165,180,245,0.28) 46%, rgba(255,255,255,0) 100%)',
          opacity: rise,
          filter: 'blur(34px)',
        }}
      />
      <span style={{ display: 'none' }}>{LINE}</span>
    </AbsoluteFill>
  );
};
