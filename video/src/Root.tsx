import React from 'react';
import { Composition } from 'remotion';
import { Promo } from './Promo';
import { Promo2 } from './v2/Promo2';
import { Promo3 } from './v3/Promo3';
import { Promo4 } from './v4/Promo4';
import { TOTAL4 } from './v4/time';
import { TOTAL as TOTAL_V2 } from './v2/time';
import { HEIGHT, TOTAL_FRAMES, WIDTH, FPS } from './beat';

/**
 * Two compositions on the same music grid. `bgm` is an input prop so each ships
 * two deliverables: with music, and with SFX only (for the user's own soundtrack).
 *   CetTypingPromo    — the first cut (kept for reference)
 *   CetTypingPromoV2  — the rebuilt cut: big type, field/paper contrast, beat-typed
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="CetTypingPromo"
      component={Promo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ bgm: true }}
    />
    <Composition
      id="CetTypingPromoV2"
      component={Promo2}
      durationInFrames={TOTAL_V2}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ bgm: true }}
    />
    <Composition
      id="CetTypingPromoV3"
      component={Promo3}
      durationInFrames={TOTAL_V2}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ bgm: true }}
    />
    <Composition
      id="CetTypingPromoV4"
      component={Promo4}
      durationInFrames={TOTAL4}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ bgm: true }}
    />
  </>
);
