---
name: Wardrobe image layout strategy
description: How the closet background image is sized and overlays are positioned on the wardrobe page
---

## Current image

`/closet-bg.png` — 853×1844 PNG (the user-supplied designer reference, 3 placeholder cards per row).
Previous files: `closet-bg.jpg` (853×1713, 4 cards per row) — superseded and no longer used.

## Sizing strategy

`object-fit: CONTAIN` inside `calc(100dvh − 90px)` container.

Image ratio 853/1844 ≈ 0.4626.  
Container ratio on iPhone 390×754 ≈ 0.517 → container is wider → image fills HEIGHT with side letterbox.

| Device | rW (px) | rL each side |
|---|---|---|
| iPhone SE  375×577 | 267 | 54 px |
| iPhone 390 ×754   | 349 | 21 px |
| iPhone Max 430×842| 390 | 20 px |

Container background `#F0C030` (matches yellow door colour) — side letterbox strips look like natural door extensions.

Full image always visible — no cropping, no scrolling, no HTML bottom bar needed.

## Overlay philosophy

The PNG already has all visual UI baked in (section labels, "+ADD" pills, rods, SAVE OUTFIT bar, chevrons, placeholder cards). HTML adds only:
- **Transparent tap zones** over every baked-in button (zero visible HTML chrome)
- **SwipeRow** (cream `rgba(254,246,236,0.95)` background) rendered on top of the placeholder card area **only when items exist**
- **Empty state**: the image's own dashed placeholder cards show through — no SwipeRow rendered

## Landmark fractions (853×1844 PNG, all 0→1)

```
doorL:   0.110   // inner left edge of yellow doors
doorR:   0.890   // inner right edge

rows[0]: { btnCY: 0.278, carY: 0.305, carBot: 0.447 }  // TOPS
rows[1]: { btnCY: 0.480, carY: 0.506, carBot: 0.645 }  // BOTTOMS
rows[2]: { btnCY: 0.685, carY: 0.712, carBot: 0.840 }  // SHOES

barY:     0.863   // top of SAVE OUTFIT bar zone
barBot:   0.928   // bottom of bar zone
hangerCX: 0.140   // hanger/shuffle icon x-centre
saveBtnL: 0.228   // save pill left edge x
saveBtnR: 0.772   // save pill right edge x
manneCX:  0.860   // mannequin/dress-form icon x-centre
```

## Save outfit input popup

Appears ABOVE the bar via `bottom: calc(100% - pY(ir, LM.barY) + 8px)`.  
Width: left=`pX(ir, LM.saveBtnL)`, right=`ir.left + pW(ir, 1 - LM.saveBtnR)`.

**Why contain over cover:** user requires full closet visible without scrolling. With cover,
the save bar is partially clipped at the bottom. With contain, the full image (including
the rug) is visible and the yellow letterbox blends with the door design.
