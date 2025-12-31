export async function measureLatency(url) {
  const start = performance.now();
  try {
    await fetch(url, { method: "GET" }); // ← FIXED (HEAD removed)
  } catch (_) {}
  return performance.now() - start;
}
