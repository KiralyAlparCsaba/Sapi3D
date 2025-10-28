import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import Metrics from "./Metrics";

export default function Building({ onInsideChange, onWorldReady }) {
  const gltf = useGLTF("/api/model");
  const roofRef = useRef();
  const interiorRef = useRef();
  const triggerBoxRef = useRef();
  const isInsideRef = useRef(false);

  const { camera, gl } = useThree();

  const avgFps = useRef(60);

  // Metrics overlay
  const metricsRef = useRef();
  if (!metricsRef.current) metricsRef.current = new Metrics(gl);

  useEffect(() => {
    metricsRef.current.attach();
    return () => metricsRef.current.detach();
  }, []);

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

  useFrame((_, delta) => {
    const metrics = metricsRef.current;
    metrics.begin();

    // Roof toggle
    if (triggerBoxRef.current && roofRef.current && interiorRef.current) {
      const inside = triggerBoxRef.current.containsPoint(camera.position);
      if (inside !== isInsideRef.current) {
        isInsideRef.current = inside;
        roofRef.current.visible = !inside;
        interiorRef.current.visible = inside;
        onInsideChange?.(inside);
      }
    }

    const fps = 1 / delta;
    avgFps.current = 0.9 * avgFps.current + 0.1 * fps;

    const ratio = gl.getPixelRatio();
    const deviceRatio = window.devicePixelRatio;

    // Gradually adjust resolution based on FPS
    if (avgFps.current < 28 && ratio > 0.5) {
      gl.setPixelRatio(ratio * 0.9);
    } else if (avgFps.current > 40 && ratio < deviceRatio) {
      gl.setPixelRatio(ratio * 1.05);
    }

    metrics.end();
  });

  return <primitive object={gltf.scene} />;
}
