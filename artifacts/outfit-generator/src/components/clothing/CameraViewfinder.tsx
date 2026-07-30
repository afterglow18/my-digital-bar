/**
 * CameraViewfinder
 *
 * Full-screen camera viewfinder using getUserMedia (no file input — avoids
 * WKWebView crash when presenting the native file picker).
 *
 * Flow:
 *   1. Request camera via getUserMedia({ video: { facingMode: "environment" } })
 *   2. Show live video feed with a circular capture button
 *   3. On tap: grab a single frame, stop the stream, return a JPEG Blob
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  onCapture: (blob: Blob) => void;
  onClose:   () => void;
}

export function CameraViewfinder({ onCapture, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera access in Settings."
            : `Could not open camera: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror flip since we use facingMode: "environment" (rear camera)
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (b) => {
        // Stop camera immediately regardless of blob result
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (b && b.size > 1000) {
          onCapture(b);
        } else {
          setError("Failed to capture photo — try again.");
        }
      },
      "image/jpeg",
      0.85,
    );
  }, [onCapture]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#000",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Close button */}
      <button
        onClick={() => {
          streamRef.current?.getTracks().forEach(t => t.stop());
          streamRef.current = null;
          onClose();
        }}
        style={{
          position: "absolute", top: 12, right: 12, zIndex: 10,
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(0,0,0,0.5)", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <X size={20} color="white" />
      </button>

      {error ? (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: 32, textAlign: "center", gap: 16,
        }}>
          <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
            {error}
          </p>
          <button
            onClick={() => {
              streamRef.current?.getTracks().forEach(t => t.stop());
              streamRef.current = null;
              onClose();
            }}
            style={{
              padding: "12px 32px", borderRadius: 100,
              border: "2px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.1)",
              color: "#fff", fontWeight: 700, fontSize: 14,
              cursor: "pointer",
            }}
          >
            Go Back
          </button>
        </div>
      ) : (
        <>
          {/* Video viewfinder */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              flex: 1,
              width: "100%",
              objectFit: "cover",
            }}
          />

          {/* Bottom bar with capture button */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px 0 calc(24px + env(safe-area-inset-bottom))",
            background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
          }}>
            <button
              onClick={handleCapture}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                border: "4px solid rgba(255,255,255,0.8)",
                background: "rgba(255,255,255,0.25)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(4px)",
                transition: "transform 0.1s",
              }}
              onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
              onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "#fff",
              }} />
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
