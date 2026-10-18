import { useEffect } from "react";

/**
 * The hero strip's clip is decoration: muted, looping, no controls. Under
 * reduced motion it must stop and show its poster, both on load and if the
 * media query flips while the page is open (references/imagery.md §11).
 */
const SELECTOR = "video[data-clip]";

function sync() {
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
  for (const node of document.querySelectorAll<HTMLVideoElement>(SELECTOR)) {
    if (calm.matches) {
      node.removeAttribute("autoplay");
      node.pause();
      node.load();
    } else {
      void node.play().catch(() => {});
    }
  }
}

export function useClipCalm() {
  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    sync();
    calm.addEventListener("change", sync);
    return () => calm.removeEventListener("change", sync);
  }, []);
}
