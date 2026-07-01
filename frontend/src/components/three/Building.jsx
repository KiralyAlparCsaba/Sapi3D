import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import Metrics from "./Metrics";
import { metricsCollector } from "./metricsCollector";
import { measureLatency } from "./Latency";
import { weightedAverage } from "./weightedAverage";
import HologramPanel from "./HologramPanel";
import InteractiveDoor from "./InteractiveDoor";
import api from "../../services/api";

// --- Konfigurációs konstansok ---
const DEFAULT_API_URL = "/api";

// Spawn pozíció (kamera kezdőhelye)
const SPAWN_X = -0.017955;
const SPAWN_Y = -0.099324;
const SPAWN_EYE_HEIGHT = 1.7;
const SPAWN_Z = 6.3213;

// Időzítők (ms)
const LATENCY_POLL_INTERVAL_MS = 5000;
const METRICS_UPLOAD_INTERVAL_MS = 30_000;

// Távolságok
const MAX_DISTANCE = 3;
const LOCATION_DISTANCE_SQ = 4;

// FPS
const INITIAL_AVG_FPS = 60;
const FPS_SMOOTHING = 0.1; // exponenciális átlag súlya az új mintára
const MAX_FPS = 240;

// Adaptív felbontás
const MIN_PIXEL_RATIO = 0.5;
const LOW_FPS_THRESHOLD = 18;
const HIGH_FPS_THRESHOLD = 28;
const PIXEL_RATIO_DOWN_FACTOR = 0.9;
const PIXEL_RATIO_UP_FACTOR = 1.05;

// Objektum nevek a GLTF jelenetben
const ROOF_NAME = "Roof";
const INTERIOR_NAME = "Interior";
const TRIGGER_ZONE_PREFIX = "TriggerZone";
const COLLIDER_PREFIX = "COL";
const DOOR_KEYWORD = "door";
const MARKER_KEYWORD = "marker";

export default function Building({
  controlsRef,
  onInsideChange,
  onWorldReady,
  onInfoPanelOpen,
  onLocationVisit,
  sessionId,
  infoPanelsData,
  locationsData,
  playMode,
}) {

  const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
  const gltf = useGLTF(`${API_URL}/model`);

  const roofRef = useRef();
  const interiorRef = useRef();
  const triggerBoxes = useRef([]);
  const isInsideRef = useRef(false);

  const hoveredDoorRef = useRef(null);
  const [hoveredDoor, setHoveredDoor] = useState(null);
  const doorObjects = useRef([]);

  const [hologramMarkers, setHologramMarkers] = useState([]);

  const { camera, gl } = useThree();

  const SPAWN_POS = new THREE.Vector3(SPAWN_X, SPAWN_Y + SPAWN_EYE_HEIGHT, SPAWN_Z);
  const didSnapRef = useRef(false);

  const avgFps = useRef(INITIAL_AVG_FPS);
  const metricsRef = useRef();
  if (!metricsRef.current) metricsRef.current = new Metrics(gl);

  const latencyRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      latencyRef.current = await measureLatency(`${API_URL}/health`);
    }, LATENCY_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [API_URL]);

  const playModeRef = useRef(playMode);
  useEffect(() => { playModeRef.current = playMode; }, [playMode]);

  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(async () => {
      const samples = metricsCollector.getSamples();
      if (samples.length < 2) return;

      const avgFpsVal    = weightedAverage(samples, "fps");
      const avgMemVal    = weightedAverage(samples, "memory_mb");
      const avgLatVal    = weightedAverage(samples, "latency_ms");

      try {
        await api.post(`/sessions/${sessionId}/metrics`, {
          session_id: Number(sessionId),
          fps:        Math.round(avgFpsVal),
          memory_mb:  Math.round(avgMemVal),
          latency_ms: Math.round(avgLatVal),
          timestamp:  new Date().toISOString(),
          play_mode:  playModeRef.current ?? null,
        });
        metricsCollector.clearSamples();
      } catch (err) {
        console.error("[metrics] Periódikus feltöltés sikertelen:", err);
      }
    }, METRICS_UPLOAD_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [sessionId]);

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
    triggerBoxes.current = [];
    doorObjects.current = [];
    const foundHolograms = [];
    const foundLocationMarkers = [];

    if (!didSnapRef.current) {
      camera.position.copy(SPAWN_POS);
      didSnapRef.current = true;
    }

    gltf.scene.traverse((child) => {
      if (child.name === ROOF_NAME) roofRef.current = child;
      if (child.name === INTERIOR_NAME) interiorRef.current = child;

      if (child.name.startsWith(TRIGGER_ZONE_PREFIX)) {
        const box = new THREE.Box3().setFromObject(child);
        triggerBoxes.current.push(box);
        child.visible = false;
      }

      if (child.name.startsWith(COLLIDER_PREFIX)) {
        child.visible = false;
      }

      if (child.name.toLowerCase().includes(DOOR_KEYWORD)) {
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

      if (child.name.toLowerCase().includes(MARKER_KEYWORD)) {
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

    setHologramMarkers(foundHolograms);
    locationMarkersRef.current = foundLocationMarkers;
    proximityTriggeredRef.current = new Set();
    onWorldReady?.(gltf.scene);
  }, [gltf.scene, camera, onWorldReady, locationsData]);

  useFrame((_, delta) => {
    const metrics = metricsRef.current;
    metrics.begin();

    raycaster.current.setFromCamera(centerScreen.current, camera);
    const intersects = raycaster.current.intersectObjects(
      gltf.scene.children,
      true,
    );

    let hoveredRoot = null;

    for (const hit of intersects) {
      if (hit.object.userData.isDoor) {
        const root = hit.object.userData.doorRoot || hit.object;

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

    if (onLocationVisit && locationMarkersRef.current.length > 0) {
      const cameraWorldPos = cameraWorldPosRef.current;
      camera.getWorldPosition(cameraWorldPos);

      for (const marker of locationMarkersRef.current) {
        if (proximityTriggeredRef.current.has(marker.locationId)) continue;
        if (
          cameraWorldPos.distanceToSquared(marker.position) <=
          LOCATION_DISTANCE_SQ
        ) {
          proximityTriggeredRef.current.add(marker.locationId);
          onLocationVisit(marker.locationId);
        }
      }
    }

    const rawFps = 1 / delta;
    const fps =
      Number.isFinite(rawFps) && rawFps >= 0 ? Math.min(rawFps, MAX_FPS) : 0;
    avgFps.current = avgFps.current * (1 - FPS_SMOOTHING) + fps * FPS_SMOOTHING;

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

    if (avgFps.current < LOW_FPS_THRESHOLD && ratio > MIN_PIXEL_RATIO) {
      gl.setPixelRatio(ratio * PIXEL_RATIO_DOWN_FACTOR);
      metricsCollector.incrementQualityReductions();
    } else if (avgFps.current > HIGH_FPS_THRESHOLD && ratio < deviceRatio) {
      gl.setPixelRatio(ratio * PIXEL_RATIO_UP_FACTOR);
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