/**
 * WelcomePage — three-phase splash sequence.
 *
 * hero    : full-screen hero image with dark gradient + "Welcome to" / "MY DIGITAL BAR" (2.5s auto)
 * welcome : martini glass + branding + "Enter Bar ✨" button + privacy/support links
 * pouring : liquid fills glass (~750ms) → calls onEnter()
 *
 * Only shown on cold launch (sessionStorage gated in App.tsx).
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

type Phase = "hero" | "welcome" | "pouring";
interface Props { onEnter: () => void; }

// ── Martini glass SVG ─────────────────────────────────────────────────────────
// viewBox 0 0 100 185 — inverted-cone bowl, thin stem, oval base
// Bowl: left rim (8,24) → right rim (92,24) → point (50,120)
// Stem: (50,120) → (50,162)   Base: ellipse cx=50 cy=162 rx=22 ry=4
function MartiniGlass({ pouring }: { pouring: boolean }) {
  // Bowl geometry
  const BOWL_TOP = 24;   // y of rim
  const BOWL_BOT = 120;  // y of bowl point / stem top

  return (
    <svg
      viewBox="0 0 100 185"
      width={170}
      height={314}
      style={{ overflow: "visible" }}
      aria-hidden
    >
      <defs>
        {/* Clip liquid + surface to the martini bowl triangle */}
        <clipPath id="wc-clip">
          <path d={`M 8 ${BOWL_TOP} L 92 ${BOWL_TOP} L 50 ${BOWL_BOT} Z`} />
        </clipPath>

        {/* Amber liquid — horizontal depth gradient */}
        <linearGradient id="wc-liquid" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#7A3010" />
          <stop offset="30%"  stopColor="#C07030" />
          <stop offset="60%"  stopColor="#F0B050" />
          <stop offset="100%" stopColor="#A85020" />
        </linearGradient>

        {/* Glass wall — subtle transparency gradient */}
        <linearGradient id="wc-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.30)" />
          <stop offset="20%"  stopColor="rgba(255,255,255,0.07)" />
          <stop offset="80%"  stopColor="rgba(255,255,255,0.07)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.26)" />
        </linearGradient>

        {/* Ambient glow */}
        <radialGradient id="wc-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0%"   stopColor="#D08030" stopOpacity="0.60" />
          <stop offset="100%" stopColor="#D08030" stopOpacity="0"   />
        </radialGradient>

        {/* Surface shimmer */}
        <linearGradient id="wc-surface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,215,120,0.85)" />
          <stop offset="100%" stopColor="rgba(220,140,60,0.05)"  />
        </linearGradient>
      </defs>

      {/* ── Ambient glow behind the bowl ── */}
      <motion.ellipse
        cx={50} cy={80} rx={58} ry={52}
        fill="url(#wc-glow)"
        initial={{ opacity: 0 }}
        animate={{ opacity: pouring ? 1 : 0 }}
        transition={{ duration: 0.35, delay: 0.30, ease: "easeOut" }}
      />

      {/* ── Pour stream — falls from above into the wide opening ── */}
      <motion.rect
        x={47.5} width={5} rx={2.5}
        fill="#D08030"
        initial={{ y: -24, height: 0, opacity: 0 }}
        animate={pouring
          ? { y: [-24, -24, BOWL_TOP, BOWL_TOP], height: [0, 22, 22, 0], opacity: [0, 0.90, 0.90, 0] }
          : { y: -24, height: 0, opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeIn", times: [0, 0.06, 0.80, 1] }}
      />

      {/* ── Liquid fill — CSS scale from bowl point (iOS-safe, no SVG attr animation) ── */}
      <motion.g
        style={{ transformOrigin: `50px ${BOWL_BOT}px` }}
        initial={{ scale: 0 }}
        animate={{ scale: pouring ? 1 : 0 }}
        transition={{ duration: 0.48, ease: [0.18, 0.05, 0.28, 1.0], delay: 0.10 }}
      >
        <path
          d={`M 8 ${BOWL_TOP} L 92 ${BOWL_TOP} L 50 ${BOWL_BOT} Z`}
          fill="url(#wc-liquid)"
          opacity={0.90}
        />
        {/* Surface shimmer ellipse */}
        <ellipse
          cx={50} cy={BOWL_TOP} rx={40} ry={3.5}
          fill="rgba(255,215,120,0.70)"
        />
      </motion.g>

      {/* ── Rising bubbles — CSS y transform (iOS-safe) ── */}
      {([
        { cx: 40, startCy: 112, dy: -72, delay: 0.19, size: 2.4 },
        { cx: 55, startCy: 105, dy: -65, delay: 0.28, size: 1.9 },
        { cx: 47, startCy: 110, dy: -68, delay: 0.37, size: 1.6 },
        { cx: 60, startCy: 108, dy: -66, delay: 0.41, size: 1.4 },
      ] as const).map(({ cx, startCy, dy, delay, size }, i) => (
        <motion.circle
          key={i}
          cx={cx} cy={startCy} r={size}
          fill="rgba(255,215,130,0.60)"
          clipPath="url(#wc-clip)"
          initial={{ y: 0, opacity: 0 }}
          animate={pouring
            ? { y: [0, dy], opacity: [0, 0.75, 0] }
            : { y: 0, opacity: 0 }}
          transition={{ duration: 0.34, delay, ease: "easeOut", times: [0, 0.68, 1] }}
        />
      ))}

      {/* ── Glass bowl walls (inverted triangle, open at top) ── */}
      <path
        d={`M 8 ${BOWL_TOP} L 50 ${BOWL_BOT} L 92 ${BOWL_TOP}`}
        fill="none"
        stroke="rgba(255,255,255,0.40)"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path
        d={`M 11 ${BOWL_TOP + 4} L 50 ${BOWL_BOT - 4}`}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M 89 ${BOWL_TOP + 4} L 50 ${BOWL_BOT - 4}`}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1.0}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M 8 ${BOWL_TOP} L 92 ${BOWL_TOP} L 50 ${BOWL_BOT} Z`}
        fill="url(#wc-wall)"
        stroke="none"
      />

      {/* ── Rim ellipse ── */}
      <ellipse
        cx={50} cy={BOWL_TOP} rx={42} ry={5}
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.44)"
        strokeWidth={1.0}
      />

      {/* ── Stem ── */}
      <line
        x1={50} y1={BOWL_BOT}
        x2={50} y2={162}
        stroke="rgba(255,255,255,0.38)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />

      {/* ── Base ── */}
      <ellipse
        cx={50} cy={162} rx={22} ry={4}
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.40)"
        strokeWidth={1.0}
      />

      {/* ── Olive garnish (idle / welcome — fades out on pour) ── */}
      <motion.g
        animate={{ opacity: pouring ? 0 : 1 }}
        transition={{ duration: 0.12 }}
      >
        <line
          x1={28} y1={16} x2={72} y2={30}
          stroke="rgba(210,180,120,0.80)"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
        <ellipse
          cx={50} cy={23} rx={5.5} ry={4.5}
          fill="#4A8040"
          stroke="rgba(100,180,80,0.60)"
          strokeWidth={0.8}
        />
        <ellipse
          cx={50} cy={23} rx={2.2} ry={1.8}
          fill="#C03020"
          opacity={0.85}
        />
      </motion.g>

      {/* ── Sparkle burst when glass is full ── */}
      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        animate={pouring
          ? { opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1.1, 0.9] }
          : { opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.20, delay: 0.55, times: [0, 0.25, 0.70, 1] }}
        style={{ transformOrigin: "50px 72px" }}
      >
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          const r1 = 18, r2 = 30;
          return (
            <line
              key={i}
              x1={50 + r1 * Math.cos(a)} y1={72 + r1 * Math.sin(a)}
              x2={50 + r2 * Math.cos(a)} y2={72 + r2 * Math.sin(a)}
              stroke="#F0C060"
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          );
        })}
      </motion.g>
    </svg>
  );
}

