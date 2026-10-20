import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/**
 * The landing page is an ordinary document: the wheel is eased by Lenis (the
 * real scroll position still drives everything), but there is no paging, no
 * snapping and no pinned screen. Touch and reduced motion keep native scrolling.
 * This hook also adds the thin reading-progress bar (scrubbed
 * to the real scroll position, so it runs backwards when the reader does) and
 * keeps the section nav's current link in step.
 */
export function useLandingScroll(scopeRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, anchors: { offset: -64 } });
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

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

    return () => {
      ctx.revert();
      if (tick) gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis?.destroy();
    };
  }, [scopeRef]);
}
