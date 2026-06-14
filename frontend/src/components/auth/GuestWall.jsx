import React from "react";
import { Link } from "react-router-dom";
import "../../styles/GuestWall.css";

/**
 * Standalone guest wall — render this as an early return when isGuest is true.
 *
 * Usage:
 *   const { isGuest } = useAuth();
 *   if (isGuest) return <GuestWall label="az eseményeket" />;
 */
export default function GuestWall({ label = "ezt a tartalmat" }) {
  return (
    <div className="guest-wall">
      <div className="guest-wall-card">
        <div className="guest-wall-icon" aria-hidden="true">🔒</div>
        <h2 className="guest-wall-title">Bejelentkezés szükséges</h2>
        <p className="guest-wall-desc">
          {label.charAt(0).toUpperCase() + label.slice(1)} megtekintéséhez
          regisztrálj, majd jelentkezz be.
        </p>
        <div className="guest-wall-actions">
          <Link to="/register" className="guest-wall-btn guest-wall-btn--primary">
            Regisztráció
          </Link>
          <Link to="/login" className="guest-wall-btn guest-wall-btn--secondary">
            Bejelentkezés
          </Link>
        </div>
      </div>
    </div>
  );
}
