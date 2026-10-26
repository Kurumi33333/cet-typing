import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Stage } from '../Stage';
import { Grain } from '../components/Light';
import { PaperField } from '../components/PaperField';
import { EASE, FONT, INK, INK_SOFT, PAPER, PAPER_2, ACCENT } from '../theme';

export interface TitleCardProps {
  text: string; // *word* marks the single accent word
  sub?: string;
  ink?: string;
  accent?: string;
  paper?: string;
  /** how the card meets its neighbours, 0..1 of the card's own length */
  duration?: number;
}

/**
 * C1/C2/C3 · the breathing cards (paper-title-card card).
 *
 * One sentence pressed onto paper, exactly one accent word, a short rule
 * closing it. 1.93 s each — long enough to read once, short enough not to
 * become a second tagline (the film's tagline only appears in S5).
 *
 * The card has its own small piece of the film's motif: the accent word's
 * underline is drawn at the same 2.4px weight as every slot rule in S1/S3.
 */
export const TitleCard: React.FC<TitleCardProps> = ({
  text,
  sub,
  ink = INK,
  accent = ACCENT,
  paper = PAPER,
  duration = 58,
}) => {
  const frame = useCurrentFrame();

  const tokens = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  const words: { text: string; accent: boolean; br: boolean }[] = [];
  for (const token of tokens) {
    if (token === '/') {
      words.push({ text: '', accent: false, br: true });
      continue;
    }
    const isAccent = token.startsWith('*') && token.endsWith('*');
    const plain = isAccent ? token.slice(1, -1) : token;
    for (const piece of plain.split(' ')) {
      if (!piece) continue;
      words.push({ text: piece, accent: isAccent, br: false });
    }
  }

  const outAt = duration - 10;
  const cardOut = interpolate(frame, [outAt, duration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.6, 1),
  });

  // the accent rule is drawn after the words have landed, never with them
  const accentIndex = words.findIndex((w) => w.accent);
  const ruleStart = Math.max(30, 4 + words.length * 4 + 4);
  const ruleProgress = interpolate(frame, [ruleStart, ruleStart + 11], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.15, 0, 0.2, 1),
  });

  return (
    <Stage>
      {/* the card sits on the same paper ground as every other shot — the chapter
          breaks belong to the film, not a flat graphic between shots */}
      <PaperField intensity={0.9} lightX={0.5} lightY={0.42} pitch={104} drift={0} />
      <Grain opacity={0.04} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: 1 - cardOut,
            transform: `translateY(${-Math.round(cardOut * 18)}px)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: '0.16em 0.30em',
              maxWidth: 1360,
              fontFamily: FONT.serifZh,
              fontWeight: 600,
              fontSize: 96,
              lineHeight: 1.34,
              letterSpacing: '-0.035em',
              color: ink,
            }}
          >
            {words.map((w, i) => {
              if (w.br) return <span key={`br-${i}`} style={{ flexBasis: '100%', height: 0 }} />;
              const at = 4 + i * 4;
              const t = interpolate(frame, [at, at + 9], [0, 1], {
                extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
                easing: Easing.bezier(0.2, 0.75, 0.3, 1),
              });
              const isAccent = w.accent;
              const showRule = isAccent && i === accentIndex;
              return (
                <span
                  key={`${w.text}-${i}`}
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    fontSize: isAccent ? undefined : undefined,
                    fontStyle: isAccent ? 'italic' : undefined,
                    color: isAccent ? accent : undefined,
                    opacity: t,
                    /**
                     * 曾经是 scale(1.28 → 1)——每个词从 1.28 倍缩到 1 倍。
                     * 那是全片字体重栅格化最严重的一处（实测 edge/flat 变化比
                     * 5.64x，全片最高）：字形在不断被重新栅格化，边缘在锐/糊之间
                     * 来回跳，观感就是"抖"。
                     * 改成只用不透明度和极小整像素位移入场——字一出现就是最终
                     * 形态，边缘从第一帧起就是干净的。
                     */
                    transform: `translateY(${Math.round((1 - t) * 6)}px)`,
                  }}
                >
                  {w.text}
                  {showRule ? (
                    <span
                      style={{
                        position: 'absolute',
                        left: '2%',
                        right: '2%',
                        bottom: '-0.13em',
                        height: 6,
                        borderRadius: 3,
                        background: accent,
                        opacity: 0.85,
                        transform: `scaleX(${ruleProgress})`,
                        transformOrigin: '0 50%',
                        // (was a 0.2px blur; removed for render determinism)
                      }}
                    />
                  ) : null}
                </span>
              );
            })}
          </div>

          {sub ? (
            <div
              style={{
                marginTop: 40,
                fontFamily: FONT.ui,
                fontWeight: 400,
                fontSize: 27,
                letterSpacing: '0.10em',
                color: INK_SOFT,
                opacity: interpolate(frame, [ruleStart + 4, ruleStart + 18], [0, 1], {
                  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
                }),
                transform: `translateY(${Math.round(interpolate(frame, [ruleStart + 4, ruleStart + 18], [8, 0], {
                  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
                }))}px)`,
              }}
            >
              {sub}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
