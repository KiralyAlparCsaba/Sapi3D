import { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useLocation } from "react-router-dom";
import UsePlayerMovement from "./PlayerMovement";
import { createMobileJoystick } from "./MobileJoystick";
import Building from "./Building";
import * as THREE from "three";
import MobilePointerLockControls from "./MobilePointerLockControls";

// SCENE CONTENT
function SceneContent({ controlsRef, sessionId, isMobile, markerToTeleport, infoPanelsData, locationsData }) {
  const collisionRef = useRef(null);
  const { camera, scene } = useThree();
  const playerRootRef = useRef(new THREE.Object3D());

  // FONTOS: megakadályozza a dupla teleportálást (StrictMode / re-mount miatt)
  const didTeleportRef = useRef(false);

  useEffect(() => {
    scene.add(playerRootRef.current);

    // root world start - ITT JAVÍTVA 0, 0, 0-RA
    playerRootRef.current.position.set(0, 0, 0);

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

  // Segéd: nevek normalizálása
  const normalize = (s) =>
    (s || "").replace(/[^a-z0-9]/gi, "").toLowerCase();

  // Segéd: marker keresése név alapján
  const findMarkerObject = (mesh, wantedName) => {
    const wanted = normalize(wantedName);

    let exact = null;
    let firstAny = null;

    mesh.traverse((child) => {
      const n = normalize(child.name);

      // fallback az első "marker" szót tartalmazó objektumra
      if (!firstAny && n.includes("marker")) {
        firstAny = child;
      }

      // pontos egyezés
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
        infoPanelsData={infoPanelsData}  // Ajtókhoz
        locationsData={locationsData}    // Hologramokhoz
        onWorldReady={(mesh) => {
          collisionRef.current = mesh;

          // Ha már teleportáltunk, ne csináljuk újra
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
            markerObj.name
          );

          // ---- TELEPORT LOGIKA ----

          // 1. Kiszámoljuk a marker VALÓS térbeli közepét (Befoglaló doboz)
          const box = new THREE.Box3().setFromObject(markerObj);
          const markerTrueCenter = new THREE.Vector3();
          box.getCenter(markerTrueCenter);

          // 2. Beállítjuk a játékos X és Z pozícióját a valós középpontra
          playerRootRef.current.position.x = markerTrueCenter.x;
          playerRootRef.current.position.z = markerTrueCenter.z;

          // 3. Y tengely beállítása Raycasttal
          const downOrigin = markerTrueCenter.clone();
          downOrigin.y += 0.5;

          const downRay = new THREE.Raycaster(
            downOrigin,
            new THREE.Vector3(0, -1, 0)
          );
          const groundHits = downRay.intersectObjects(mesh.children, true);

          if (groundHits.length > 0) {
            playerRootRef.current.position.y = groundHits[0].point.y;
          } else {
            playerRootRef.current.position.y = markerTrueCenter.y;
          }

          // 4. Forgatás (Quaternion) átvétele - csak Y tengely (yaw), pitch/roll nullázva
          const markerQuaternion = new THREE.Quaternion();
          markerObj.getWorldQuaternion(markerQuaternion);
          const euler = new THREE.Euler().setFromQuaternion(markerQuaternion, 'YXZ');
          euler.x = 0;
          euler.z = 0;
          playerRootRef.current.quaternion.setFromEuler(euler);

          // 5. BIZTOSÍTÉK: Kamera lokális nullázása
          camera.position.set(0, 1.7, 0);
          camera.rotation.set(0, 0, 0);

          // 7. Kontrollerek frissítése az új pozíción
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

  // ÚJ: Két külön állapot a két különböző adatforráshoz
  const [infoPanelsData, setInfoPanelsData] = useState([]);  // Ajtókhoz
  const [locationsData, setLocationsData] = useState([]);    // Hologramokhoz

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Marker kiolvasása a router state-ből
  const routeLocation = useLocation();
  const markerToTeleport = routeLocation.state?.marker;

  // FETCH: Info Panels (ajtókhoz)
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
      .catch((err) => console.error("❌ Hiba az info panels lekérésekor:", err));
  }, [API_URL]);

  // FETCH: Locations (hologramokhoz)
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
        />

        {!isMobile && PointerLock && <PointerLock ref={controlsRef} />}
      </Canvas>
    </>
  );
}