class MetricsCollector {
  constructor() {
    this.samples = [];
    this.sessionId = null;
    this.loadTimeS = null;
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

  setLoadTime(seconds) {
    this.loadTimeS = seconds;
  }

  getLoadTime() {
    return this.loadTimeS;
  }

  clear() {
    this.samples = [];
    this.sessionId = null;
    this.loadTimeS = null;
  }
}

export const metricsCollector = new MetricsCollector();
