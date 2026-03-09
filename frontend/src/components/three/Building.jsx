import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import Metrics from "./Metrics";
import { metricsCollector } from "./metricsCollector";
import { measureLatency } from "./Latency";

// Importáljuk az új komponenst!
import HologramPanel from "./HologramPanel";

export default function Building({
  controlsRef,
  onInsideChange,
  onWorldReady,
  sessionId,
  databaseInfo // Ezt a prop-ot majd kívülről (pl. API-ból) kaphatja meg
}) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const gltf = useGLTF(`${API_URL}/model`);

  const roofRef = useRef();
  const interiorRef = useRef();
  const triggerBoxes = useRef([]);
  const isInsideRef = useRef(false);

  // Állapot a megtalált hologramoknak
  const [hologramMarkers, setHologramMarkers] = useState([]);

  const { camera, gl } = useThree();

  // --- INITIAL SPAWN POINT ---
  // ONLY for first-load snap
  const SPAWN_POS = new THREE.Vector3(-0.017955, -0.099324 + 1.7, 6.3213);
  const didSnapRef = useRef(false);
  // ---------------------------

  const avgFps = useRef(60);
  const metricsRef = useRef();
  if (!metricsRef.current) metricsRef.current = new Metrics(gl);

  const camWorldPosRef = useRef(new THREE.Vector3());

  useEffect(() => {
    if (sessionId) metricsCollector.setSession(sessionId);
  }, [sessionId]);

  useEffect(() => {
    metricsRef.current.attach();
    return () => metricsRef.current.detach();
  }, []);

  //
  // Load model + gather triggers, colliders, and markers
  //
  useEffect(() => {
    triggerBoxes.current = []; // reset
    const foundHolograms = []; // Ide gyűjtjük őket ideiglenesen

    // Snap camera only once on first load
    if (!didSnapRef.current) {
      camera.position.copy(SPAWN_POS);
      didSnapRef.current = true;
    }

    gltf.scene.traverse((child) => {
      if (child.name === "Roof") roofRef.current = child;
      if (child.name === "Interior") interiorRef.current = child;

      // Collect all TriggerZone_* meshes
      if (child.name.startsWith("TriggerZone")) {
        const box = new THREE.Box3().setFromObject(child);
        triggerBoxes.current.push(box);
        child.visible = false;
      }

      // Hide all Collision meshes
      if (child.name.startsWith("COL")) {
        child.visible = false;
        child.castShadow = false;
        child.receiveShadow = false;
      }

      // --- ÚJ RÉSZ: Markerek keresése a hologramokhoz ---
      if (child.name.toLowerCase().includes("marker")) {
        // Elrejtjük magát a 3D-s marker objektumot (kocka/henger), hogy csak a hologram látsszon
        child.visible = false;

        // Lekérjük a pontos térbeli pozícióját (középpontot)
        const box = new THREE.Box3().setFromObject(child);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // --- BIZTONSÁGOS KERESÉS AZ ADATBÁZISBAN ---
        const normalizedChildName = child.name.toLowerCase();

        const dbEntry = databaseInfo?.find((item) => {
          // Ha létezik a mező, kisbetűsíti, ha nem, akkor üres string lesz (így nem fagy ki!)
          const dbName = item.name ? item.name.toLowerCase() : "";
          const dbButtonLoc = item.button_location ? item.button_location.toLowerCase() : "";

          return dbName === normalizedChildName || dbButtonLoc === normalizedChildName;
        });

        // Ha megtalálta az adatbázisban, kiírja az information mezőt. Ha nem, marad a helyőrző szöveg.
        const displayText = dbEntry && dbEntry.information
          ? dbEntry.information
          : `(Nincs DB infó:\n${child.name})`;

        foundHolograms.push({
          id: child.uuid,
          name: child.name,
          position: center,
          text: displayText
        });
      }
    });

    // Frissítjük a state-et a kigyűjtött markerekkel
    setHologramMarkers(foundHolograms);

    if (onWorldReady) onWorldReady(gltf.scene);
  }, [gltf.scene, onWorldReady, camera, databaseInfo]);

  //
  // MAIN LOOP
  //
  useFrame(async (_, delta) => {
    const metrics = metricsRef.current;
    metrics.begin();

    camera.getWorldPosition(camWorldPosRef.current);

    // 1. Check camera inside ANY of the trigger boxes
    if (
      roofRef.current &&
      interiorRef.current &&
      triggerBoxes.current.length > 0
    ) {
      let inside = false;

      for (const box of triggerBoxes.current) {
        if (box.containsPoint(camWorldPosRef.current)) {
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

    // 2. FPS
    const fps = 1 / delta;
    avgFps.current = avgFps.current * 0.9 + fps * 0.1;

    // 3. Latency
    const latency = await measureLatency();

    // 4. Memory
    let memoryMB = 0;
    if (performance?.memory) {
      memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    }

    // 5. Store metrics
    metricsCollector.addSample({
      fps,
      memory_mb: memoryMB,
      latency_ms: latency,
      timestamp: performance.now(),
    });

    // 6. Dynamic resolution scaling
    const ratio = gl.getPixelRatio();
    const deviceRatio = window.devicePixelRatio;

    if (avgFps.current < 28 && ratio > 0.5) {
      gl.setPixelRatio(ratio * 0.9);
    } else if (avgFps.current > 40 && ratio < deviceRatio) {
      gl.setPixelRatio(ratio * 1.05);
    }

    metrics.end();
  });

  return (
    <>
      {/* Maga az épület modellje */}
      <primitive object={gltf.scene} />

      {/* A kigyűjtött markerek alapján kirendereljük a hologramokat */}
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