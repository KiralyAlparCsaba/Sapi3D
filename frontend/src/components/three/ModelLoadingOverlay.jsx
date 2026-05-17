import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import "../../styles/ModelLoadingOverlay.css";

const FADE_OUT_MS = 600;
const MIN_DISPLAY_MS = 400;


export default function ModelLoadingOverlay({
  visible,
  mode,
  defaultMode,
  onSelectMode,
}) {
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
  
  const showPicker = !mode && typeof onSelectMode === "function";

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

        {showPicker && (
          <div className="model-loading-overlay__picker">
            <div className="model-loading-overlay__picker-question">
              Hogyan szeretnél belépni?
            </div>

            <div className="model-loading-overlay__picker-buttons">
              <button
                type="button"
                onClick={() => onSelectMode("single")}
                className={
                  "model-loading-overlay__mode-btn" +
                  (defaultMode === "single"
                    ? " model-loading-overlay__mode-btn--default"
                    : "")
                }
              >
                <span className="model-loading-overlay__mode-icon">👤</span>
                <span className="model-loading-overlay__mode-label">
                  Egyedül
                </span>
                <span className="model-loading-overlay__mode-sub">
                  Csendes felfedezés
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectMode("multi")}
                className={
                  "model-loading-overlay__mode-btn" +
                  (defaultMode === "multi"
                    ? " model-loading-overlay__mode-btn--default"
                    : "")
                }
              >
                <span className="model-loading-overlay__mode-icon">👥</span>
                <span className="model-loading-overlay__mode-label">
                  Másokkal
                </span>
                <span className="model-loading-overlay__mode-sub">
                  Multiplayer + chat
                </span>
              </button>
            </div>

            {defaultMode && (
              <div className="model-loading-overlay__picker-hint">
                Legutóbb a{" "}
                <strong>
                  {defaultMode === "multi" ? "„Másokkal”" : "„Egyedül”"}
                </strong>{" "}
                módot választottad.
              </div>
            )}
          </div>
        )}

        {mode && (
          
          <div className="model-loading-overlay__mode-confirmed">
            {mode === "multi" ? "👥 Multiplayer mód" : "👤 Egyedül mód"}
          </div>
        )}
      </div>
    </div>
  );
}
