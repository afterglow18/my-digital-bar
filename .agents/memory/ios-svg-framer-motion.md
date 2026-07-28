---
name: iOS SVG Framer Motion
description: Framer Motion SVG presentation attribute animation (y, height, cy) is unreliable on iOS Safari — use CSS transforms instead.
---

## Rule
Never animate SVG presentation attributes (`y`, `height`, `cx`, `cy`, `r`, `width`) via Framer Motion `animate` on iOS Safari. Use CSS transforms (`scale`, `translateY`, `opacity`) on a `<motion.g>` or `<motion.div>` wrapper instead.

**Why:** iOS Safari does not reliably execute Framer Motion's SVG attribute interpolation. The animation either stalls part-way or uses a cached value from a previous render. This was observed on `motion.rect` animating `y`/`height` in a martini glass fill animation — the liquid stuck at ~65% fill even though the target was 100%.

**How to apply:**
- Fill effects: wrap the shape in `<motion.g style={{ transformOrigin: "Xpx Ypx" }}>` and animate `scale` from 0→1. For a V-shaped (triangular) fill rising from the point, uniform `scale` with origin at the bottom point is geometrically exact.
- Moving elements: use CSS `y` (translateY) on `motion.g` or `motion.circle` instead of animating the `cy` SVG attribute.
- Opacity: fine to animate directly — this is CSS and works everywhere.
- Pour stream / short-lived elements: using keyframe arrays on `y`/`height` may appear to work visually (fast enough to mask the issue) but should still be converted if precision matters.

**Affected file:** `artifacts/outfit-generator/src/pages/welcome.tsx` — MartiniGlass component.
