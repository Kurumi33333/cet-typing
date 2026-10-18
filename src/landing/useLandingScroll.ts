import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

/**
 * Smooth scroll, one-screen-per-gesture paging, both driven by GSAP.
 *
 * The landing page is a deck: every `[data-panel]` is exactly one visible
 * viewport (`--panel-h`, measured from the visual viewport so phone browser
 * chrome never clips a screen). ScrollSmoother owns the easing and the content
 * transform; the page count decides the stops.
 *
 * Deliberately inert — native scrolling, no paging — on touch, narrow screens
 * and under `prefers-reduced-motion`: hijacking a phone's scrollbar costs
 * usability and buys nothing.
 */
const ENABLED_QUERY = "(min-width: 62rem) and (hover: hover) and (pointer: fine)";
const GESTURE_COOLDOWN_MS = 480;

interface ScrollApi {
  smoother: ScrollSmoother | null;
  triggers: ScrollTrigger[];
  offWheel: (() => void) | null;
  /** The page the deck is heading to; the smoother eases toward it. */
  page: number;
  lastGesture: number;
  /** Re-derives <body>'s height from the deck, after layout or a route return. */
  syncRange: (() => void) | null;
}

export function useLandingScroll(scopeRef: React.RefObject<HTMLElement | null>) {
  const api = useRef<ScrollApi>({
    smoother: null, triggers: [], offWheel: null, page: 0, lastGesture: 0, syncRange: null,
  });

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    const state = api.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia(ENABLED_QUERY);

    /** One panel is exactly the visible viewport, browser chrome included. */
    const setPanelHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      scope.style.setProperty("--panel-h", `${Math.round(height)}px`);
    };
    setPanelHeight();
    window.visualViewport?.addEventListener("resize", setPanelHeight);
    window.addEventListener("resize", setPanelHeight);

    const pageStep = () => {
      const panel = scope.querySelector<HTMLElement>("[data-panel]");
      return panel?.offsetHeight || window.innerHeight;
    };
    const pageCount = () => scope.querySelectorAll("[data-panel]").length;

    const stop = () => {
      document.documentElement.classList.remove("landing-smooth");
      state.offWheel?.();
      state.offWheel = null;
      state.triggers.forEach((trigger) => trigger.kill());
      state.triggers = [];
      state.smoother?.kill();
      state.smoother = null;
      state.syncRange = null;
    };

    const goToPage = (page: number) => {
      const smoother = state.smoother;
      if (!smoother) return;
      const last = pageCount() - 1;
      const clamped = Math.max(0, Math.min(last, page));
      if (clamped === state.page) return;
      state.page = clamped;
      smoother.scrollTo(clamped * pageStep(), true, "top top");
    };

    const start = () => {
      stop();
      if (reduce.matches || !wide.matches || pageCount() < 2) return;

      // ScrollSmoother reuses any `.ScrollSmoother-wrapper` it finds in the DOM.
      // After a client-side round trip that wrapper still carries the height it
      // measured while the app shell was mounted, so unwrap the deck first and
      // let the plugin build a fresh one around the real document.
      document.querySelectorAll(".ScrollSmoother-wrapper").forEach((wrapper) => {
        const parent = wrapper.parentNode;
        if (!parent) return;
        while (wrapper.firstChild) parent.insertBefore(wrapper.firstChild, wrapper);
        wrapper.remove();
      });

      // Open the scroll chain before the plugin measures.
      document.documentElement.classList.add("landing-smooth");
      void scope.offsetHeight;

      state.smoother = ScrollSmoother.create({
        smooth: 1.1,
        effects: false,
        normalizeScroll: false,
        smoothTouch: 0,
        speed: 1,
      });
      ScrollTrigger.refresh();
      // ScrollSmoother writes <body> height once, from whatever it could measure
      // at construction. A client-side return from /app constructs it while the
      // document still reports one viewport, so the scroll range would stay at
      // 900px. Re-derive it from the deck itself once layout exists.
      const syncScrollRange = () => {
        if (!state.smoother) return;
        const deck = scope.getBoundingClientRect().height;
        const viewport = window.visualViewport?.height ?? window.innerHeight;
        if (deck <= viewport) return;
        const wanted = `${Math.round(deck)}px`;
        // ScrollSmoother rewrites <body> height on every refresh from its
        // construction-time measurement, so re-assert it for a few frames
        // rather than once.
        if (document.body.style.height !== wanted) document.body.style.height = wanted;
      };
      syncScrollRange();
      // The plugin rewrites <body> height during its own refresh cycle, so keep
      // re-asserting until two consecutive checks agree, then stop.
      let stable = 0;
      let frames = 0;
      const pump = () => {
        const before = document.body.style.height;
        syncScrollRange();
        stable = document.body.style.height === before ? stable + 1 : 0;
        if (stable < 3 && frames++ < 90) window.requestAnimationFrame(pump);
      };
      window.requestAnimationFrame(pump);
      void document.fonts?.ready.then(() => {
        syncScrollRange();
        ScrollTrigger.refresh();
      });
      state.syncRange = syncScrollRange;

      state.triggers = gsap.utils.toArray<HTMLElement>("[data-panel]", scope).map((panel) =>
        ScrollTrigger.create({
          trigger: panel,
          start: "top top",
          end: "bottom top",
          onToggle: (self) => panel.classList.toggle("is-current", self.isActive),
        }),
      );

      document.documentElement.classList.add("landing-smooth");

      // With the document overflow hidden there is no native scroller for a
      // wheel to land on, so a gesture pages the deck by exactly one screen.
      // A touchpad keeps firing after the fingers stop; the cooldown folds that
      // burst into one move.
      const onWheel = (event: WheelEvent) => {
        const smoother = state.smoother;
        if (!smoother) return;
        // An open FAQ answer may be taller than the screen; let it scroll itself
        // instead of paging the deck out from under the reader.
        const faq = (event.target as Element | null)?.closest<HTMLDetailsElement>(".faq__item");
        if (faq?.open && faq.scrollHeight > faq.clientHeight) return;
        // Typing in the live card must not page away under the reader, but a
        // wheel over the card while it is not focused is just navigation.
        const card = (event.target as Element | null)?.closest(".try__card");
        if (card && card.contains(document.activeElement)) return;
        if (Math.abs(event.deltaY) < 2) return;
        event.preventDefault();
        const now = performance.now();
        if (now - state.lastGesture < GESTURE_COOLDOWN_MS) return;
        state.lastGesture = now;
        goToPage(state.page + (event.deltaY > 0 ? 1 : -1));
      };
      window.addEventListener("wheel", onWheel, { passive: false });
      state.offWheel = () => window.removeEventListener("wheel", onWheel);

      // Keyboard paging: arrows and Page Up/Down move one screen.
      const onKey = (event: KeyboardEvent) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if ((event.target as Element | null)?.closest("input, textarea, summary, .try__card")) return;
        if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
          event.preventDefault();
          goToPage(state.page + 1);
        } else if (event.key === "ArrowUp" || event.key === "PageUp") {
          event.preventDefault();
          goToPage(state.page - 1);
        } else if (event.key === "Home") {
          event.preventDefault();
          goToPage(0);
        } else if (event.key === "End") {
          event.preventDefault();
          goToPage(pageCount() - 1);
        }
      };
      window.addEventListener("keydown", onKey);

      const removeWheel = state.offWheel;
      state.offWheel = () => {
        removeWheel?.();
        window.removeEventListener("keydown", onKey);
      };
    };

    // Wait for layout (the font, the panel height and the deck's own class) before
    // building: a smoother created mid-layout measures the wrong document and
    // keeps that wrong height.
    let frame = 0;
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        start();
        // Second settle: on a client-side return from /app the first measurement
        // can still see the app shell's viewport height.
        window.setTimeout(() => state.syncRange?.(), 120);
      });
    });

    const onModeChange = () => start();
    reduce.addEventListener("change", onModeChange);
    wide.addEventListener("change", onModeChange);

    return () => {
      window.cancelAnimationFrame(frame);
      reduce.removeEventListener("change", onModeChange);
      wide.removeEventListener("change", onModeChange);
      window.visualViewport?.removeEventListener("resize", setPanelHeight);
      window.removeEventListener("resize", setPanelHeight);
      stop();
    };
  }, [scopeRef]);
}
