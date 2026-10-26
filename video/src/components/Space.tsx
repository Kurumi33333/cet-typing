import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';

/**
 * 三层空间 —— 这是整支片子重构的核心。
 *
 * 诊断：把旧版的六帧并排看，没有任何一帧有「东西在哪里」——每帧都是
 * 一块纯白底 + 居中内容。没有前景、没有背景、没有焦点落差，因此观众
 * 读到的是一页 PPT。问题不在动效细节，在**画面构图本身没有纵深**。
 *
 * 这里把每个镜头强制拆成三层，并且让三层以**不同速度**运动（视差）：
 *
 *   back   真实页面的整体（小、暗、虚、慢）
 *   mid    焦点层：真实页面的当前区域（清晰、有投影、正常速度）
 *   front  产品元素：词槽、字母、光标（最大、最锐、有落回纸面的影）
 *
 * 视差是「空间感」唯一可靠的来源：三层同速 = 平的；三层异速 = 有厚度。
 */

export interface Depth {
  /** how far back the layer sits, 0 = focal plane, 1 = far */
  z: number;
}

/** parallax factor for a layer: far layers move less */
export const parallax = (z: number) => 1 - z * 0.45;

/**
 * A real-page plate placed in space: it has a position, a scale, a tilt and a
 * shadow that falls onto the paper. Never full-bleed, never centred by default —
 * a full-bleed flat screenshot is exactly what made the old cut read as slides.
 */
export const Plate: React.FC<{
  src: string;
  x: number;
  y: number;
  width: number;
  /** crop window inside the texture, in texture fraction (0..1) */
  crop?: { x: number; y: number; w: number; h: number };
  rotate?: number;
  rotateY?: number;
  shadow?: number;
  radius?: number;
  opacity?: number;
  /** dim the plate so foreground type wins */
  dim?: number;
  children?: React.ReactNode;
}> = ({
  src, x, y, width, crop = { x: 0, y: 0, w: 1, h: 1 },
  rotate = 0, rotateY = 0, shadow = 1, radius = 18, opacity = 1, dim = 0, children,
}) => {
  const frame = useCurrentFrame();
  void frame;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        transform: `rotate(${rotate}deg) rotateY(${rotateY}deg)`,
        transformStyle: 'preserve-3d',
        opacity,
        borderRadius: radius,
        overflow: 'hidden',
        background: '#fbfcfa',
        boxShadow: shadow > 0
          ? `0 ${18 * shadow}px ${48 * shadow}px rgba(38,52,47,${0.13 * shadow}), 0 2px 0 rgba(255,255,255,0.7) inset`
          : undefined,
      }}
    >
      {/* the crop is done with positioning, not object-fit, so the texture stays
          at its native resolution (no resampling of the page's own type) */}
      <div style={{ position: 'relative', width: '100%', paddingTop: `${(crop.h / crop.w) * 100 * (1 / 1)}%` }}>
        <Img
          src={staticFile(src)}
          style={{
            position: 'absolute',
            width: `${(1 / crop.w) * 100}%`,
            height: 'auto',
            left: `${-(crop.x / crop.w) * 100}%`,
            top: `${-(crop.y / crop.h) * 100 * (crop.h / crop.w)}%`,
            display: 'block',
          }}
        />
      </div>
      {dim > 0 ? (
        <div style={{ position: 'absolute', inset: 0, background: '#f7f9f6', opacity: dim }} />
      ) : null}
      {children}
    </div>
  );
};
