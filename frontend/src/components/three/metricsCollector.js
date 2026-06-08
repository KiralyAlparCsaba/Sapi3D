class MetricsCollector {
  constructor() {
    this.samples = [];
    this.sessionId = null;
    this.loadTimeS = null;
    this.peakMemoryMB = null;
    this.qualityReductions = 0;
  }

  setSession(id) {
    this.sessionId = id;
  }

  addSample(sample) {
    this.samples.push(sample);
  }

  getSamples() {
    return this.samples;
  }

  // Puffer ürítése periódikus küldés után (a már feltöltött mintákat dobja el)
  clearSamples() {
    this.samples = [];
  }

  setLoadTime(seconds) {
    this.loadTimeS = seconds;
  }

  getLoadTime() {
    return this.loadTimeS;
  }

  setPeakMemory(mb) {
    this.peakMemoryMB = mb;
  }

  getPeakMemory() {
    return this.peakMemoryMB;
  }

  incrementQualityReductions() {
    this.qualityReductions += 1;
  }

  getQualityReductions() {
    return this.qualityReductions;
  }

  clear() {
    this.samples = [];
    this.sessionId = null;
    this.loadTimeS = null;
    this.peakMemoryMB = null;
    this.qualityReductions = 0;
  }
}

export const metricsCollector = new MetricsCollector();
