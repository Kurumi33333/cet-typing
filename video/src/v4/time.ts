import { beatF } from '../beat';

/** Film 4 · one continuous world, six chapters, three hits. All times in beats. */
export const B4 = {
  slam1: 4,
  /** short sentence: word i completes on these beats */
  shortDone: [6, 7, 8],
  longStart: 12,
  longDone: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
  typoIndex: 4,
  fixBeat: 25,
  travel1: 28,
  courseIn: 32,
  travel2: 38,
  slam2: 42,
  travel3: 48,
  lexIn: 52,
  zoomOut: 57,
  slam3: 60,
  end: 68,
} as const;

export const TOTAL4 = beatF(B4.end);