// ── Shared branding block ──────────────────────────────────────────────────────
function Branding({ theme }: { theme: "hero" | "dark" }) {
  const isHero = theme === "hero";
  return (
    <div style={{ textAlign: "center", userSelect: "none" }}>
      <p style={{
        margin: 0,
        fontFamily: "var(--font-display, serif)",
        fontWeight: 600,
        fontSize: isHero ? 13 : 11,
        letterSpacing: "0.28em",
        textTransform: "uppercase",
        color: isHero ? "rgba(255,255,255,0.70)" : "rgba(232,212,176,0.55)",
        marginBottom: 4,
      }}>
        Welcome to
      </p>
      <h1 style={{
        margin: 0,
        fontFamily: "var(--font-display, serif)",
        fontWeight: 900,
        fontSize: isHero ? 32 : 24,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: isHero ? "#FFFFFF" : "rgba(232,212,176,0.88)",
      }}>
        MY DIGITAL BAR
      </h1>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function WelcomePage({ onEnter }: Props) {
  const [phase, setPhase] = useState<Phase>("hero");
  const calledRef = useRef(false);

  // Phase 1 → 2: auto-advance after 2.5s
  useEffect(() => {
    if (phase !== "hero") return;
    const t = setTimeout(() => setPhase("welcome"), 2500);
    return () => clearTimeout(t);
  }, [phase]);

  const finish = useCallback(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    onEnter();
  }, [onEnter]);

  const handleEnter = () => {
    if (phase !== "welcome") return;
    setPhase("pouring");
    setTimeout(finish, 750);
  };

  const showWelcome = phase !== "hero";
  const pouring   = phase === "pouring";

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
      {/* ═════════════════════════════════════════════════════════════════════
          PHASE 1 — Hero image
          Always rendered; opacity 0 once we leave the hero phase.        */}
      <motion.div
        style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }}
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === "hero" ? 1 : 0 }}
        transition={{ duration: 0.60, ease: "easeInOut" }}
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
        {/* Dark gradient overlay */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "28%",
          background: "linear-gradient(to bottom, transparent, rgba(11,7,4,0.85))",
        }} />

        {/* Branding near the bottom */}
        <div style={{
          position: "absolute", bottom: "16%", left: 0, right: 0,
          display: "flex", justifyContent: "center", alignItems: "center",
        }}>
          <Branding theme="hero" />
        </div>
      </motion.div>

      {/* ═════════════════════════════════════════════════════════════════════
          PHASE 2 & 3 — Welcome / Pouring
          Branding + martini glass.  Fades in as hero fades out.          */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showWelcome ? 1 : 0 }}
        transition={{ duration: 0.50, ease: "easeInOut" }}
        style={{
          position: "relative", zIndex: 5,
          flex: 1, width: "100%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 16,
        }}
      >
        {/* Branding — appears above the glass in welcome/pouring phases */}
        <Branding theme="dark" />

        <MartiniGlass pouring={pouring} />

        {/* Tagline — only while the welcome phase is idle */}
        <motion.p
          animate={{ opacity: pouring ? 0 : 1, y: pouring ? 6 : 0 }}
          transition={{ duration: 0.28 }}
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
      </motion.div>

      {/* ═════════════════════════════════════════════════════════════════════
          Bottom bar — Enter button + links
          Visible only in the welcome (idle) phase.                      */}
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
          animate={{
            opacity: phase === "welcome" ? 1 : 0,
            y: phase === "welcome" ? 0 : 8,
          }}
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
            cursor: phase === "welcome" ? "pointer" : "default",
            boxShadow: "0 4px 20px rgba(120,80,40,0.45), 2px 2px 0 rgba(0,0,0,0.7)",
            pointerEvents: phase === "welcome" ? "auto" : "none",
          }}
        >
          Enter ✨
        </motion.button>

        <motion.div
          animate={{
            opacity: phase === "welcome" ? 1 : 0,
          }}
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
