import React from 'react';
import { AbsoluteFill } from 'remotion';
import { HEIGHT, WIDTH } from './beat';
import { installFonts } from './fonts';
import { PAPER } from './theme';

installFonts();

/** Shared stage: 1920x1080, paper ground, film fonts installed once. */
export const Stage: React.FC<{
  children: React.ReactNode;
  background?: string;
  style?: React.CSSProperties;
}> = ({ children, background = PAPER, style }) => (
  <AbsoluteFill
    style={{
      width: WIDTH,
      height: HEIGHT,
      background,
      overflow: 'hidden',
      fontKerning: 'normal',
      WebkitFontSmoothing: 'antialiased',
      textRendering: 'optimizeLegibility',
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);
