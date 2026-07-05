/**
 * WardrobePage — closet-bg.png (853×1844 PNG)
 *
 * Sizing: object-fit CONTAIN inside calc(100dvh − 90px) container.
 *   • Image ratio 853/1844 ≈ 0.4626
 *   • iPhone 390 container ratio 390/754 ≈ 0.517  →  image fills height,
 *     ~21 px side letterbox.  Container background = door yellow (#F0C030) so
 *     the strips look like a natural door extension.
 *   • Full image always visible — no cropping.  All baked-in UI (rods, "+ADD"
 *     pills, SAVE OUTFIT bar) is inside the visible area → transparent overlays.
 *
 * Layer order (z-index):
 *   0   background <img>
 *   10  SwipeRow carousels (clothing photos; rendered only when items > 0)
 *   12  Transparent "+ ADD" tap zones
 *   14  Transparent SAVE OUTFIT / shuffle / mannequin tap zones
 *   20  Save-outfit name-input popup
 *   30+ Modals
 */

import React, {
  useRef, useState, useCallback, useEffect, RefObject,
} from "react";
import {
  useListClothing, getListClothingQueryKey,
  useSaveOutfit, useListOutfits, getListOutfitsQueryKey,
  ClothingItem,
} from "@workspace/api-client-react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SwipeRow, SwipeRowHandle } from "@/components/SwipeRow";
import { QuickAddSheet } from "@/components/clothing/QuickAddSheet";
import { ItemDetailsSheet } from "@/components/clothing/ItemDetailsSheet";
import { MannequinView } from "@/components/MannequinView";
import { UpgradeSheet, UpgradeReason } from "@/components/paywall/UpgradeSheet";
import { PremiumSheet } from "@/components/paywall/PremiumSheet";
import { useQueryClient } from "@tanstack/react-query";
import { useEntitlements } from "@/hooks/useEntitlements";
import { FREE_ITEM_LIMIT, FREE_OUTFIT_LIMIT } from "@/lib/entitlements";

// ── Types ─────────────────────────────────────────────────────────────────────
type RowKey   = "tops" | "bottoms" | "shoes";
type Category = "tops" | "bottoms" | "shoes" | "accessories" | "outerwear" | "dresses";

const ROWS: { key: RowKey; addLabel: string; btnLabel: string }[] = [
  { key: "tops",    addLabel: "Add Top",    btnLabel: "+ ADD TOPS"    },
  { key: "bottoms", addLabel: "Add Bottom", btnLabel: "+ ADD BOTTOMS" },
  { key: "shoes",   addLabel: "Add Shoes",  btnLabel: "+ ADD SHOES"   },
];

// ── Image constants ───────────────────────────────────────────────────────────
const IMG_W   = 853;
const IMG_H   = 1844;
const NAV_H   = 90;    // AppLayout bottom-nav height (px)

// ── Landmark fractions — all measured from the 853×1844 PNG ─────────────────
// x fractions = proportion of image WIDTH; y fractions = proportion of image HEIGHT.
const LM = {
  // Yellow door inner edges
  doorL: 0.110,
  doorR: 0.890,

  // Per-row: button tap zone y-centre, carousel top & bottom
  // btnCY = centre of the baked-in "+ ADD" pill on the rod
  rows: [
    { btnCY: 0.278, carY: 0.305, carBot: 0.447 }, // TOPS
    { btnCY: 0.480, carY: 0.506, carBot: 0.645 }, // BOTTOMS
    { btnCY: 0.685, carY: 0.712, carBot: 0.840 }, // SHOES
  ],

  // SAVE OUTFIT bar (baked into image; fully visible with contain)
  barY:     0.863,   // top of bar area
  barBot:   0.928,   // bottom of bar area
  hangerCX: 0.140,   // hanger/shuffle icon x-centre
  saveBtnL: 0.228,   // save pill left x
  saveBtnR: 0.772,   // save pill right x
  manneCX:  0.860,   // mannequin icon x-centre
} as const;

// ── Image rect (object-fit: contain, fills container height) ─────────────────
interface ImgRect { top: number; left: number; width: number; height: number }

