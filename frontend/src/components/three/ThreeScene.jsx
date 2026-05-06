import { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useLocation, useNavigate } from "react-router-dom";
import UsePlayerMovement from "./PlayerMovement";
import { createMobileJoystick } from "./MobileJoystick";
import Building from "./Building";
import * as THREE from "three";
import MobilePointerLockControls from "./MobilePointerLockControls";
import { metricsCollector } from "./metricsCollector";

// SCENE CONTENT
function SceneContent({ controlsRef, sessionId, isMobile, markerToTeleport, infoPanelsData, locationsData, loadStartRef }) {
  const collisionRef = useRef(null);
  const { camera, scene } = useThree();
  const playerRootRef = useRef(new THREE.Object3D());

  const didTeleportRef = useRef(false);

  useEffect(() => {
    scene.add(playerRootRef.current);

    playerRootRef.current.position.set(0, 0, 0);

    playerRootRef.current.add(camera);
    camera.position.set(0, 1.7, 0);

    return () => {
      if (camera.parent === playerRootRef.current) {
        playerRootRef.current.remove(camera);
      }
      scene.remove(playerRootRef.current);
    };
  }, [camera, scene]);

  useEffect(() => {
    if (isMobile) {
      controlsRef.current = new MobilePointerLockControls(camera);
    }
  }, [isMobile, camera]);

  const player = UsePlayerMovement(
    controlsRef,
    collisionRef,
    playerRootRef,
    isMobile ? 7.0 : 10.0,
  );

  useFrame((_, delta) => {
    if (collisionRef.current) player.updateMovement(delta);

    if (controlsRef.current?.update) {
      controlsRef.current.update(delta);
    }
  });

  const normalize = (s) => (s || "").replace(/[^a-z0-9]/gi, "").toLowerCase();

  const findMarkerObject = (mesh, wantedName) => {
    const wanted = normalize(wantedName);

    let exact = null;
    let firstAny = null;

    mesh.traverse((child) => {
      const n = normalize(child.name);

      if (!firstAny && n.includes("marker")) {
        firstAny = child;
      }

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
        infoPanelsData={infoPanelsData}
        locationsData={locationsData}
        onWorldReady={(mesh) => {
          collisionRef.current = mesh;

          if (didTeleportRef.current) return;

          const markerObj = findMarkerObject(mesh, markerToTeleport);

          if (!markerObj) {
            console.warn("NEM TALÁLHATÓ MARKER A MODELLBEN");
            return;
          }

          console.log(
            "Teleport target:",
            markerToTeleport || "(nincs marker átadva)",
            "-> használatban:",
            markerObj.name,
          );

          const box = new THREE.Box3().setFromObject(markerObj);
          const markerTrueCenter = new THREE.Vector3();
          box.getCenter(markerTrueCenter);

          playerRootRef.current.position.x = markerTrueCenter.x;
          playerRootRef.current.position.z = markerTrueCenter.z;

          const downOrigin = markerTrueCenter.clone();
          downOrigin.y += 0.5;

          const downRay = new THREE.Raycaster(
            downOrigin,
            new THREE.Vector3(0, -1, 0),
          );
          const groundHits = downRay.intersectObjects(mesh.children, true);

          if (groundHits.length > 0) {
            playerRootRef.current.position.y = groundHits[0].point.y;
          } else {
            playerRootRef.current.position.y = markerTrueCenter.y;
          }

          const markerQuaternion = new THREE.Quaternion();
          markerObj.getWorldQuaternion(markerQuaternion);
          const euler = new THREE.Euler().setFromQuaternion(markerQuaternion, 'YXZ');
          euler.x = 0;
          euler.z = 0;
          playerRootRef.current.quaternion.setFromEuler(euler);

          camera.position.set(0, 1.7, 0);
          camera.rotation.set(0, 0, 0);

          if (controlsRef.current?.update) controlsRef.current.update(0);

          didTeleportRef.current = true;
        }}
      />
    </Suspense>
  );
}

export default function ThreeScene() {
  const controlsRef = useRef();
  const modelOpenTrackedRef = useRef(false);
  const modelCloseTrackedRef = useRef(false);
  const navigate = useNavigate();
  const [PointerLock, setPointerLock] = useState(null);
  const loadStartRef = useRef(performance.now());

  const [infoPanelsData, setInfoPanelsData] = useState([]);
  const [locationsData, setLocationsData] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const routeLocation = useLocation();
  const markerToTeleport = routeLocation.state?.marker;

  useEffect(() => {
    fetch(`${API_URL}/info-panels/`)
      .then((res) => {
        if (!res.ok) throw new Error("Hiba a hálózati válaszban");
        return res.json();
      })
      .then((data) => {
        console.log("✅ Info Panels betöltve (ajtókhoz):", data);
        setInfoPanelsData(data);
      })
      .catch((err) =>
        console.error("❌ Hiba az info panels lekérésekor:", err),
      );
  }, [API_URL]);

  useEffect(() => {
    fetch(`${API_URL}/locations/`)
      .then((res) => {
        if (!res.ok) throw new Error("Hiba a hálózati válaszban");
        return res.json();
      })
      .then((data) => {
        console.log("✅ Locations betöltve (hologramokhoz):", data);
        setLocationsData(data);
      })
      .catch((err) => console.error("❌ Hiba a locations lekérésekor:", err));
  }, [API_URL]);

  useEffect(() => {
    if (!isMobile) {
      import("@react-three/drei").then((mod) => {
        setPointerLock(() => mod.PointerLockControls);
      });
    } else {
      const cleanup = createMobileJoystick(
        (x, y) => (window.joystickMove = { x, y }),
        (lx, ly) => (window.joystickLook = { lx, ly }),
      );
      return cleanup;
    }
  }, [isMobile]);

  useEffect(() => {
    if (modelOpenTrackedRef.current) return;
    modelOpenTrackedRef.current = true;

    api
      .post("/achievements/track/model-open")
      .then(() => {
        window.dispatchEvent(new CustomEvent("achievements-updated"));
      })
      .catch((err) => {
        console.error("Model-open achievement tracking failed:", err);
      });
  }, []);

  const sendModelClose = () => {
    if (modelCloseTrackedRef.current) return;
    modelCloseTrackedRef.current = true;

    const token = sessionStorage.getItem("token");
    fetch("/api/achievements/track/model-close", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      keepalive: true,
    })
      .then(() => window.dispatchEvent(new CustomEvent("achievements-updated")))
      .catch((err) =>
        console.error("Model-close achievement tracking failed:", err),
      );
  };

  useEffect(() => {
    window.addEventListener("beforeunload", sendModelClose);
    return () => {
      window.removeEventListener("beforeunload", sendModelClose);

      sendModelClose();
    };
  }, []);

  const sessionId = parseInt(sessionStorage.getItem("session_id"), 10);

  return (
    <>
      <button
        onClick={() => navigate("/app")}
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
        camera={{ position: [0, 1.7, 0], fov: 75 }}
        style={{ width: "100vw", height: "100vh" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 7.5]} intensity={1.2} />

        <SceneContent
          controlsRef={controlsRef}
          sessionId={sessionId}
          isMobile={isMobile}
          markerToTeleport={markerToTeleport}
          infoPanelsData={infoPanelsData}  // Ajtókhoz
          locationsData={locationsData}    // Hologramokhoz
          loadStartRef={loadStartRef}
        />

        {!isMobile && PointerLock && <PointerLock ref={controlsRef} />}
      </Canvas>
    </>
  );
}
