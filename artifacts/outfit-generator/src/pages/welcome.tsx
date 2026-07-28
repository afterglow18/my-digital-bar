/**
 * WelcomePage — three-phase animated entry.
 *
 * idle    : dark screen, empty cocktail glass, "Enter Bar" button
 * pouring : amber liquid fills the glass (~1.6 s); button fades out
 * reveal  : hero image fades in over the glass → calls onEnter()
 */

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

type Phase = "idle" | "pouring" | "reveal";
interface Props { onEnter: () => void; }

// ── Cocktail glass SVG ─────────────────────────────────────────────────────────
// viewBox 0 0 100 185 — highball glass with pour stream + rising liquid
function CocktailGlass({ pouring }: { pouring: boolean }) {
  return (
    <svg
      viewBox="0 0 100 185"
      width={165}
      height={306}
      style={{ overflow: "visible" }}
      aria-hidden
    >
      <defs>
        {/* Clip liquid to glass interior */}
        <clipPath id="wc-clip">
          <path d="M 17 20 L 83 20 L 78 158 L 22 158 Z" />
        </clipPath>

        {/* Amber liquid (horizontal gradient for depth) */}
        <linearGradient id="wc-liquid" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#6B2E0A" />
          <stop offset="28%"  stopColor="#C07030" />
          <stop offset="60%"  stopColor="#E8A040" />
          <stop offset="100%" stopColor="#A85020" />
        </linearGradient>

        {/* Glass wall (glass material look) */}
        <linearGradient id="wc-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.28)" />
          <stop offset="22%"  stopColor="rgba(255,255,255,0.06)" />
          <stop offset="78%"  stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.24)" />
        </linearGradient>

        {/* Ambient glow behind glass when full */}
        <radialGradient id="wc-glow" cx="50%" cy="60%" r="50%">
          <stop offset="0%"   stopColor="#C87030" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#C87030" stopOpacity="0"   />
        </radialGradient>

        {/* Liquid surface highlight */}
        <linearGradient id="wc-surface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,210,100,0.80)" />
          <stop offset="100%" stopColor="rgba(200,120,50,0.10)"  />
        </linearGradient>
      </defs>

      {/* ── Ambient glow (expands as glass fills) ── */}
      <motion.ellipse
        cx={50} cy={110} rx={62} ry={68}
        fill="url(#wc-glow)"
        initial={{ opacity: 0 }}
        animate={{ opacity: pouring ? 1 : 0 }}
        transition={{ duration: 1.1, delay: 0.8, ease: "easeOut" }}
      />

      {/* ── Pour stream — thin amber line that falls into the glass ── */}
      <motion.rect
        x={47.5} width={5} rx={2.5}
        fill="#D08030"
        initial={{ y: -22, height: 0, opacity: 0 }}
        animate={pouring
          ? { y: [-22, -22, 20, 20], height: [0, 42, 42, 0], opacity: [0, 0.95, 0.95, 0] }
          : { y: -22, height: 0, opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeIn", times: [0, 0.06, 0.80, 1] }}
      />

      {/* ── Liquid fill (rises from bottom) ── */}
      <motion.rect
        x={17} width={66}
        clipPath="url(#wc-clip)"
        fill="url(#wc-liquid)"
        initial={{ y: 158, height: 0 }}
        animate={pouring ? { y: 38, height: 120 } : { y: 158, height: 0 }}
        transition={{ duration: 1.40, ease: [0.18, 0.05, 0.28, 1.0], delay: 0.28 }}
        style={{ opacity: 0.92 }}
      />

      {/* ── Liquid surface — thin bright band at the top of the liquid ── */}
      <motion.rect
        x={17} width={66} height={6}
        clipPath="url(#wc-clip)"
        fill="url(#wc-surface)"
        initial={{ y: 158 }}
        animate={pouring ? { y: 38 } : { y: 158 }}
        transition={{ duration: 1.40, ease: [0.18, 0.05, 0.28, 1.0], delay: 0.28 }}
        style={{ opacity: 0.75 }}
      />

      {/* ── Bubbles (rise through liquid while pouring) ── */}
      {([
        { cx: 36, delay: 0.55, size: 2.8 },
        { cx: 56, delay: 0.80, size: 2.2 },
        { cx: 45, delay: 1.05, size: 2.0 },
        { cx: 63, delay: 1.20, size: 1.6 },
      ] as const).map(({ cx, delay, size }, i) => (
        <motion.circle
          key={i}
          cx={cx} r={size}
          fill="rgba(255,210,130,0.60)"
          clipPath="url(#wc-clip)"
          initial={{ cy: 155, opacity: 0 }}
          animate={pouring
            ? { cy: [148, 55], opacity: [0, 0.75, 0] }
            : { cy: 155, opacity: 0 }}
          transition={{
            duration: 1.1, delay,
            ease: "easeOut",
            times: [0, 0.70, 1],
          }}
        />
      ))}

      {/* ── Glass body ── */}
      <path
        d="M 13 19 L 87 19 L 81 160 Q 81 166 74 166 L 26 166 Q 19 166 19 160 Z"
        fill="url(#wc-wall)"
        stroke="rgba(255,255,255,0.38)"
        strokeWidth={1.2}
      />

      {/* ── Rim ellipse ── */}
      <ellipse
        cx={50} cy={19} rx={37} ry={4.5}
        fill="rgba(255,255,255,0.10)"
        stroke="rgba(255,255,255,0.42)"
        strokeWidth={1.0}
      />

      {/* ── Left wall highlight ── */}
      <path
        d="M 19 28 L 23 153"
        stroke="rgba(255,255,255,0.24)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* ── Right wall faint shadow ── */}
      <path
        d="M 79 28 L 76 153"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />

      {/* ── Ice cubes (visible only when glass is empty / idle) ── */}
      <motion.g
        animate={{ opacity: pouring ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* cube 1 */}
        <rect x={26} y={128} width={18} height={16} rx={2}
          fill="rgba(200,235,255,0.22)" stroke="rgba(200,235,255,0.45)" strokeWidth={0.8} />
        <line x1={26} y1={133} x2={44} y2={133}
          stroke="rgba(255,255,255,0.22)" strokeWidth={0.6} />
        {/* cube 2 */}
        <rect x={48} y={132} width={16} height={14} rx={2}
          fill="rgba(200,235,255,0.18)" stroke="rgba(200,235,255,0.38)" strokeWidth={0.8} />
        <line x1={48} y1={136} x2={64} y2={136}
          stroke="rgba(255,255,255,0.18)" strokeWidth={0.6} />
        {/* cube 3 */}
        <rect x={34} y={140} width={20} height={14} rx={2}
          fill="rgba(200,235,255,0.20)" stroke="rgba(200,235,255,0.42)" strokeWidth={0.8} />
      </motion.g>

      {/* ── Sparkle burst when glass is full ── */}
      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        animate={pouring
          ? { opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1.1, 0.9] }
          : { opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.55, delay: 1.62, times: [0, 0.25, 0.7, 1] }}
        style={{ transformOrigin: "50px 80px" }}
      >
        {/* 8 radial lines */}
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const r1 = 20, r2 = 34;
          return (
            <line
              key={i}
              x1={50 + r1 * Math.cos(angle)} y1={80 + r1 * Math.sin(angle)}
              x2={50 + r2 * Math.cos(angle)} y2={80 + r2 * Math.sin(angle)}
              stroke="#E8C060"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}
      </motion.g>
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function WelcomePage({ onEnter }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const calledRef = useRef(false);

  const finish = useCallback(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    onEnter();
  }, [onEnter]);

  const handleEnter = () => {
    if (phase !== "idle") return;
    setPhase("pouring");
    setTimeout(() => setPhase("reveal"), 1800);
    setTimeout(finish, 2800);
  };

  const pouring = phase !== "idle";

  return (
    <div
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
      {/* ── Hero image — slides in as the glass fills ── */}
      <motion.div
        style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "reveal" ? 1 : 0 }}
        transition={{ duration: 0.95, ease: "easeIn" }}
      >
        <img
          src="/bar-hero.png"
          alt="My Digital Bar"
          draggable={false}
          style={{
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "top center",
            display: "block", userSelect: "none", pointerEvents: "none",
          }}
        />
        {/* Bottom fade so the button bar below reads cleanly */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "22%",
          background: "linear-gradient(to bottom, transparent, #0B0704)",
        }} />
      </motion.div>

      {/* ── Glass area ── */}
      <div style={{
        position: "relative", zIndex: 2,
        flex: 1, width: "100%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 18,
      }}>
        {/* Title — fades out on click so the hero can take over cleanly */}
        <motion.div
          animate={{ opacity: pouring ? 0 : 1, y: pouring ? -6 : 0 }}
          transition={{ duration: 0.35 }}
          style={{
            fontFamily: "var(--font-display, serif)",
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "rgba(232,212,176,0.82)",
            textAlign: "center",
            userSelect: "none",
          }}
        >
          MY DIGITAL BAR
        </motion.div>

        <CocktailGlass pouring={pouring} />

        <motion.p
          animate={{ opacity: pouring ? 0 : 1, y: pouring ? 6 : 0 }}
          transition={{ duration: 0.35 }}
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(232,212,176,0.38)",
            margin: 0,
            userSelect: "none",
          }}
        >
          your drink collection
        </motion.p>
      </div>

      {/* ── Bottom bar — zIndex 6 so it sits above the hero overlay ── */}
      <div style={{
        position: "relative", zIndex: 6,
        width: "100%",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 12,
        padding: "16px 28px 8px",
        background: "#0B0704",
      }}>
        <motion.button
          onClick={handleEnter}
          animate={{ opacity: phase === "idle" ? 1 : 0, y: phase === "idle" ? 0 : 8 }}
          transition={{ duration: 0.28 }}
          style={{
            width: "100%", maxWidth: 340,
            fontFamily: "var(--font-display, sans-serif)",
            fontWeight: 800, fontSize: 16,
            letterSpacing: "0.03em",
            color: "#3A2210",
            background: "linear-gradient(to bottom, #E8D4B0, #B8894E)",
            border: "1.5px solid #B8894E",
            borderRadius: 100,
            padding: "15px 40px",
            cursor: phase === "idle" ? "pointer" : "default",
            boxShadow: "0 4px 20px rgba(120,80,40,0.45), 2px 2px 0 rgba(0,0,0,0.7)",
            pointerEvents: phase === "idle" ? "auto" : "none",
          }}
        >
          Enter Bar ✨
        </motion.button>

        <motion.div
          animate={{ opacity: phase === "idle" ? 1 : 0 }}
          transition={{ duration: 0.28 }}
          style={{ display: "flex", gap: 20, paddingBottom: 6 }}
        >
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
        </motion.div>
      </div>
    </div>
  );
}
