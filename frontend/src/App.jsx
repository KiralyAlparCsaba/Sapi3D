import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";


import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import LandingPage from "./components/auth/LandingPage";

import ProtectedLayout from "./components/layout/ProtectedLayout";


import HomePage from "./pages/HomePage";
import EventsPage from "./pages/EventsPage";
import LocationsPage from "./pages/LocationsPage";
import ContactPage from "./pages/ContactPage";
import AdminPage from "./pages/AdminPage";

import { metricsCollector } from "./components/three/metricsCollector";
import { weightedAverage } from "./components/three/weightedAverage";

export default function App() {
  useEffect(() => {
  function flushMetricsAndEndSession() {
    const sessionId =
      metricsCollector.sessionId || sessionStorage.getItem("session_id");

    if (!sessionId) return;

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

      navigator.sendBeacon(`/api/sessions/${sessionId}/metrics`,
        new Blob([JSON.stringify(payload)], { type: "application/json" })
      );
    }

    const endPayload = {
    ended_at: new Date().toISOString(),
    };

    navigator.sendBeacon(
      `/api/sessions/${sessionId}`,
      new Blob([JSON.stringify(endPayload)], { type: "application/json" })
      );


    metricsCollector.clear();
    sessionStorage.removeItem("session_id");
  }

  window.addEventListener("pagehide", flushMetricsAndEndSession);

  return () => {
    window.removeEventListener("pagehide", flushMetricsAndEndSession);
  };
}, []);


  return (
    <Router>
      <Routes>

        
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/app" element={<ProtectedLayout />}>
          <Route index element={<HomePage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>

      </Routes>
    </Router>
  );
}
