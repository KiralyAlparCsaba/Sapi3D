import { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import UsePlayerMovement from "./PlayerMovement";
import { createMobileJoystick } from "./MobileJoystick";
import Building from "./Building";
import * as THREE from "three";
import MobilePointerLockControls from "./MobilePointerLockControls";

import Metrics from "./Metrics";
import usePerformanceUploader from "./usePerformanceUploader";

// Metrics monitor
function PerformanceMonitor({ sessionId }) {
  const { gl } = useThree();
  const [metrics] = useState(() => new Metrics(gl));

  useEffect(() => {
    metrics.attach();
    return () => metrics.detach();
  }, [metrics]);

  usePerformanceUploader(metrics, sessionId);

  useFrame((_, delta) => metrics.end(delta * 1000)); // pass delta in ms

  return null;
}

// Scene content
function SceneContent({ controlsRef, sessionId, isMobile }) {
  const collisionRef = useRef(null);
  const { camera } = useThree();

  useEffect(() => {
    if (isMobile) {
      controlsRef.current = new MobilePointerLockControls(camera);
      camera.position.set(0, 1.7, 3);
    }
  }, [isMobile, camera]);

  const player = UsePlayerMovement(
    controlsRef,
    collisionRef,
    isMobile ? 7.0 : 10.0
  );

  useFrame((_, delta) => {
    if (collisionRef.current) player.updateMovement(delta);
    controlsRef.current?.update?.(delta);
  });

  return (
    <Suspense fallback={null}>
      <PerformanceMonitor sessionId={sessionId} />

      <Building
        sessionId={sessionId}
        onWorldReady={(mesh) => {
          collisionRef.current = mesh;
          const cam = controlsRef.current.getObject();
          const rayOrigin = cam.position.clone();
          rayOrigin.y = 10;

          const ray = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0));
          const hits = ray.intersectObjects(mesh.children, true);
          if (hits.length > 0) cam.position.y = hits[0].point.y + 1.2;
        }}
      />
    </Suspense>
  );
}

export default function ThreeScene() {
  const controlsRef = useRef();
  const [PointerLock, setPointerLock] = useState(null);

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    if (!isMobile) {
      import("@react-three/drei").then(mod => setPointerLock(() => mod.PointerLockControls));
    } else {
      return createMobileJoystick(
        (x, y) => (window.joystickMove = { x, y }),
        (lx, ly) => (window.joystickLook = { lx, ly })
      );
    }
  }, []);

  const sessionId = Number(sessionStorage.getItem("session_id"));

  return (
    <>
      <button
        onClick={() => (window.location.href = "/app")}
        className="back-btn"
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          padding: "10px 20px",
          background: "white",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          zIndex: 999,
        }}
      >
        ← Vissza a főoldalra
      </button>

      <Canvas camera={{ position: [0, 1.7, 3], fov: 75 }} style={{ width: "100vw", height: "100vh" }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 7.5]} intensity={1.2} />

        <SceneContent controlsRef={controlsRef} sessionId={sessionId} isMobile={isMobile} />

        {!isMobile && PointerLock && <PointerLock ref={controlsRef} />}
      </Canvas>
    </>
  );
}