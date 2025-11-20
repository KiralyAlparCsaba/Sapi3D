class MetricsCollector {
  constructor() {
    this.samples = [];
    this.sessionId = null;
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

  clear() {
    this.samples = [];
    this.sessionId = null;
  }
}

export const metricsCollector = new MetricsCollector();
