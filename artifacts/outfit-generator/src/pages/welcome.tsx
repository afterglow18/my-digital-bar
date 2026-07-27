/**
 * WelcomePage — Bar hero splash screen.
 *
 * IDLE    : bar image + button.
 * EXITING : whole screen fades out → onEnter().
 */

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface Props { onEnter: () => void; }

export default function WelcomePage({ onEnter }: Props) {
  const [exiting, setExiting] = useState(false);
  const calledRef = useRef(false);

  const finish = useCallback(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    onEnter();
  }, [onEnter]);

  const handleOpen = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(finish, 550);
  };

  return (
    <motion.div
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.55, ease: "easeIn" }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#0B0704",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "space-between",
        overflow: "hidden",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* ── Hero image — fills most of the screen ── */}
      <div style={{ flex: 1, width: "100%", position: "relative", overflow: "hidden" }}>
        <img
          src="/bar-hero.png"
          alt="My Digital Bar"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            display: "block",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
        {/* Subtle bottom fade so the button area reads cleanly */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: "22%",
          background: "linear-gradient(to bottom, transparent, #0B0704)",
        }} />
      </div>

      {/* ── Bottom area: subtitle + button + links ── */}
      <div style={{
        width: "100%",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 12,
        padding: "16px 28px 8px",
        background: "#0B0704",
      }}>
        <p style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "rgba(232,212,176,0.45)",
          margin: 0,
        }}>
          your drink collection
        </p>

        <motion.button
          onClick={handleOpen}
          animate={{ opacity: exiting ? 0 : 1, y: exiting ? 6 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            width: "100%",
            maxWidth: 340,
            fontFamily: "var(--font-display, sans-serif)",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: "0.03em",
            color: "#3A2210",
            background: "linear-gradient(to bottom, #E8D4B0, #B8894E)",
            border: "1.5px solid #B8894E",
            borderRadius: 100,
            padding: "15px 40px",
            cursor: exiting ? "default" : "pointer",
            boxShadow: "0 4px 20px rgba(120,80,40,0.45), 2px 2px 0 rgba(0,0,0,0.7)",
            pointerEvents: exiting ? "none" : "auto",
          }}
        >
          Open Bar ✨
        </motion.button>

        {/* Legal links */}
        <div style={{ display: "flex", gap: 20, paddingBottom: 6 }}>
          <a
            href="https://classy-alpaca-441.notion.site/Privacy-Policy-39682db6065380b19dedcb108d4a0ef4"
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.22)", textDecoration: "none", letterSpacing: "0.02em" }}
          >Privacy Policy</a>
          <a
            href="https://app.notion.com/p/My-Digital-Closet-Support-39782db60653802a9088dcbae84c0527?source=copy_link"
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.22)", textDecoration: "none", letterSpacing: "0.02em" }}
          >Support</a>
        </div>
      </div>
    </motion.div>
  );
}
