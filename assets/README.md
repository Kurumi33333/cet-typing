# `assets/` — source media for the landing page

The binaries in this folder are **not committed** (see `.gitignore`): they are
archive scans and footage, about 4.5 MB together, and every one is reproducible
from its source page. What is committed is the record that makes that possible:

- **`credits.json`** — for each file: the Wikimedia Commons page, the creator,
  the licence and its URL, the original resolution, and the credit line the site
  must display. Treat it as the source of truth for attribution.
- **`../public/landing/`** — the cropped, resized files the site actually serves.
  These **are** committed, so a fresh clone builds and renders correctly without
  re-downloading anything.
- **`../public/landing/credits.md`** — the same attribution in the form the page
  footer uses.

## Rebuilding the served crops

`scripts/prepare-landing-assets.py` performs the crops with Pillow. It reads the
source files from this folder by name; the boxes are proportions, so a
re-downloaded file at a different pixel size still crops the same region.

```bash
# 1. download the sources (needs the 21st/tasteskill asset helper, or fetch the
#    `page`/`image` URLs in credits.json by hand), keeping the file names:
#    chinese-typewriter.jpg, geography-class-in-the-affiliated-high-school.jpg,
#    writing-and-drawing-made-easy-amusing-and.jpg,
#    an-analytical-chinese-english-dictionary-1900-14597036350.jpg,
#    remington-typewriter-1907-02.jpg,
#    typewriter-optima-m12-typing.webm + typewriter-optima-m12-typing-poster.jpg
# 2. regenerate the crops
python -m pip install pillow
python scripts/prepare-landing-assets.py
```

The script also re-derives `typing-poster.jpg` and copies the clip into
`public/landing/`.

## Why the sources are kept instead of hotlinked

Wikimedia Commons permits hotlinking, but a landmark page should not break when
an archive reorganises its thumbnails, and the CC BY-SA files must keep their
licence reachable. The site serves its own copies, and the footer credits name
every picture and clip.
