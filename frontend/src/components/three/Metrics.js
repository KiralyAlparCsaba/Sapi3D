// src/components/three/Metrics.js
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

    // IMPORTANT: store samples here (for weighted averaging later)
    this.samples = [];
  }

  attach() { document.body.appendChild(this.stats.dom); }
  detach() { this.stats.dom.parentNode?.removeChild(this.stats.dom); }

  begin() { this.stats.begin(); }

  end() {
    this.stats.end();

    // FPS from stats.js
    const fps = Math.round(this.stats.fps || 0);

    // Memory
    let memoryMB = 0;
    if (performance?.memory) {
      memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
      this.maxMemoryMB = Math.max(this.maxMemoryMB, parseFloat(memoryMB));
      memoryMB = parseFloat(memoryMB);
    }

    // Render stats
    const { triangles, calls } = this.renderer.info.render;

    this.extraMetrics.innerHTML = `
      Triangles: ${triangles.toLocaleString()}<br>
      Draw Calls: ${calls.toLocaleString()}<br>
      Mem: ${memoryMB} MB (Max: ${this.maxMemoryMB.toFixed(1)})
    `;

    // Add timestamped sample for later weighted averaging
    this.samples.push({
      fps,
      memory_mb: memoryMB,
      latency_ms: 0,         // will be filled by frontend latency checker
      timestamp: performance.now()
    });
  }

  // Return all collected samples
  getSamples() {
    return this.samples;
  }

  // Allow updating latency from outside
  setLatency(ms) {
    if (this.samples.length > 0) {
      this.samples[this.samples.length - 1].latency_ms = ms;
    }
  }
}
