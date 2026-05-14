import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import "../../styles/ModelLoadingOverlay.css";

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
    <div className={`model-loading-overlay${fading ? " is-fading" : ""}`}>
      <div aria-hidden="true" className="model-loading-overlay__glow" />

      <div className="model-loading-overlay__content">
        <img
          src="/sapilogo.png"
          alt="Sapi3D"
          className="model-loading-overlay__logo"
        />

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="model-loading-overlay__progress"
        >
          <div
            className="model-loading-overlay__progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="model-loading-overlay__label">
          3D modell betöltése
          <span className="model-loading-overlay__pct">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
