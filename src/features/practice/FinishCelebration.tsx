import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { playFeedback, readSoundPreference } from "./sounds";

const COLORS = ["#77a993", "#356b54", "#f2c14e", "#f08a6c", "#8fa8e8", "#bfe3d0"];

interface Piece {
  x: number; y: number; vx: number; vy: number;
  size: number; spin: number; angle: number; color: string; round: boolean; life: number;
}

/** Two cannons from the lower corners, then gravity; stops by itself. */
function useConfetti(canvasRef: React.RefObject<HTMLCanvasElement | null>, enabled: boolean) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const pieces: Piece[] = [];
    const burst = (fromLeft: boolean, count: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      for (let i = 0; i < count; i++) {
        const aim = (fromLeft ? -62 : -118) + (Math.random() - 0.5) * 34; // degrees, up and inward
        const speed = (h * 0.019) * (0.55 + Math.random() * 0.75);
        pieces.push({
          x: fromLeft ? w * 0.02 : w * 0.98, y: h * 0.98,
          vx: Math.cos((aim * Math.PI) / 180) * speed,
          vy: Math.sin((aim * Math.PI) / 180) * speed,
          size: 6 + Math.random() * 7, spin: (Math.random() - 0.5) * 0.4, angle: Math.random() * 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          round: Math.random() < 0.28, life: 0,
        });
      }
    };
    const timers = [
      window.setTimeout(() => { burst(true, 70); burst(false, 70); }, 120),
      window.setTimeout(() => { burst(true, 40); burst(false, 40); }, 650),
    ];

    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(2, (now - last) / 16.67);
      last = now;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.vx *= 0.992 ** dt;
        p.vy = p.vy * 0.992 ** dt + 0.32 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        p.life += dt;
        const fade = Math.max(0, Math.min(1, (260 - p.life) / 70));
        if (p.y > window.innerHeight + 30 || fade <= 0) { pieces.splice(i, 1); continue; }
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2.4, 0, 6.3); ctx.fill(); }
        else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef, enabled]);
}

interface Props {
  completed: number;
  /** Label of the one action; Enter triggers it as well. */
  actionLabel: string;
  onAction: () => void;
  reducedMotion: boolean;
}

export function FinishCelebration({ completed, actionLabel, onAction, reducedMotion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  useConfetti(canvasRef, !reducedMotion);

  useEffect(() => {
    if (readSoundPreference()) {
      playFeedback("success");
      const id = window.setTimeout(() => playFeedback("advance"), 420);
      return () => window.clearTimeout(id);
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.from(".finish__in", { opacity: 0, y: 28, duration: 0.7, ease: "power3.out", stagger: 0.12, delay: 0.05 });
      gsap.from(".finish__chip", { scale: 0.6, opacity: 0, duration: 0.6, ease: "back.out(2.4)", delay: 0.7 });
    }, root);
    return () => ctx.revert();
  }, [reducedMotion]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat) return;
      event.preventDefault();
      onAction();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAction]);

  return (
    <section className="finished-screen finish" aria-labelledby="finish-title" ref={rootRef}>
      <canvas className="finish__confetti" ref={canvasRef} aria-hidden="true" />
      <h2 id="finish-title" className="finish__in">很棒，<br /><em>继续保持。</em></h2>
      <p className="finish__chip" role="status">+{completed} 步 · 今天又向前一步</p>
      <div className="choice-group finish__in">
        <button className="primary-button" type="button" autoFocus onClick={onAction}>
          {actionLabel} <kbd className="finish__key">Enter ↵</kbd>
        </button>
      </div>
    </section>
  );
}
