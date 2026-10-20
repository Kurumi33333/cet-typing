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

    // Overlay scrollbar: the native one is hidden (it narrows the page), this
    // thumb floats above the content and follows / drives the real scroll.
    const track = document.createElement("div");
    track.className = "landing__scrollbar";
    track.setAttribute("aria-hidden", "true");
    const thumb = document.createElement("div");
    thumb.className = "landing__scrollbar-thumb";
    track.appendChild(thumb);
    scope.appendChild(track);

    const root = document.documentElement;
    let hideTimer = 0;
    const geometry = () => {
      const view = window.innerHeight;
      const total = root.scrollHeight;
      const room = track.clientHeight;
      const size = Math.max(44, (view / total) * room);
      return { view, total, room, size, travel: room - size, max: total - view };
    };
    const sync = () => {
      const g = geometry();
      track.classList.toggle("is-idle-hidden", g.max <= 1);
      thumb.style.height = `${g.size}px`;
      thumb.style.transform = `translateY(${g.max > 0 ? (window.scrollY / g.max) * g.travel : 0}px)`;
    };
    const wake = () => {
      track.classList.add("is-awake");
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (!track.classList.contains("is-dragging")) track.classList.remove("is-awake");
      }, 900);
    };
    const onScroll = () => { sync(); wake(); };

    let dragFrom: { y: number; scroll: number } | null = null;
    const scrollTo = (y: number) => {
      if (lenis) lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
    };
    const onDown = (event: PointerEvent) => {
      event.preventDefault();
      const g = geometry();
      const rect = thumb.getBoundingClientRect();
      if (event.target !== thumb) {
        // Click on the track: centre the thumb on the pointer.
        const top = event.clientY - track.getBoundingClientRect().top - g.size / 2;
        scrollTo(Math.min(g.max, Math.max(0, (top / g.travel) * g.max)));
      }
      dragFrom = { y: event.clientY, scroll: window.scrollY };
      void rect;
      track.setPointerCapture(event.pointerId);
      track.classList.add("is-dragging", "is-awake");
    };
    const onMove = (event: PointerEvent) => {
      if (!dragFrom) return;
      const g = geometry();
      scrollTo(Math.min(g.max, Math.max(0, dragFrom.scroll + ((event.clientY - dragFrom.y) / g.travel) * g.max)));
    };
    const onUp = (event: PointerEvent) => {
      if (!dragFrom) return;
      dragFrom = null;
      track.releasePointerCapture(event.pointerId);
      track.classList.remove("is-dragging");
      wake();
    };
    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sync);
    const resizer = new ResizeObserver(sync);
    resizer.observe(root);
    sync();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", sync);
      resizer.disconnect();
      window.clearTimeout(hideTimer);
      track.remove();
      ctx.revert();
      if (tick) gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis?.destroy();
    };
  }, [scopeRef]);
}
