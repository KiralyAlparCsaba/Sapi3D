import { weightedAverage } from "./weightedAverage";
import { measureLatency } from "./Latency";
import axios from "axios";
import { useEffect } from "react";

const PERIODIC_INTERVAL_MS = 30_000; // 30 másodpercenként POST a DB-be

async function postMetrics(sessionId, samples) {
  if (samples.length < 2) return;

  const avgFps = weightedAverage(samples, "fps");
  const avgMem = weightedAverage(samples, "memory_mb");
  const avgLat = weightedAverage(samples, "latency_ms");

  const token = localStorage.getItem("access_token");

  await axios.post(
    `${import.meta.env.VITE_API_URL || "/api"}/sessions/${sessionId}/metrics`,
    {
      session_id: sessionId,
      fps: Math.round(avgFps),
      memory_mb: Math.round(avgMem),
      latency_ms: Math.round(avgLat),
      timestamp: new Date().toISOString(),
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export default function usePerformanceUploader(metrics, sessionId) {
  useEffect(() => {
    if (!metrics || !sessionId) return;

    // Latency mérés 5 másodpercenként
    const latencyInterval = setInterval(async () => {
      const latency = await measureLatency("/health");
      metrics.setLatency(latency);
    }, 5000);

    // Periódikus mentés 30 másodpercenként:
    // elküldi az eddig gyűjtött minták átlagát, majd törli a puffert
    const periodicInterval = setInterval(async () => {
      const samples = metrics.getSamples();
      try {
        await postMetrics(sessionId, samples);
        // Puffer törlése: csak az elküldött mintákat dobjuk el
        metrics.clearSamples?.();
        console.log("Periodic metrics uploaded.");
      } catch (err) {
        console.error("Failed to upload periodic metrics:", err);
        // Nem töröljük a mintákat ha sikertelen volt — a következő körben újra megpróbálja
      }
    }, PERIODIC_INTERVAL_MS);

    // Kilépéskor: maradék minták elküldése
    return async () => {
      clearInterval(latencyInterval);
      clearInterval(periodicInterval);

      const remaining = metrics.getSamples();
      try {
        await postMetrics(sessionId, remaining);
        console.log("Final metrics uploaded on cleanup.");
      } catch (err) {
        console.error("Failed to upload final metrics:", err);
      }
    };
  }, [metrics, sessionId]);
}
