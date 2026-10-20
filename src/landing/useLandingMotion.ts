import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { landingSound } from "./landingSound";

gsap.registerPlugin(ScrollTrigger);

/**
 * Every reveal on the landing page is reversible: scrolling back above a
 * section plays its timeline backwards, so nothing is "used up" after one pass.
 *
 * Content is already in its finished state in the markup; GSAP only sets the
 * hidden state when motion is allowed, so reduced motion (or a failed script)
 * leaves a complete static page.
 */
export function useLandingMotion(scopeRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>("[data-panel]", scope);

      panels.forEach((panel, index) => {
        const parts = gsap.utils.toArray<HTMLElement>("[data-rise], [data-reveal]", panel);
        if (!parts.length) return;
        const timeline = gsap.timeline({ paused: true, defaults: { ease: "power3.out", duration: 0.85 } });
        timeline.fromTo(parts, { opacity: 0, y: 34 }, { opacity: 1, y: 0, stagger: 0.09 });
        if (index === 0) {
          timeline.play();
          return;
        }
        gsap.set(parts, { opacity: 0, y: 34 });
        ScrollTrigger.create({
          trigger: panel,
          start: "top 78%",
          onEnter: () => { timeline.play(); landingSound.enter(index); },
          onLeaveBack: () => { timeline.reverse(); landingSound.leave(index); },
        });
      });

      // The hero photograph opens from its frame.
      const frame = scope.querySelector<HTMLElement>(".hero__frame");
      if (frame) {
        gsap.fromTo(frame, { clipPath: "inset(0 100% 0 0)" }, {
          clipPath: "inset(0 0% 0 0)", duration: 1.15, ease: "power3.inOut", delay: 0.1,
        });
      }

      // Bars grow from their real proportions; scrolling back retracts them.
      const bars = gsap.utils.toArray<HTMLElement>(".how__bar", scope);
      const steps = scope.querySelector(".how__steps");
      if (steps && bars.length) {
        const grow = gsap.timeline({ paused: true });
        grow.fromTo(bars, { scaleX: 0, transformOrigin: "0 50%" }, {
          scaleX: 1, duration: 0.9, ease: "power3.out", stagger: 0.08,
        });
        gsap.set(bars, { scaleX: 0, transformOrigin: "0 50%" });
        ScrollTrigger.create({
          trigger: steps,
          start: "top 80%",
          onEnter: () => { grow.play(); landingSound.sweep(); },
          onLeaveBack: () => grow.reverse(),
        });
      }

      // Counters in the stats band tick up on arrival and back down on leaving.
      const counters = gsap.utils.toArray<HTMLElement>("[data-count]", scope);
      if (counters.length) {
        const run = gsap.timeline({ paused: true, onComplete: () => { if (!run.reversed()) landingSound.settle(); } });
        counters.forEach((node) => {
          const to = Number(node.dataset.count);
          const state = { value: 0 };
          node.textContent = "0";
          run.to(state, {
            value: to,
            duration: 1.4,
            ease: "power2.out",
            onUpdate: () => {
              node.textContent = Math.round(state.value).toLocaleString("zh-CN");
              if (!run.reversed() && run.isActive()) landingSound.count(state.value / to);
            },
          }, 0);
        });
        const band = counters[0].closest("section") ?? counters[0];
        ScrollTrigger.create({
          trigger: band,
          start: "top 80%",
          onEnter: () => run.play(),
          onLeaveBack: () => run.reverse(),
        });
      }

      // Slow parallax drift on the archive photographs, tied to the scroll.
      gsap.utils.toArray<HTMLElement>(".source__proof img", scope).forEach((img, index) => {
        gsap.fromTo(img, { yPercent: index % 2 === 0 ? -3 : 3 }, {
          yPercent: index % 2 === 0 ? 3 : -3,
          ease: "none",
          scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: true },
        });
      });

      // The hero film eases out of a rounded inset as it scrolls into view.
      const film = scope.querySelector<HTMLElement>(".hero__filmwrap");
      if (film) {
        gsap.fromTo(film, { scale: 0.92, borderRadius: 36 }, {
          scale: 1, borderRadius: 0, ease: "none",
          scrollTrigger: { trigger: film, start: "top bottom", end: "top 35%", scrub: true },
        });
      }

      ScrollTrigger.refresh();
    }, scope);

    return () => ctx.revert();
  }, [scopeRef]);
}
