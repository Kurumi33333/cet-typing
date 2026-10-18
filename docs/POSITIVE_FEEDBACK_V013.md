# CET Typing · Kinetic Positive Feedback (V0.13)

Implemented: 2026-10-18. The *first* phase of positive-feedback redesign.

## Delivery

**1. Word lock / 单词弹性锁定**
- When a slot becomes an exact, approved target word, Motion lifts the written word 4px, stretches it slightly (max ×1.075), settles it and emits a short sage-to-mint light across the underline.
- Per-word animation is bound to the **transition into correctness**, not every keystroke, and does not interfere with choosing or replacing existing word slots.
- Web Speech TTS still fires on a correct word and is not canceled when the next question arrives. Visual effects do not attempt to replay audio.

**2. Sentence energy conduction / 整句能量传导**
- On a correct multiword target, GSAP reads the actual `.slot-unit` centers *at success time*, including wraps. One luminous orb travels across the centers, lighting a thin line beneath each word in order; an unobtrusive blurred bloom fades behind the sentence.
- One-word questions do not get the large sentence treatment. This avoids turning every easy word into a full-screen celebration.
- GSAP effects are confined to pointer-events-none overlays. They do not move the editable focus target, word containers, or the WebGL scene.
- For the 360ms success hold: the travel starts are distributed over 165ms, each local glow ends by 350ms, and the aura fades by 330ms. Green answer text is displayed immediately; the next question starts automatically after the original 360ms.
- Reduced motion: word/phrase decoration and GSAP flight are disabled; correctness text and normal lesson progression remain available.

**3. Sound hierarchy / 声音优先级**
- Existing success sound is now a very short, quiet two-note chime (~149ms maximum) instead of a three-note ~330ms flourish. TTS remains the main English learning signal. Preference controls are unchanged.

## QA

- Chromium 390×844 simulated mobile: single-word `I`, then `like`, then multiword `I like`; first correct word displays `.word-lock-light`, multiword success creates two `.sentence-energy-node` and an animated `.sentence-flow-orb`; 360ms passage remains; native focused input instance unchanged; no scroll overflow.
- Chromium 320×568 simulated mobile: entered 11-word final sentence `The ability to adapt is a definite asset in this job.` of CET4 unit 8; 11 energy nodes and orb visible; words were wrapped over multiple rows; automatically reached unit-completed screen; no page scroll overflow.
- Current production: 17 test suites / 88 tests passed, vocabulary source verification passed, TypeScript and Vite build successful.
- Unverified: physical iOS keyboard interaction, actual desktop GPU frame pacing, accessibility at very large OS text scale. Only performance timings **inside the 360ms budget** were tested, not independent low-end phone FPS measurement.

## Next phase (not implemented yet)

- 5/10 consecutive-correct streak accents tied to the progress line and a special lower-intensity recovery animation after a previously missed question. These must never block practice or increase sound volume.
