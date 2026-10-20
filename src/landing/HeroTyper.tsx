import { useEffect, useRef, useState } from "react";
import { playFeedback, readSoundPreference } from "../features/practice/sounds";

/**
 * The hero's own demonstration: a Chinese line, and its English being typed out
 * key by key, then erased, then the next pair. It pauses while off-screen and
 * under reduced motion shows the first pair finished. Key taps are only played
 * once the visitor has interacted with the page (browsers keep audio locked
 * until then) and never if they turned key sounds off.
 */
const PAIRS = [
  { zh: "我们每天都要练习写作。", en: "We practise writing every day." },
  { zh: "这本词典帮了我很多。", en: "This dictionary helped me a lot." },
  { zh: "慢一点，反而记得更牢。", en: "Slower is how it sticks." },
] as const;

export function HeroTyper() {
  const [pair, setPair] = useState(0);
  const [typed, setTyped] = useState(PAIRS[0].en.length);
  const rootRef = useRef<HTMLDivElement>(null);
  const unlocked = useRef(false);

  useEffect(() => {
    const unlock = () => { unlocked.current = true; };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let visible = true;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.2 });
    observer.observe(root);

    let timer = 0;
    let current = 0;
    let count = 0;
    let mode: "type" | "hold" | "erase" = "type";
    setTyped(0);

    const tick = () => {
      const target = PAIRS[current].en;
      let wait = 70;
      if (!visible) {
        wait = 400;
      } else if (mode === "type") {
        count += 1;
        setTyped(count);
        if (unlocked.current && readSoundPreference() && target[count - 1] !== " ") playFeedback("typing");
        wait = 55 + Math.random() * 70;
        if (count >= target.length) { mode = "hold"; wait = 2200; }
      } else if (mode === "hold") {
        mode = "erase";
        wait = 60;
      } else {
        count = Math.max(0, count - 2);
        setTyped(count);
        wait = 22;
        if (count === 0) {
          mode = "type";
          current = (current + 1) % PAIRS.length;
          setPair(current);
          wait = 420;
        }
      }
      timer = window.setTimeout(tick, wait);
    };
    timer = window.setTimeout(tick, 900);
    return () => { window.clearTimeout(timer); observer.disconnect(); };
  }, []);

  const { zh, en } = PAIRS[pair];
  return (
    <div className="typer" ref={rootRef} aria-label="示例：看一句中文，把英文打出来">
      <p className="typer__zh" lang="zh-CN">{zh}</p>
      <p className="typer__en" lang="en" aria-hidden="true">
        {en.slice(0, typed)}
        <span className="typer__caret" />
      </p>
      <span className="typer__sr">{en}</span>
    </div>
  );
}
