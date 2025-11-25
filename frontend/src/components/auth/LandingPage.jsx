import React from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1>Sapientia Campus 3D</h1>
        <p>
          Fedezd fel a Sapientia Erdélyi Magyar Tudományegyetem campusát interaktív 3D-ben.
        </p>
        <button onClick={() => navigate("/login")} className="landing-btn">
          Belépés
        </button>
      </div>
    </div>
  );
}