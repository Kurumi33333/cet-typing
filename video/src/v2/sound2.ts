/**
 * V2 sound table. Same assets, same measured attack lags, same rules as the V1
 * table (src/sound.ts): every cue is pinned to the frame the picture lands on,
 * written relative to the shot it belongs to, never as a bare frame number.
 */
import attackLags from '../analysis/sfx-lags.json';
import { OUTPUT_AUDIO_OFFSET_FRAMES, beatF } from '../beat';
import { HOOK_LETTERS } from './Hook';
import { SENT_LETTERS, SENT_TIMING, SENT_WORD_DONE } from './Sentence';
import { REVIEW_NODES } from './Review';
import { LEXICON_KEYS } from './Lexicon';
import { OUTRO_ARRIVALS, STAMP } from './Outro';
import { COURSE_SEGS } from './Course';
import { T, WIPE } from './time';

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
  src: `norm/${src}`,
  volume,
  durationInFrames,
  note,
});

const KEY_COUNT = 206;
const keyAt = (n: number): string => `key-${String((n % KEY_COUNT) + 1).padStart(3, '0')}.mp3`;
const keyVol = (n: number): number => 0.82 - (n % 5) * 0.05;

const key = (target: number, n: number, note: string): SfxPin => pin(target, keyAt(n), keyVol(n), note, 7);

/** a whoosh under every wipe, on the frame the new shot begins to open */
const wipes = (): SfxPin[] =>
  [T.titleOne, T.course, T.sentence, T.review, T.lexicon, T.sound, T.local, T.outro].map((s, i) =>
    pin(s.from + 2, 'whoosh-fast.mp3', 0.42, `wipe ${i + 1}`, 28),
  );

export const SFX: SfxPin[] = [
  // ---------------------------------------------------------------- hook
  pin(T.hook.from + 1, 'hit-weak.mp3', 0.6, 'hook · the Chinese prompt stamps', 14),
  ...HOOK_LETTERS.map((lf, i) => key(T.hook.from + lf, i * 3 + 1, `hook · key ${i + 1}`)),
  pin(T.hook.from + beatF(3) + 1, 'typewriter-return-bell.mp3', 0.3, 'hook · sentence 1 is right', 26),
  pin(T.hook.from + 50, 'swoosh-quick.mp3', 0.5, 'hook · sentence 1 leaves', 18),
  pin(T.hook.from + 59, 'hit-weak.mp3', 0.6, 'hook · prompt 2 stamps', 14),
  pin(T.hook.from + beatF(7) + 1, 'typewriter-return-bell.mp3', 0.34, 'hook · sentence 2 is right', 26),

  // ---------------------------------------------------------------- title ①
  pin(T.titleOne.from, 'impact-deep-whoosh.mp3', 0.9, 'title ① · SLAM #1 on the kick at beat 8', 48),
  pin(beatF(9), 'camera-shutter-vintage.mp3', 0.5, 'title ① · line 2', 14),
  pin(beatF(10), 'camera-shutter-vintage.mp3', 0.5, 'title ① · line 3', 14),

  // ---------------------------------------------------------------- course
  ...COURSE_SEGS.map((s, i) =>
    pin(beatF(s.endBeat), 'clock-mech-retract.mp3', 0.46 - i * 0.03, `course · "${s.label}" segment closes`, 16),
  ),

  // ---------------------------------------------------------------- sentence
  pin(T.sentence.from + 1, 'hit-weak.mp3', 0.55, 'sentence · prompt stamps', 14),
  ...SENT_LETTERS.map((lf, i) => key(T.sentence.from + lf, i * 2 + 7, `sentence · key ${i + 1}`)),
  pin(T.sentence.from + SENT_TIMING.wrongAt, 'switch-tap.mp3', 0.62, 'sentence · the typo turns red', 12),
  pin(T.sentence.from + SENT_TIMING.fixAt + 3, 'switch-light.mp3', 0.62, 'sentence · the fix lands', 14),
  ...SENT_WORD_DONE.filter((_, i) => i === 4 || i === 9).map((lf, i) =>
    pin(T.sentence.from + lf + 1, 'switch-light.mp3', 0.45, `sentence · row ${i + 1} complete`, 12),
  ),
  pin(T.sentence.from + SENT_TIMING.allDone + 1, 'typewriter-return-bell.mp3', 0.34, 'sentence · all slots right', 26),
  pin(T.sentence.from + SENT_TIMING.pageOut, 'paper-slide.mp3', 0.5, 'sentence · the page moves on by itself', 22),

  // ---------------------------------------------------------------- review
  pin(T.review.from, 'impact-deep-whoosh.mp3', 0.9, 'review · SLAM #2 on the kick at beat 32', 48),
  ...REVIEW_NODES.flatMap((lf, i) => [
    pin(T.review.from + lf, 'clock-mech-retract.mp3', 0.46, `review · node ${i + 1}`, 16),
    pin(T.review.from + lf + 2, 'sparkle-touch.mp3', 0.26, `review · node ${i + 1} ring`, 40),
  ]),

  // ---------------------------------------------------------------- lexicon
  ...LEXICON_KEYS.map((lf, i) => key(T.lexicon.from + lf, 91 + i * 4, `lexicon · key ${i + 1}`)),
  pin(T.lexicon.from + 22, 'paper-slide.mp3', 0.4, 'lexicon · results open', 22),

  // ---------------------------------------------------------------- sound
  pin(T.sound.from + 2, 'stardust-swish.mp3', 0.3, 'sound · the wave rises', 40),
  pin(beatF(54), 'hit-weak.mp3', 0.5, 'sound · "7"', 14),

  // ---------------------------------------------------------------- local
  ...[58, 59, 60].flatMap((b, li) => {
    const n = [5, 6, 10][li];
    return Array.from({ length: n }, (_, k) =>
      key(beatF(b) + k * 2 + 2, 140 + li * 17 + k * 3, `local · line ${li + 1} key ${k + 1}`),
    );
  }),

  // ---------------------------------------------------------------- outro
  pin(T.outro.from + 2, 'riser-cine.mp3', 1.4, 'outro · the fragments are lifted', 80),
  ...OUTRO_ARRIVALS.map((lf, i) => pin(T.outro.from + lf, 'hit-weak.mp3', 0.4, `outro · fragment ${i + 1} lands`, 12)),
  pin(T.outro.from + STAMP, 'impact-cine-big.mp3', 1.0, 'outro · SLAM #3, the wordmark stamps', 140),
  pin(T.outro.from + STAMP + 26, 'marker-pen-line.mp3', 0.32, 'outro · the rule under the wordmark', 34),
  pin(T.outro.from + STAMP + 38, 'sparkle.mp3', 0.42, 'outro · the aurora settles', 90),

  ...wipes(),
];

export const BGM = { src: 'bgm.mp3', volume: 0.22 } as const;
void WIPE;
