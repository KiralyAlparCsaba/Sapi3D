import Stats from "three/examples/jsm/libs/stats.module.js";

export default class Metrics {
  constructor(renderer) {
    this.renderer = renderer;
    this.stats = new Stats();
    this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom

    this.extraMetrics = document.createElement("div");
    Object.assign(this.extraMetrics.style, {
      color: "#0f0",
      fontFamily: "monospace",
      fontSize: "16px",
      marginTop: "4px",
      lineHeight: "1.2",
      textShadow: "1px 1px 0 #000"
    });
    this.stats.dom.appendChild(this.extraMetrics);

    this.maxMemoryMB = 0;
    this.samples = [];

    this.currentLatency = 0;
    this.currentCpu = null; // null ahelyett, hogy 0 lenne
  }

  attach() {
    if (!document.body.contains(this.stats.dom)) {
        document.body.appendChild(this.stats.dom);
    }
  }

  detach() {
    if (this.stats.dom && this.stats.dom.parentNode) {
        this.stats.dom.parentNode.removeChild(this.stats.dom);
    }
  }

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

    const cpuDisplay = (this.currentCpu !== null) ? Math.round(this.currentCpu) : "-";
    const latDisplay = Math.round(this.currentLatency || 0);

    this.extraMetrics.innerHTML = `
      Triangles: ${triangles.toLocaleString()}<br>
      Draw Calls: ${calls.toLocaleString()}<br>
      Mem: ${memoryMB} MB (Max: ${this.maxMemoryMB.toFixed(1)})<br>
      <span style="color: #ff9;">Lat: ${latDisplay} ms</span> | <span style="color: #f99;">CPU: ${cpuDisplay}%</span>
    `;

    // Csak akkor pusholunk sample-t, ha már van valós CPU érték
    if (this.currentCpu !== null) {
      this.samples.push({
        fps,
        memory_mb: memoryMB,
        latency_ms: this.currentLatency,
        cpu_gpu_usage: this.currentCpu,
        timestamp: performance.now()
      });
    }
  }

  getSamples() {
    return this.samples;
  }

  setLatency(ms) {
    this.currentLatency = ms;
  }

  setCpuUsage(cpu) {
    this.currentCpu = cpu;
  }
}
