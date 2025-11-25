import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";

import PublicRoutes from "./routes/PublicRoutes";
import ProtectedRoutes from "./routes/ProtectedRoutes";

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
      <PublicRoutes />
      <ProtectedRoutes />
    </Router>
  );
}
