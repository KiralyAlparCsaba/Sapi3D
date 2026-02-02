import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import Metrics from "./Metrics";
import { metricsCollector } from "./metricsCollector";
import { measureLatency } from "./Latency";

export default function Building({ controlsRef, onInsideChange, onWorldReady, sessionId }) {
  // Load GLTF building model from backend API
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const gltf = useGLTF(`${API_URL}/model`);
  const roofRef = useRef();
  const interiorRef = useRef();
  const triggerBoxes = useRef([]);  // <--- multiple boxes
  const isInsideRef = useRef(false);

  const { camera, gl } = useThree();

  const avgFps = useRef(60);
  const metricsRef = useRef();
  if (!metricsRef.current) metricsRef.current = new Metrics(gl);

  useEffect(() => {
    if (sessionId) metricsCollector.setSession(sessionId);
  }, [sessionId]);

  useEffect(() => {
    metricsRef.current.attach();
    return () => metricsRef.current.detach();
  }, []);

  //
  // Load model + gather trigger boxes
  //
  useEffect(() => {
    triggerBoxes.current = [];  // reset

    gltf.scene.traverse((child) => {
      if (child.name === "Roof") roofRef.current = child;
      if (child.name === "Interior") interiorRef.current = child;

      // Collect all TriggerZone_* meshes
      if (child.name.startsWith("TriggerZone")) {
        const box = new THREE.Box3().setFromObject(child);
        triggerBoxes.current.push(box);
        child.visible = false;
      }
    });

    if (onWorldReady) onWorldReady(gltf.scene);
  }, [gltf.scene, onWorldReady]);


  //
  // MAIN LOOP
  //
  useFrame(async (_, delta) => {
    const metrics = metricsRef.current;
    metrics.begin();

    //
    // 1. Check camera inside ANY of the trigger boxes
    //
    if (
      roofRef.current &&
      interiorRef.current &&
      triggerBoxes.current.length > 0
    ) {
      let inside = false;

      for (const box of triggerBoxes.current) {
        if (box.containsPoint(camera.position)) {
          inside = true;
          break;
        }
      }

      if (inside !== isInsideRef.current) {
        isInsideRef.current = inside;

        roofRef.current.visible = !inside;
        interiorRef.current.visible = inside;

        onInsideChange?.(inside);
      }
    }

    //
    // 2. FPS
    //
    const fps = 1 / delta;
    avgFps.current = avgFps.current * 0.9 + fps * 0.1;

    //
    // 3. Latency
    //
    const latency = await measureLatency();

    //
    // 4. Memory
    //
    let memoryMB = 0;
    if (performance?.memory) {
      memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    }

    //
    // 5. Store metrics
    //
    metricsCollector.addSample({
      fps,
      memory_mb: memoryMB,
      latency_ms: latency,
      timestamp: performance.now(),
    });

    //
    // 6. Dynamic resolution scaling
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
