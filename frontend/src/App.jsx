import React, { useState, useEffect } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ThreeScene from "./components/three/ThreeScene";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";

import { metricsCollector } from "./components/three/metricsCollector";
import { weightedAverage } from "./components/three/weightedAverage";

export default function App() {

  // ─────────────────────────────────────────────
  // GLOBAL METRICS FLUSH HANDLER (App-level)
  // Runs on tab close, refresh, navigation, back button
  // ─────────────────────────────────────────────
  useEffect(() => {

    function flushMetrics() {
      const samples = metricsCollector.getSamples();
      const sessionId = metricsCollector.sessionId;

      if (!sessionId || samples.length < 2) return;

      const avgFps = weightedAverage(samples, "fps");
      const avgMem = weightedAverage(samples, "memory_mb");
      const avgLat = weightedAverage(samples, "latency_ms");

      const payload = {
        session_id: Number(sessionId),
        fps: Math.round(avgFps),
        memory_mb: Math.round(avgMem),
        latency_ms: Math.round(avgLat),
        timestamp: new Date().toISOString(),
        cpu_gpu_usage: 0,
      };

      console.log("📤 Sending metrics on exit:", payload);

      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      console.log("📤 Beacon Fired!");
      navigator.sendBeacon(`/api/sessions/${sessionId}/metrics`, blob);
    }

    // Fires when page becomes hidden (tab close, switch tab, back button)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushMetrics();
      }
    });

    // Safari/navigation fallback
    window.addEventListener("pagehide", flushMetrics);

    return () => {
      window.removeEventListener("pagehide", flushMetrics);
    };
  }, []);

  // ─────────────────────────────────────────────

  return (
    <Router>
      <Routes>
        {/* Főoldal – a mostani 3D modell UI */}
        <Route path="/" element={<MainApp />} />

        {/* Login és Register oldalak */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
}

function MainApp() {
  const [role, setRole] = useState(null);
  const [activeMenu, setActiveMenu] = useState("home");

  const handleLogout = () => {
    setRole(null);
    setActiveMenu("home");
  };

  if (!role) {
    return (
      <div className="login-screen">
        <h1>Login</h1>
        <div>
          <button className="btn user-btn" onClick={() => setRole("user")}>
            Login as User
          </button>
          <button className="btn admin-btn" onClick={() => setRole("admin")}>
            Login as Admin
          </button>
        </div>
      </div>
    );
  }

  if (activeMenu === "model") {
    return (
      <div className="model-container">
        <ThreeScene />
        <button className="back-btn" onClick={() => setActiveMenu("home")}>
          ← Vissza
        </button>
      </div>
    );
  }

  const menuItems = [
    { key: "home", label: "Főoldal" },
    { key: "model", label: "3D Modell" },
    { key: "about", label: "Információk" },
  ];

  if (role === "admin") {
    menuItems.push({ key: "admin", label: "Admin" });
  }

  const renderMainContent = () => {
    switch (activeMenu) {
      case "home":
        return <p>Ez a főoldal tartalma.</p>;
      case "about":
        return <p>Itt lesznek az információk.</p>;
      case "admin":
        return role === "admin" ? (
          <p>Itt lesz az admin oldal (pl. statisztikák, grafikonok).</p>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="content">
        <main className="main-content">{renderMainContent()}</main>
        <Sidebar
          menuItems={menuItems}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          handleLogout={handleLogout}
        />
      </div>
    </div>
  );
}
