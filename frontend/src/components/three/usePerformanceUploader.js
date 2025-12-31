import { weightedAverage } from "./weightedAverage";
import { measureLatency } from "./Latency";
import axios from "axios";
import { useEffect } from "react";

export default function usePerformanceUploader(metrics, sessionId) {
  useEffect(() => {
    if (!metrics || !sessionId) return;

    // Measure latency every 5s
    const latencyInterval = setInterval(async () => {
      const latency = await measureLatency("/health"); // any lightweight endpoint
      metrics.setLatency(latency);
    }, 5000);

    // On cleanup -> send final averaged metrics
    return async () => {
      const samples = metrics.getSamples();
      if (samples.length < 2) return;

      const avgFps = weightedAverage(samples, "fps");
      const avgMem = weightedAverage(samples, "memory_mb");
      const avgLat = weightedAverage(samples, "latency_ms");

      try {
        const token = localStorage.getItem("access_token");

        await axios.post(
          `${import.meta.env.VITE_API_URL}/sessions/${sessionId}/metrics`,
          {
            session_id: sessionId,
            fps: Math.round(avgFps),
            memory_mb: Math.round(avgMem),
            latency_ms: Math.round(avgLat)
            // cpu_gpu_usage defaults to 0 on backend
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log("Uploaded final averaged performance metrics!");
      } catch (err) {
        console.error("Failed to upload performance metrics:", err);
      }

      clearInterval(latencyInterval);
    };
  }, [metrics, sessionId]);
}
