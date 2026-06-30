import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

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

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;

      if (decoded.exp < now) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("session_id");

      }
    } catch (e) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("session_id");
    }
  }, []);

  useEffect(() => {

    const safeInt = (n) =>
      Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;

    function buildSamplesArray(rawSamples) {
      if (!rawSamples.length) return [];
      const startTime = rawSamples[0].timestamp;
      const BUCKET_MS = 3000;
      const buckets = {};
      for (const s of rawSamples) {
        const t = Math.floor((s.timestamp - startTime) / BUCKET_MS) * 3;
        if (!buckets[t]) buckets[t] = { fps: [], memory_mb: [] };

        if (Number.isFinite(s.fps)) buckets[t].fps.push(s.fps);
        if (Number.isFinite(s.memory_mb)) buckets[t].memory_mb.push(s.memory_mb);
      }
      return Object.entries(buckets)
        .map(([t, data]) => {
          const avgFps = data.fps.length
            ? data.fps.reduce((a, b) => a + b, 0) / data.fps.length
            : 0;
          const avgMem = data.memory_mb.length
            ? data.memory_mb.reduce((a, b) => a + b, 0) / data.memory_mb.length
            : 0;
          return {
            t: safeInt(parseInt(t)),
            fps: safeInt(avgFps),
            memory_mb: safeInt(avgMem),
          };
        })
        .sort((a, b) => a.t - b.t);
    }

    function flushMetricsAndEndSession() {
      const sessionId =
        metricsCollector.sessionId || sessionStorage.getItem("session_id");
      const token = sessionStorage.getItem("token");

      if (!sessionId) return;

      const samples = metricsCollector.getSamples?.() || [];
      if (samples.length >= 2) {
        const avgFps = weightedAverage(samples, "fps");
        const avgMem = weightedAverage(samples, "memory_mb");
        const avgLat = weightedAverage(samples, "latency_ms");

        const safeOptionalFloat = (n) =>
          n != null && Number.isFinite(n) && n >= 0 ? n : null;
        const safeOptionalInt = (n) =>
          n != null && Number.isFinite(n) && n >= 0 ? Math.round(n) : null;

        const payload = {
          session_id: Number(sessionId),
          fps: safeInt(avgFps),
          memory_mb: safeInt(avgMem),
          latency_ms: safeInt(avgLat),
          timestamp: new Date().toISOString(),
          samples: buildSamplesArray(samples),
          load_time_s: safeOptionalFloat(metricsCollector.getLoadTime()),
          peak_memory_mb: safeOptionalFloat(metricsCollector.getPeakMemory()),
          quality_reductions: safeOptionalInt(metricsCollector.getQualityReductions()),
        };

        navigator.sendBeacon(
          `/api/sessions/${sessionId}/metrics`,
          new Blob([JSON.stringify(payload)], { type: "application/json" })
        );
      }

      const endPayload = {
        ended_at: new Date().toISOString(),
      };

      fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(endPayload),
        keepalive: true,
      });

      metricsCollector.clear();
      sessionStorage.removeItem("session_id");
    }

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
