# React Bits selected source components

Upstream: https://github.com/DavidHDev/react-bits
Pinned revision: `d965399df489c7b8da3874e07d716c0d98ab39fd` (main)
Components: `src/ts-default/Animations/Magnet/Magnet.tsx`, `src/ts-default/Animations/ClickSpark/ClickSpark.tsx`.

These are actual upstream component source copies, used inside this application. See adjacent [LICENSE.md](./LICENSE.md) for the **MIT + Commons Clause License Condition v1.0**. The source and substantially equivalent ports may **not** be sold, sublicensed or redistributed as standalone components or component bundles. Retain notice in distributions. Only use as part of the CET Typing website/application and do not publish as an independent component library.

Usage: subtle home-course magnetic hover and course-picker click sparks. Other animation timings are implemented locally with Motion 12. Avoid GSAP/WebGL/large animated backgrounds; respect prefers-reduced-motion, maintain zero-scroll layout and persistent typing input.


## V0.11 shader additions

- `src/ts-default/Backgrounds/Aurora/Aurora.tsx` + `Aurora.css` → `Aurora.tsx/.css` in this folder. Real WebGL2 fragment shader, home atmospheric background; transparent overlay and fallback CSS preserve legibility.
- `src/ts-default/Backgrounds/Particles/Particles.tsx` + `Particles.css` → `Particles.tsx/.css` in this folder. Real WebGL2 GPU point/line shader, lightly interactive practice stage.
- Both are copied from React Bits upstream `DavidHDev/react-bits` on 2026-10-18, without redistributing as a standalone library; use and redistribute only subject to **LICENSE.md** (MIT + Commons Clause).
- `gsap` is separately installed from npm and used for a kinetic two-line hero and sub-360ms answer confirmation rings. Motion remains responsible for per-word focus and prompt animation.
