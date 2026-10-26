import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { FONT, INK } from '../theme';
import { PaperBg, Rise, prog, silk } from './kit';

/**
 * LEXICON · beat 44–50. The real reference-vocabulary page (4x capture) cropped
 * to heading + search + first results, rising into frame while a query types
 * itself into the real search box. The query text in the capture is painted out
 * with the box's own white so it can be retyped letter by letter.
 *
 * Texture is 5760x3600 = 1440x900 css @4x. Crop in css px: x 220..780, y 75..360.
 */
const TEX_W = 5760;
const TEX_H = 3600;
const PAGE_H = TEX_H / 4; // css px
const CROP = { x: 300, y: 70, w: 840, h: 400 }; // css px
const SHOW_W = 1560; // on-canvas width of the crop
const K = SHOW_W / CROP.w; // canvas px per css px
const CARD_LEFT = (1920 - SHOW_W) / 2;
const CARD_TOP = 56;
/** css y where the results list starts; everything above it is always shown */
const RESULTS_Y = 292;

/** where the typed query sits, in css px of the page */
const QUERY = { x: 336, y: 243, w: 34, h: 22 };

export const LEXICON_KEYS = [10, 14, 18] as const; // local frames of e-d-u

export const Lexicon: React.FC = () => {
  const f = useCurrentFrame();
  const rise = prog(f, 0, 20);
  const typed = LEXICON_KEYS.filter((k) => f >= k).length;
  const rows = prog(f, 22, 34, silk);
  const head = prog(f, 20, 16);
  const cardH = CROP.h * K;

  return (
    <AbsoluteFill>
      <PaperBg shift={2} />
      <div
        style={{
          position: 'absolute',
          left: CARD_LEFT,
          top: CARD_TOP + (1 - rise) * 260,
          width: SHOW_W,
          height: cardH,
          overflow: 'hidden',
          borderRadius: 32,
          background: '#f7f9f6',
          boxShadow: '0 40px 90px rgba(38,52,47,0.20), 0 4px 14px rgba(38,52,47,0.10)',
          opacity: rise,
        }}
      >
        {[
          `inset(0 0 ${(1 - RESULTS_Y / PAGE_H) * 100}% 0)`,
          `inset(${(RESULTS_Y / PAGE_H) * 100}% 0 ${(1 - (RESULTS_Y + (CROP.y + CROP.h - RESULTS_Y) * rows) / PAGE_H) * 100}% 0)`,
        ].map((clip, k) => (
          <Img
            key={k}
            src={staticFile('textures/live/lexicon-full-4x.png')}
            style={{
              position: 'absolute',
              width: (TEX_W / 4) * K,
              height: PAGE_H * K,
              left: -CROP.x * K,
              top: -CROP.y * K,
              clipPath: clip,
            }}
          />
        ))}
        {/* paint over the captured query, then type our own */}
        <div
          style={{
            position: 'absolute',
            left: (QUERY.x - CROP.x - 6) * K,
            top: (QUERY.y - CROP.y - 4) * K,
            width: (QUERY.w + 24) * K,
            height: (QUERY.h + 8) * K,
            background: '#fff',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: (QUERY.x - CROP.x) * K,
            top: (QUERY.y - CROP.y - 1) * K,
            fontFamily: FONT.ui,
            fontWeight: 500,
            fontSize: 17 * K,
            color: INK,
            lineHeight: 1.2,
          }}
        >
          {'edu'.slice(0, typed)}
          {Math.floor(f / 3) % 2 === 0 && f > 6 && f < 60 ? (
            <span style={{ display: 'inline-block', width: 2 * K, height: 18 * K, background: '#356b54', marginLeft: 3, verticalAlign: 'middle' }} />
          ) : null}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, top: CARD_TOP + cardH + 56, textAlign: 'center' }}>
        <Rise p={head} size={120} style={{ margin: '0 auto', width: 'fit-content' }}>
          四六级共 8,534 条词库。
        </Rise>
      </div>
    </AbsoluteFill>
  );
};
