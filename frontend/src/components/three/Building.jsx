import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import Metrics from "./Metrics";
import { metricsCollector } from "./metricsCollector";
import { measureLatency } from "./Latency";
import HologramPanel from "./HologramPanel";
import InteractiveDoor from "./InteractiveDoor";

// Per-floor trigger zones (set in Blender).
//   TriggerZone_A → floor 0 (ground / földszint)
//   TriggerZone_B → floor 1 (first floor / első emelet)
//   TriggerZone_C → floor 2 (second floor / második emelet)
const TRIGGER_TO_FLOOR = {
  TriggerZone_A: 0,
  TriggerZone_B: 1,
  TriggerZone_C: 2,
};
const FLOOR_INDICES = [0, 1, 2];
const FLOOR_PREFIX_REGEX = /^F(\d+)_/;

// Door interaction.
const DOOR_PROXIMITY_DISTANCE = 3; // m, max raycast distance to a door
const LOCATION_PROXIMITY_DISTANCE_SQ = 4; // m², squared distance for visit trigger

// Latency probe.
const LATENCY_PROBE_INTERVAL_MS = 5000;

// Adaptive quality control (frame-rate based pixel-ratio tuning).
const FPS_SMOOTHING_NEW = 0.1; // weight of newest frame in moving average
const FPS_SMOOTHING_OLD = 1 - FPS_SMOOTHING_NEW;
const FPS_CLAMP_MAX = 240; // upper bound on a single frame's instantaneous FPS
const ADAPTIVE_FPS_DOWN_THRESHOLD = 18; // below this avg fps, reduce pixel ratio
const ADAPTIVE_FPS_UP_THRESHOLD = 28; // above this avg fps, gently restore
const ADAPTIVE_RATIO_MIN = 0.5; // floor for the reduced pixel ratio
const ADAPTIVE_RATIO_DOWN_FACTOR = 0.9; // multiplier applied when degrading
const ADAPTIVE_RATIO_UP_FACTOR = 1.05; // multiplier applied when recovering

// Spawn fallback (camera-space; the actual spawn happens via marker teleport in ThreeScene).
const SPAWN_POS_CAMERA = new THREE.Vector3(-0.017955, -0.099324 + 1.7, 6.3213);

