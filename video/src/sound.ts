/**
 * 声音设计。
 *
 * ── 为什么整张表重做（用户：「音效廉价」）─────────────────────────────────
 * 上一版有两个硬伤，都是"听感廉价"的直接来源：
 *
 * 1. **给打字产品配了机械打字机。** `typewriter-hit-*` 是金属杆砸滚筒的录音
 *    （峰值 88Hz / 1064Hz，低频很重）。这个产品是在电脑上敲字母，声音应该是
 *    **电脑键盘**。现在改用 `keyboard.mp3`——一段 19.6 秒的真实键盘实录，
 *    用 analysis/cut-keystrokes.py 切出 206 个**彼此不同**的真实击键
 *    （每个的音色、力度、音高都不一样）。
 *
 * 2. **同一个采样循环播放。** 即使音色对，反复播放同一块音也是廉价的根源。
 *    现在每一击都是不同的键声，并且按片子的打字节奏逐键钉帧、轻重交替。
 *
 * 另外把合成的 UI 音几乎全部换掉：`ui-zoom-in` / `switch-light` 这类"设计过的
 * 反馈音"在宣传片里听起来像系统提示。纸张、真实机械、真实快门保留。
 *
 * ── 两条工程约定 ──────────────────────────────────────────────────────────
 * · 素材先归一化（analysis/normalize-sfx.py → public/audio/norm/），`volume`
 *   只表达相对关系。Remotion 里 `volume` 是乘法系数，不是目标音量。
 * · 每个音从实测击弦点提前起播（analysis/sfx-lags.py），让**听得见的那一下**
 *   落在画面对应帧上。
 */
import { SHOTS, OUTPUT_AUDIO_OFFSET_FRAMES, S5_STAMP } from './beat';
import attackLags from './analysis/sfx-lags.json';
import { S1_LETTERS, S1_WORD_DONE } from './scenes/SceneWord';
import { S3_TIMING, S3_WORD_EVENTS } from './scenes/SceneSentence';

export interface SfxPin {
  /** absolute frame the sound's attack must land on */
  from: number;
  src: string;
  volume: number;
  /** truncate long samples to the action they belong to (S4) */
  durationInFrames?: number;
  /** what happens on screen, for the audit table */
  note: string;
}

const LAG: Record<string, number> = attackLags as Record<string, number>;

const pin = (targetFrame: number, src: string, volume: number, note: string, durationInFrames?: number): SfxPin => {
  const lag = LAG[src] ?? LAG['key-001.mp3'] ?? 0;
  return {
    from: Math.max(0, Math.round(targetFrame - lag - OUTPUT_AUDIO_OFFSET_FRAMES)),
    src: `norm/${src}`,
    volume,
    durationInFrames,
    note,
  };
};

const S1 = SHOTS.s1Scene.from;
const C1 = SHOTS.c1Card.from;
const S2 = SHOTS.s2Course.from;
const C2 = SHOTS.c2Card.from;
const S3 = SHOTS.s3Sentence.from;
const C3 = SHOTS.c3Card.from;
const S4 = SHOTS.s4Review.from;
const S5 = SHOTS.s5Outro.from;

/** S2 cues, mirrored from SceneCourse. */
const S2_SWEEP = 26;
const S2_STATS = [84, 94, 104];
/** S4 interval cues, mirrored from SceneReview. */
const S4_STEPS = [38, 54, 70, 86];

/**
 * The keystroke bank: 206 real key sounds cut from one recording. Picking with
 * a fixed stride (not randomly) keeps the render deterministic while making
 * sure no two adjacent keys are the same sample.
 */
const KEY_COUNT = 206;
const keyAt = (n: number): string => `key-${String((n % KEY_COUNT) + 1).padStart(3, '0')}.mp3`;

/** Typing velocity: soft and fast in the forward pass, firmer on a correction. */
const keyVolume = (n: number, total: number) => 0.9 - (n / Math.max(1, total)) * 0.18;

