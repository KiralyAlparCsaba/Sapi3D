import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

const FADE_OUT_MS = 600;
const MIN_DISPLAY_MS = 400;

export default function ModelLoadingOverlay({ visible }) {
  const { progress } = useProgress();

  const [mounted, setMounted] = useState(true);
  const [fading, setFading] = useState(false);

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const shouldHide = !visible && minTimeElapsed;
    if (shouldHide && !fading) {
      setFading(true);
      const t = setTimeout(() => setMounted(false), FADE_OUT_MS);
      return () => clearTimeout(t);
    }
  }, [visible, minTimeElapsed, fading]);

  if (!mounted) return null;

  const pct = Math.round(progress);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse at 50% 40%, rgba(4, 26, 10, 0.98) 0%, #010805 60%, #000 100%)",
        color: "#fff",
        fontFamily: '"Inter", Arial, sans-serif',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms ease-out`,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {/* Soft green glow behind the logo, matching the auth-page accent */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(21, 80, 21, 0.35) 0%, rgba(21, 80, 21, 0) 60%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          maxWidth: "90vw",
        }}
      >
        <img
          src="/sapilogo.png"
          alt="Sapi3D"
          style={{
            width: 140,
            height: "auto",
            filter: "drop-shadow(0 0 24px rgba(21, 80, 21, 0.6))",
            animation: "sapi3d-loading-pulse 2.4s ease-in-out infinite",
          }}
        />

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          style={{
            width: 320,
            maxWidth: "80vw",
            height: 6,
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: 999,
            overflow: "hidden",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background:
                "linear-gradient(90deg, rgba(21,80,21,0.85), rgba(120,200,120,0.95))",
              boxShadow: "0 0 12px rgba(120,200,120,0.6)",
              transition: "width 0.25s ease",
            }}
          />
        </div>

        <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: 0.3 }}>
          3D modell betöltése
          <span style={{ opacity: 0.6, marginLeft: 8 }}>{pct}%</span>
        </div>
      </div>

      {/* Pulse animation keyframes (scoped to this overlay) */}
      <style>{`
        @keyframes sapi3d-loading-pulse {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50%      { transform: scale(1.04); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
