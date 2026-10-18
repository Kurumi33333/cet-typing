import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * GSAP owns the landing page's motion.
 *
 * Each panel gets one trigger that plays a staggered timeline: in reading order
 * the heading, then the text, then the picture, then the controls. The macro
 * pieces (bars, photographs, the hero frame) get their own small timelines.
 *
 * Everything is inside `prefers-reduced-motion: no-preference` and the content
 * is already in its finished state in the markup: if the script fails, or the
 * visitor prefers reduced motion, the page is simply static and complete.
 */
export function useLandingMotion(scopeRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const ctx = gsap.context(() => {
      // One timeline per panel, staggered in reading order.
      for (const panel of gsap.utils.toArray<HTMLElement>("[data-panel]", scope)) {
        const parts = gsap.utils.toArray<HTMLElement>("[data-rise], [data-reveal]", panel);
        if (!parts.length) continue;
        gsap.set(parts, { opacity: 0, y: 28 });
        const timeline = gsap.timeline({
          paused: true,
          defaults: { ease: "power3.out", duration: 0.85 },
          onStart: () => {},
        });
        timeline.to(parts, { opacity: 1, y: 0, stagger: 0.085 });
        ScrollTrigger.create({
          trigger: panel,
          start: "top 76%",
          once: true,
          onEnter: () => timeline.play(),
        });
        // The first panel is already on screen at load: play it immediately.
        if (panel === gsap.utils.toArray<HTMLElement>("[data-panel]", scope)[0]) timeline.play();
      }

      // The hero photograph opens from its frame.
      const frame = scope.querySelector<HTMLElement>(".hero__frame");
      if (frame) {
        gsap.fromTo(frame, { clipPath: "inset(0 100% 0 0)" }, {
          clipPath: "inset(0 0% 0 0)", duration: 1.15, ease: "power3.inOut", delay: 0.1,
        });
      }

      // The bars grow from their real proportions as the section arrives.
      const steps = scope.querySelector(".how__steps");
      if (steps) {
        gsap.fromTo(scope.querySelectorAll(".how__bar"), { scaleX: 0, transformOrigin: "0 50%" }, {
          scaleX: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: steps, start: "top 80%", once: true },
        });
      }

      // A slow drift on the archive photographs, tied to the scroll.
      gsap.utils.toArray<HTMLElement>(".source__proof img", scope).forEach((img, index) => {
        gsap.fromTo(img, { yPercent: index % 2 === 0 ? -3 : 3 }, {
          yPercent: index % 2 === 0 ? 3 : -3,
          ease: "none",
          scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: true },
        });
      });

      ScrollTrigger.refresh();
    }, scope);

    return () => ctx.revert();
  }, [scopeRef]);
}
