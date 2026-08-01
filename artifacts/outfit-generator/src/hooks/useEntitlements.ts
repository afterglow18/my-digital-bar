/**
 * useEntitlements — maps RevenueCat subscription state to the app's tier/caps model.
 *
 * Source of truth: useSubscription() (RevenueCat).
 * RC entitlement identifier: "My Digital Bar Pro"
 * No localStorage, no Stripe, no hardcoded flags.
 *
 * Tier mapping:
 *   no active RC entitlement        → "free"   (up to 20 items, 5 drinks)
 *   "My Digital Bar Pro" active     → "unlock"  (unlimited everything)
 *
 * PurchaseResult:
 *   "success"     — subscription activated
 *   "cancelled"   — user dismissed the native purchase sheet
 *   "unavailable" — not running on a native device, or no products loaded yet
 */
import { useCallback } from "react";
import { Tier, TIER_CAPS, TierCapabilities } from "@/lib/entitlements";
import { useSubscription } from "@/lib/revenuecat";

export type PurchaseResult = "success" | "cancelled" | "unavailable";
export type PurchaseProduct = "unlock" | "premium"; // kept for call-site compat

// setGlobalTier is no longer needed (RC manages state) but keep the export so
// App.tsx doesn't need special-casing if any old import remains.
export function setGlobalTier(_t: Tier): void { /* no-op */ }

export function useEntitlements() {
  const { isSubscribed, offerings, purchase: rcPurchase, isPurchasing } =
    useSubscription();

  // Both "unlock" and "premium" products now map to the RC "unlock" tier.
  const tier: Tier = isSubscribed ? "unlock" : "free";
  const caps: TierCapabilities = TIER_CAPS[tier];

  const canAddItem = useCallback(
    (count: number) => caps.maxItems === null || count < caps.maxItems,
    [caps.maxItems],
  );

  const canSaveOutfit = useCallback(
    (count: number) => caps.maxOutfits === null || count < caps.maxOutfits,
    [caps.maxOutfits],
  );

  const purchase = useCallback(
    async (_product: PurchaseProduct): Promise<PurchaseResult> => {
      const pkg = offerings?.current?.availablePackages?.[0];
      if (!pkg) return "unavailable";

      try {
        await rcPurchase(pkg);
        return "success";
      } catch (err: unknown) {
        // RevenueCat throws with userCancelled flag on user dismiss
        if (err && typeof err === "object" && "userCancelled" in err) {
          return "cancelled";
        }
        const msg = err instanceof Error ? err.message.toLowerCase() : "";
        if (msg.includes("cancel") || msg.includes("dismiss")) return "cancelled";
        return "unavailable";
      }
    },
    [offerings, rcPurchase],
  );

  return { tier, caps, canAddItem, canSaveOutfit, purchase, isPurchasing };
}
