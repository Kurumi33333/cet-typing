# V0.11 — GSAP × WebGL visual transformation

**Implemented:** 2026-10-18 in `Kurumi33333/cet-typing`.

## Visual hierarchy

1. **Home / first impression:** React Bits **Aurora**, a WebGL2 multi-layer shader with teal/blue/sage color stops. Transparent mask + warm white tint keep headline readable. GSAP drives two lines of Chinese hero copy with 3D rotateX, translateY and backward-settling springs; course links enter in a stagger. Magnet/ClickSpark still work.
2. **Exercise / sustained attention:** React Bits **Particles** on a separate WebGL2 canvas *behind* the visible input, with mouse parallax, tiny upward drift and low-alpha connections. Stage controls and persistent readOnly/native input always sit above this canvas.
3. **Correct-answer moment:** GSAP scales and fades three decorative energy rings over about 320ms, without changing the **360ms answer delay**, focus, TTS or FSRS.
4. **CSS fallback:** If WebGL2 unavailable, no hard crash; existing solid page background, buttons, headline and editable interactions remain.

## Performance and lifecycle

- Just one GPU scene is mounted per view (Aurora on home, Particles on practice). React Bits components release buffers/programs/context on unmount and attach document visibility and viewport observers.
- DPR capped around 1.15–1.25 for WebGL scenes; practice particles limited to 220, no WebGL game engine or 3D model downloads.
- Screen layout remains `100svh` with no document scroll; browser CSS pointer-events none on shader overlay, focus and keyboard unaffected.
- System reduced-motion preference stops animated GSAP home intro and energy rings; upstream shaders also respect reduced-motion.
- Licenses: official components copied with exact upstream source notice at `src/components/reactbits/LICENSE.md` (MIT + Commons Clause). `gsap` is a distinct npm dependency.

## Render-level QA (Chromium browser rendering)

- 390×844: shaders initialized with WebGL2 contexts and nonzero canvas sizes; GSAP timeline produced transform matrices on hero lines; typed `I` showed exactly 3 expanding answer rings, then advanced to `like` with input identity/focus preserved, zero vertical/horizontal scroll.
- 320×568: Aurora on home and Particles on practice both initialized, keyboard visible; 8 lesson menu choices visible without clipping; `I` 360ms success effect then `like`; home→practice→home successfully reacquired WebGL2 context; no document overflow.
- Desktop 1280×780 WebGL rendering still needs another check after Cloudflare snapshot rate limit; actual Windows IME candidate popup requires physical-device validation.

## Non-goals

No scrolling spectacle on the typing page, no answer logic changes, no blocking animation that postpones acceptance, no asset library extraction and no unlicensed copy of React Bits demo materials.
