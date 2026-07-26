/**
 * CleanUpPhotoSheet
 *
 * Full-screen overlay that runs @imgly/background-removal on-device against
 * an existing item's stored image, then lets the user pick Original or Cleaned.
 *
 * UX contract:
 *   • onSaved(url) is called IMMEDIATELY when the user confirms — before the
 *     DB write — so the parent can update its displayed image without flash.
 *   • The DB mutation fires in the background; failure is logged, not surfaced
 *     (the optimistic value is already on screen and in the parent's state).
 *
 * Phase flow:  processing ──► compare
 *                         └──► error
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Check } from "lucide-react";
import { removeBackground } from "@/lib/backgroundRemoval";
import {
  useUpdateClothingItem,
  getListClothingQueryKey,
  getWardrobeStatsQueryKey,
} from "@/hooks/useLocalDB";
import { useQueryClient } from "@tanstack/react-query";

// Pink used for the selection ring / label — matches the spec.
const PINK = "#ec4899";

type Phase = "processing" | "compare" | "error";

interface Props {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  itemId:       number;
  /** Current stored image — base64 data URL or any src string. */
  sourceUrl:    string;
  /** Called optimistically with the chosen URL before the DB write completes. */
  onSaved:      (newUrl: string) => void;
}

export function CleanUpPhotoSheet({ open, onOpenChange, itemId, sourceUrl, onSaved }: Props) {
  const [phase,      setPhase]      = useState<Phase>("processing");
  const [cleanedUrl, setCleanedUrl] = useState<string | null>(null);
  const [selected,   setSelected]   = useState<"original" | "cleaned">("cleaned");
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  const updateItem  = useUpdateClothingItem();
  const queryClient = useQueryClient();

  // Kick off removal every time the sheet opens
  useEffect(() => {
    if (!open) return;

    setPhase("processing");
    setCleanedUrl(null);
    setSelected("cleaned");
    setErrorMsg(null);

    let cancelled = false;
    removeBackground(sourceUrl)
      .then((url) => {
        if (cancelled) return;
        setCleanedUrl(url);
        setPhase("compare");
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[CleanUpPhoto] bg removal failed:", err);
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setPhase("error");
      });

    return () => { cancelled = true; };
  }, [open, sourceUrl]);

  const handleConfirm = useCallback(() => {
    const chosenUrl = selected === "cleaned" && cleanedUrl ? cleanedUrl : sourceUrl;

    // 1. Tell parent immediately — UI shows new image without any flash
    onSaved(chosenUrl);
    onOpenChange(false);

    // 2. Persist in background — errors are non-fatal (optimistic value is live)
    updateItem.mutate(
      { id: itemId, data: { imageObjectPath: chosenUrl } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClothingQueryKey() });
          queryClient.invalidateQueries({ queryKey: getWardrobeStatsQueryKey() });
        },
        onError: (err) => {
          console.error("[CleanUpPhoto] DB write failed:", err);
        },
      },
    );
  }, [selected, cleanedUrl, sourceUrl, itemId, onSaved, onOpenChange, updateItem, queryClient]);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 240 }}
      className="fixed inset-0 z-[75] flex flex-col max-w-md mx-auto bg-[#f9f4ee]"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 bg-white border-b-2 border-black flex-shrink-0"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "0.75rem" }}
      >
        <h2 className="font-display font-bold text-xl uppercase tracking-tight">
          Clean Up Photo
        </h2>
        {phase !== "processing" && (
          <button
            onClick={() => onOpenChange(false)}
            className="w-9 h-9 border-2 border-black rounded-full flex items-center justify-center
                       bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                       active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* ── PROCESSING ── */}
        {phase === "processing" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 20, padding: 24 }}>
            <div className="w-28 h-28 border-4 border-black rounded-3xl bg-white flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <Loader2 className="w-12 h-12 animate-spin" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-2xl uppercase tracking-tight">
                Removing Background…
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Running on-device. This may take a moment.
              </p>
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {phase === "error" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
            <p className="text-5xl">😔</p>
            <div className="text-center">
              <p className="font-display font-bold text-xl uppercase tracking-tight">
                Couldn't Remove Background
              </p>
              <p className="text-sm text-black/50 mt-1 max-w-xs">
                {errorMsg ?? "An unknown error occurred."}
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="mt-2 px-6 py-3 border-2 border-black rounded-xl bg-white font-bold uppercase text-sm
                         shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                         active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              Close
            </button>
          </div>
        )}

        {/* ── COMPARE ── */}
        {phase === "compare" && cleanedUrl && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20, flex: 1 }}>
            <p style={{ textAlign: "center", fontWeight: "bold", fontSize: 11,
                        textTransform: "uppercase", letterSpacing: 2, opacity: 0.45, margin: 0 }}>
              Tap to choose
            </p>

            <div style={{ display: "flex", gap: 12 }}>
              {/* Original card */}
              <button
                onClick={() => setSelected("original")}
                style={{
                  flex: 1, padding: 0, background: "none", border: "none",
                  cursor: "pointer", borderRadius: 16, overflow: "hidden",
                  outline: selected === "original"
                    ? `4px solid ${PINK}` : "4px solid rgba(0,0,0,0.15)",
                  outlineOffset: -4,
                  transition: "outline 0.15s",
                }}
              >
                <div style={{ background: "#111", minHeight: 200, position: "relative" }}>
                  <img
                    src={sourceUrl}
                    alt="Original"
                    style={{ width: "100%", objectFit: "contain", maxHeight: 200, display: "block" }}
                  />
                  {selected === "original" && (
                    <div style={{
                      position: "absolute", top: 8, right: 8, width: 22, height: 22,
                      borderRadius: "50%", background: PINK,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 0 0 2px white",
                    }}>
                      <Check size={13} color="white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p style={{
                  textAlign: "center", fontWeight: 800, fontSize: 11,
                  textTransform: "uppercase", padding: "7px 0", margin: 0,
                  background: "#f9f4ee", letterSpacing: "0.05em",
                  color: selected === "original" ? PINK : "black",
                }}>
                  Original
                </p>
              </button>

              {/* Cleaned card */}
              <button
                onClick={() => setSelected("cleaned")}
                style={{
                  flex: 1, padding: 0, background: "none", border: "none",
                  cursor: "pointer", borderRadius: 16, overflow: "hidden",
                  outline: selected === "cleaned"
                    ? `4px solid ${PINK}` : "4px solid rgba(0,0,0,0.15)",
                  outlineOffset: -4,
                  transition: "outline 0.15s",
                }}
              >
                {/* Checkerboard reveals transparency */}
                <div style={{
                  background: "repeating-conic-gradient(#d1d5db 0% 25%, white 0% 50%) 0 0 / 12px 12px",
                  minHeight: 200, position: "relative",
                }}>
                  <img
                    src={cleanedUrl}
                    alt="Background removed"
                    style={{ width: "100%", objectFit: "contain", maxHeight: 200, display: "block" }}
                  />
                  {selected === "cleaned" && (
                    <div style={{
                      position: "absolute", top: 8, right: 8, width: 22, height: 22,
                      borderRadius: "50%", background: PINK,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 0 0 2px white",
                    }}>
                      <Check size={13} color="white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p style={{
                  textAlign: "center", fontWeight: 800, fontSize: 11,
                  textTransform: "uppercase", padding: "7px 0", margin: 0,
                  background: "#f9f4ee", letterSpacing: "0.05em",
                  color: selected === "cleaned" ? PINK : "black",
                }}>
                  Cleaned ✨
                </p>
              </button>
            </div>

            {/* Confirm */}
            <button
              onClick={handleConfirm}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 14,
                border: "3px solid black", background: "#000",
                color: "white", fontWeight: 800, fontSize: 14,
                cursor: "pointer", letterSpacing: "0.03em",
                boxShadow: "3px 3px 0 rgba(0,0,0,0.35)",
              }}
            >
              {selected === "cleaned" ? "✓ Save Cleaned Version" : "✓ Save Original"}
            </button>
          </div>
        )}

      </div>
    </motion.div>
  );
}
