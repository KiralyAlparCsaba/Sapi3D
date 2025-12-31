import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/Navbar.css";
import { jwtDecode } from "jwt-decode";

export default function Navbar({ theme, setTheme}) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const token = sessionStorage.getItem("token");
  let username = "Guest";
  let isAdmin = false;

  if (token) {
    try {
      const decoded = jwtDecode(token);
      username = decoded.username || "Logged in user";
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
      

      <nav className="navbar">

        {/* LEFT WRAPPER */}
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
        </div>

        {/* DESKTOP MENU */}
        <div className="nav-center desktop-only">
          <div className="nav-menu">
            <Link to="/app" className="nav-link">Főoldal</Link>
            <Link to="/app/model" className="nav-link">Modell</Link>
            <Link to="/app/events" className="nav-link">Események</Link>
            <Link to="/app/locations" className="nav-link">Helyszínek</Link>
            <Link to="/app/contact" className="nav-link">Kapcsolat</Link>
            {isAdmin && <Link to="/app/admin" className="nav-link">Admin</Link>}
          </div>
        </div>

        {/* DESKTOP RIGHT */}
        <div className="nav-right desktop-only">
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

        {/* MOBILE HAMBURGER */}
        <div className="hamburger mobile-only" onClick={() => setDrawerOpen(true)}>
          ☰
        </div>

      </nav>

      {/* MOBILE DRAWER OVERLAY */}
      {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />}

      {/* MOBILE DRAWER (RIGHT) */}
      <div className={`mobile-drawer ${drawerOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <img src="/sapilogo.png" className="drawer-logo" />
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>×</button>
        </div>

        <div className="drawer-brand">Sapientia EMTE<br />Marosvásárhelyi Kar</div>

        <div className="drawer-menu">
          <Link to="/app" onClick={() => setDrawerOpen(false)}>Főoldal</Link>
          <Link to="/app/model" onClick={() => setDrawerOpen(false)}>Modell</Link>
          <Link to="/app/events" onClick={() => setDrawerOpen(false)}>Események</Link>
          <Link to="/app/locations" onClick={() => setDrawerOpen(false)}>Helyszínek</Link>
          <Link to="/app/contact" onClick={() => setDrawerOpen(false)}>Kapcsolat</Link>
          {isAdmin && <Link to="/app/admin" onClick={() => setDrawerOpen(false)}>Admin</Link>}
        </div>

        <div className="drawer-footer">
          <div className="theme-toggle drawer-theme" onClick={toggleTheme}>
            <span>Light</span>
            <div className={`toggle-switch ${theme === "dark" ? "dark" : "light"}`}>
              <div className="toggle-knob"></div>
            </div>
            <span>Dark</span>
          </div>

          <div className="drawer-user">
            <img src="/user-icon.png" className="drawer-profile" />
            <span>{username}</span>
          </div>

          <button className="drawer-logout" onClick={handleLogout}>Kijelentkezés</button>
        </div>

      </div>
    </>
  );
}
