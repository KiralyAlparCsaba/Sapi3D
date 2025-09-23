// frontend/src/metrics.js
import Stats from 'three/examples/jsm/libs/stats.module.js';

export class Metrics {
  constructor(renderer) {
    this.renderer = renderer;

    this.stats = new Stats();
    this.stats.showPanel(0); // 0 = FPS
    document.body.appendChild(this.stats.dom);

    this.extraMetrics = document.createElement('div');
    this.extraMetrics.style.color = '#0f0';
    this.extraMetrics.style.fontFamily = 'monospace';
    this.extraMetrics.style.fontSize = '16px';
    this.extraMetrics.style.marginTop = '4px';
    this.stats.dom.appendChild(this.extraMetrics);

    this.maxMemoryMB = 0;
  }

  begin() {
    this.stats.begin();
  }

  end() {
    this.stats.end();

    const info = this.renderer.info;
    const triangles = info.render.triangles;
    const drawCalls = info.render.calls;

    let memoryMB = 'N/A';
    if (performance && performance.memory) {
      memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
      this.maxMemoryMB = Math.max(this.maxMemoryMB, parseFloat(memoryMB));
    }

    this.extraMetrics.innerHTML = `
      Tri: ${triangles.toLocaleString()}<br>
      Draw: ${drawCalls.toLocaleString()}<br>
      Mem: ${memoryMB} MB (Max: ${this.maxMemoryMB.toFixed(1)})
    `;
  }
}
