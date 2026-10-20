import { readSoundPreference, sharedAudioContext, tap, tone, writeSoundPreference } from "../features/practice/sounds";

/**
 * The landing page's sound palette, built from the practice screen's own
 * oscillator primitives so both sound like one product: soft, short, tactile.
 *
 * Nothing plays before the visitor has interacted (browsers keep audio locked,
 * and notes scheduled on a suspended context would all fire at once on
 * unlock), and nothing plays when key sounds are switched off.
 */
let unlocked = false;
let lastHover = 0;
let lastTick = 0;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  const unlock = () => {
    unlocked = true;
    sharedAudioContext();
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
}

function play(build: (ctx: AudioContext, at: number) => void) {
  if (!unlocked || !readSoundPreference()) return;
  const ctx = sharedAudioContext();
  if (!ctx || ctx.state !== "running") return;
  try {
    build(ctx, ctx.currentTime + 0.006);
  } catch {
    /* audio never blocks the page */
  }
}

const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

export const landingSound = {
  isOn: () => readSoundPreference(),
  setOn(on: boolean) {
    writeSoundPreference(on);
    listeners.forEach((fn) => fn());
    if (on) this.click();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },

  /** Pointer passes over a control: a tiny pitched tick, rate-limited. */
  hover(step = 0) {
    const now = performance.now();
    if (now - lastHover < 70) return;
    lastHover = now;
    play((ctx, at) => tone(ctx, at, PENTA[step % PENTA.length] * 2, 0.03, 0.007, "sine"));
  },
  /** A button press: low thump plus a bright tap. */
  click() {
    play((ctx, at) => {
      tone(ctx, at, 220, 0.07, 0.03, "sine", 150);
      tap(ctx, at, 0.02, 0.014);
      tone(ctx, at + 0.02, 660, 0.05, 0.012, "triangle");
    });
  },
  /** Primary call to action: a rising three-note lift. */
  start() {
    play((ctx, at) => {
      tone(ctx, at, 392, 0.1, 0.034, "sine");
      tone(ctx, at + 0.06, 587.33, 0.12, 0.03, "sine");
      tone(ctx, at + 0.12, 783.99, 0.18, 0.024, "sine");
    });
  },
  /** A section scrolls in, and its mirror when it scrolls back out. */
  enter(index = 0) {
    play((ctx, at) => {
      tone(ctx, at, PENTA[index % PENTA.length], 0.16, 0.014, "sine");
      tone(ctx, at + 0.05, PENTA[(index + 2) % PENTA.length], 0.2, 0.009, "sine");
    });
  },
  leave(index = 0) {
    const hz = PENTA[index % PENTA.length];
    play((ctx, at) => tone(ctx, at, hz / 2, 0.1, 0.01, "sine", hz / 2.6));
  },
  /** Counter digits ticking up. */
  count(progress: number) {
    const now = performance.now();
    if (now - lastTick < 55) return;
    lastTick = now;
    play((ctx, at) => {
      tap(ctx, at, 0.012, 0.012);
      tone(ctx, at, 700 + progress * 700, 0.02, 0.006, "triangle");
    });
  },
  /** Counters landed: a small chord. */
  settle() {
    play((ctx, at) => {
      [523.25, 659.25, 783.99].forEach((hz, i) => tone(ctx, at + i * 0.03, hz, 0.22, 0.012, "sine"));
    });
  },
  /** Bars growing: a short rising sweep. */
  sweep() {
    play((ctx, at) => tone(ctx, at, 300, 0.32, 0.012, "sine", 900));
  },
  /** A disclosure opens or closes. */
  toggle(open: boolean) {
    play((ctx, at) => {
      if (open) {
        tone(ctx, at, 480, 0.05, 0.02, "sine", 720);
        tone(ctx, at + 0.03, 960, 0.05, 0.01, "sine");
      } else {
        tone(ctx, at, 620, 0.05, 0.018, "sine", 380);
      }
    });
  },
  /** The hero demo finishes a line: a typewriter bell. */
  bell() {
    play((ctx, at) => {
      tone(ctx, at, 1568, 0.5, 0.014, "sine");
      tone(ctx, at, 2349, 0.35, 0.006, "sine");
    });
  },
  /** The hero demo wipes the line. */
  wipe() {
    play((ctx, at) => {
      tap(ctx, at, 0.018, 0.12);
      tone(ctx, at, 500, 0.12, 0.008, "sine", 200);
    });
  },
  /** One note per word as the success orb passes over the sentence. */
  flow(step: number, steps: number) {
    const hz = PENTA[Math.min(PENTA.length - 1, Math.round((step / Math.max(1, steps - 1)) * (PENTA.length - 1)))];
    play((ctx, at) => {
      tone(ctx, at, hz, 0.14, 0.016, "sine");
      tone(ctx, at, hz * 2, 0.08, 0.005, "sine");
    });
  },
  /** Final sparkle when a whole sentence passes. */
  sparkle() {
    play((ctx, at) => {
      [1046.5, 1318.5, 1568, 2093].forEach((hz, i) => tone(ctx, at + i * 0.045, hz, 0.18, 0.008, "sine"));
    });
  },
  /** A nav jump. */
  whoosh() {
    play((ctx, at) => {
      tap(ctx, at, 0.02, 0.18);
      tone(ctx, at, 250, 0.2, 0.01, "sine", 700);
    });
  },
};
