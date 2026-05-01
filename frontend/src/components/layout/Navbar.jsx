import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/Navbar.css";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { metricsCollector } from "../three/metricsCollector";
import { weightedAverage } from "../three/weightedAverage";

function resolveAvatarUrl(avatarUrl) {
  if (!avatarUrl) return "";
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;

  const envBase = (import.meta.env.VITE_API_URL || "").trim();
  const base = envBase || `${window.location.protocol}//${window.location.hostname}:8000`;
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`;
  return `${normalizedBase}${normalizedPath}`;
}

export default function Navbar({ theme, setTheme}) {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);

  let username = "Guest";
  let isAdmin = false;

  if (isAuthenticated && user) {
    username = user.username || "Logged in user";
    isAdmin = user.role_id === 2;
  }

  const initial = (username || "?").trim().charAt(0).toUpperCase() || "?";
  const avatarSrc = avatarUrl ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${avatarVersion}` : "";

  const loadAvatar = async () => {
    if (!isAuthenticated) {
      setAvatarUrl("");
      setAvatarLoadFailed(false);
      return;
    }

    try {
      const res = await api.get("/auth/me");
      const resolved = resolveAvatarUrl(res.data?.avatar_url || "");
      setAvatarUrl(resolved);
      setAvatarLoadFailed(false);
      setAvatarVersion(Date.now());
    } catch (_err) {
      setAvatarUrl("");
      setAvatarLoadFailed(false);
    }
  };

  useEffect(() => {
    loadAvatar();

    const handleAvatarUpdated = (event) => {
      void event;
      loadAvatar();
    };

    window.addEventListener("avatar-updated", handleAvatarUpdated);

    return () => {
      window.removeEventListener("avatar-updated", handleAvatarUpdated);
    };
  }, [isAuthenticated, user?.user_id, user?.username]);

  const flushMetricsAndEndSession = async () => {
    const sessionId =
      metricsCollector.sessionId || sessionStorage.getItem("session_id");

    if (!sessionId) return;

    const samples = metricsCollector.getSamples?.() || [];
    if (samples.length >= 2) {
      const payload = {
        session_id: Number(sessionId),
        fps: Math.round(weightedAverage(samples, "fps")),
        memory_mb: Math.round(weightedAverage(samples, "memory_mb")),
        latency_ms: Math.round(weightedAverage(samples, "latency_ms")),
        timestamp: new Date().toISOString(),
      };

      try {
        await api.post(`/sessions/${sessionId}/metrics`, payload);
      } catch (err) {
        console.error("Failed to upload performance metrics on logout:", err);
      }
    }

    try {
      await api.put(`/sessions/${sessionId}`, {
        ended_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to end session on logout:", err);
    }

    metricsCollector.clear();
    sessionStorage.removeItem("session_id");
  };

  const handleLogout = async () => {
    await flushMetricsAndEndSession();
    logout();
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
            <Link to="/app/model" state={{ marker: "MarkerAula" }} className="nav-link">Modell</Link>
            <Link to="/app/events" className="nav-link">Események</Link>
            <Link to="/app/locations" className="nav-link">Helyszínek</Link>
            <Link to="/app/profil" className="nav-link">Profil</Link>
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
          {avatarSrc && !avatarLoadFailed ? (
            <img
              src={avatarSrc}
              alt="Profile"
              className="nav-profile"
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : (
            <div className="nav-profile nav-profile-fallback" aria-label="Profile initial">
              {initial}
            </div>
          )}
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
          <Link to="/app/model" state={{ marker: "MarkerAula" }} onClick={() => setDrawerOpen(false)}>Modell</Link>
          <Link to="/app/events" onClick={() => setDrawerOpen(false)}>Események</Link>
          <Link to="/app/locations" onClick={() => setDrawerOpen(false)}>Helyszínek</Link>
          <Link to="/app/profil" onClick={() => setDrawerOpen(false)}>Profil</Link>
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
            {avatarSrc && !avatarLoadFailed ? (
              <img
                src={avatarSrc}
                alt="Profile"
                className="drawer-profile"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <div className="drawer-profile drawer-profile-fallback" aria-label="Profile initial">
                {initial}
              </div>
            )}
            <span>{username}</span>
          </div>

          <button className="drawer-logout" onClick={handleLogout}>Kijelentkezés</button>
        </div>

      </div>
    </>
  );
}
