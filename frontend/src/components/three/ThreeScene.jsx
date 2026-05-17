import { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useNavigate, useSearchParams } from "react-router-dom";
import UsePlayerMovement from "./PlayerMovement";
import { createMobileJoystick } from "./MobileJoystick";
import Building from "./Building";
import * as THREE from "three";
import MobilePointerLockControls from "./MobilePointerLockControls";
import { metricsCollector } from "./metricsCollector";
import api from "../../services/api";
import useMultiplayer from "./useMultiplayer";
import RemotePlayer from "./RemotePlayer";
import ModelLoadingOverlay from "./ModelLoadingOverlay";
import ChatWindow from "./ChatWindow";
import PlayerPickerPanel from "./PlayerPickerPanel";
import "../../styles/ThreeScene.css";

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
  onModelReady,
  onSelectPlayer,
}) {
  const collisionRef = useRef(null);
  const { camera, scene } = useThree();
  const playerRootRef = useRef(new THREE.Object3D());
  const forwardTmpRef = useRef(new THREE.Vector3());

  const didTeleportRef = useRef(false);

  useEffect(() => {
    scene.add(playerRootRef.current);

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

          onModelReady?.();

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

      {remotePlayers &&
        [...remotePlayers.values()].map((p) => (
          <RemotePlayer
            key={p.userId}
            player={p}
            otherPlayers={remotePlayers}
            onSelect={onSelectPlayer}
          />
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

  // Marker comes from a URL query param now (e.g. /app/model?marker=Foo).
  // This survives "open in new tab", refresh, and shared/bookmarked links —
  // unlike React Router's location.state, which only carries through a real
  // in-app click and is silently dropped otherwise.
  const [searchParams] = useSearchParams();
  const markerToTeleport = searchParams.get("marker");

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

  const [modelReady, setModelReady] = useState(false);
  const handleModelReady = () => setModelReady(true);

  
  const initialMode =
    routeLocation.state?.mode === "single" ||
    routeLocation.state?.mode === "multi"
      ? routeLocation.state.mode
      : null;
  const [playMode, setPlayMode] = useState(initialMode);
  const isMultiplayer = playMode === "multi";

 
  const [defaultMode] = useState(() => {
    const v = sessionStorage.getItem("sapi3d.modelMode");
    return v === "single" || v === "multi" ? v : null;
  });

  const handleSelectMode = (mode) => {
    if (mode !== "single" && mode !== "multi") return;
    try {
      sessionStorage.setItem("sapi3d.modelMode", mode);
    } catch {
      
    }
    setPlayMode(mode);
  };

  const {
    remotePlayers,
    sendPosition,
    connected: mpConnected,
    status: mpStatus,
    lastError: mpError,
    chatMessages,
    unreadCounts,
    activeChatUserId,
    selfUserId,
    sendChatMessage,
    openChat,
    closeChat,
  } = useMultiplayer({ enabled: isMultiplayer });

  const [pickerOpen, setPickerOpen] = useState(false);

  let totalUnread = 0;
  if (unreadCounts) {
    for (const n of unreadCounts.values()) totalUnread += n;
  }

  const handlePickPlayer = (userId) => {
    setPickerOpen(false);
    openChat(userId);
  };

  useEffect(() => {
    if (isMobile) return;
    // Singleplayer: no chat shortcuts make sense.
    if (!isMultiplayer) return;
    const isTypingTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };
    const onKey = (e) => {
      if (isTypingTarget(document.activeElement)) return;
      if (e.code === "KeyT") {
        e.preventDefault();
        if (activeChatUserId != null) {
          closeChat();
        } else {
          setPickerOpen((v) => !v);
        }
      } else if (e.code === "Escape") {
        if (activeChatUserId != null) closeChat();
        else if (pickerOpen) setPickerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile, isMultiplayer, activeChatUserId, pickerOpen, closeChat]);

  useEffect(() => {
    if (isMobile) return;
    if (activeChatUserId != null || pickerOpen) {
      try {
        controlsRef.current?.unlock?.();
      } catch {}
    }
  }, [activeChatUserId, pickerOpen, isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const chatOpen = activeChatUserId != null || pickerOpen;
    const ids = ["joystick-move", "joystick-look"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.style.display = chatOpen ? "none" : "block";
    }
    return () => {
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) el.style.display = "block";
      }
    };
  }, [isMobile, activeChatUserId, pickerOpen]);

  const activePartner =
    activeChatUserId != null
      ? remotePlayers?.get?.(activeChatUserId) || {
          userId: activeChatUserId,
          username: `user${activeChatUserId}`,
        }
      : null;
  const activeMessages =
    activeChatUserId != null ? chatMessages?.get?.(activeChatUserId) || [] : [];

  const mpStatusClass = mpConnected
    ? "is-online"
    : mpStatus === "no_token" ||
        mpStatus === "error" ||
        (mpStatus === "closed" && mpError)
      ? "is-error"
      : mpStatus === "connecting"
        ? "is-connecting"
        : "is-idle";

  return (
    <>
      {/* The overlay stays up until BOTH the GLB is parsed AND the user
          has confirmed their play mode. The picker UI is rendered inside
          the overlay (see ModelLoadingOverlay) — passing mode/onSelectMode
          activates it. */}
      <ModelLoadingOverlay
        visible={!modelReady || playMode == null}
        mode={playMode}
        defaultMode={defaultMode}
        onSelectMode={handleSelectMode}
      />

      <button
        onClick={() => {
          sendModelClose();
          navigate("/app");
        }}
        className="three-back-button"
      >
        ← Vissza a főoldalra
      </button>

      {/* All multiplayer UI is gated on isMultiplayer. In singleplayer
          mode the chat launcher, picker, chat window, and MP status pill
          are hidden — the scene looks like a regular solo walkthrough. */}
      {isMultiplayer && activeChatUserId == null && !pickerOpen && (
        <button
          onClick={() => setPickerOpen(true)}
          title={isMobile ? "Chat" : "Chat (T)"}
          className={`three-chat-launcher${isMobile ? " is-mobile" : ""}`}
        >
          <span className="three-chat-launcher__icon">💬</span>
          <span className="three-chat-launcher__label">Chat</span>
          {!isMobile && (
            <span aria-hidden="true" className="three-chat-launcher__kbd">
              T
            </span>
          )}

          {totalUnread > 0 && (
            <span className="three-chat-launcher__badge">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      )}

      {isMultiplayer && pickerOpen && (
        <PlayerPickerPanel
          remotePlayers={remotePlayers}
          unreadCounts={unreadCounts}
          onPick={handlePickPlayer}
          onClose={() => setPickerOpen(false)}
          isMobile={isMobile}
        />
      )}

      {isMultiplayer && activeChatUserId != null && (
        <ChatWindow
          messages={activeMessages}
          selfUserId={selfUserId}
          partner={activePartner}
          onSend={(text) => sendChatMessage(activeChatUserId, text)}
          onClose={closeChat}
          isMobile={isMobile}
        />
      )}

      {isMultiplayer && (
        <div className={`three-mp-status ${mpStatusClass}`}>
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
      )}

      <Canvas
        camera={{ position: [0, 1.7, 0], fov: 75 }}
        className="three-canvas"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 7.5]} intensity={1.2} />

        <SceneContent
          controlsRef={controlsRef}
          sessionId={sessionId}
          isMobile={isMobile}
          markerToTeleport={markerToTeleport}
          infoPanelsData={infoPanelsData}
          locationsData={locationsData}
          loadStartRef={loadStartRef}
          onInfoPanelOpen={handleInfoPanelOpen}
          onLocationVisit={handleLocationVisit}
          remotePlayers={remotePlayers}
          // Skip sendPosition in singleplayer so we don't run the
          // per-frame camera-direction computation when nobody's
          // listening on the WS anyway.
          sendPosition={isMultiplayer ? sendPosition : undefined}
          onModelReady={handleModelReady}
          // Tap-to-chat is mobile-only — and obviously irrelevant
          // when multiplayer is off entirely.
          onSelectPlayer={
            isMobile && isMultiplayer ? openChat : undefined
          }
        />

        {!isMobile && PointerLock && <PointerLock ref={controlsRef} />}
      </Canvas>
    </>
  );
}
