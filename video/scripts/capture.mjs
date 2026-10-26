// capture.mjs — turn the real CET Typing pages into film assets.
//
// One pass, every texture the film needs, all from the running product:
//
//   landing-full.png         whole landing page @2x      (page coordinates)
//   how-4x.png               the #how section          @4x (section coordinates)
//   how-4x-empty.png         the same section with the ladder bars hidden, so
//                            the three rows can fly in and embed in real slots
//   how-bar-<n>.png          the six real ladder bars   @4x (cropped, padded)
//   ui-stats.png             the stats band             @2x
//   ui-spacing-panel.png     the real "到期复习" panel   @2x
//   practice-<s>-full.png    practice page              @2x
//   practice-<s>-stage.png   practice stage             @4x
//   practice-<s>-band.png    the stage's content band   @4x (close-up plate)
//
// Data policy: the product only ever holds its own public demo content.
// The practice page is driven into the exact curriculum position the film
// needs by writing the app's own progress record, never by faking the UI.
//
// Usage: node scripts/capture.mjs [--only=landing,practice]

import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.CET_PROMO_BASE ?? 'http://127.0.0.1:5199';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const OUT = path.join(root, 'public', 'textures', 'live');
const LAYOUT = path.join(root, 'src', 'live-layout.json');
fs.mkdirSync(OUT, { recursive: true });

const only = (() => {
  const arg = process.argv.find((a) => a.startsWith('--only='));
  return arg ? new Set(arg.slice(7).split(',')) : null;
})();
const want = (name) => !only || only.has(name);

const launch = (dsf) => puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--force-color-profile=srgb', '--disable-lcd-text'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: dsf },
});

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Crop in DEVICE pixels from a PNG. */
function cropDevice(src, dst, x, y, w, h) {
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', src,
    '-vf', `crop=${Math.round(w)}:${Math.round(h)}:${Math.round(x)}:${Math.round(y)}`,
    dst,
  ]);
}

/**
 * Warm every scroll reveal, then STAY at the bottom to take the shot: the
 * landing page reverses its reveals when scrolled back up, so leaving the
 * bottom would photograph the pre-reveal state (counters at zero).
 */
async function warmAndShootBottom(page, outFile) {
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /静音进入/.test(b.textContent ?? ''));
    btn?.click();
  });
  await pause(1400);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.55;
    const end = document.documentElement.scrollHeight;
    for (let y = 0; y <= end; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 300));
    }
    window.scrollTo(0, end);
    await new Promise((r) => setTimeout(r, 1300));
  });
  await page.addStyleTag({ content: '*{animation-play-state:paused!important;transition:none!important;}' });
  await pause(400);
  await page.screenshot({ path: outFile, fullPage: true, captureBeyondViewport: true });
}

// The landing pass writes live-layout.json; the practice pass must not clobber
// it, so it merges into whatever is already on disk instead of starting blank.
const layout = fs.existsSync(LAYOUT)
  ? JSON.parse(fs.readFileSync(LAYOUT, 'utf8'))
  : { pageW: 1920, viewportH: 1080, scale: 2 };

