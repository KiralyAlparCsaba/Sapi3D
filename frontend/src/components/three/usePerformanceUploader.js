import { useEffect } from "react";
import axios from "axios";
import { weightedAverage } from "./weightedAverage";
import { measureLatency } from "./Latency";

export default function usePerformanceUploader(metrics, sessionId) {
  useEffect(() => {
    if (!metrics || !sessionId) return;

    const latencyInterval = setInterval(async () => {
      const latency = await measureLatency("/health");
      metrics.setLatency(latency);
    }, 5000);

    return () => {
      clearInterval(latencyInterval);

      const samples = metrics.getSamples();
      if (!samples.length) return;

      const avgFps = weightedAverage(samples, "fps") || 0;
      const avgMem = weightedAverage(samples, "memory_mb") || 0;
      const avgLat = weightedAverage(samples, "latency_ms") || 0;
      const avgFrame = weightedAverage(samples, "frame_time_ms") || 16.67;

      const token = localStorage.getItem("access_token");

      axios.post(
        `${import.meta.env.VITE_API_URL}/sessions/${sessionId}/metrics`,
        {
          session_id: Number(sessionId),
          fps: Math.max(0, Math.round(avgFps)),
          memory_mb: Math.max(0, Math.round(avgMem)),
          latency_ms: Math.max(0, Math.round(avgLat)),
          frame_time_ms: Math.max(0, Math.round(avgFrame)), // mandatory
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(() => console.log("Uploaded final averaged performance metrics!"))
      .catch(err => console.error("Failed to upload performance metrics:", err));
    };
  }, [metrics, sessionId]);
}