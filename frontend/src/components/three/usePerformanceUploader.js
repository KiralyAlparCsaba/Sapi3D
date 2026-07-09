import { weightedAverage } from "./weightedAverage";
import { measureLatency } from "./Latency";
import api from "../../services/api";
import { useEffect } from "react";

const LATENCY_PROBE_INTERVAL_MS = 5000;
const MIN_SAMPLES_TO_UPLOAD = 2;

export default function usePerformanceUploader(metrics, sessionId) {
  useEffect(() => {
    if (!metrics || !sessionId) return;

    const latencyInterval = setInterval(async () => {
      const latency = await measureLatency("/health");
      metrics.setLatency(latency);
    }, LATENCY_PROBE_INTERVAL_MS);

    return async () => {
      const samples = metrics.getSamples();
      if (samples.length < MIN_SAMPLES_TO_UPLOAD) return;

      const avgFps = weightedAverage(samples, "fps");
      const avgMem = weightedAverage(samples, "memory_mb");
      const avgLat = weightedAverage(samples, "latency_ms");

      try {
        // Use the shared api instance — it attaches the real token from
        // sessionStorage (the old code read localStorage("access_token"),
        // which was never written, and sent "Bearer null").
        await api.post(`/sessions/${sessionId}/metrics`, {
          session_id: sessionId,
          fps: Math.round(avgFps),
          memory_mb: Math.round(avgMem),
          latency_ms: Math.round(avgLat),
        });
      } catch (err) {
        console.error("[Metrics] Failed to upload averaged metrics:", err);
      }

      clearInterval(latencyInterval);
    };
  }, [metrics, sessionId]);
}
