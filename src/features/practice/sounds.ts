/**
 * Local Web Audio sound palette (no files/network).
 * Designed to be quiet, tactile, and distinct: typing, delete, navigation,
 * selecting a blank, correcting mistakes, succeeding, entering the next step.
 * AudioContext is opened lazily from a real key/tap gesture.
 */
export type FeedbackSound = "typing" | "delete" | "navigate" | "select" | "success" | "error" | "advance";
const KEY = "cet-typing:feedback-sounds";
let context: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

export function readSoundPreference(): boolean {
  try { return typeof window === "undefined" || window.localStorage.getItem(KEY) !== "off"; }
  catch { return true; }
}

export function writeSoundPreference(enabled: boolean): void {
  try { window.localStorage.setItem(KEY, enabled ? "on" : "off"); }
  catch { /* Some privacy modes disallow persistent settings. */ }
}

export function tone(ctx: AudioContext, start: number, hz: number, duration: number, volume: number,
  shape: OscillatorType = "sine", endHz = hz): void {
  const osc = ctx.createOscillator();
  const envelope = ctx.createGain();
  osc.type = shape;
  osc.frequency.setValueAtTime(hz, start);
  if (hz !== endHz) osc.frequency.exponentialRampToValueAtTime(endHz, start + duration);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.008, duration * 0.35));
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(envelope);
  envelope.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.005);
}

export function tap(ctx: AudioContext, now: number, volume: number, duration: number): void {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.05), ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1600;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(now);
  src.stop(now + duration);
}

/** Shared lazily-created context for sound palettes built on tone()/tap(). */
export function sharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Audio = window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Audio) return null;
  try {
    const ctx = context ?? (context = new Audio());
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

export function playFeedback(kind: FeedbackSound): void {
  if (typeof window === "undefined") return;
  const Audio = window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Audio) return;
  try {
    const ctx = context ?? (context = new Audio());
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    const at = ctx.currentTime + 0.006;
    if (kind === "typing") {
      tap(ctx, at, 0.032, 0.019);
      tone(ctx, at, 770, 0.025, 0.008, "triangle", 610);
    } else if (kind === "delete") {
      tap(ctx, at, 0.022, 0.025);
      tone(ctx, at, 340, 0.042, 0.013, "sine", 265);
    } else if (kind === "navigate") {
      tone(ctx, at, 510, 0.055, 0.024, "sine", 690);
      tone(ctx, at + 0.018, 870, 0.035, 0.009);
    } else if (kind === "select") {
      tone(ctx, at, 640, 0.036, 0.022, "sine", 760);
      tap(ctx, at, 0.009, 0.011);
    } else if (kind === "advance") {
      tone(ctx, at, 490, 0.088, 0.04);
      tone(ctx, at + 0.056, 735, 0.12, 0.036);
    } else if (kind === "success") {
      // Short and soft: built-in English TTS remains the primary audio signal.
      tone(ctx, at, 659.25, 0.078, 0.021, "sine");
      tone(ctx, at + 0.043, 783.99, 0.106, 0.017, "sine");
    } else {
      // Soft double dissonance, present without an obnoxious alarm.
      tone(ctx, at, 352, 0.085, 0.034, "triangle", 310);
      tone(ctx, at + 0.065, 247, 0.115, 0.028, "triangle", 215);
    }
  } catch {
    // Failure to play never blocks typing (iOS mute, privacy modes, etc).
  }
}
