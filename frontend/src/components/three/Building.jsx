// src/components/three/Building.jsx
import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import Metrics from "./Metrics";
import PlayerMovement from "./PlayerMovement";

export default function Building({ controlsRef, onInsideChange }) {
  // Load GLTF building model from API proxy
  const gltf = useGLTF("/api/model");
  const roofRef = useRef();
  const interiorRef = useRef();
  const triggerBoxRef = useRef();
  const isInsideRef = useRef(false);

  const { camera, gl } = useThree();

  // Initialize Metrics
  const metricsRef = useRef();
  if (!metricsRef.current) metricsRef.current = new Metrics(gl);

  // Attach Metrics DOM when component mounts
  useEffect(() => {
    metricsRef.current.attach();
    return () => metricsRef.current.detach();
  }, []);

  // Initialize player movement
  const { updateMovement } = PlayerMovement(controlsRef, 10.0);

  // Setup references once GLTF is loaded
  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child.name === "Roof") roofRef.current = child;
      if (child.name === "Interior") interiorRef.current = child;
      if (child.name === "TriggerZone") {
        triggerBoxRef.current = new THREE.Box3().setFromObject(child);
        child.visible = false;
      }
    });
  }, [gltf.scene]);

  // Update per frame
  useFrame((_, delta) => {
    const metrics = metricsRef.current;
    metrics.begin();

    // Check if camera is inside the trigger zone
    if (triggerBoxRef.current && roofRef.current && interiorRef.current) {
      const inside = triggerBoxRef.current.containsPoint(camera.position);
      if (inside !== isInsideRef.current) {
        isInsideRef.current = inside;
        roofRef.current.visible = !inside;
        interiorRef.current.visible = inside;
        onInsideChange?.(inside);
      }
    }

    // Move player
    updateMovement(delta);

    metrics.end();
  });

  return <primitive object={gltf.scene} />;
}