function useImageRect(containerRef: RefObject<HTMLDivElement>): ImgRect {
  const [rect, setRect] = useState<ImgRect>({ top: 0, left: 0, width: 0, height: 0 });
  useEffect(() => {
    const compute = () => {
      const c = containerRef.current;
      if (!c) return;
      const cW = c.clientWidth, cH = c.clientHeight;
      const iR = IMG_W / IMG_H;   // 0.4626
      const cR = cW / cH;
      let rW: number, rH: number, rL: number, rT: number;
      if (cR > iR) {
        // Container wider than image → fills height, side letterbox
        rH = cH; rW = cH * iR; rT = 0; rL = (cW - rW) / 2;
      } else {
        // Container taller than image → fills width, pinned top
        rW = cW; rH = cW / iR; rL = 0; rT = 0;
      }
      setRect({ top: rT, left: rL, width: rW, height: rH });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [containerRef]);
  return rect;
}

// ── Pixel helpers ─────────────────────────────────────────────────────────────
const pH = (ir: ImgRect, f: number) => ir.height * f;
const pW = (ir: ImgRect, f: number) => ir.width  * f;
const pX = (ir: ImgRect, f: number) => ir.left   + ir.width  * f;
const pY = (ir: ImgRect, f: number) => ir.top    + ir.height * f;

// Interior cream colour used to back the clothing carousel overlay
const INTERIOR_BG = "rgba(254, 246, 236, 0.95)";
const GOLD        = "#C49B2A";

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WardrobePage() {
  const containerRef = useRef<HTMLDivElement>(null!);
  const ir = useImageRect(containerRef);

  const rowRefs: Record<RowKey, RefObject<SwipeRowHandle | null>> = {
    tops:    useRef<SwipeRowHandle | null>(null),
    bottoms: useRef<SwipeRowHandle | null>(null),
    shoes:   useRef<SwipeRowHandle | null>(null),
  };

  const [centred,       setCentred]       = useState<Partial<Record<RowKey, ClothingItem>>>({});
  const [addCategory,   setAddCategory]   = useState<Category | null>(null);
  const [detailsItem,   setDetailsItem]   = useState<ClothingItem | null>(null);
  const [showMannequin, setShowMannequin] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null);
  const [showPremium,   setShowPremium]   = useState(false);
  const [isSaveOpen,    setIsSaveOpen]    = useState(false);
  const [saveName,      setSaveName]      = useState("");

  const { data: tops    = [] } = useListClothing({ category: "tops"    }, { query: { queryKey: getListClothingQueryKey({ category: "tops"    }) } });
  const { data: bottoms = [] } = useListClothing({ category: "bottoms" }, { query: { queryKey: getListClothingQueryKey({ category: "bottoms" }) } });
  const { data: shoes   = [] } = useListClothing({ category: "shoes"   }, { query: { queryKey: getListClothingQueryKey({ category: "shoes"   }) } });
  const { data: outfits = [] } = useListOutfits();

  const rowData: Record<RowKey, ClothingItem[]> = { tops, bottoms, shoes };
  const totalItems = tops.length + bottoms.length + shoes.length;

  // Clear centred selection for any row that becomes empty (e.g. item deleted)
  // so canSave never fires with stale IDs.
  useEffect(() => {
    setCentred(prev => {
      const next = { ...prev };
      let changed = false;
      (Object.keys(rowData) as RowKey[]).forEach(key => {
        if (rowData[key].length === 0 && next[key] !== undefined) {
          delete next[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [tops.length, bottoms.length, shoes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveOutfit  = useSaveOutfit();
  const queryClient = useQueryClient();
  const { tier, caps, canAddItem, canSaveOutfit } = useEntitlements();

  // ── Stable per-row callbacks ──────────────────────────────────────────────
  const setCentredTops    = useCallback((item: ClothingItem | null) =>
    setCentred(p => ({ ...p, tops:    item ?? undefined })), []);
  const setCentredBottoms = useCallback((item: ClothingItem | null) =>
    setCentred(p => ({ ...p, bottoms: item ?? undefined })), []);
  const setCentredShoes   = useCallback((item: ClothingItem | null) =>
    setCentred(p => ({ ...p, shoes:   item ?? undefined })), []);
  const centredHandlers: Record<RowKey, (item: ClothingItem | null) => void> = {
    tops: setCentredTops, bottoms: setCentredBottoms, shoes: setCentredShoes,
  };

  const handleAddClick   = useCallback((cat: Category) => {
    if (canAddItem(totalItems)) setAddCategory(cat); else setUpgradeReason("items");
  }, [canAddItem, totalItems]);
  const handleAddTops    = useCallback(() => handleAddClick("tops"),    [handleAddClick]);
  const handleAddBottoms = useCallback(() => handleAddClick("bottoms"), [handleAddClick]);
  const handleAddShoes   = useCallback(() => handleAddClick("shoes"),   [handleAddClick]);
  const addHandlers: Record<RowKey, () => void> = {
    tops: handleAddTops, bottoms: handleAddBottoms, shoes: handleAddShoes,
  };

  const handleItemTap = useCallback((item: ClothingItem) => setDetailsItem(item), []);

  const handleSaveClick = useCallback(() => {
    if (canSaveOutfit(outfits.length)) setIsSaveOpen(true); else setUpgradeReason("outfits");
  }, [canSaveOutfit, outfits.length]);

  const handleMannequinClick = useCallback(() => {
    if (caps.mannequin) setShowMannequin(true); else setShowPremium(true);
  }, [caps.mannequin]);

  const handleShuffle = useCallback(() => {
    ROWS.forEach(({ key }, i) => {
      const data = rowData[key];
      if (data.length < 2) return;
      const ref = rowRefs[key].current;
      if (!ref) return;
      const idx = Math.floor(Math.random() * data.length);
      setTimeout(() => {
        ref.scrollToIndex(data.length - 1, false);
        setTimeout(() => ref.scrollToIndex(idx, true), 60);
      }, i * 80);
    });
  }, [rowData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    if (!saveName.trim()) return;
    if (!canSaveOutfit(outfits.length)) {
      setIsSaveOpen(false); setSaveName(""); setUpgradeReason("outfits"); return;
    }
    const itemIds = Object.values(centred)
      .filter((i): i is ClothingItem => i != null)
      .map(i => i.id);
    saveOutfit.mutate(
      { data: { name: saveName.trim(), itemIds } },
      { onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOutfitsQueryKey() });
        setIsSaveOpen(false); setSaveName("");
      }},
    );
  };

  const canSave  = ROWS.every(({ key }) => !!centred[key]);
  const isFree   = tier === "free";
  const itemsLeft = isFree ? Math.max(0, FREE_ITEM_LIMIT - totalItems) : null;
  const ready    = ir.width > 0;

  // Per-row computed card sizes (derived from rendered image height)
  const rowSizes = LM.rows.map(lm => {
    const carH  = pH(ir, lm.carBot - lm.carY);
    const hH    = Math.min(18, Math.max(8, Math.round(carH * 0.145)));
    const cardH = Math.max(0, carH - hH);
    const cardW = Math.round(Math.max(36, cardH) * 0.82);
    return { carH, hH, cardH, cardW };
  });

  // Height of SAVE OUTFIT bar in px
  const barH = pH(ir, LM.barBot - LM.barY);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: `calc(100dvh - ${NAV_H}px)`,
        overflow: "hidden",
        // Door-yellow background: the ~21 px side letterbox strips look like
        // a natural continuation of the image's yellow doors.
        background: "#F0C030",
      }}
    >
      {/* ── Background image — object-fit:contain, never cropped ── */}
      <img
        src="/closet-bg.png"
        alt="My Digital Closet"
        style={{
          position: "absolute",
          top:    ready ? ir.top    : 0,
          left:   ready ? ir.left   : 0,
          width:  ready ? ir.width  : "100%",
          height: ready ? ir.height : "auto",
          display: "block",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
      />

      {/* ── Interactive overlays — only after rect is computed ── */}
      {ready && (
        <>
          {/* Item-limit warning badge (only when wardrobe is full) */}
          {itemsLeft === 0 && (
            <button
              onClick={() => setUpgradeReason("items")}
              data-testid="badge-item-count"
              aria-label="Wardrobe full"
              style={{
                position: "absolute",
                top: pY(ir, 0.255), left: "50%", transform: "translateX(-50%)",
                zIndex: 12,
                padding: "3px 14px", borderRadius: 20, border: "none",
                background: "rgba(200,40,40,0.14)",
                boxShadow: "0 0 0 2px rgba(200,40,40,0.40)",
                color: "#aa0000", fontWeight: 700, fontSize: 11,
                letterSpacing: "0.08em", textTransform: "uppercase",
                whiteSpace: "nowrap", cursor: "pointer",
              }}
            >
              WARDROBE FULL
            </button>
          )}

          {/* ── Three clothing rows ── */}
          {ROWS.map(({ key, addLabel, btnLabel }, rowIdx) => {
            const lm    = LM.rows[rowIdx];
            const items = rowData[key];
            const { carH, hH, cardH, cardW } = rowSizes[rowIdx];

            // Tap zone covers the baked-in "+ ADD" pill button
            const tapH   = Math.max(36, pH(ir, 0.052));
            const tapTop = pY(ir, lm.btnCY) - tapH / 2;

            // Carousel strip
            const carTop = pY(ir, lm.carY);

            return (
              <React.Fragment key={key}>
                {/* Transparent tap zone — over the image's "+ ADD TOPS/BOTTOMS/SHOES" pill */}
                <button
                  onClick={addHandlers[key]}
                  aria-label={btnLabel}
                  data-testid={`add-btn-${key}`}
                  style={{
                    position: "absolute",
                    top: tapTop,
                    left: pX(ir, LM.doorL),
                    width: pW(ir, LM.doorR - LM.doorL),
                    height: tapH,
                    zIndex: 12,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 20,
                  }}
                />

                {/* Clothing carousel — rendered only when items exist */}
                {items.length > 0 && (
                  <div
                    data-testid={`row-${key}`}
                    style={{
                      position: "absolute",
                      top: carTop,
                      left: 0, right: 0,
                      height: carH,
                      zIndex: 10,
                      // Cream overlay covers the image's ghost placeholder cards
                      background: INTERIOR_BG,
                    }}
                  >
                    {/* Pink swipe chevrons */}
                    <div style={{
                      position: "absolute", left: ir.left - 2, top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: Math.max(18, Math.round(carH * 0.44)),
                      color: "#e8a0bc", fontWeight: 300, lineHeight: 1,
                      pointerEvents: "none", userSelect: "none", opacity: 0.9, zIndex: 13,
                    }}>‹</div>
                    <div style={{
                      position: "absolute",
                      right: ir.left - 2,   // mirror left letterbox
                      top: "50%", transform: "translateY(-50%)",
                      fontSize: Math.max(18, Math.round(carH * 0.44)),
                      color: "#e8a0bc", fontWeight: 300, lineHeight: 1,
                      pointerEvents: "none", userSelect: "none", opacity: 0.9, zIndex: 13,
                    }}>›</div>

                    <SwipeRow
                      ref={rowRefs[key]}
                      items={items}
                      addLabel={addLabel}
                      onCenteredItem={centredHandlers[key]}
                      onAddClick={addHandlers[key]}
                      onItemTap={handleItemTap}
                      closetStyle
                      closetItemW={cardW}
                      closetItemH={cardH}
                      closetHangerH={hH}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* ── SAVE OUTFIT bar — transparent tap zones over the image's bar ── */}
          {/* Shuffle / hanger icon */}
          <button
            onClick={handleShuffle}
            data-testid="button-shuffle"
            aria-label="Shuffle outfit"
            title="Shuffle outfit"
            style={{
              position: "absolute",
              top: pY(ir, LM.barY),
              left: pX(ir, LM.hangerCX) - 26,
              width: 52, height: barH,
              zIndex: 14,
              background: "transparent", border: "none", cursor: "pointer",
            }}
          />

          {/* Save Outfit tap zone / name-input popup */}
          <AnimatePresence mode="wait">
            {isSaveOpen ? (
              /* Name input floats above the bar */
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                style={{
                  position: "absolute",
                  // position bottom-edge 8 px above the bar's top
                  bottom: `calc(100% - ${pY(ir, LM.barY)}px + 8px)`,
                  left: pX(ir, LM.saveBtnL),
                  right: ir.left + pW(ir, 1 - LM.saveBtnR),
                  display: "flex",
                  gap: 6,
                  zIndex: 20,
                }}
              >
                <input
                  autoFocus type="text"
                  placeholder="Name this outfit…"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSave()}
                  data-testid="input-outfit-name"
                  style={{
                    flex: 1, height: 38, borderRadius: 20, padding: "0 14px",
                    fontSize: 13, fontWeight: 600, color: "#3a2400",
                    background: "rgba(255,252,245,0.98)",
                    border: "1.5px solid rgba(196,155,42,0.50)",
                    boxShadow: "0 3px 12px rgba(0,0,0,0.14)", outline: "none",
                  }}
                />
                <button
                  onClick={() => { setIsSaveOpen(false); setSaveName(""); }}
                  style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(255,250,240,0.97)",
                    border: "1.5px solid rgba(196,155,42,0.36)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X style={{ width: 14, height: 14, color: GOLD }} />
                </button>
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim() || saveOutfit.isPending}
                  data-testid="button-save-outfit-confirm"
                  style={{
                    padding: "0 16px", height: 38, borderRadius: 20, flexShrink: 0,
                    background: "linear-gradient(to bottom,#f5d840,#c89018)",
                    color: "#3a2400", fontWeight: 700, fontSize: 13, border: "none",
                    boxShadow: "0 3px 10px rgba(200,168,24,0.32)",
                    opacity: (!saveName.trim() || saveOutfit.isPending) ? 0.42 : 1,
                    cursor: "pointer",
                  }}
                >
                  {saveOutfit.isPending ? "…" : "Save ♡"}
                </button>
              </motion.div>
            ) : (
              /* Transparent tap zone over the "SAVE OUTFIT" pill */
              <button
                key="save-zone"
                onClick={handleSaveClick}
                data-testid="button-save-outfit"
                aria-label="Save Outfit"
                style={{
                  position: "absolute",
                  top: pY(ir, LM.barY),
                  left: pX(ir, LM.saveBtnL),
                  right: ir.left + pW(ir, 1 - LM.saveBtnR),
                  height: barH,
                  zIndex: 14,
                  background: "transparent", border: "none", cursor: "pointer",
                  borderRadius: 20,
                  // Gold glow ring when a complete outfit is selected
                  boxShadow: canSave
                    ? "0 0 0 2.5px rgba(196,155,42,0.55), 0 4px 16px rgba(200,168,24,0.28)"
                    : "none",
                }}
              />
            )}
          </AnimatePresence>

          {/* Mannequin / dress-form icon */}
          <button
            onClick={handleMannequinClick}
            disabled={!canSave}
            data-testid="button-view-mannequin"
            title="View on mannequin"
            style={{
              position: "absolute",
              top: pY(ir, LM.barY),
              left: pX(ir, LM.manneCX) - 26,
              width: 52, height: barH,
              zIndex: 14,
              background: "transparent", border: "none",
              cursor: canSave ? "pointer" : "default",
              opacity: canSave ? 1 : 0.32,
            }}
          />
        </>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {showMannequin && (
          <MannequinView
            top={centred.tops} bottom={centred.bottoms} shoes={centred.shoes}
            onClose={() => setShowMannequin(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {upgradeReason && (
          <UpgradeSheet reason={upgradeReason} onClose={() => setUpgradeReason(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPremium && <PremiumSheet onClose={() => setShowPremium(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {addCategory && (
          <QuickAddSheet
            key={addCategory}
            open={!!addCategory}
            onOpenChange={open => !open && setAddCategory(null)}
            category={addCategory}
            existingCount={rowData[addCategory as RowKey]?.length ?? 0}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {detailsItem && (
          <ItemDetailsSheet
            key={detailsItem.id}
            item={detailsItem}
            onClose={() => setDetailsItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
