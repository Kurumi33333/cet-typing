# CET Typing · Motion × React Bits visual pass (2026-10-18)

## Intent

More expressive motion with a restrained Apple-like typographic aesthetic. **No continuous layout shifts, no WebGL, no visual noise over the actual typing region.** All major views remain one-screen at tested portrait sizes.

## Actual upstream component integration

- `Magnet` — **verbatim source** from `DavidHDev/react-bits`, pinned at `d965399df489c7b8da3874e07d716c0d98ab39fd`. Applied to CET4/CET6 home course entry buttons; strength 9, max translate 7px, max scale 1.008, subtle tilt .65°, spring 240/21/0.68. Disabled for coarse-pointer and reduced-motion devices.
- `ClickSpark` — **verbatim source** from the same revision. Applied **only** to the lesson picker button, not every virtual keyboard tap (to avoid visual distraction); 5 sage-color thin sparks, 21px radius, 300ms. Disabled for reduced-motion.
- Original source and **MIT + Commons Clause** license copied to `src/components/reactbits/`. No separate component redistribution; this is app-specific usage.

## Motion 12 choreography

| Element | Effect | Guardrail |
|---|---|---|
| Home headline | 14px translate-y + 5px blur reveal, spring 230/23 | Mount only, not continuous on each keystroke |
| Home ambient tint | muted mint radial wash, 12s slow translate/scale | Behind text, pointer-events none; off for reduced-motion |
| Course buttons | magnetic spring and 3px hover lift, 0.972 tap scale | Stable wrapping size, real button identity retained |
| Lesson picker | spring pressed state; React Bits ClickSpark click | Does not move keyboard or hide picker under header |
| Lesson choices | 6px staggered translate-in, 3px hover nudge | Modest stagger cap 140ms, no scroll dependency |
| Prompt transition | simultaneous new prompt/slot update; 11px translate, 3px blur, spring 360/28 | No exit-wait that leaves old Chinese text beside new answer slots |
| Active word | shared layoutId underline spring | Persistent native input never keyed/remounted |
| Correct answer | spring checkmark inside reserved feedback line | The existing **360ms** auto-advance timer is unchanged |
| Progress | existing Motion width spring | No additional model/state changes |

## QA boundaries

- Verified Chromium browser-rendering portrait 320×568 and 390×844: no vertical/horizontal document scroll, no clipped curriculum picker (8 lessons), home course widths fit parent.
- Verified virtual English keyboard `I` → 360ms positive confirmation → `like`, same focused input element; no duplicate typing.
- Validate system-level Windows IME behavior separately on real hardware (readonly English-direct mode remains unchanged).
- Reduced-motion preference disables all interactive effects where available, with no animated page entry.
- No new runtime dependency beyond the already-installed `motion`. Two React Bits source components are local with a pinned upstream revision and preserved license.
