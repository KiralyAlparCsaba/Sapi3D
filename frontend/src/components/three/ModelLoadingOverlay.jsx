import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import "../../styles/ModelLoadingOverlay.css";

const FADE_OUT_MS = 600;
const MIN_DISPLAY_MS = 400;
const SELECTION_HOLD_MS = 1000;

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

  const [displayPct, setDisplayPct] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setDisplayPct((prev) => {
        if (progress >= 100) {
          return Math.min(prev + Math.max(1.5, (100 - prev) * 0.18), 100);
        }
        const cap = 95;
        if (prev >= cap) return cap;
        return Math.min(prev + Math.max(0.4, (cap - prev) * 0.05), cap);
      });
    }, 80);
    return () => clearInterval(id);
  }, [progress]);

  const prevModeRef = useRef(mode);
  const [selectionHold, setSelectionHold] = useState(false);
  useEffect(() => {
    const prev = prevModeRef.current;
    prevModeRef.current = mode;
    if (!prev && mode) {
      setSelectionHold(true);
      const t = setTimeout(() => setSelectionHold(false), SELECTION_HOLD_MS);
      return () => clearTimeout(t);
    }
  }, [mode]);

  useEffect(() => {
    const shouldHide = !visible && minTimeElapsed && !selectionHold;
    if (shouldHide && !fading) {
      setFading(true);
      const t = setTimeout(() => setMounted(false), FADE_OUT_MS);
      return () => clearTimeout(t);
    }
  }, [visible, minTimeElapsed, selectionHold, fading]);

  if (!mounted) return null;

  const pct = Math.round(displayPct);

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
