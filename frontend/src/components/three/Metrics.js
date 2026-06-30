import Stats from "three/examples/jsm/libs/stats.module.js";

export default class Metrics {
  constructor(renderer) {
    this.renderer = renderer;
    this.stats = new Stats();
    this.stats.showPanel(0);

    this.extraMetrics = document.createElement("div");
    Object.assign(this.extraMetrics.style, {
      color: "#0f0",
      fontFamily: "monospace",
      fontSize: "16px",
      marginTop: "4px",
    });
    this.stats.dom.appendChild(this.extraMetrics);

    this.maxMemoryMB = 0;

    this.samples = [];
  }

  attach() { document.body.appendChild(this.stats.dom); }
  detach() { this.stats.dom.parentNode?.removeChild(this.stats.dom); }

  begin() { this.stats.begin(); }

  end() {
    this.stats.end();

    const fps = Math.round(this.stats.fps || 0);

    let memoryMB = 0;
    if (performance?.memory) {
      memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
      this.maxMemoryMB = Math.max(this.maxMemoryMB, parseFloat(memoryMB));
      memoryMB = parseFloat(memoryMB);
    }

    const { triangles, calls } = this.renderer.info.render;

    this.extraMetrics.innerHTML = `
      Triangles: ${triangles.toLocaleString()}<br>
      Draw Calls: ${calls.toLocaleString()}<br>
      Mem: ${memoryMB} MB (Max: ${this.maxMemoryMB.toFixed(1)})
    `;

    this.samples.push({
      fps,
      memory_mb: memoryMB,
      latency_ms: 0,
      timestamp: performance.now()
    });
  }

  getSamples() {
    return this.samples;
  }

  getPeakMemory() {
    return this.maxMemoryMB;
  }

  setLatency(ms) {
    if (this.samples.length > 0) {
      this.samples[this.samples.length - 1].latency_ms = ms;
    }
  }
}
