/**
 * vision.ts — Photo analysis for search indexing.
 *
 * Web:    canvas-based dominant colour extraction (48×48 down-sample).
 * Native: delegates to the VisionAnalyzer Capacitor plugin (Swift).
 *
 * Version scheme stored in `visionVersion` on each item:
 *   0 = unanalysed
 *   1 = indexed by iOS Vision (VNClassify + VNRecognizeText)
 *   4 = indexed by web canvas (current algorithm)
 *   5 = web analysed but no labels found — don't retry
 */

import { registerPlugin, Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { listClothing, updateItemVision } from "./localDB";

// ── Native plugin contract ────────────────────────────────────────────────────

interface VisionAnalyzerPlugin {
  analyze(opts: { base64: string }): Promise<{ labels: string[]; text: string[] }>;
}

const VisionAnalyzer = registerPlugin<VisionAnalyzerPlugin>("VisionAnalyzer");

// ── Version constants ─────────────────────────────────────────────────────────

export const VERSION_UNANALYZED      = 0;
export const VERSION_IOS             = 1;
export const VERSION_WEB             = 4;
export const VERSION_WEB_NO_LABELS   = 5;

// ── Web colour extraction ─────────────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
    case gn: h = (bn - rn) / d + 2;                  break;
    case bn: h = (rn - gn) / d + 4;                  break;
  }
  return [h * 60, s, l];
}

function toColorName(r: number, g: number, b: number): string {
  const brightness = (r + g + b) / 3;
  const [h, s] = rgbToHsl(r, g, b);

  if (brightness < 80)  return "black";
  if (brightness < 110) return "dark grey";

  if (s < 0.12) {
    if (brightness < 175) return "grey";
    if (brightness < 225) return "light grey";
    return "white";
  }
  // Warm low-saturation → earth tones
  if (s < 0.35 && h >= 20 && h < 50) {
    if (brightness < 130) return "brown";
    if (brightness < 180) return "tan";
    return "beige";
  }
  if (h < 20 || h >= 340) return "red";
  if (h < 45)  return "orange";
  if (h < 65)  return "yellow";
  if (h < 170) return "green";
  if (h < 195) return "teal";
  if (h < 265) return "blue";
  if (h < 300) return "purple";
  return "pink";
}

function colorsClose(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): boolean {
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) < 60;
}

/** Extract dominant colours from a data-URL image using a 48×48 canvas. */
export function extractWebColors(dataUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const SIZE = 48;
        const canvas = document.createElement("canvas");
        canvas.width  = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve([]); return; }
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        // Sample 4×4 corner patches to detect studio-background colour
        const PATCH = 4;
        let bgR = 0, bgG = 0, bgB = 0;
        let bgCount = 0;
        for (const [cx, cy] of [
          [0, 0], [SIZE - PATCH, 0],
          [0, SIZE - PATCH], [SIZE - PATCH, SIZE - PATCH],
        ] as [number, number][]) {
          for (let dy = 0; dy < PATCH; dy++) {
            for (let dx = 0; dx < PATCH; dx++) {
              const i = ((cy + dy) * SIZE + (cx + dx)) * 4;
              bgR += data[i]; bgG += data[i + 1]; bgB += data[i + 2];
              bgCount++;
            }
          }
        }
        bgR = Math.round(bgR / bgCount);
        bgG = Math.round(bgG / bgCount);
        bgB = Math.round(bgB / bgCount);

        // Count foreground pixel colour names
        const counts = new Map<string, number>();
        let foreground = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;                              // transparent
          if (colorsClose(r, g, b, bgR, bgG, bgB)) continue; // background
          foreground++;
          const name = toColorName(r, g, b);
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }

        if (foreground === 0) { resolve([]); return; }

        const threshold = foreground * 0.10;
        const result: string[] = [];
        for (const [name, count] of counts) {
          if (count >= threshold) result.push(name);
        }
        resolve(result);
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.crossOrigin = "anonymous";
    img.src = dataUrl;
  });
}

// ── iOS native vision ─────────────────────────────────────────────────────────

async function analyzeNative(
  dataUrl: string,
): Promise<{ labels: string[]; text: string[] }> {
  try {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    return await VisionAnalyzer.analyze({ base64 });
  } catch {
    return { labels: [], text: [] };
  }
}

// ── Background indexer ────────────────────────────────────────────────────────

let _indexerStarted = false;

/**
 * Call once at app start. Finds all items that need (re-)indexing and
 * processes them one at a time with a 350 ms pause between each so the
 * UI stays responsive. Shows a non-blocking toast while running.
 */
export async function startBackgroundIndexer(): Promise<void> {
  if (_indexerStarted) return;
  _indexerStarted = true;

  // Let the UI paint first
  await new Promise<void>((r) => setTimeout(r, 1000));

  const isNative      = Capacitor.isNativePlatform();
  const targetVersion = isNative ? VERSION_IOS : VERSION_WEB;

  try {
    const all = await listClothing();
    const queue = all.filter((item) => {
      if (!item.imageObjectPath) return false;
      const v = item.visionVersion ?? VERSION_UNANALYZED;
      // Re-run anything below the current target version
      // (also re-runs web items at version 4 if targetVersion is 1 — that's fine,
      //  iOS items won't be in this queue on iOS since they'd already be v1)
      if (isNative) return v !== VERSION_IOS;
      return v < VERSION_WEB; // re-run 0,1 on web; skip 4 and 5
    });

    if (queue.length === 0) return;

    const toastId = `vision-indexer`;
    toast.loading(`Preparing photo search… (0 / ${queue.length})`, { id: toastId });

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      try {
        let labels: string[] = [];
        let text:   string[] = [];

        if (isNative) {
          ({ labels, text } = await analyzeNative(item.imageObjectPath!));
        } else {
          labels = await extractWebColors(item.imageObjectPath!);
        }

        const version =
          !isNative && labels.length === 0
            ? VERSION_WEB_NO_LABELS
            : targetVersion;

        await updateItemVision(item.id, {
          visionLabels:  labels,
          visionText:    text,
          visionVersion: version,
        });
      } catch {
        // Non-fatal — skip this item
      }

      toast.loading(
        `Preparing photo search… (${i + 1} / ${queue.length})`,
        { id: toastId },
      );
      await new Promise<void>((r) => setTimeout(r, 350));
    }

    toast.dismiss(toastId);
  } catch {
    // Silent fail — text search still works without vision
  }
}

/**
 * Index a single item immediately (call after adding / updating its photo).
 * Does NOT show a toast.
 */
export async function indexItemNow(itemId: number, dataUrl: string): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  try {
    let labels: string[] = [];
    let text:   string[] = [];
    if (isNative) {
      ({ labels, text } = await analyzeNative(dataUrl));
    } else {
      labels = await extractWebColors(dataUrl);
    }
    const version =
      !isNative && labels.length === 0
        ? VERSION_WEB_NO_LABELS
        : isNative ? VERSION_IOS : VERSION_WEB;
    await updateItemVision(itemId, {
      visionLabels:  labels,
      visionText:    text,
      visionVersion: version,
    });
  } catch {
    // Silent
  }
}