// ============================================================== landing =====
if (want('landing')) {
  const browser = await launch(2);
  const page = await browser.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  await warmAndShootBottom(page, path.join(OUT, 'landing-full.png'));
  const pageH = await page.evaluate(() => document.documentElement.scrollHeight);
  layout.landing = { pageH };
  console.log('landing-full', pageH);

  const boxes = await page.evaluate(() => {
    const b = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round((r.x + window.scrollX) * 100) / 100,
        y: Math.round((r.y + window.scrollY) * 100) / 100,
        w: Math.round(r.width * 100) / 100,
        h: Math.round(r.height * 100) / 100,
      };
    };
    return {
      nav: b('.landing__nav'), hero: b('.hero'), heroTitle: b('.hero__stage'),
      typer: b('.typer'), ticker: b('.ticker'), stats: b('.stats'),
      how: b('.how'), howTitle: b('.how .statement'), howLead: b('.how .lead'),
      howSteps: b('.how__steps'), howAside: b('.how__aside'),
      spacing: b('.spacing'), spacingPanel: b('.spacing__panel'),
      facts: b('.facts'), closing: b('.closing'), tryCard: b('.try__card'),
    };
  });
  layout.landing.boxes = boxes;

  // ---- the ladder bars: coordinates inside .how, and their real labels ----
  layout.landing.howBars = await page.evaluate(() => {
    const how = document.querySelector('.how');
    const hr = how.getBoundingClientRect();
    return [...how.querySelectorAll('.how__bar')].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: Math.round((r.x - hr.x) * 100) / 100,
        y: Math.round((r.y - hr.y) * 100) / 100,
        w: Math.round(r.width * 100) / 100,
        h: Math.round(r.height * 100) / 100,
        text: (el.textContent ?? '').trim(),
        share: getComputedStyle(el).getPropertyValue('--share').trim(),
      };
    });
  });
  layout.landing.howLevels = await page.evaluate(() => {
    const how = document.querySelector('.how');
    const hr = how.getBoundingClientRect();
    return [...how.querySelectorAll('.how__level')].map((el) => {
      const r = el.getBoundingClientRect();
      const head = el.querySelector('.how__level-head')?.textContent?.trim().replace(/\s+/g, ' ');
      return {
        x: Math.round((r.x - hr.x) * 100) / 100,
        y: Math.round((r.y - hr.y) * 100) / 100,
        w: Math.round(r.width * 100) / 100,
        h: Math.round(r.height * 100) / 100,
        head,
      };
    });
  });
  console.log('howBars', layout.landing.howBars.length);
  await browser.close();

  // ---- 4x capture of just the #how section, normal and empty ----
  const hiBrowser = await launch(4);
  const hi = await hiBrowser.newPage();
  await hi.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
  await warmAndShootBottom(hi, path.join(OUT, '_warm-sink.png'));
  const how = await hi.$('.how');
  if (!how) throw new Error('.how missing');
  await how.screenshot({ path: path.join(OUT, 'how-4x.png') });

  const howBox = await hi.evaluate(() => {
    const el = document.querySelector('.how');
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  layout.landing.howSize = howBox;
  console.log('how-4x', howBox.w, 'x', howBox.h, '->', howBox.w * 4, 'x', howBox.h * 4);

  // empty backplate + per-bar cutouts, all from the same 4x frame
  await hi.evaluate(() => {
    document.querySelectorAll('.how__bar').forEach((el) => { el.style.visibility = 'hidden'; });
  });
  await pause(300);
  await how.screenshot({ path: path.join(OUT, 'how-4x-empty.png') });
  await hi.evaluate(() => {
    document.querySelectorAll('.how__bar').forEach((el) => { el.style.visibility = ''; });
  });
  await pause(200);

  for (let i = 0; i < layout.landing.howBars.length; i += 1) {
    const b = layout.landing.howBars[i];
    const pad = 6; // device px of bleed so the rounded corner survives
    cropDevice(
      path.join(OUT, 'how-4x.png'),
      path.join(OUT, `how-bar-${i + 1}.png`),
      b.x * 4 - pad, b.y * 4 - pad, b.w * 4 + pad * 2, b.h * 4 + pad * 2,
    );
  }
  console.log('how-bar-1..', layout.landing.howBars.length);

  // ---- stats band + review panel, honest 2x crops of the same frame ----
  const frame = path.join(OUT, 'landing-full.png');
  cropDevice(frame, path.join(OUT, 'ui-stats.png'),
    boxes.stats.x * 2, boxes.stats.y * 2, boxes.stats.w * 2, boxes.stats.h * 2);
  cropDevice(frame, path.join(OUT, 'ui-spacing-panel.png'),
    boxes.spacingPanel.x * 2 - 8, boxes.spacingPanel.y * 2 - 8,
    boxes.spacingPanel.w * 2 + 16, boxes.spacingPanel.h * 2 + 16);
  fs.rmSync(path.join(OUT, '_warm-sink.png'), { force: true });
  await hiBrowser.close();
}

// ============================================================= practice =====
const STATES = [
  { name: 'short', lesson: 'cet4-01', exercise: 'cet4-01-05' },
  { name: 'long', lesson: 'cet4-08', exercise: 'cet4-08-05' },
];

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

async function openPractice(browser, st) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/app/cet4?fresh=1`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await seed(page, st.lesson, st.exercise);
  await page.goto(`${BASE}/app/cet4`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await pause(1400);
  await page.addStyleTag({ content: '*{animation-play-state:paused!important;}' });
  return page;
}

const practiceLayout = { states: {} };

if (want('practice')) {
  for (const st of STATES) {
    const browser = await launch(2);
    const page = await openPractice(browser, st);
    await page.screenshot({ path: path.join(OUT, `practice-${st.name}-full.png`) });

    const entry = {
      prompt: await page.evaluate(() => ({
        chinese: document.querySelector('.chinese-sentence')?.textContent?.trim() ?? '',
        eyebrow: document.querySelector('.centered-practice .eyebrow')?.textContent?.trim() ?? '',
        counter: document.querySelector('.question-counter')?.textContent?.trim() ?? '',
        lesson: document.querySelector('.lesson-toggle')?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
      })),
      page: await page.evaluate(() => {
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
          centered: b('.centered-practice'), eyebrow: b('.centered-practice .eyebrow'),
          chinese: b('.chinese-sentence'), stage: b('.slot-stage'), slots: b('.slot-list'),
          feedback: b('.slot-feedback'), actions: b('.slot-actions'),
        };
      }),
      styles: await page.evaluate(() => {
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
      }),
    };
    await browser.close();

    // ---- 4x stage pass: same DOM, four device pixels per CSS pixel ----
    const hiBrowser = await launch(4);
    const hi = await openPractice(hiBrowser, st);
    const host = await hi.$('.centered-practice');
    if (!host) throw new Error('.centered-practice missing');
    await host.screenshot({ path: path.join(OUT, `practice-${st.name}-stage.png`) });

    entry.stage = await hi.evaluate(() => {
      const hostEl = document.querySelector('.centered-practice');
      const hr = hostEl.getBoundingClientRect();
      const rel = (sel) => {
        const el = hostEl.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round((r.x - hr.x) * 100) / 100, y: Math.round((r.y - hr.y) * 100) / 100,
          w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100,
        };
      };
      return {
        w: Math.round(hr.width * 100) / 100,
        h: Math.round(hr.height * 100) / 100,
        boxes: {
          eyebrow: rel('.eyebrow'), chinese: rel('.chinese-sentence'),
          slotStage: rel('.slot-stage'), slots: rel('.slot-list'), feedback: rel('.slot-feedback'),
        },
        slotUnits: [...hostEl.querySelectorAll('.slot-unit')].map((el) => {
          const r = el.getBoundingClientRect();
          return {
            x: Math.round((r.x - hr.x) * 100) / 100, y: Math.round((r.y - hr.y) * 100) / 100,
            w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100,
            text: (el.textContent ?? '').trim(),
          };
        }),
      };
    });
    // ---- clean plate: hide the slot row and shoot the SAME stage again ----
    // Must happen while this page is still open (it is closed below). The film
    // redraws the slots, so it needs page pixels with no slot rules in them —
    // hiding the row beats painting a rectangle over it.
    await hi.evaluate(() => {
      const stage = document.querySelector('.centered-practice .slot-stage');
      if (stage) stage.style.visibility = 'hidden';
    });
    await new Promise((r) => setTimeout(r, 250));
    const hostClean = await hi.$('.centered-practice');
    if (!hostClean) throw new Error('.centered-practice missing (clean plate)');
    await hostClean.screenshot({ path: path.join(OUT, `practice-${st.name}-stage-clean.png`) });
    await hiBrowser.close();

    // ---- the content band: crop the 4x stage to the part the film frames ----
    // Band = from just above the eyebrow to just below the slot rules.

    // No horizontal trim: the last slot (the full stop) ends at x=843 of an
    // 850px stage, so any inset clips it. The scrollbar strip is handled by
    // hiding the scrollbar in the page instead (see openPractice).
    const EDGE = 0;
    const boxes4 = entry.stage.boxes;
    const bandTop = Math.max(0, boxes4.eyebrow.y - 26);
    const bandBottom = Math.min(entry.stage.h, boxes4.slotStage.y + boxes4.slotStage.h + 12);
    entry.band = {
      x: EDGE, y: bandTop, w: entry.stage.w - EDGE * 2, h: bandBottom - bandTop,
    };
    cropDevice(
      path.join(OUT, `practice-${st.name}-stage.png`),
      path.join(OUT, `practice-${st.name}-band.png`),
      EDGE * 4, bandTop * 4, entry.band.w * 4, entry.band.h * 4,
    );

    // ---- a SECOND exposure of the same band with the slot row hidden ----
    // The film re-draws the slots (they have to change colour per word, which a
    // screenshot cannot do). Painting a paper-coloured rectangle over them left
    // a visibly lighter, hard-edged slab — a hand-drawn box inside a real-page
    // shot. Instead the slots are hidden in the DOM and the band is captured
    // again, so the film draws on genuinely empty page, in the page's own pixels.
    cropDevice(
      path.join(OUT, `practice-${st.name}-stage-clean.png`),
      path.join(OUT, `practice-${st.name}-band-clean.png`),
      EDGE * 4, bandTop * 4, entry.band.w * 4, entry.band.h * 4,
    );

    // band-relative coordinates (what the film actually draws against)
    const toBand = (b) => (b ? {
      ...b,
      x: Math.round((b.x - EDGE) * 100) / 100,
      y: Math.round((b.y - bandTop) * 100) / 100,
    } : null);
    entry.bandBoxes = {
      eyebrow: toBand(boxes4.eyebrow),
      chinese: toBand(boxes4.chinese),
      slotStage: toBand(boxes4.slotStage),
      slots: toBand(boxes4.slots),
    };
    entry.bandSlots = entry.stage.slotUnits.map((s) => toBand(s));

    practiceLayout.states[st.name] = entry;
    console.log(
      `practice-${st.name}: "${entry.prompt.chinese}"`,
      `slots=${entry.stage.slotUnits.length}`,
      `band=${Math.round(entry.band.w)}x${Math.round(entry.band.h)}`,
    );
  }
  fs.writeFileSync(
    path.join(root, 'src', 'practice-layout.json'),
    JSON.stringify(practiceLayout, null, 1),
  );
  console.log('wrote src/practice-layout.json');
}

fs.writeFileSync(LAYOUT, JSON.stringify(layout, null, 1));
console.log('wrote src/live-layout.json');
