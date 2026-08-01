/**
 * Entitlement tier definitions — single source of truth for limits and capabilities.
 *
 * Tiers:
 *   "free"    — default; up to FREE_ITEM_LIMIT items, FREE_OUTFIT_LIMIT saved outfits.
 *   "unlock"  — any active RC subscription ("My Digital Bar Pro"); unlimited everything.
 *   "premium" — reserved alias for "unlock"; maps to the same caps.
 *
 * RevenueCat entitlement identifier: "My Digital Bar Pro"
 * Packages: $rc_monthly | $rc_annual | $rc_lifetime
 */

export type Tier = "free" | "unlock" | "premium";

/** Adjust these constants to run promotions or A/B tests without touching logic. */
export const FREE_ITEM_LIMIT   = 20;
export const FREE_OUTFIT_LIMIT = 5;

export interface TierCapabilities {
  /** Maximum bar items, or null for unlimited. */
  maxItems:   number | null;
  /** Maximum saved drinks, or null for unlimited. */
  maxOutfits: number | null;
}

export const TIER_CAPS: Record<Tier, TierCapabilities> = {
  free:    { maxItems: FREE_ITEM_LIMIT, maxOutfits: FREE_OUTFIT_LIMIT },
  unlock:  { maxItems: null,            maxOutfits: null              },
  premium: { maxItems: null,            maxOutfits: null              },
};

/** @deprecated — RC manages purchase flow via UpgradeSheet directly. */
export type PurchaseProduct = "unlock" | "premium";
