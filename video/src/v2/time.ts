/**
 * V2 timeline — every boundary is a beat number on the measured BGM grid
 * (beat.ts). 76 beats = 19 bars = 1103 frames, same as V1 so the music slice,
 * the SFX lag table and the render-offset measurement all carry over.
 */
import { beatF } from '../beat';

export interface Span {
  from: number;
  duration: number;
}

const span = (a: number, b: number): Span => ({ from: beatF(a), duration: beatF(b) - beatF(a) });

export const T = {
  hook: span(0, 8),
  titleOne: span(8, 12),
  course: span(12, 20),
  sentence: span(20, 32),
  review: span(32, 44),
  lexicon: span(44, 50),
  sound: span(50, 58),
  local: span(58, 64),
  outro: span(64, 76),
} as const;

/** Frames the incoming shot takes to wipe in over the outgoing one. */
export const WIPE = 6;

export const TOTAL = T.outro.from + T.outro.duration;

/** Local frame (inside a shot) of a beat number counted from the film start. */
export const at = (shot: Span, beat: number): number => beatF(beat) - shot.from;
