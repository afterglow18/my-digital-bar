import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";

/**
 * One-time ONNX Runtime configuration that must run before any inference.
 *
 * Why Object.defineProperty instead of a plain assignment:
 *   @imgly/background-removal internally does `ort.env.wasm.proxy = false` right
 *   before creating the inference session (it only enables the proxy when WebGPU is
 *   available, which it isn't on iOS Safari/WKWebView). A plain `proxy = true`
 *   assignment gets clobbered. Locking the property with a no-op setter means imgly's
 *   write is silently ignored and the value stays true — ONNX Runtime then offloads
 *   inference to a Web Worker, keeping the main thread responsive.
 *
 * Why numThreads = 1:
 *   iOS Safari has no SharedArrayBuffer, which WASM multithreading requires.
 *   Threads > 1 causes a silent crash on WKWebView.
 *
 * Why dynamic import():
 *   Importing onnxruntime-web at module parse time triggers Vite's dependency
 *   pre-bundling mid-session, causing a full page reload that corrupts React's
 *   internal dispatcher. Importing dynamically (inside the function) means it only
 *   loads the moment inference is first requested — after React is fully stable.
 */
let ortConfigured = false;

async function configureOrt(): Promise<void> {
  if (ortConfigured) return;
  ortConfigured = true;

  const ort = await import("onnxruntime-web");

  // Lock proxy = true so imgly cannot reset it to false
  Object.defineProperty(ort.env.wasm, "proxy", {
    get: () => true,
    set: () => {},      // no-op — blocks imgly's internal `proxy = false` write
    configurable: true, // allow re-definition if called again
  });

  // Single thread — iOS Safari has no SharedArrayBuffer
  ort.env.wasm.numThreads = 1;
}

/**
 * Remove the background from a JPEG/PNG base64 data-URL.
 * Returns a PNG data-URL with transparent background.
 *
 * Inference runs in a Web Worker (via the locked proxy setting) so the main
 * thread stays responsive during the ~5-15 s model run on iOS.
 *
 * On first ever call: downloads ~15 MB ONNX model from imgly CDN (cached after).
 * Throws on network error or unreadable image — callers should catch and fall back.
 */
export async function removeBackground(dataUrl: string): Promise<string> {
  await configureOrt();

  const sourceBlob = await dataUrlToBlob(dataUrl);
  const resultBlob = await imglyRemoveBackground(sourceBlob, {
    model: "isnet_fp16",
    output: { format: "image/png", quality: 0.9 },
  });
  return blobToDataUrl(resultBlob);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
