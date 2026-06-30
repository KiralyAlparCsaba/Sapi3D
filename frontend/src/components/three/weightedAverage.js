export function weightedAverage(samples, key) {
  let totalWeighted = 0;
  let totalTime = 0;

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    const dt = (curr.timestamp - prev.timestamp) / 1000;

    if (dt <= 0) continue;

    totalWeighted += prev[key] * dt;
    totalTime += dt;
  }

  return totalTime > 0 ? totalWeighted / totalTime : 0;
}
