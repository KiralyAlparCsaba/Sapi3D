import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // 1. Added import

import { AuthProvider } from "./context/AuthContext";

import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import LandingPage from "./components/auth/LandingPage";

import ProtectedLayout from "./components/layout/ProtectedLayout";
import ModelLayout from "./components/layout/ModelLayout";
import AdminLayout from "./components/layout/AdminLayout";

import HomePage from "./pages/HomePage";
import EventsPage from "./pages/EventsPage";
import LocationsPage from "./pages/LocationsPage";
import ProfilPage from "./pages/ProfilPage";
import AdminPage from "./pages/AdminPage";
import ModelPage from "./pages/ModelPage";

import { metricsCollector } from "./components/three/metricsCollector";
import { weightedAverage } from "./components/three/weightedAverage";

export default function App() {
  // 2. Added Auth Check Logic from MainApp.jsx
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;

      // If token is expired, clear everything immediately
      if (decoded.exp < now) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("session_id");
        // We can't use navigate() here because we are outside the Router context,
        // but removing the token will cause ProtectedLayout to redirect user to login.
      }
    } catch (e) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("session_id");
    }
  }, []);

  // 3. Fixed Session Cleanup Logic
  useEffect(() => {
    function flushMetricsAndEndSession() {
      const sessionId =
        metricsCollector.sessionId || sessionStorage.getItem("session_id");
      const token = sessionStorage.getItem("token");

      if (!sessionId) return;

      // --- Part A: Send Metrics (POST is okay for sendBeacon) ---
      const samples = metricsCollector.getSamples?.() || [];
      if (samples.length >= 2) {
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

        // sendBeacon is perfect for metrics (POST)
        navigator.sendBeacon(
          `/api/sessions/${sessionId}/metrics`,
          new Blob([JSON.stringify(payload)], { type: "application/json" })
        );
      }

      // --- Part B: End Session (Must be PUT) ---
      const endPayload = {
        ended_at: new Date().toISOString(),
      };



      //  ADDED: fetch with keepalive + PUT
      fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // Add token just in case
        },
        body: JSON.stringify(endPayload),
        keepalive: true, // This is the magic flag that lets it survive page close
      });

      metricsCollector.clear();
      sessionStorage.removeItem("session_id");
    }

    // Listen for page unload events
    window.addEventListener("pagehide", flushMetricsAndEndSession);
    return () =>
      window.removeEventListener("pagehide", flushMetricsAndEndSession);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/app/model" element={<ModelLayout />}>
            <Route index element={<ModelPage />} />
          </Route>

          <Route path="/app" element={<ProtectedLayout />}>
            <Route index element={<HomePage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="profil" element={<ProfilPage />} />

            <Route element={<AdminLayout />}>
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
