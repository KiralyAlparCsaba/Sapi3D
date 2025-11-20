import React from "react";
import "../../styles/HeroSection.css";
import { Link } from "react-router-dom";

export default function HeroSection() {
  return (
    <div className="hero-container">
      <div className="hero-inner">
        <img src="/campus-render.jpg" alt="Campus render" className="hero-image" />

        <div className="hero-text-left">
          <h1>
            Üdvözlünk a Sapientia<br />campus oldalán
          </h1>
        </div>

        <div className="hero-text-right">
          <h2>
            Fedezd fel a campust egy interaktív<br />3D modellen keresztül
          </h2>
        </div>

        <Link to="/app?view=model" className="hero-button">
          Indítsd el a 3D modellt
        </Link>
      </div>
    </div>
  );
}
