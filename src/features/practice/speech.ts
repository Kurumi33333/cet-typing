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
 * iOS lists novelty/effect voices as regular en-US voices. Never select the
 * first English entry: that may be Albert, Cellos, Boing, etc.
 */
const NOVELTY_VOICES = new Set([
  "albert", "bad news", "bahh", "bells", "boing", "bubbles",
  "cellos", "good news", "jester", "organ", "superstar",
  "trinoids", "whisper", "wobble", "zarvox",
]);

const NATURAL_VOICES = [
  "samantha", "ava", "allison", "alex", "nicky", "susan",
  "victoria", "zoe", "tom", "evan", "noelle", "joelle",
  "google us english", "microsoft aria", "microsoft jenny",
  "daniel", "kate", "serena", "karen", "moira",
];

export function selectEnglishVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((voice) => /^en(?:-|$)/i.test(voice.lang) &&
    !NOVELTY_VOICES.has(voice.name.trim().toLowerCase()));
  for (const name of NATURAL_VOICES) {
    const found = english.find((v) => v.name.toLowerCase() === name ||
      v.name.toLowerCase().startsWith(name + " ("));
    if (found) return found;
  }
  // Prefer a normal US English voice; if only novelty voices are available,
  // let the browser pick its default instead of forcing a novelty effect.
  return english.find((v) => v.lang.toLowerCase() === "en-us" && v.default) ??
    english.find((v) => v.lang.toLowerCase() === "en-us") ??
    english.find((v) => v.default) ??
    english[0] ?? null;
}

/** Spell I, pronounce eye. The homophone avoids single-letter TTS ambiguity. */
export function pronunciationText(text: string, kind: PronunciationKind): string {
  const trimmed = text.trim();
  return kind === "word" && trimmed.toLowerCase() === "i" ? "eye" : trimmed;
}

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
    const utterance = new SpeechSynthesisUtterance(pronunciationText(text, kind));
    utterance.lang = "en-US";
    utterance.rate = kind === "word" ? 0.83 : 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.82;

    // Voice lists may initially be empty on Safari: the lang fallback still works.
    const available = synth.getVoices?.() ?? [];
    const voice = selectEnglishVoice(available);
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
