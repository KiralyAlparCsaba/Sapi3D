import { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useLocation, useNavigate } from "react-router-dom";
import UsePlayerMovement from "./PlayerMovement";
import { createMobileJoystick } from "./MobileJoystick";
import Building from "./Building";
import * as THREE from "three";
import MobilePointerLockControls from "./MobilePointerLockControls";
import { metricsCollector } from "./metricsCollector";
import api from "../../services/api";
import useMultiplayer from "./useMultiplayer";
import RemotePlayer from "./RemotePlayer";

// SCENE CONTENT
function SceneContent({
  controlsRef,
  sessionId,
  isMobile,
  markerToTeleport,
  infoPanelsData,
  locationsData,
  loadStartRef,
  onInfoPanelOpen,
  onLocationVisit,
  remotePlayers,
  sendPosition,
}) {
  const collisionRef = useRef(null);
  const { camera, scene } = useThree();
  const playerRootRef = useRef(new THREE.Object3D());
  const forwardTmpRef = useRef(new THREE.Vector3());

  const didTeleportRef = useRef(false);

  useEffect(() => {
    scene.add(playerRootRef.current);

    // NOTE: do NOT reset playerRootRef.current.position here.
    // On a cached-model second visit, Building's useEffect (child) runs before
    // this one (parent), so onWorldReady already placed the player at the correct
    // marker position. Resetting to (0,0,0) would undo the teleport.
    // A fresh Object3D starts at (0,0,0) anyway, so this line is always redundant.

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

    // MULTIPLAYER: broadcast our position + facing direction (throttled in the hook)
    if (sendPosition && playerRootRef.current) {
      const fwd = forwardTmpRef.current;
      camera.getWorldDirection(fwd);
      const rotY = Math.atan2(fwd.x, fwd.z);
      sendPosition(playerRootRef.current.position, rotY);
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
        onInfoPanelOpen={onInfoPanelOpen}
        onLocationVisit={onLocationVisit}
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
          const euler = new THREE.Euler().setFromQuaternion(
            markerQuaternion,
            "YXZ",
          );
          euler.x = 0;
          euler.z = 0;
          playerRootRef.current.quaternion.setFromEuler(euler);

          camera.position.set(0, 1.7, 0);
          camera.rotation.set(0, 0, 0);

          if (controlsRef.current?.update) controlsRef.current.update(0);

          didTeleportRef.current = true;
        }}
      />

      {/* MULTIPLAYER: remote players rendered in-world */}
      {remotePlayers &&
        [...remotePlayers.values()].map((p) => (
          <RemotePlayer key={p.userId} player={p} />
        ))}
    </Suspense>
  );
}

export default function ThreeScene() {
  const controlsRef = useRef();
  const modelOpenTrackedRef = useRef(false);
  const modelCloseLastSentRef = useRef(0);
  const panelTrackRef = useRef({});
  const locationTrackRef = useRef({});
  const navigate = useNavigate();
  const [PointerLock, setPointerLock] = useState(null);
  const loadStartRef = useRef(performance.now());

  const [infoPanelsData, setInfoPanelsData] = useState([]);
  const [locationsData, setLocationsData] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL || "/api";
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
    const now = Date.now();
    if (now - modelCloseLastSentRef.current < 2000) return;
    modelCloseLastSentRef.current = now;

    const token = sessionStorage.getItem("token");
    fetch(`${API_URL}/achievements/track/model-close`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      keepalive: true,
    })
      .then(() => window.dispatchEvent(new CustomEvent("achievements-updated")))
      .catch((err) =>
        console.error("Model-close achievement tracking failed:", err),
      );
  };

  const handleInfoPanelOpen = (panelId) => {
    if (!panelId) return;
    const now = Date.now();
    const lastSentAt = panelTrackRef.current[panelId] || 0;
    if (now - lastSentAt < 2000) return;
    panelTrackRef.current[panelId] = now;

    api
      .post("/achievements/track/panel", null, {
        params: { panel_id: panelId },
      })
      .then(() => {
        window.dispatchEvent(new CustomEvent("achievements-updated"));
      })
      .catch((err) => {
        console.error("Panel achievement tracking failed:", err);
      });
  };

  const handleLocationVisit = (locationId) => {
    if (!locationId) return;
    const now = Date.now();
    const lastSentAt = locationTrackRef.current[locationId] || 0;
    if (now - lastSentAt < 2000) return;
    locationTrackRef.current[locationId] = now;

    api
      .post("/achievements/track/location", null, {
        params: { location_id: locationId },
      })
      .then(() => {
        window.dispatchEvent(new CustomEvent("achievements-updated"));
      })
      .catch((err) => {
        console.error("Location achievement tracking failed:", err);
      });
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendModelClose();
      }
    };

    window.addEventListener("beforeunload", sendModelClose);
    window.addEventListener("pagehide", sendModelClose);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", sendModelClose);
      window.removeEventListener("pagehide", sendModelClose);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      sendModelClose();
    };
  }, []);

  const sessionId = parseInt(sessionStorage.getItem("session_id"), 10);

  // MULTIPLAYER: open WS, expose remote player state + sendPosition
  const {
    remotePlayers,
    sendPosition,
    connected: mpConnected,
    status: mpStatus,
    lastError: mpError,
  } = useMultiplayer();

  return (
    <>
      <button
        onClick={() => {
          sendModelClose();
          navigate("/app");
        }}
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

      {/* MULTIPLAYER status pill */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          padding: "6px 12px",
          background: mpConnected
            ? "rgba(0,150,80,0.85)"
            : mpStatus === "no_token"
            ? "rgba(180,60,60,0.85)"
            : mpStatus === "error" || (mpStatus === "closed" && mpError)
            ? "rgba(180,60,60,0.85)"
            : "rgba(120,120,120,0.85)",
          color: "white",
          borderRadius: "999px",
          fontSize: "13px",
          fontFamily: "sans-serif",
          zIndex: 999,
          pointerEvents: "none",
          maxWidth: "90vw",
        }}
      >
        {mpConnected
          ? `Online • ${remotePlayers.size} másik játékos`
          : mpStatus === "no_token"
          ? "MP: nincs token (jelentkezz be újra)"
          : mpStatus === "connecting"
          ? "MP: csatlakozás..."
          : mpStatus === "closed"
          ? `MP: lecsatlakozva${mpError ? ` (${mpError})` : ""}`
          : mpStatus === "error"
          ? `MP: hiba${mpError ? ` (${mpError})` : ""}`
          : "MP: indul..."}
      </div>

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
          infoPanelsData={infoPanelsData} // Ajtókhoz
          locationsData={locationsData} // Hologramokhoz
          loadStartRef={loadStartRef}
          onInfoPanelOpen={handleInfoPanelOpen}
          onLocationVisit={handleLocationVisit}
          remotePlayers={remotePlayers}
          sendPosition={sendPosition}
        />

        {!isMobile && PointerLock && <PointerLock ref={controlsRef} />}
      </Canvas>
    </>
  );
}
