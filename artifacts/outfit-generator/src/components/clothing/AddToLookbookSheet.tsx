/**
 * AddToLookbookSheet — slide-up picker listing every saved lookbook group.
 * Each row shows a 3-thumbnail preview + the group name.
 * A filled checkmark appears on groups that already contain the item.
 * Tapping a row adds (or removes) the item from that group.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { Bookmark } from "lucide-react";
import {
  useListOutfits,
  useAddItemToOutfit,
  useRemoveItemFromOutfit,
  getListOutfitsQueryKey,
  type ClothingItem,
  type SavedOutfit,
} from "@/hooks/useLocalDB";
import { useQueryClient } from "@tanstack/react-query";
import { getImageUrl } from "@/lib/utils";

// ── Tiny 3-thumbnail strip ────────────────────────────────────────────────────

function ThumbStrip({ items }: { items: ClothingItem[] }) {
  const shown = items.slice(0, 3);
  return (
    <div className="flex gap-1 shrink-0">
      {shown.map((item) => (
        <div
          key={item.id}
          className="w-10 h-10 border-2 border-black rounded overflow-hidden bg-[#F5EDD8] shrink-0"
        >
          {item.imageObjectPath ? (
            <img
              src={getImageUrl(item.imageObjectPath)!}
              alt={item.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[9px] text-black/25">—</span>
            </div>
          )}
        </div>
      ))}
      {/* Placeholder squares if fewer than 3 items */}
      {Array.from({ length: Math.max(0, 3 - shown.length) }).map((_, i) => (
        <div
          key={`ph-${i}`}
          className="w-10 h-10 border-2 border-dashed border-black/20 rounded bg-black/5 shrink-0"
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AddToLookbookSheetProps {
  item: ClothingItem;
  onClose: () => void;
}

export function AddToLookbookSheet({ item, onClose }: AddToLookbookSheetProps) {
  const { data: outfits = [] } = useListOutfits();
  const addItem    = useAddItemToOutfit();
  const removeItem = useRemoveItemFromOutfit();
  const qc         = useQueryClient();

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListOutfitsQueryKey() });

  const toggle = (outfit: SavedOutfit) => {
    const alreadyIn = (outfit.items ?? []).some((i) => i.id === item.id);
    if (alreadyIn) {
      removeItem.mutate(
        { id: outfit.id, itemId: item.id },
        { onSuccess: invalidate },
      );
    } else {
      addItem.mutate(
        { id: outfit.id, data: { itemId: item.id } },
        { onSuccess: invalidate },
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 280 }}
      className="fixed inset-0 z-[80] flex flex-col max-w-md mx-auto bg-[#f9f4ee]"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4
                   bg-white border-b-2 border-black flex-shrink-0"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          paddingBottom: "0.75rem",
        }}
      >
        <h2 className="font-display font-bold text-xl uppercase tracking-tight">
          Add to Lookbook
        </h2>
        <button
          onClick={onClose}
          className="w-9 h-9 border-2 border-black rounded-full flex items-center justify-center
                     bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                     active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {outfits.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
            <Bookmark className="w-10 h-10 text-black/20" />
            <p className="text-sm font-medium text-black/40">
              No lookbooks yet — save a drink first.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {outfits.map((outfit) => {
              const alreadyIn = (outfit.items ?? []).some((i) => i.id === item.id);
              return (
                <button
                  key={outfit.id}
                  onClick={() => toggle(outfit)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left
                              transition-all active:scale-[0.98]
                              ${alreadyIn
                                ? "border-black bg-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                : "border-black/20 bg-white hover:border-black"
                              }`}
                >
                  <ThumbStrip items={outfit.items ?? []} />

                  <span
                    className={`flex-1 font-bold text-sm uppercase tracking-tight truncate
                                ${alreadyIn ? "text-primary-foreground" : "text-black"}`}
                  >
                    {outfit.name}
                  </span>

                  {alreadyIn && (
                    <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
