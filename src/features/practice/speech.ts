import { matchesSlot, type Slot } from "./slots";

const PREF = "cet-typing:word-pronunciation";

/** Sentence pronunciation is manual, word pronunciation is opt-out. */
export function readPronunciationPreference(): boolean {
  try {
    return typeof window === "undefined" || window.localStorage.getItem(PREF) !== "off";
  } catch {
    return true;
  }
}

export function writePronunciationPreference(enabled: boolean): void {
  try { window.localStorage.setItem(PREF, enabled ? "on" : "off"); }
  catch { /* Private mode can disallow storage. */ }
}

/** A transition from an incomplete/incorrect word to exactly the correct word. */
export function shouldPronounceWord(before: string, after: string, slot: Slot): boolean {
  if (after.trim().includes(" ") || !after.trim()) return false;
  return !matchesSlot(before, slot) && matchesSlot(after, slot);
}

export type PronunciationKind = "word" | "sentence";

/**
 * Use built-in system English voices. A fresh utterance replaces an older one:
 * rapid typing must never build an audible speech queue.
 * Called synchronously from input / click handlers for iOS gesture restrictions.
 */
export function speakEnglish(text: string, kind: PronunciationKind = "word"): boolean {
  if (typeof window === "undefined" || typeof SpeechSynthesisUtterance === "undefined") return false;
  const synth = window.speechSynthesis;
  if (!synth || !text.trim()) return false;

  try {
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = "en-US";
    utterance.rate = kind === "word" ? 0.83 : 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.82;

    // Voice lists may initially be empty on Safari: the lang fallback still works.
    const available = synth.getVoices?.() ?? [];
    const voice = available.find((v) => v.lang.toLowerCase() === "en-us") ??
      available.find((v) => v.lang.toLowerCase().startsWith("en-")) ??
      available.find((v) => v.lang.toLowerCase() === "en");
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    if (synth.speaking || synth.pending) synth.cancel();
    synth.speak(utterance);
    return true;
  } catch {
    // No audio device/voice support should not affect typing or grading.
    return false;
  }
}

export function stopPronunciation(): void {
  try {
    if (typeof window !== "undefined" && window.speechSynthesis &&
      (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
      window.speechSynthesis.cancel();
    }
  } catch { /* optional browser API */ }
}
