import { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useLocation } from "react-router-dom";
import UsePlayerMovement from "./PlayerMovement";
import { createMobileJoystick } from "./MobileJoystick";
import Building from "./Building";
import * as THREE from "three";
import MobilePointerLockControls from "./MobilePointerLockControls";

// SCENE CONTENT
function SceneContent({ controlsRef, sessionId, isMobile, markerToTeleport }) {
  const collisionRef = useRef(null);
  const { camera, scene } = useThree();
  const playerRootRef = useRef(new THREE.Object3D());

  // IMPORTANT: prevent double-teleport (StrictMode / re-mount / onWorldReady twice)
  const didTeleportRef = useRef(false);

  useEffect(() => {
    scene.add(playerRootRef.current);

    // root world start
    playerRootRef.current.position.set(0, 0, 3);

    // attach camera to player root
    playerRootRef.current.add(camera);
    camera.position.set(0, 1.7, 0);

    return () => {
      if (camera.parent === playerRootRef.current) {
        playerRootRef.current.remove(camera);
      }
      scene.remove(playerRootRef.current);
    };
  }, [camera, scene]);

  // Mobile controls init
  useEffect(() => {
    if (isMobile) {
      controlsRef.current = new MobilePointerLockControls(camera);
    }
  }, [isMobile, camera]);

  const player = UsePlayerMovement(
    controlsRef,
    collisionRef,
    playerRootRef,
    isMobile ? 7.0 : 10.0
  );

  useFrame((_, delta) => {
    if (collisionRef.current) player.updateMovement(delta);

    if (controlsRef.current?.update) {
      controlsRef.current.update(delta);
    }
  });

  // ✅ Helper: normalize names robustly
  // Marker.003 / Marker_003 / Marker003 -> marker003
  const normalize = (s) =>
    (s || "").replace(/[^a-z0-9]/gi, "").toLowerCase();

  // Helper: find marker by exact name (normalized), fallback to first marker in scene
  const findMarkerObject = (mesh, wantedName) => {
    const wanted = normalize(wantedName);

    let exact = null;
    let firstAny = null;

    mesh.traverse((child) => {
      const n = normalize(child.name);

      // first marker fallback
      if (!firstAny && n.includes("marker")) {
        firstAny = child;
      }

      // exact match
      if (!exact && wanted && n === wanted) {
        exact = child;
      }
    });

    return exact || firstAny;
  };

  return (
    <Suspense fallback={null}>
      <Building
        sessionId={sessionId}
        onWorldReady={(mesh) => {
          collisionRef.current = mesh;

          // If we already teleported once, don't do it again
          if (didTeleportRef.current) return;

          const markerObj = findMarkerObject(mesh, markerToTeleport);

          if (!markerObj) {
            console.warn("NO MARKER FOUND IN MODEL AT ALL");
            return;
          }

          console.log(
            "Teleport target:",
            markerToTeleport || "(no marker passed)",
            "-> using:",
            markerObj.name
          );

          // ---- TELEPORT (move player root) ----
          const markerWorldPos = new THREE.Vector3();
          markerObj.getWorldPosition(markerWorldPos);

          // Move PLAYER ROOT (camera is child)
          playerRootRef.current.position.x = markerWorldPos.x;
          playerRootRef.current.position.z = markerWorldPos.z;

          // Fix Y using raycast down from above marker
          const downOrigin = markerWorldPos.clone();
          downOrigin.y += 10;

          const downRay = new THREE.Raycaster(
            downOrigin,
            new THREE.Vector3(0, -1, 0)
          );
          const groundHits = downRay.intersectObjects(mesh.children, true);

          if (groundHits.length > 0) {
            playerRootRef.current.position.y = groundHits[0].point.y;
          }

          if (controlsRef.current?.update) controlsRef.current.update(0);

          // Mark teleport done
          didTeleportRef.current = true;
        }}
      />
    </Suspense>
  );
}

export default function ThreeScene() {
  const controlsRef = useRef();
  const [PointerLock, setPointerLock] = useState(null);

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Read marker from router state
  const routeLocation = useLocation();
  const markerToTeleport = routeLocation.state?.marker; // e.g. "Marker.003" or "Marker003"

  useEffect(() => {
    if (!isMobile) {
      import("@react-three/drei").then((mod) => {
        setPointerLock(() => mod.PointerLockControls);
      });
    } else {
      const cleanup = createMobileJoystick(
        (x, y) => (window.joystickMove = { x, y }),
        (lx, ly) => (window.joystickLook = { lx, ly })
      );
      return cleanup;
    }
  }, [isMobile]);

  const sessionId = parseInt(sessionStorage.getItem("session_id"), 10);

  return (
    <>
      <button
        onClick={() => (window.location.href = "/app")}
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

      <Canvas
        camera={{ position: [0, 1.7, 3], fov: 75 }}
        style={{ width: "100vw", height: "100vh" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 7.5]} intensity={1.2} />

        <SceneContent
          controlsRef={controlsRef}
          sessionId={sessionId}
          isMobile={isMobile}
          markerToTeleport={markerToTeleport}
        />

        {!isMobile && PointerLock && <PointerLock ref={controlsRef} />}
      </Canvas>
    </>
  );
}