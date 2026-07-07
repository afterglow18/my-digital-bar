/**
 * FavoritesPage ("Totally 💛") — every clothing item the user has hearted.
 * Design mirrors SavedPage (Lookbook) exactly.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import {
  useListClothing,
  useUpdateClothingItem,
  getListClothingQueryKey,
  ClothingItem,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getImageUrl } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  tops:        "Top",
  bottoms:     "Bottom",
  shoes:       "Shoes",
  accessories: "Accessory",
  outerwear:   "Jacket",
  dresses:     "Dress",
};

function FavoriteCard({ item }: { item: ClothingItem }) {
  const updateItem  = useUpdateClothingItem();
  const queryClient = useQueryClient();

  const handleUnheart = () => {
    updateItem.mutate(
      { id: item.id, data: { isFavorite: false } },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: getListClothingQueryKey() }),
      }
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden"
    >
      {/* Card header — yellow bar with item name + heart button */}
      <div className="px-4 py-3 border-b-2 border-black flex justify-between items-center bg-primary">
        <h3 className="font-display font-bold text-lg uppercase tracking-tight truncate pr-2">
          {item.name || CATEGORY_LABELS[item.category ?? ""] || "Item"}
        </h3>
        <button
          onClick={handleUnheart}
          disabled={updateItem.isPending}
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center
                     bg-red-500 border-2 border-black rounded-full
                     shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                     active:translate-y-0.5 active:translate-x-0.5 active:shadow-none
                     transition-all disabled:opacity-50"
          title="Remove from Totally"
        >
          <Heart className="w-3.5 h-3.5 text-white" fill="white" />
        </button>
      </div>

      {/* Item photo */}
      <div
        className="w-full h-52 border-b-2 border-black overflow-hidden"
        style={{ background: "#FDECEF" }}
      >
        {item.imageObjectPath ? (
          <img
            src={getImageUrl(item.imageObjectPath)!}
            alt={item.name}
            className="w-full h-full"
            style={{ objectFit: "contain", objectPosition: "center" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-20">
              {item.category === "shoes"
                ? "👟"
                : item.category === "dresses"
                ? "👗"
                : item.category === "accessories"
                ? "👜"
                : "👚"}
            </span>
          </div>
        )}
      </div>

      {/* Footer: category */}
      <div className="px-3 py-3">
        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">
          {CATEGORY_LABELS[item.category ?? ""] ?? item.category}
        </span>
      </div>
    </motion.div>
  );
}

export default function FavoritesPage() {
  // Fetch all categories — hook count is fixed, React rules compliant
  const { data: tops        = [], isLoading: l1 } = useListClothing({ category: "tops"        });
  const { data: bottoms     = [], isLoading: l2 } = useListClothing({ category: "bottoms"     });
  const { data: shoes       = [], isLoading: l3 } = useListClothing({ category: "shoes"       });
  const { data: accessories = [], isLoading: l4 } = useListClothing({ category: "accessories" });
  const { data: outerwear   = [], isLoading: l5 } = useListClothing({ category: "outerwear"   });
  const { data: dresses     = [], isLoading: l6 } = useListClothing({ category: "dresses"     });

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6;

  const favorites = [
    ...tops, ...bottoms, ...shoes, ...accessories, ...outerwear, ...dresses,
  ].filter((item) => item.isFavorite);

  return (
    <div className="min-h-full flex flex-col pt-8 px-4 pb-8 bg-secondary/10 relative">

      {/* Header — matches Lookbook exactly */}
      <header className="mb-6">
        <h1 className="text-4xl font-display font-bold uppercase tracking-tighter mb-1">
          Totally 💛
        </h1>
        <p className="font-medium text-muted-foreground text-sm">Hearted pieces.</p>
      </header>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 bg-muted animate-pulse border-2 border-black rounded-xl" />
          ))}
        </div>
      ) : favorites.length > 0 ? (
        <AnimatePresence mode="popLayout">
          <div className="flex flex-col gap-6">
            {favorites.map((item) => (
              <FavoriteCard key={item.id} item={item} />
            ))}
          </div>
        </AnimatePresence>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8
                        bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                        rounded-xl mt-8">
          <div className="w-14 h-14 bg-accent rounded-full flex items-center justify-center border-2 border-black mb-4">
            <Heart className="w-7 h-7" />
          </div>
          <h3 className="font-display font-bold text-xl mb-2">No faves yet.</h3>
          <p className="text-sm font-medium text-muted-foreground">
            Tap any item in your wardrobe, then tap the ❤️ to save it here.
          </p>
        </div>
      )}
    </div>
  );
}
