// capture-practice.mjs — hi-res capture of the REAL practice stage.
//
// The practice stage is 850 CSS px wide with 22px word slots. The film pushes
// into it, so the plain 2x whole-page texture would blur under the move. Per the
// quality rule (fix the texture chain first, not the camera), the same DOM is
// captured a second time with `deviceScaleFactor: 4` — no CSS is touched, no
// layout is modified, Chromium simply rasterizes the glyphs at 4x.
//
// Emits, per state, under public/textures/live/:
//   practice-<state>-full.png    page at 2x  (wide shots; page coordinates)
//   practice-<state>-stage.png   stage at 4x (close-ups; element-local coords)
// and src/practice-layout.json with boxes in BOTH coordinate spaces.
//
// Usage: node scripts/capture-practice.mjs

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.CET_PROMO_BASE ?? 'http://127.0.0.1:5199';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const OUT = path.join(root, 'public', 'textures', 'live');
const LAYOUT = path.join(root, 'src', 'practice-layout.json');
fs.mkdirSync(OUT, { recursive: true });

const STATES = [
  { name: 'short', lesson: 'cet4-01', exercise: 'cet4-01-05' },
  { name: 'long', lesson: 'cet4-08', exercise: 'cet4-08-05' },
];

const launch = (dsf) => puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--force-color-profile=srgb', '--disable-lcd-text'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: dsf },
});

const seed = (page, lesson, exercise) =>
  page.evaluate((l, e) => new Promise((resolve, reject) => {
    const req = indexedDB.open('cet-typing-study');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('progress', 'readwrite');
      tx.objectStore('progress').put({ level: 'CET4', lessonId: l, exerciseId: e, updatedAt: 1_700_000_000_000 });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  }), lesson, exercise);

async function openState(browser, st) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/app/cet4?fresh=1`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await seed(page, st.lesson, st.exercise);
  await page.goto(`${BASE}/app/cet4`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 1400));
  await page.addStyleTag({ content: '*{animation-play-state:paused!important;}' });
  return page;
}

const relBox = (page, hostSel, sel) =>
  page.evaluate((h, s) => {
    const host = document.querySelector(h);
    const el = document.querySelector(s);
    if (!host || !el) return null;
    const hr = host.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: Math.round((r.x - hr.x) * 100) / 100, y: Math.round((r.y - hr.y) * 100) / 100,
      w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100,
    };
  }, hostSel, sel);

const relChildren = (page, hostSel, sel) =>
  page.evaluate((h, s) => {
    const host = document.querySelector(h);
    if (!host) return [];
    const hr = host.getBoundingClientRect();
    return [...host.querySelectorAll(s)].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: Math.round((r.x - hr.x) * 100) / 100, y: Math.round((r.y - hr.y) * 100) / 100,
        w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100,
        text: (el.textContent ?? '').trim(),
      };
    });
  }, hostSel, sel);

const promptOf = (page) => page.evaluate(() => ({
  chinese: document.querySelector('.chinese-sentence')?.textContent?.trim() ?? '',
  eyebrow: document.querySelector('.centered-practice .eyebrow')?.textContent?.trim() ?? '',
  counter: document.querySelector('.question-counter')?.textContent?.trim() ?? '',
  lesson: document.querySelector('.lesson-toggle')?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
}));

const styleSnapshot = (page) => page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      fontFamily: cs.fontFamily, fontSize: parseFloat(cs.fontSize), fontWeight: cs.fontWeight,
      letterSpacing: cs.letterSpacing, lineHeight: parseFloat(cs.lineHeight), color: cs.color,
      borderBottomColor: cs.borderBottomColor, borderBottomWidth: parseFloat(cs.borderBottomWidth),
    };
  };
  const chip = document.createElement('span');
  document.querySelector('.slot-list')?.appendChild(chip);
  const palette = {};
  for (const [k, cls] of Object.entries({
    idle: 'slot-word slot-idle', active: 'slot-word slot-active',
    correct: 'slot-word slot-correct', wrong: 'slot-word slot-incorrect',
  })) {
    chip.className = cls;
    const cs = getComputedStyle(chip);
    palette[k] = { color: cs.color, border: cs.borderBottomColor };
  }
  chip.remove();
  return { chinese: pick('.chinese-sentence'), slot: pick('.slot-word'), palette };
});

const pageBoxes = (page) => page.evaluate(() => {
  const b = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x * 100) / 100, y: Math.round(r.y * 100) / 100,
      w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100,
    };
  };
  return {
    header: b('.site-header'), topbar: b('.practice-topline'), progress: b('.progress-track'),
    progressFill: b('.progress-fill'), lesson: b('.lesson-navigation'),
    eyebrow: b('.centered-practice .eyebrow'), chinese: b('.chinese-sentence'),
    stage: b('.slot-stage'), slots: b('.slot-list'), feedback: b('.slot-feedback'),
    actions: b('.slot-actions'), centered: b('.centered-practice'),
  };
});

const result = { stageScale: 4, states: {} };

for (const st of STATES) {
  // ---------- A. wide shot: whole page at 2x ----------
  const wideBrowser = await launch(2);
  const wide = await openState(wideBrowser, st);
  await wide.screenshot({ path: path.join(OUT, `practice-${st.name}-full.png`) });

  const entry = {
    prompt: await promptOf(wide),
    page: await pageBoxes(wide),
    styles: await styleSnapshot(wide),
  };
  await wideBrowser.close();

  // ---------- B. close shot: the stage element at 4x ----------
  const nearBrowser = await launch(4);
  const near = await openState(nearBrowser, st);
  const host = await near.$('.centered-practice');
  if (!host) throw new Error('.centered-practice missing');
  await host.screenshot({ path: path.join(OUT, `practice-${st.name}-stage.png`) });

  entry.stage = {
    boxes: {
      eyebrow: await relBox(near, '.centered-practice', '.eyebrow'),
      chinese: await relBox(near, '.centered-practice', '.chinese-sentence'),
      slotStage: await relBox(near, '.centered-practice', '.slot-stage'),
      slots: await relBox(near, '.centered-practice', '.slot-list'),
      feedback: await relBox(near, '.centered-practice', '.slot-feedback'),
    },
    slotUnits: await relChildren(near, '.centered-practice', '.slot-unit'),
    host: await relBox(near, '.page-shell', '.centered-practice'),
  };
  await nearBrowser.close();

  result.states[st.name] = entry;
  console.log(
    `practice-${st.name}: "${entry.prompt.chinese}"`,
    `slots=${entry.stage.slotUnits.length}`,
    `stage=${Math.round(entry.stage.boxes.slots.w)}x${Math.round(entry.stage.boxes.slots.h)}`,
    `chinese=${entry.styles.chinese.fontSize}px slot=${entry.styles.slot.fontSize}px`,
  );
}

fs.writeFileSync(LAYOUT, JSON.stringify(result, null, 1));
console.log('wrote', LAYOUT);
