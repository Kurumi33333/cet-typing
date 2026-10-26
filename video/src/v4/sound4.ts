/**
 * Film 4 sound. Deliberately small: the keys (the product's own sound), one whoosh per
 * camera travel, three hits, a bell when a sentence is right, and a few soft glints.
 */
import attackLags from '../analysis/sfx-lags.json';
import { OUTPUT_AUDIO_OFFSET_FRAMES, beatF } from '../beat';
import { B4 } from './time';
import { FSRS_NODES, KEY_FRAMES, SENTENCE_DONE } from './Film4';

export interface SfxPin {
  from: number;
  src: string;
  volume: number;
  durationInFrames?: number;
  note: string;
}

const LAG = attackLags as Record<string, number>;

const pin = (target: number, src: string, volume: number, note: string, durationInFrames?: number): SfxPin => ({
  from: Math.max(0, Math.round(target - (LAG[src] ?? 0) - OUTPUT_AUDIO_OFFSET_FRAMES)),
  src: `hifi/${src.replace(/\.mp3$/, '.wav')}`,
  volume,
  durationInFrames,
  note,
});

const KEY_COUNT = 206;
const keyAt = (n: number): string => `key-${String((n % KEY_COUNT) + 1).padStart(3, '0')}.mp3`;

export const SFX: SfxPin[] = [
  ...KEY_FRAMES.map((f, i) => pin(f, keyAt(i * 3 + 1), 0.98 - (i % 5) * 0.05, `key ${i + 1}`, 7)),
  ...SENTENCE_DONE.map((f, i) => pin(f, 'typewriter-return-bell.mp3', 0.3, `sentence ${i + 1} right`, 26)),

  // the camera travels: one whoosh each, peaking mid-flight
  ...[B4.travel1, B4.travel2, B4.travel3].map((b, i) => pin(beatF(b + 1), 'whoosh-fast.mp3', 0.55, `travel ${i + 1}`, 30)),
  pin(beatF(B4.zoomOut + 1.5), 'whoosh-fast.mp3', 0.6, 'push through the last card', 30),

  pin(beatF(B4.slam1), 'impact-deep-whoosh.mp3', 0.68, 'hit 1 · the first card', 48),
  pin(beatF(B4.slam2), 'impact-deep-whoosh.mp3', 0.75, 'hit 2 · review lands', 48),
  pin(beatF(B4.slam3), 'impact-cine-big.mp3', 0.68, 'hit 3 · the wordmark', 140),

  ...FSRS_NODES.map((f, i) => pin(f, 'sparkle-touch.mp3', 0.22, `interval ${i + 1}`, 40)),
  pin(beatF(B4.slam3) + 36, 'sparkle.mp3', 0.35, 'aurora settles', 90),
];

export const BGM = { src: 'hifi/bgm-v4-eq.wav', volume: 0.62 } as const;
export const bgmVolume = (f: number, total: number): number => {
  const fin = Math.min(1, f / 10);
  const fout = Math.min(1, Math.max(0, (total - f) / 36));
  return BGM.volume * fin * fout;
};
