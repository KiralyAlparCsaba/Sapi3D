import Stats from "three/examples/jsm/libs/stats.module.js";

export default class Metrics {
  constructor(renderer) {
    this.renderer = renderer;
    this.stats = new Stats();
    this.stats.showPanel(0); // FPS panel

    // Extra metrics DOM
    this.extraMetrics = document.createElement("div");
    Object.assign(this.extraMetrics.style, {
      color: "#0f0",
      fontFamily: "monospace",
      fontSize: "16px",
      marginTop: "4px",
    });
    this.stats.dom.appendChild(this.extraMetrics);

    this.maxMemoryMB = 0;

    // Samples for averaging
    this.samples = [];
  }

  attach() { document.body.appendChild(this.stats.dom); }
  detach() { this.stats.dom.parentNode?.removeChild(this.stats.dom); }

  begin() { this.stats.begin(); }

  end(frameTimeMs = 16.67) { // frameTime mandatory, default ~60fps
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
      Mem: ${memoryMB} MB (Max: ${this.maxMemoryMB.toFixed(1)})<br>
      Frame Time: ${frameTimeMs.toFixed(2)} ms
    `;

    this.samples.push({
      fps,
      memory_mb: memoryMB,
      latency_ms: 0,              // updated externally
      frame_time_ms: frameTimeMs, // mandatory
      timestamp: performance.now(),
    });
  }

  getSamples() {
    return this.samples;
  }

  setLatency(ms) {
    if (this.samples.length > 0) {
      this.samples[this.samples.length - 1].latency_ms = ms;
    }
  }
}