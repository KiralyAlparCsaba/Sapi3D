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
  infoPanelsData,  // Ajtókhoz (coordinates_obj_name, information, media_url)
  locationsData    // Hologramokhoz (name, button_location, information)
}) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const gltf = useGLTF(`${API_URL}/model`);

  const roofRef = useRef();
  const interiorRef = useRef();
  const triggerBoxes = useRef([]);
  const isInsideRef = useRef(false);

  const hoveredDoorRef = useRef(null);
  // hoveredDoor most a doorRoot-ot tárolja (a névvel rendelkező node), nem a hit mesh-t
  const [hoveredDoor, setHoveredDoor] = useState(null);
  const [hologramMarkers, setHologramMarkers] = useState([]);

  const { camera, gl } = useThree();

  const SPAWN_POS = new THREE.Vector3(-0.017955, -0.099324 + 1.7, 6.3213);
  const didSnapRef = useRef(false);

  const avgFps = useRef(60);
  const metricsRef = useRef();
  if (!metricsRef.current) metricsRef.current = new Metrics(gl);

  const raycaster = new THREE.Raycaster();
  const centerScreen = new THREE.Vector2(0, 0);

  //
  // INIT
  //
  useEffect(() => {
    if (sessionId) metricsCollector.setSession(sessionId);
  }, [sessionId]);

  useEffect(() => {
    metricsRef.current.attach();
    return () => metricsRef.current.detach();
  }, []);

  //
  // LOAD MODEL
  //
  useEffect(() => {
    triggerBoxes.current = [];
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

      // FIX: az ajtó root node-ját megjelöljük, majd az összes leszármazottjára
      // ráírjuk az isDoor flag-et ÉS a doorRoot referenciát.
      // Így a raycast bármely mélységű mesh-t eltalálja, mégis visszakövethetjük
      // a névvel rendelkező szülő node-hoz.
      if (child.name.toLowerCase().includes("door")) {
        child.userData.isDoor = true;
        child.userData.doorRoot = child; // ő maga a root

        child.traverse((descendant) => {
          if (descendant === child) return; // magát ne írjuk felül
          descendant.userData.isDoor = true;
          descendant.userData.doorRoot = child;
        });
      }

      // HOLOGRAM MARKEREK - locationsData alapján
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

  //
  // MAIN LOOP
  //
  useFrame(async (_, delta) => {
    const metrics = metricsRef.current;
    metrics.begin();

    // 🎯 RAYCAST – minden ajtót keres, mélyen egymásba ágyazott mesh-eket is
    raycaster.setFromCamera(centerScreen, camera);
    const intersects = raycaster.intersectObjects(gltf.scene.children, true);

    let hoveredRoot = null;
    for (const hit of intersects) {
      if (hit.object.userData.isDoor) {
        // Visszakövetjük a névvel rendelkező root node-hoz
        hoveredRoot = hit.object.userData.doorRoot || hit.object;
        break;
      }
    }

    // Csak akkor frissítjük ha változott (referencia alapján)
    if (hoveredRoot !== hoveredDoorRef.current) {
      hoveredDoorRef.current = hoveredRoot;
      setHoveredDoor(hoveredRoot);
    }

    // ✨ HIGHLIGHT – doorRoot alapján highlight-olunk, így az egész ajtó (minden
    // leszármazott mesh) egységesen világít, függetlenül a hierarchia mélységétől
    gltf.scene.traverse((obj) => {
      if (obj.userData.isDoor && obj.material) {
        const sameRoot = hoveredRoot && obj.userData.doorRoot === hoveredRoot;

        if (sameRoot) {
          obj.material.emissive = new THREE.Color("#4da6ff");
          obj.material.emissiveIntensity = 0.5;
        } else {
          obj.material.emissive = new THREE.Color("#000000");
          obj.material.emissiveIntensity = 0;
        }
      }
    });

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

    // 📊 FPS
    const fps = 1 / delta;
    avgFps.current = avgFps.current * 0.9 + fps * 0.1;

    const latency = await measureLatency();

    let memoryMB = 0;
    if (performance?.memory) {
      memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
    }

    metricsCollector.addSample({
      fps,
      memory_mb: memoryMB,
      latency_ms: latency,
      timestamp: performance.now(),
    });

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
      <primitive object={gltf.scene} />

      {/* 🚪 INTERACTIVE DOOR – infoPanelsData alapján */}
      <InteractiveDoor
        mesh={hoveredDoor}
        databaseInfo={infoPanelsData}  // Itt az infoPanelsData-t adjuk át!
        isHovered={!!hoveredDoor}
      />

      {/* 💚 HOLOGRAM PANELEK – locationsData alapján */}
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