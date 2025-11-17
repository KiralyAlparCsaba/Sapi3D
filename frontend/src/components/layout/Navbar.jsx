import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/Navbar.css";
import { jwtDecode } from "jwt-decode";

export default function Navbar({ theme, setTheme, warning }) {
  const navigate = useNavigate();

  const token = sessionStorage.getItem("token");
  let username = "Guest";
  let isAdmin = false;

  if (token) {
    try {
      const decoded = jwtDecode(token);
      username = decoded.username || "Felhasználó";
      isAdmin = decoded.role_id === 2;
    } catch (err) {
      console.error("JWT decode error:", err);
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    navigate("/login");
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <>
      {warning && (
        <div className="nav-warning">
          {warning}
        </div>
      )}

      <nav className="navbar">
        <div className="nav-left-wrapper">
          <div className="nav-left">
            <Link to="/app">
              <img src="/sapilogo.png" alt="Sapientia Logo" className="nav-logo" />
            </Link>
          </div>

          <div className="nav-brand">
            <span className="nav-brand-main">Sapientia EMTE</span>
            <span className="nav-brand-sub">Marosvásárhelyi Kar</span>
          </div>

          <div className="nav-center">
            <div className="nav-menu">
              <Link to="/app" className="nav-link">Főoldal</Link>
              <Link to="/app?view=model" className="nav-link">Modell</Link>
              <Link to="/app/events" className="nav-link">Események</Link>
              <Link to="/app/locations" className="nav-link">Helyszínek</Link>
              <Link to="/app/contact" className="nav-link">Kapcsolat</Link>
              {isAdmin && <Link to="/app/admin" className="nav-link">Admin</Link>}
            </div>
          </div>
        </div>

        <div className="nav-right">

          <div className="theme-toggle" onClick={toggleTheme}>
            <span className="theme-label">Light</span>
            <div className={`toggle-switch ${theme === "dark" ? "dark" : "light"}`}>
              <div className="toggle-knob"></div>
            </div>
            <span className="theme-label">Dark</span>
          </div>

          <span className="nav-username">{username}</span>
          <img src="/user-icon.png" alt="Profile" className="nav-profile" />
          <button className="nav-logout" onClick={handleLogout}>⏻</button>
        </div>
      </nav>
    </>
  );
}
