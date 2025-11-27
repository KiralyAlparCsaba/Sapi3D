import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import Metrics from "./Metrics";
import { metricsCollector } from "./metricsCollector";
import { measureLatency } from "./Latency";

export default function Building({ onInsideChange, onWorldReady, sessionId }) {
  const gltf = useGLTF("/api/model");

  const roofRef = useRef();
  const interiorRef = useRef();
  const triggerBoxRef = useRef();
  const isInsideRef = useRef(false);

  const { camera, gl } = useThree();

  // Store weighted average FPS
  const avgFps = useRef(60);

  // Metrics overlay (Three.js Stats)
  const metricsRef = useRef();
  if (!metricsRef.current) metricsRef.current = new Metrics(gl);

  // Tell the global collector which session this belongs to
  useEffect(() => {
    if (sessionId) {
      metricsCollector.setSession(sessionId);
    }
  }, [sessionId]);

  // Attach/remove FPS panel to the DOM
  useEffect(() => {
    metricsRef.current.attach();
    return () => metricsRef.current.detach();
  }, []);

  // Load model + find objects
  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child.name === "Roof") roofRef.current = child;
      if (child.name === "Interior") interiorRef.current = child;

      if (child.name === "TriggerZone") {
        triggerBoxRef.current = new THREE.Box3().setFromObject(child);
        child.visible = false;
      }
    });

    if (onWorldReady) onWorldReady(gltf.scene);
  }, [gltf.scene, onWorldReady]);

  // MAIN FRAME LOOP — runs every animation frame
  useFrame(async (_, delta) => {
    const metrics = metricsRef.current;
    metrics.begin();

    //
    // 1. Detect entering/exiting the building interior
    //
    if (triggerBoxRef.current && roofRef.current && interiorRef.current) {
      const inside = triggerBoxRef.current.containsPoint(camera.position);

      if (inside !== isInsideRef.current) {
        isInsideRef.current = inside;
        roofRef.current.visible = !inside;
        interiorRef.current.visible = inside;
        onInsideChange?.(inside);
      }
    }




    //
    // 2. FPS calculation (weighted)
    //
    const fps = 1 / delta;
    avgFps.current = avgFps.current * 0.9 + fps * 0.1;

    //
    // 3. Latency
    //
    const latency = await measureLatency();

    //
    // 4. Memory usage (if supported)
    //
    let memoryMB = 0;
    if (performance?.memory) {
      memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    }

    //
    // 5. Push this sample to GLOBAL collector
    //

    console.log("Sample recorded:", {
      fps,
      memoryMB,
      latency
    });

    console.log("Current sessionId:", metricsCollector.sessionId);


    metricsCollector.addSample({
      fps,
      memory_mb: memoryMB,
      latency_ms: latency,
      timestamp: performance.now()
    });

    //
    // 6. Dynamic resolution scaling (optional)
    //
    const ratio = gl.getPixelRatio();
    const deviceRatio = window.devicePixelRatio;

    if (avgFps.current < 28 && ratio > 0.5) {
      gl.setPixelRatio(ratio * 0.9);
    } else if (avgFps.current > 40 && ratio < deviceRatio) {
      gl.setPixelRatio(ratio * 1.05);
    }

    metrics.end();
  });

  return <primitive object={gltf.scene} />;
}
