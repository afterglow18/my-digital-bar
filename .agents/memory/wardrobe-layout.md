---
name: Wardrobe image layout strategy
description: How the closet background image is sized and overlays are positioned on the wardrobe page
---

## Current image

`/closet-bg.png` — 853×1844 PNG (user-supplied, 3 baked-in placeholder cards per row).

## Sizing strategy

`object-fit: CONTAIN` inside `calc(100dvh − 90px)` container.

Image ratio 853/1844 ≈ 0.4626.
Container ratio on iPhone 390×754 ≈ 0.517 → container wider → image fills HEIGHT.

| Device | rW (px) | rL each side |
|---|---|---|
| iPhone SE  375×577 | 267 | 54 px |
| iPhone 390 ×754   | 349 | 21 px |
| iPhone Max 430×842| 390 | 20 px |

Container background `#F0C030` — side letterbox blends with yellow door colour.

## Overlay philosophy

The PNG already has all visual UI baked in. HTML provides:
- **Transparent tap zones** over every baked-in button
- **ClosetRow** (no background) rendered over the placeholder card area **only when items exist**
- **Empty slots**: image's dashed placeholder cards show through (ClosetRow is transparent)

## ClosetRow component

`src/components/ClosetRow.tsx` — fixed 3-slot carousel, NOT a scrollable strip.

Behaviour:
- Divides its container into 3 equal slots (left / center / right)
- Container is positioned exactly at `doorL`→`doorR` inner closet bounds with `overflow:hidden`
- Center item: scale 1.0, opacity 1.0. Side items: scale ~0.82, opacity ~0.62
- Swipe gesture (pointer events) translates the strip; snaps to nearest item on release
- Tap on side item re-centers it; tap on center item opens item details
- `hasDragged` ref prevents synthetic click triggering after a drag
- Tracks last-notified item **ID** (not just index) to keep parent `centred` map accurate
- Item cards are `<button>` elements for keyboard/screen-reader accessibility

## Landmark fractions (853×1844 PNG, all 0→1)

```
doorL:   0.110   // inner left edge
doorR:   0.890   // inner right edge

rows[0]: { btnCY: 0.278, carY: 0.305, carBot: 0.447 }  // TOPS
rows[1]: { btnCY: 0.480, carY: 0.506, carBot: 0.645 }  // BOTTOMS
rows[2]: { btnCY: 0.685, carY: 0.712, carBot: 0.840 }  // SHOES

barY:     0.863
barBot:   0.928
hangerCX: 0.140
saveBtnL: 0.228
saveBtnR: 0.772
manneCX:  0.860
```

## Carousel container positioning (wardrobe.tsx)

```
left:   pX(ir, LM.doorL)                        // = ir.left + ir.width * doorL
right:  ir.left + pW(ir, 1 - LM.doorR)          // distance from right edge
top:    pY(ir, lm.carY)
height: pH(ir, lm.carBot - lm.carY)
overflow: hidden                                 // clips items to 3-slot bounds
// NO background — transparent, image placeholder cards show through
```

**Why contain over cover:** user requires full closet visible without scrolling.
**Why ClosetRow over SwipeRow:** SwipeRow overflows the closet bounds; ClosetRow is pinned to the 3-slot box.
