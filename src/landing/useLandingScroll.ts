import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * The landing page is an ordinary document: native scrolling, no paging, no
 * pinned screens. This hook only adds the thin reading-progress bar (scrubbed
 * to the real scroll position, so it runs backwards when the reader does) and
 * keeps the section nav's current link in step.
 */
export function useLandingScroll(scopeRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    const ctx = gsap.context(() => {
      const bar = scope.querySelector<HTMLElement>(".landing__progress");
      if (bar) {
        gsap.set(bar, { scaleX: 0, transformOrigin: "0 50%" });
        gsap.to(bar, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: scope, start: "top top", end: "bottom bottom", scrub: 0.2 },
        });
      }

      const links = new Map(
        gsap.utils.toArray<HTMLAnchorElement>(".landing__links a", scope)
          .map((link) => [link.getAttribute("href")?.slice(1) ?? "", link] as const),
      );
      for (const [id, link] of links) {
        const target = id ? scope.querySelector<HTMLElement>(`#${id}`) : null;
        if (!target) continue;
        ScrollTrigger.create({
          trigger: target,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => link.classList.toggle("is-current", self.isActive),
        });
      }
    }, scope);

    return () => ctx.revert();
  }, [scopeRef]);
}
