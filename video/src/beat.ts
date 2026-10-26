/**
 * THE TIMELINE — the single source of truth for the whole film.
 *
 * Every shot boundary is written as `beatF(n)` against the measured BGM grid
 * (analysis/beat-data.json: 124.004 BPM, 0.483857 s per beat, 14.52 frames per
 * beat at 30 fps, ±11.4 ms residual over the 20-bar window the film uses).
 * Nothing in the film uses a bare frame number, so moving the music moves the
 * film with it.
 *
 * Shot list (DESIGN.md §阶段 3):
 *   S1    0–232    the rule, the Chinese prompt, the first typed sentence
 *   C1  232–290    title card ①
 *   S2  290–435    the course ladder, on the real page
 *   C2  435–494    title card ②
 *   S3  494–755    the long sentence, typed word by word
 *   C3  755–813    title card ③
 *   S4  813–929    the review interval axis
 *   S5  929–1103   the group photo and the wordmark
 *
 * Every boundary is a bar line (a multiple of 4 beats), so the cuts agree with
 * the music's phrase structure and not merely with its pulse.
 */
import beatData from './analysis/beat-data.json';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Measured on the source file; never mixed with render-pipeline offsets. */
export const SOURCE_BEAT0_SEC = beatData.source_beat0_s;
export const BEAT_SEC = beatData.T;
/**
 * Output-track offset for this pipeline, measured on a rendered file
 * (analysis/render-offset.py). Subtracted from every SFX pin so the sound
 * lands on the frame the picture lands on.
 */
export const OUTPUT_AUDIO_OFFSET_FRAMES = 0; // measured on a render of THIS pipeline

export const beatT = (n: number): number => SOURCE_BEAT0_SEC + n * BEAT_SEC;
export const beatF = (n: number): number => Math.round(n * BEAT_SEC * FPS);

export interface Shot {
  from: number;
  duration: number;
}

const shot = (fromBeat: number, toBeat: number): Shot => {
  const from = beatF(fromBeat);
  return { from, duration: beatF(toBeat) - from };
};

export const SHOTS = {
  s1Scene: shot(0, 16), //    0 – 232   7.73s
  c1Card: shot(16, 20), //  232 – 290   1.93s
  s2Course: shot(20, 30), //  290 – 435   4.84s
  c2Card: shot(30, 34), //  435 – 494   1.97s
  s3Sentence: shot(34, 52), //  494 – 755   8.70s
  c3Card: shot(52, 56), //  755 – 813   1.93s
  s4Review: shot(56, 64), //  813 – 929   3.87s
  s5Outro: shot(64, 76), //  929 – 1103  5.80s
} as const;

/** Local frames of the two moments the whole film is built around. */
export const S1_COMPLETE = 196; // the first sentence is finished
export const S5_STAMP = 74; // the wordmark stamps down

export const TOTAL_FRAMES = SHOTS.s5Outro.from + SHOTS.s5Outro.duration;

/** Rest/hold budget, reserved before any motion was timed (R1/R3). */
export const HOLDS = {
  /** letters stop, the finished sentence breathes before the cut */
  s1SentenceSettled: { from: SHOTS.s1Scene.from + 212, to: SHOTS.s1Scene.from + 232 },
  /** the three stats have landed under the ladder */
  s2StatsSettled: { from: SHOTS.s2Course.from + 108, to: SHOTS.s2Course.from + 145 },
  /** the whole sentence is green, the orb has walked it, before the cut */
  s3SentenceSettled: { from: SHOTS.s3Sentence.from + 232, to: SHOTS.s3Sentence.from + 261 },
  /** wordmark lockup: 44 frames of true stillness (floor is 30) */
  s5Wordmark: { from: SHOTS.s5Outro.from + 130, to: SHOTS.s5Outro.from + 174 },
} as const;

/**
 * Whole-screen / camera-level impacts. Equity: at most 3 in the film, each on
 * a measured strong kick of the window, each ≥16 beats apart (R4).
 *   S1+196  = the sentence completes   (beat 13.5 — kick 0.97, bar 3)
 *   S5+74   = the wordmark stamps      (beat 69.1 — bar 17 is the loudest bar
 *                                       of the whole window, RMS 0.2598)
 * Nothing else touches the whole frame; every other beat moves elements only.
 */
export const SLAMS = [SHOTS.s1Scene.from + S1_COMPLETE, SHOTS.s5Outro.from + S5_STAMP] as const;

/** Frame → beat number, for pinning SFX relative to the music. */
export const frameBeat = (frame: number): number => frame / (BEAT_SEC * FPS);