export default function Building({
  controlsRef,
  onInsideChange,
  onWorldReady,
  onInfoPanelOpen,
  onLocationVisit,
  sessionId,
  infoPanelsData,
  locationsData,
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
  // floorBoxes: { 0: Box3, 1: Box3, 2: Box3 } — per-floor trigger volumes.
  const floorBoxes = useRef({});
  // floorObjects: { 0: [...], 1: [...], 2: [...] } — every F0_/F1_/F2_-prefixed object.
  const floorObjects = useRef({ 0: [], 1: [], 2: [] });
  // currentFloorRef: undefined → not yet initialized; null → outside; 0/1/2 → floor index.
  const currentFloorRef = useRef(undefined);

  const hoveredDoorRef = useRef(null);
  const [hoveredDoor, setHoveredDoor] = useState(null);
  const doorObjects = useRef([]);

  const [hologramMarkers, setHologramMarkers] = useState([]);

  const { camera, gl } = useThree();

  const didSnapRef = useRef(false);

  const avgFps = useRef(60);
  const metricsRef = useRef();
  if (!metricsRef.current) metricsRef.current = new Metrics(gl);

  const latencyRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      latencyRef.current = await measureLatency(`${API_URL}/health`);
    }, LATENCY_PROBE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [API_URL]);

  const raycaster = useRef(new THREE.Raycaster());
  const centerScreen = useRef(new THREE.Vector2(0, 0));
  const cameraWorldPosRef = useRef(new THREE.Vector3());
  const locationMarkersRef = useRef([]);
  const proximityTriggeredRef = useRef(new Set());

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
    floorBoxes.current = {};
    floorObjects.current = { 0: [], 1: [], 2: [] };
    currentFloorRef.current = undefined;
    doorObjects.current = [];
    const foundHolograms = [];
    const foundLocationMarkers = [];

    if (!didSnapRef.current) {
      camera.position.copy(SPAWN_POS_CAMERA);
      didSnapRef.current = true;
    }

    gltf.scene.traverse((child) => {
      if (child.name === "Roof") roofRef.current = child;

      const triggerFloor = TRIGGER_TO_FLOOR[child.name];
      if (triggerFloor !== undefined) {
        floorBoxes.current[triggerFloor] = new THREE.Box3().setFromObject(child);
        child.visible = false;
      }

      const floorMatch = child.name.match(FLOOR_PREFIX_REGEX);
      if (floorMatch) {
        const floor = parseInt(floorMatch[1], 10);
        if (floorObjects.current[floor]) {
          floorObjects.current[floor].push(child);
        }
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
          const dbButtonLoc = item.button_location
            ? item.button_location.toLowerCase()
            : "";
          return (
            dbName === normalizedChildName ||
            dbButtonLoc === normalizedChildName
          );
        });

        const displayText =
          dbEntry?.information || `Nincs DB infó:\n${child.name}`;

        foundHolograms.push({
          id: child.uuid,
          name: child.name,
          position: center,
          text: displayText,
        });

        if (dbEntry?.loc_id) {
          foundLocationMarkers.push({
            locationId: dbEntry.loc_id,
            position: center,
          });
        }
      }
    });

    // Initial visibility: outside → all floor groups hidden, roof visible.
    // useFrame's first tick will reconcile once the camera position is sampled.
    for (const list of Object.values(floorObjects.current)) {
      for (const obj of list) obj.visible = false;
    }
    if (roofRef.current) roofRef.current.visible = true;

    setHologramMarkers(foundHolograms);
    locationMarkersRef.current = foundLocationMarkers;
    proximityTriggeredRef.current = new Set();
    onWorldReady?.(gltf.scene);
  }, [gltf.scene, camera, onWorldReady, locationsData]);

  useFrame((_, delta) => {
    const metrics = metricsRef.current;
    metrics.begin();

    // The camera is parented to playerRoot (see ThreeScene.jsx), so
    // `camera.position` is *local* to that parent (always (0, 1.7, 0)).
    // Trigger-zone Box3 objects and location markers live in world space, so
    // we resolve the camera's world position once and reuse it below.
    const camWorldPos = cameraWorldPosRef.current;
    camera.getWorldPosition(camWorldPos);

    // Door pickup via screen-center raycast.
    raycaster.current.setFromCamera(centerScreen.current, camera);
    const intersects = raycaster.current.intersectObjects(
      gltf.scene.children,
      true,
    );

    let hoveredRoot = null;
    for (const hit of intersects) {
      if (hit.object.userData.isDoor) {
        const root = hit.object.userData.doorRoot || hit.object;
        if (hit.distance <= DOOR_PROXIMITY_DISTANCE) {
          hoveredRoot = root;
          break;
        }
      }
    }

    if (hoveredRoot !== hoveredDoorRef.current) {
      hoveredDoorRef.current = hoveredRoot;
      setHoveredDoor(hoveredRoot);
    }

    // Per-floor visibility — show only the floor that contains the camera.
    let detectedFloor = null;
    for (const floor of FLOOR_INDICES) {
      const box = floorBoxes.current[floor];
      if (box && box.containsPoint(camWorldPos)) {
        detectedFloor = floor;
        break;
      }
    }

    if (detectedFloor !== currentFloorRef.current) {
      currentFloorRef.current = detectedFloor;
      const inside = detectedFloor !== null;
      if (roofRef.current) roofRef.current.visible = !inside;
      for (const floor of FLOOR_INDICES) {
        const list = floorObjects.current[floor];
        if (!list) continue;
        const visible = inside && floor === detectedFloor;
        for (const obj of list) obj.visible = visible;
      }
      onInsideChange?.(inside);
    }

    // Location-marker proximity trigger (once per marker per session).
    if (onLocationVisit && locationMarkersRef.current.length > 0) {
      for (const marker of locationMarkersRef.current) {
        if (proximityTriggeredRef.current.has(marker.locationId)) continue;
        if (
          camWorldPos.distanceToSquared(marker.position) <=
          LOCATION_PROXIMITY_DISTANCE_SQ
        ) {
          proximityTriggeredRef.current.add(marker.locationId);
          onLocationVisit(marker.locationId);
        }
      }
    }

    // Frame metrics collection.
    // Clamp fps: 1/delta is Infinity when delta=0 (can happen on the very
    // first frame). If Infinity reaches buildSamplesArray it taints the
    // bucket average → JSON serializes as null → backend 422-rejects the
    // whole metrics POST. Keeping fps finite, non-negative and capped
    // avoids that.
    const rawFps = 1 / delta;
    const fps =
      Number.isFinite(rawFps) && rawFps >= 0
        ? Math.min(rawFps, FPS_CLAMP_MAX)
        : 0;
    avgFps.current = avgFps.current * FPS_SMOOTHING_OLD + fps * FPS_SMOOTHING_NEW;

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

    // Adaptive pixel-ratio: degrade rendering resolution if the moving FPS
    // average drops below the threshold, and gently restore it once the
    // device recovers.
    const ratio = gl.getPixelRatio();
    const deviceRatio = window.devicePixelRatio;

    if (avgFps.current < ADAPTIVE_FPS_DOWN_THRESHOLD && ratio > ADAPTIVE_RATIO_MIN) {
      gl.setPixelRatio(ratio * ADAPTIVE_RATIO_DOWN_FACTOR);
      metricsCollector.incrementQualityReductions();
    } else if (avgFps.current > ADAPTIVE_FPS_UP_THRESHOLD && ratio < deviceRatio) {
      gl.setPixelRatio(ratio * ADAPTIVE_RATIO_UP_FACTOR);
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
        onPanelOpen={onInfoPanelOpen}
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
