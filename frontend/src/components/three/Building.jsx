import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import Metrics from "./Metrics";
import { metricsCollector } from "./metricsCollector";
import { measureLatency } from "./Latency";
import HologramPanel from "./HologramPanel";
import InteractiveDoor from "./InteractiveDoor";

export default function Building({
  controlsRef,
  onInsideChange,
  onWorldReady,
  sessionId,
  infoPanelsData,
  locationsData
}) {
  // IMPORTANT (production): never default to "http://localhost:8000".
  // In the user's browser, "localhost" points to their own device and is often blocked
  // (loopback protection) when your site is served over HTTPS.
  //
  // Our production nginx proxies the backend under the same origin at /api.
  // So the model endpoint becomes: /api/model
  const API_URL = import.meta.env.VITE_API_URL || "/api";
  const gltf = useGLTF(`${API_URL}/model`);

  const roofRef = useRef();
  const interiorRef = useRef();
  const triggerBoxes = useRef([]);
  const isInsideRef = useRef(false);

  const hoveredDoorRef = useRef(null);
  const [hoveredDoor, setHoveredDoor] = useState(null);
  const doorObjects = useRef([]);

  const COLOR_HIGHLIGHT = new THREE.Color("#4da6ff");
  const COLOR_DEFAULT = new THREE.Color("#000000");
  const [hologramMarkers, setHologramMarkers] = useState([]);

  const { camera, gl } = useThree();

  const SPAWN_POS = new THREE.Vector3(-0.017955, -0.099324 + 1.7, 6.3213);
  const didSnapRef = useRef(false);

  const avgFps = useRef(60);
  const metricsRef = useRef();
  if (!metricsRef.current) metricsRef.current = new Metrics(gl);

  const latencyRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      latencyRef.current = await measureLatency(`${API_URL}/health`);
    }, 5000);
    return () => clearInterval(interval);
  }, [API_URL]);

  const raycaster = useRef(new THREE.Raycaster());
  const centerScreen = useRef(new THREE.Vector2(0, 0));

  // ✅ PROXIMITY LIMIT
  const MAX_DISTANCE = 3;

  useEffect(() => {
    if (sessionId) metricsCollector.setSession(sessionId);
  }, [sessionId]);

  useEffect(() => {
    metricsRef.current.attach();
    return () => {
      metricsCollector.setPeakMemory(metricsRef.current.getPeakMemory());
      metricsRef.current.detach();
    };
  }, []);

  useEffect(() => {
    triggerBoxes.current = [];
    doorObjects.current = [];
    const foundHolograms = [];

    if (!didSnapRef.current) {
      camera.position.copy(SPAWN_POS);
      didSnapRef.current = true;
    }

    gltf.scene.traverse((child) => {
      if (child.name === "Roof") roofRef.current = child;
      if (child.name === "Interior") interiorRef.current = child;

      if (child.name.startsWith("TriggerZone")) {
        const box = new THREE.Box3().setFromObject(child);
        triggerBoxes.current.push(box);
        child.visible = false;
      }

      if (child.name.startsWith("COL")) {
        child.visible = false;
      }

      if (child.name.toLowerCase().includes("door")) {
        child.userData.isDoor = true;
        child.userData.doorRoot = child;
        doorObjects.current.push(child);

        child.traverse((descendant) => {
          if (descendant === child) return;
          descendant.userData.isDoor = true;
          descendant.userData.doorRoot = child;
          doorObjects.current.push(descendant);
        });
      }

      if (child.name.toLowerCase().includes("marker")) {
        child.visible = false;

        const box = new THREE.Box3().setFromObject(child);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const normalizedChildName = child.name.toLowerCase();
        const dbEntry = locationsData?.find((item) => {
          const dbName = item.name ? item.name.toLowerCase() : "";
          const dbButtonLoc = item.button_location ? item.button_location.toLowerCase() : "";
          return dbName === normalizedChildName || dbButtonLoc === normalizedChildName;
        });

        const displayText = dbEntry?.information || `Nincs DB infó:\n${child.name}`;

        foundHolograms.push({
          id: child.uuid,
          name: child.name,
          position: center,
          text: displayText,
        });
      }
    });

    setHologramMarkers(foundHolograms);
    onWorldReady?.(gltf.scene);
  }, [gltf.scene, camera, onWorldReady, locationsData]);

  useFrame((_, delta) => {
    const metrics = metricsRef.current;
    metrics.begin();

    // 🎯 RAYCAST
    raycaster.current.setFromCamera(centerScreen.current, camera);
    const intersects = raycaster.current.intersectObjects(gltf.scene.children, true);

    let hoveredRoot = null;

    for (const hit of intersects) {
      if (hit.object.userData.isDoor) {
        const root = hit.object.userData.doorRoot || hit.object;

        // ✅ CORRECT PROXIMITY CHECK
        if (hit.distance <= MAX_DISTANCE) {
          hoveredRoot = root;
          break;
        }
      }
    }

    if (hoveredRoot !== hoveredDoorRef.current) {
      hoveredDoorRef.current = hoveredRoot;
      setHoveredDoor(hoveredRoot);
    }

    // ✨ HIGHLIGHT
    for (const obj of doorObjects.current) {
      if (obj.material) {
        const sameRoot = hoveredRoot && obj.userData.doorRoot === hoveredRoot;
        obj.material.emissive = sameRoot ? COLOR_HIGHLIGHT : COLOR_DEFAULT;
        obj.material.emissiveIntensity = sameRoot ? 0.5 : 0;
      }
    }

    // 🏠 INSIDE CHECK
    const camPos = camera.position;
    let inside = false;
    for (const box of triggerBoxes.current) {
      if (box.containsPoint(camPos)) {
        inside = true;
        break;
      }
    }

    if (inside !== isInsideRef.current) {
      isInsideRef.current = inside;
      if (roofRef.current) roofRef.current.visible = !inside;
      if (interiorRef.current) interiorRef.current.visible = inside;
      onInsideChange?.(inside);
    }

    // 📊 METRICS
    const fps = 1 / delta;
    avgFps.current = avgFps.current * 0.9 + fps * 0.1;

    let memoryMB = 0;
    if (performance?.memory) {
      memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    }

    metricsCollector.addSample({
      fps,
      memory_mb: memoryMB,
      latency_ms: latencyRef.current,
      timestamp: performance.now(),
    });

    const ratio = gl.getPixelRatio();
    const deviceRatio = window.devicePixelRatio;

    if (avgFps.current < 18 && ratio > 0.5) {
      gl.setPixelRatio(ratio * 0.9);
      metricsCollector.incrementQualityReductions();
    } else if (avgFps.current > 28 && ratio < deviceRatio) {
      gl.setPixelRatio(ratio * 1.05);
    }

    metrics.end();
  });

  return (
    <>
      <primitive object={gltf.scene} />

      <InteractiveDoor
        mesh={hoveredDoor}
        databaseInfo={infoPanelsData}
        isHovered={!!hoveredDoor}
      />

      {hologramMarkers.map((marker) => (
        <HologramPanel
          key={marker.id}
          position={marker.position}
          text={marker.text}
        />
      ))}
    </>
  );
}