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
  }


  attach() { document.body.appendChild(this.stats.dom); }
  detach() { this.stats.dom.parentNode?.removeChild(this.stats.dom); }

  begin() { this.stats.begin(); }
  end() {
    this.stats.end();
    const { triangles, calls } = this.renderer.info.render;
    let memoryMB = "N/A";
    if (performance?.memory) {
      memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
      this.maxMemoryMB = Math.max(this.maxMemoryMB, parseFloat(memoryMB));
    }
    this.extraMetrics.innerHTML = `
      Tri: ${triangles.toLocaleString()}<br>
      Draw: ${calls.toLocaleString()}<br>
      Mem: ${memoryMB} MB (Max: ${this.maxMemoryMB.toFixed(1)})
    `;
  }
}