export const SFX: SfxPin[] = [
  // ---------------- S1 · the rule draws, the sentence gets typed ----------------
  // a pen laying ink: the real thing, not a whoosh
  pin(S1 + 8, 'marker-pen-line.mp3', 0.55, 'S1 · the first rule is drawn on empty paper', 46),
  // every keystroke — real keyboard, a different sample each time
  ...S1_LETTERS.map((frame, i) =>
    pin(S1 + frame, keyAt(i), keyVolume(i, S1_LETTERS.length), `S1 · key ${i + 1}`, 7)),
  // the moment a word completes: the same key bank, hit a little firmer
  ...S1_WORD_DONE.map((frame, i) =>
    pin(S1 + frame, keyAt(S1_LETTERS.length + i * 3), 0.95, `S1 · word ${i + 1} turns green`, 8)),
  pin(S1 + 146, 'impact-deep-whoosh.mp3', 0.85, 'S1 · the sentence completes (SLAM #1)', 48),
  pin(S1 + 149, 'typewriter-return-bell.mp3', 0.34, 'S1 · the sentence closes with a bell', 22),

  // ---------------- title cards: paper, not clicks ---------------------------
  pin(C1 + 1, 'paper-slide.mp3', 0.5, 'C1 · a sheet is set down', 24),
  pin(C2 + 1, 'paper-slide.mp3', 0.5, 'C2 · a sheet is set down', 24),
  pin(C3 + 1, 'paper-slide.mp3', 0.5, 'C3 · a sheet is set down', 24),

  // ---------------- S2 · the real page, pointed at by the motif ---------------
  pin(S2 + 0, 'paper-slide.mp3', 0.42, 'S2 · cut into the page', 24),
  pin(S2 + S2_SWEEP, 'marker-pen-line.mp3', 0.3, 'S2 · the tier is underlined with a pen', 12),
  pin(S2 + S2_STATS[0], 'clock-mech-retract.mp3', 0.42, 'S2 · 12 单元 lands', 14),
  pin(S2 + S2_STATS[1], 'clock-mech-retract.mp3', 0.4, 'S2 · 120 步', 14),
  pin(S2 + S2_STATS[2], 'clock-mech-retract.mp3', 0.37, 'S2 · 8,534 词', 16),

  // ---------------- S3 · typing, the mistake, the fix, the hand-over ----------
  pin(S3 + S3_TIMING.bandIn, 'paper-slide.mp3', 0.4, 'S3 · the page hands over', 22),
  // the long sentence types with the same real keyboard — it types MORE than S1
  ...S3_WORD_EVENTS.letters.map((frame, i) =>
    pin(S3 + frame, keyAt(i * 2), keyVolume(i, S3_WORD_EVENTS.letters.length), 'S3 · key', 7)),
  ...S3_WORD_EVENTS.done.map(({ frame, word }, i) =>
    pin(S3 + frame, keyAt(60 + i * 3), 0.95, `S3 · "${word}" turns green`, 8)),
  // the mistake and its correction: a real switch click, twice
  pin(S3 + S3_TIMING.typoAt, 'switch-tap.mp3', 0.6, 'S3 · the wrong word is marked red', 12),
  pin(S3 + S3_TIMING.fixStart, 'switch-light.mp3', 0.55, 'S3 · the caret returns to that slot', 12),
  pin(S3 + S3_TIMING.fixed, 'switch-light.mp3', 0.62, 'S3 · the fix lands, the word turns green', 14),
  pin(S3 + S3_TIMING.flowStart, 'typewriter-return-bell.mp3', 0.3, 'S3 · the sentence is complete', 26),
  pin(S3 + S3_TIMING.advance, 'paper-slide.mp3', 0.45, 'S3 · the page advances by itself', 22),

  // ---------------- S4 · the review axis --------------------------------------
  pin(S4 + 2, 'paper-slide.mp3', 0.4, 'S4 · cut into the dark field', 22),
  pin(S4 + 12, 'clock-mech-retract.mp3', 0.42, 'S4 · the due count rolls', 18),
  ...S4_STEPS.map((cue, i) =>
    pin(S4 + cue, 'clock-mech-retract.mp3', 0.4 - i * 0.02, `S4 · interval ${i + 1} lands`, 12)),

  // ---------------- S5 · riser → impact → sparkle ------------------------------
  pin(S5 + 0, 'riser-cine.mp3', 1.5, 'S5 · the assembly is lifted', 70),
  pin(S5 + S5_STAMP, 'impact-cine-big.mp3', 1.0, 'S5 · the wordmark stamps down (SLAM #2)', 140),
  pin(S5 + S5_STAMP + 26, 'marker-pen-line.mp3', 0.32, 'S5 · the rule under the wordmark', 34),
  pin(S5 + S5_STAMP + 38, 'sparkle.mp3', 0.42, 'S5 · the aurora settles', 90),
];

/**
 * BGM level. The music is a bed: at 0.15 the bed measures ~-29 dB RMS, leaving
 * every normalized effect 6–15 dB of headroom.
 */
export const BGM = {
  src: 'bgm.mp3',
  volume: 0.22,
} as const;
