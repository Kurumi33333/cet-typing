import { useEffect } from "react";
import { landingSound } from "./landingSound";

/**
 * One delegated listener set for the whole landing page, so every control gets
 * a hover tick and a press sound without wiring each element. The live practice
 * card has its own key sounds and is left alone.
 */
const HOVER = "a, button, summary, .source__proof, .spacing__step, .stats__item, .how__level";

export function useLandingSound(scopeRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    let last: Element | null = null;
    let index = 0;

    const inCard = (el: Element | null) => Boolean(el?.closest(".try__card"));

    const onOver = (event: PointerEvent) => {
      if (!fine.matches) return;
      const el = (event.target as Element | null)?.closest(HOVER) ?? null;
      if (!el || el === last || inCard(el)) {
        if (!el) last = null;
        return;
      }
      last = el;
      landingSound.hover(index++);
    };
    const onDown = (event: PointerEvent) => {
      const el = event.target as Element | null;
      if (!el || inCard(el)) return;
      const target = el.closest("a, button, summary");
      if (!target) return;
      if (target.closest(".landing__links")) landingSound.whoosh();
      else if (target.classList.contains("btn--solid") || target.classList.contains("landing__nav-action")) landingSound.start();
      else if (target.tagName !== "SUMMARY" && !target.hasAttribute("data-silent")) landingSound.click();
    };
    const onToggle = (event: Event) => {
      const details = event.target as HTMLDetailsElement;
      if (details?.classList?.contains("faq__item")) landingSound.toggle(details.open);
    };

    scope.addEventListener("pointerover", onOver);
    scope.addEventListener("pointerdown", onDown);
    scope.addEventListener("toggle", onToggle, true);
    return () => {
      scope.removeEventListener("pointerover", onOver);
      scope.removeEventListener("pointerdown", onDown);
      scope.removeEventListener("toggle", onToggle, true);
    };
  }, [scopeRef]);
}
