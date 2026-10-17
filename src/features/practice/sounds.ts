/**
 * Tiny local Web Audio feedback: no third-party files, requests or accounts.
 * Called from a keyboard/tap gesture to respect browser autoplay restrictions.
 */
type FeedbackSound = "success" | "error";
let sharedContext: AudioContext | null = null;
const KEY = "cet-typing:feedback-sounds";

export function readSoundPreference(): boolean {
  try { return window.localStorage.getItem(KEY) !== "off"; }
  catch { return true; }
}

export function writeSoundPreference(enabled: boolean): void {
  try { window.localStorage.setItem(KEY, enabled ? "on" : "off"); }
  catch { /* Private browsing can disable localStorage. */ }
}

export function playFeedback(type: FeedbackSound): void {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    const context = sharedContext ?? (sharedContext = new window.AudioContext());
    if (context.state === "suspended") void context.resume().catch(() => {});
    const now = context.currentTime;
    // Success = quiet ascending major triad. Error = short, muted downward pair.
    const notes = type === "success" ? [523.25, 659.25, 783.99] : [330, 261.63];
    const duration = type === "success" ? 0.105 : 0.12;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type === "success" ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      const start = now + index * (type === "success" ? 0.074 : 0.095);
      const end = start + duration;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(type === "success" ? 0.06 : 0.038, start + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.01);
    });
  } catch {
    // No sound support should never block the typing experience.
  }
}
