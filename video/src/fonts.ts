import { staticFile } from 'remotion';

/**
 * The film's fonts, loaded from public/fonts/ (subset woff2, built by
 * scripts/prepare-fonts.py). Remotion waits for document.fonts.ready before
 * each frame, so a missing @font-face would silently fall back — keep the
 * weights in sync with what the scenes ask for.
 */
const FONT_CSS = `
@font-face {
  font-family: "Noto Serif SC";
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url("${staticFile('fonts/noto-serif-sc-500.woff2')}") format("woff2");
}
@font-face {
  font-family: "Noto Serif SC";
  font-style: normal;
  font-weight: 600;
  font-display: block;
  src: url("${staticFile('fonts/noto-serif-sc-600.woff2')}") format("woff2");
}
@font-face {
  font-family: "Noto Sans SC";
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url("${staticFile('fonts/noto-sans-sc-400.woff2')}") format("woff2");
}
@font-face {
  font-family: "Noto Sans SC";
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url("${staticFile('fonts/noto-sans-sc-500.woff2')}") format("woff2");
}
@font-face {
  font-family: "EB Garamond";
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url("${staticFile('fonts/eb-garamond-400-normal.woff2')}") format("woff2");
}
@font-face {
  font-family: "EB Garamond";
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url("${staticFile('fonts/eb-garamond-500-normal.woff2')}") format("woff2");
}
@font-face {
  font-family: "EB Garamond";
  font-style: italic;
  font-weight: 400;
  font-display: block;
  src: url("${staticFile('fonts/eb-garamond-400-italic.woff2')}") format("woff2");
}
@font-face {
  font-family: "Noto Sans SC";
  font-style: normal;
  font-weight: 700;
  font-display: block;
  src: url("${staticFile('fonts/noto-sans-sc-700.woff2')}") format("woff2");
}
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url("${staticFile('fonts/inter-400.woff2')}") format("woff2");
}
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url("${staticFile('fonts/inter-500.woff2')}") format("woff2");
}
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 600;
  font-display: block;
  src: url("${staticFile('fonts/inter-600.woff2')}") format("woff2");
}
`;

let injected = false;

/** Injects the faces once per renderer page. Idempotent. */
export function installFonts(): void {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const style = document.createElement('style');
  style.setAttribute('data-cet-promo-fonts', '1');
  style.textContent = FONT_CSS;
  document.head.appendChild(style);
}
