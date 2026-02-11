import { weightedAverage } from "./weightedAverage";
import { measureLatency } from "./Latency";
import { measureCpuUsage } from "./CpuEstimator";
import { useEffect } from "react";

export default function usePerformanceUploader(metrics, sessionId) {
  useEffect(() => {
    if (!metrics || !sessionId) return;

    const runInitialMeasurements = async () => {
      try {
        const [latency, cpu] = await Promise.all([
          measureLatency("/health"),
          measureCpuUsage()
        ]);
        metrics.setLatency(latency);
        metrics.setCpuUsage(cpu);
      } catch (err) {
        console.warn("[Metrics] Initial measurement skipped");
      }
    };
    runInitialMeasurements();

    const latencyInterval = setInterval(async () => {
      const latency = await measureLatency("/health");
      metrics.setLatency(latency);
    }, 5000);

    const cpuInterval = setInterval(async () => {
      const cpu = await measureCpuUsage();
      metrics.setCpuUsage(cpu);
    }, 5000);

    // Cleanup / exit
    return () => {
      clearInterval(latencyInterval);
      clearInterval(cpuInterval);

      const samples = metrics.getSamples();
      if (samples.length === 0) return;

      // Átlagolás
      const avgFps = weightedAverage(samples, "fps");
      const avgMem = weightedAverage(samples, "memory_mb");
      const avgLat = weightedAverage(samples, "latency_ms");

      // CPU: vegyük a **legutolsó valós értéket**, mert az async measurement garantálja
      const lastCpuSample = samples
        .filter(s => s.cpu_gpu_usage != null)
        .slice(-1)[0];
      const cpuValue = lastCpuSample ? lastCpuSample.cpu_gpu_usage : 0;

      const payload = {
        session_id: sessionId,
        fps: Math.round(avgFps),
        memory_mb: Math.round(avgMem),
        latency_ms: Math.round(avgLat),
        cpu_gpu_usage: Math.round(cpuValue)
      };

      console.log("🚀 Sending Metrics via Beacon/Fetch:", payload);

      const token = localStorage.getItem("access_token");
      const url = `${import.meta.env.VITE_API_URL}/sessions/${sessionId}/metrics`;

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(err => console.error("Metrics send failed:", err));
    };
  }, [metrics, sessionId]);
}
