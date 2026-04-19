import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const handleMouseMove = (event) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    el.style.setProperty("--mx", x.toFixed(3));
    el.style.setProperty("--my", y.toFixed(3));
  };

  const handleMouseLeave = () => {
    const el = containerRef.current;
    if (!el) return;
    el.style.setProperty("--mx", "0");
    el.style.setProperty("--my", "0");
  };

  return (
    <div
      className="landing-container"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />
      <div className="blob blob-3" aria-hidden="true" />
      <div className="blob blob-4" aria-hidden="true" />
      <div className="landing-content">
        <h1>Sapientia Egyetem 3D</h1>
        <p>
          Fedezd fel a Sapientia Erdélyi Magyar Tudományegyetemet interaktív 3D-ben.
        </p>
        <button onClick={() => navigate("/login")} className="landing-btn">
          Belépés
        </button>
      </div>
    </div>
  );
}
