// capture-lexicon.mjs — the reference-vocabulary screen, in a POPULATED state.
//
// Why this screen: the film only ever showed the practice page, and the practice
// page is mostly white space by design. Measured visual density was 3.0% of
// pixels carrying detail (a "rich" frame runs 18-35%), which is why camera moves
// had nothing to move against and read as static.
//
// The lexicon at rest is equally empty (an empty search box and one line of
// copy). Driven into a real query it becomes the densest, most concrete screen
// in the product: real entries, real parts of speech, real definitions, real
// page count. That is what the film was missing.
//
// Data policy: this is the product's own public vocabulary (KyleBing/english-
// vocabulary, BSD-3-Clause, attributed on the page itself). The query "edu" is a
// neutral substring chosen for its mix of real entries; nothing is fabricated.

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.CET_PROMO_BASE ?? 'http://127.0.0.1:5199';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'textures', 'live');

const VIEW_W = 1440;
const VIEW_H = 900;
const SCALE = 4;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const page = await (async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--hide-scrollbars', '--font-render-hinting=none', '--force-color-profile=srgb', '--disable-lcd-text'],
  });
  const p = await browser.newPage();
  await p.setViewport({ width: VIEW_W, height: VIEW_H, deviceScaleFactor: SCALE });
  await p.goto(`${BASE}/lexicon/cet4`, { waitUntil: 'networkidle0', timeout: 30000 });
  await wait(900);

  const input = await p.$('input[type="search"], input[type="text"], input');
  if (!input) throw new Error('no search input on the lexicon page');
  await input.click();
  await input.type('edu', { delay: 70 });
  await wait(1500);

  const count = await p.evaluate(() => document.querySelectorAll('li, article, [class*="entry"]').length);
  console.log(`lexicon: ${count} entry-ish nodes after the query`);

  // full viewport, 4x
  const shot = await p.screenshot({ encoding: 'binary' });
  fs.writeFileSync(path.join(OUT, 'lexicon-full-4x.png'), shot);

  // element-level crops, so the film can place real pieces with real layout
  const boxes = await p.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    const list = document.querySelector('ul, ol, [class*="list"]');
    const lr = list?.getBoundingClientRect();
    return {
      title: pick('h1'),
      search: pick('input'),
      list: lr ? { x: lr.x, y: lr.y, w: lr.width, h: lr.height } : null,
      pageH: document.body.scrollHeight,
    };
  });
  console.log('lexicon layout', JSON.stringify(boxes));
  fs.writeFileSync(path.join(ROOT, 'src', 'lexicon-layout.json'), JSON.stringify({ view: { w: VIEW_W, h: VIEW_H, scale: SCALE }, ...boxes }, null, 1));

  // the entry list only, as its own texture (this is the dense part)
  if (boxes.list) {
    const el = await p.$('ul, ol, [class*="list"]');
    if (el) {
      await el.screenshot({ path: path.join(OUT, 'lexicon-list-4x.png') }).catch(() => {});
    }
  }

  await browser.close();
})();

void page;
