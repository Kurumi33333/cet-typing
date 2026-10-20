import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { landingSound } from "./landingSound";

/**
 * The page before the page: the visitor decides whether the landing page may
 * make sound. Browsers keep audio locked until a gesture anyway, so this one
 * click both unlocks it and records the choice (shared with the practice
 * screen's key-sound switch). It shows once per browser session; coming back
 * from the practice screen goes straight to the page.
 */
const SEEN_KEY = "cet-typing:landing-gate";
export const GATE_EVENT = "landing-gate-done";

function alreadySeen(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function useGateOpen(): boolean {
  const [open] = useState(() => typeof window !== "undefined" && !alreadySeen());
  return open;
}

export function SoundGate({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("landing-gated");
    rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    return () => document.documentElement.classList.remove("landing-gated");
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".gate__in", { opacity: 0, y: 26, duration: 0.8, ease: "power3.out", stagger: 0.09, delay: 0.1 });
      gsap.fromTo(".gate__bars i", { scaleY: 0.2 }, {
        scaleY: 1, duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: -1,
        stagger: { each: 0.09, repeat: -1, yoyo: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const choose = (sound: boolean) => {
    if (leaving) return;
    setLeaving(true);
    landingSound.setOn(sound);
    if (sound) landingSound.start();
    try {
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode */
    }
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone();
      window.dispatchEvent(new Event(GATE_EVENT));
      return;
    }
    gsap.to(root, { yPercent: -100, duration: 0.85, ease: "power4.inOut", onComplete: onDone });
    // The page starts moving while the curtain is still lifting.
    window.setTimeout(() => window.dispatchEvent(new Event(GATE_EVENT)), 380);
  };

  return (
    <div className="gate" ref={rootRef} role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="gate__inner">
        <span className="gate__bars gate__in" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        <p className="gate__eyebrow gate__in">CET Typing</p>
        <h2 className="gate__title gate__in" id="gate-title">这里的每一次敲击，<br />都有声音。</h2>
        <p className="gate__copy gate__in">
          键音、翻页、答对的那一下，都是页面里现合成的轻声响，不会下载任何音频。想安静地看，也可以静音进入；之后随时能在页面顶部切换。
        </p>
        <div className="gate__actions gate__in">
          <button type="button" className="btn btn--solid btn--big" onClick={() => choose(true)}>开启音效进入</button>
          <button type="button" className="btn btn--ghost btn--big" onClick={() => choose(false)}>静音进入</button>
        </div>
      </div>
    </div>
  );
}
