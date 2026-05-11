/**
 * useMultiplayer
 *
 * Opens a WebSocket to /ws/world, sends our position at ~10Hz (when moved),
 * and exposes the other players' latest positions as a stateful Map.
 *
 * Usage (inside ThreeScene):
 *   const { remotePlayers, sendPosition, connected } = useMultiplayer();
 *   ...
 *   useFrame(() => {
 *     sendPosition(playerRootRef.current.position, controlsRef.current);
 *   });
 *   ...
 *   {[...remotePlayers.values()].map(p => <RemotePlayer key={p.userId} player={p} />)}
 */

import { useEffect, useRef, useState, useCallback } from "react";

const SEND_INTERVAL_MS = 100;     // 10 Hz target
const MIN_DELTA_POS = 0.02;       // require ~2cm of movement to send
const MIN_DELTA_ROT = 0.02;       // ~1.1 degrees

function buildWsUrl(token) {
  // Vite dev proxy + nginx in prod both route /ws to the backend.
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/world?token=${encodeURIComponent(token)}`;
}

export default function useMultiplayer() {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  // Diagnostic status so we can see what's going on, especially on mobile
  // where DevTools aren't easily accessible.
  // Values: "init" | "no_token" | "connecting" | "open" | "closed" | "error"
  const [status, setStatus] = useState("init");
  const [lastError, setLastError] = useState(null);
  const [remotePlayers, setRemotePlayers] = useState(() => new Map());

  // Last-sent snapshot (to throttle + skip-when-unchanged)
  const lastSentRef = useRef({ x: 0, y: 0, z: 0, rotY: 0, ts: 0 });

  // We mutate the players map by reference for speed, then trigger re-render
  // by replacing the Map ref. The state holds the current Map.
  const playersMapRef = useRef(new Map());

  const updatePlayersState = useCallback(() => {
    // Clone so React notices the change
    setRemotePlayers(new Map(playersMapRef.current));
  }, []);

  // ─────────────────────────────────────────────
  // CONNECT
  // ─────────────────────────────────────────────
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      console.warn("[MP] No token in sessionStorage, multiplayer disabled");
      setStatus("no_token");
      return;
    }

    let ws;
    let closed = false;
    let reconnectTimer = null;

    const open = () => {
      const url = buildWsUrl(token);
      console.log("[MP] Opening WS:", url);
      setStatus("connecting");
      setLastError(null);
      try {
        ws = new WebSocket(url);
      } catch (e) {
        console.error("[MP] WS construct error:", e);
        setStatus("error");
        setLastError(String(e?.message || e));
        return;
      }
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        // Ignore if this WS is no longer the active one (StrictMode dispose
        // already replaced it with a newer connection).
        if (closed || wsRef.current !== ws) return;
        console.log("[MP] Connected");
        setConnected(true);
        setStatus("open");
      });

      ws.addEventListener("close", (e) => {
        // CRITICAL: only touch shared state if THIS websocket is still the
        // one we're using. Under React StrictMode, the first WS gets disposed
        // and its close event can fire AFTER the second WS has already been
        // installed into wsRef.current. Without this guard we'd null out the
        // live ref and clear the players map, leaving the live socket open
        // but unreachable — sendPosition would `return` early forever, so the
        // server never gets our first position, never broadcasts user_joined,
        // and other clients never learn we joined.
        const wasActive = wsRef.current === ws;
        console.log(
          "[MP] Disconnected",
          e.code,
          e.reason,
          wasActive ? "(active)" : "(stale)"
        );
        if (!wasActive) return;

        setConnected(false);
        setStatus("closed");
        if (e.code && e.code !== 1000) {
          setLastError(`code ${e.code}${e.reason ? ` (${e.reason})` : ""}`);
        }
        wsRef.current = null;
        playersMapRef.current = new Map();
        updatePlayersState();
        if (!closed) {
          // Simple reconnect after 2s if not intentional close
          reconnectTimer = setTimeout(open, 2000);
        }
      });

      ws.addEventListener("error", (e) => {
        if (wsRef.current !== ws) return; // ignore stale errors
        console.warn("[MP] WS error", e);
        setLastError("network/proxy error");
      });

      ws.addEventListener("message", (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        handleServerMessage(msg);
      });
    };

    const handleServerMessage = (msg) => {
      switch (msg.type) {
        case "welcome": {
          const map = new Map();
          for (const other of msg.others || []) {
            map.set(other.userId, {
              ...other,
              // Animation state: where we ARE rendering vs where we WANT to be
              curX: other.x, curY: other.y, curZ: other.z, curRotY: other.rotY,
              targetX: other.x, targetY: other.y, targetZ: other.z, targetRotY: other.rotY,
            });
          }
          playersMapRef.current = map;
          updatePlayersState();
          console.log("[MP] Welcome, others online:", map.size);
          break;
        }
        case "user_joined": {
          const u = msg.user;
          playersMapRef.current.set(u.userId, {
            ...u,
            curX: u.x, curY: u.y, curZ: u.z, curRotY: u.rotY,
            targetX: u.x, targetY: u.y, targetZ: u.z, targetRotY: u.rotY,
          });
          updatePlayersState();
          break;
        }
        case "user_left": {
          playersMapRef.current.delete(msg.userId);
          updatePlayersState();
          break;
        }
        case "position": {
          const p = playersMapRef.current.get(msg.userId);
          if (p) {
            p.targetX = msg.x;
            p.targetY = msg.y;
            p.targetZ = msg.z;
            p.targetRotY = msg.rotY;
            // NOTE: no setState here — RemotePlayer reads via ref pattern below.
            // Position updates happen 10x/sec, we don't want to re-render the
            // whole React tree that often. The RemotePlayer component
            // interpolates from a ref to its target each frame.
          }
          break;
        }
        default:
          break;
      }
    };

    open();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      // Close regardless of state. close() is valid during CONNECTING too —
      // it aborts the handshake. Without this, StrictMode's double-mount in
      // dev would leave a phantom WS half-open on the server.
      if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
        try {
          ws.close(1000, "Component unmount");
        } catch {
          /* ignore */
        }
      }
      wsRef.current = null;
    };
  }, [updatePlayersState]);

  // ─────────────────────────────────────────────
  // SEND POSITION (called from useFrame)
  // ─────────────────────────────────────────────
  const sendPosition = useCallback((position, rotY) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const now = performance.now();
    const last = lastSentRef.current;

    if (now - last.ts < SEND_INTERVAL_MS) return;

    const dx = position.x - last.x;
    const dy = position.y - last.y;
    const dz = position.z - last.z;
    const dr = rotY - last.rotY;
    const movedEnough =
      Math.abs(dx) > MIN_DELTA_POS ||
      Math.abs(dy) > MIN_DELTA_POS ||
      Math.abs(dz) > MIN_DELTA_POS ||
      Math.abs(dr) > MIN_DELTA_ROT;

    // Heartbeat: send anyway every 2s so server knows we're alive
    const heartbeat = now - last.ts > 2000;
    if (!movedEnough && !heartbeat) return;

    ws.send(
      JSON.stringify({
        type: "position",
        x: position.x,
        y: position.y,
        z: position.z,
        rotY,
      })
    );

    last.x = position.x;
    last.y = position.y;
    last.z = position.z;
    last.rotY = rotY;
    last.ts = now;
  }, []);

  return {
    connected,
    status,
    lastError,
    remotePlayers,        // Map<userId, {userId, username, avatarUrl, cur*, target*}>
    sendPosition,
  };
}
