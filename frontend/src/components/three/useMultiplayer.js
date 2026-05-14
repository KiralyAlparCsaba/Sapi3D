import { useEffect, useRef, useState, useCallback } from "react";

const SEND_INTERVAL_MS = 100;
const MIN_DELTA_POS = 0.02;
const MIN_DELTA_ROT = 0.02;
const CONNECT_TIMEOUT_MS = 6000;
const FAST_RECONNECT_MS = 500;
const NORMAL_RECONNECT_MS = 2000;

function buildWsUrl(token) {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/world?token=${encodeURIComponent(token)}`;
}

export default function useMultiplayer() {
  const wsRef = useRef(null);
  const selfUserIdRef = useRef(null);
  const [selfUserId, setSelfUserId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("init");
  const [lastError, setLastError] = useState(null);
  const [remotePlayers, setRemotePlayers] = useState(() => new Map());

  const [chatMessages, setChatMessages] = useState(() => new Map());
  const [unreadCounts, setUnreadCounts] = useState(() => new Map());
  const [activeChatUserId, setActiveChatUserId] = useState(null);
  const activeChatUserIdRef = useRef(null);
  const historyFetchedRef = useRef(new Set());

  const lastSentRef = useRef({ x: 0, y: 0, z: 0, rotY: 0, ts: 0 });

  const playersMapRef = useRef(new Map());

  const updatePlayersState = useCallback(() => {
    setRemotePlayers(new Map(playersMapRef.current));
  }, []);

  const appendChatMessage = useCallback((msg, selfUserId) => {
    const otherUserId =
      msg.fromUserId === selfUserId ? msg.toUserId : msg.fromUserId;

    setChatMessages((prev) => {
      const next = new Map(prev);
      const existing = next.get(otherUserId) ?? [];
      if (existing.some((m) => m.msgId === msg.msgId)) {
        return prev;
      }
      next.set(otherUserId, [...existing, msg]);
      return next;
    });

    if (
      msg.fromUserId !== selfUserId &&
      activeChatUserIdRef.current !== otherUserId
    ) {
      setUnreadCounts((prev) => {
        const next = new Map(prev);
        next.set(otherUserId, (prev.get(otherUserId) ?? 0) + 1);
        return next;
      });
    }
  }, []);

  const replaceChatHistory = useCallback((withUserId, messages) => {
    setChatMessages((prev) => {
      const next = new Map(prev);
      next.set(withUserId, messages);
      return next;
    });
    historyFetchedRef.current.add(withUserId);
  }, []);

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

    let watchdogTriggered = false;

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
      watchdogTriggered = false;

      const watchdog = setTimeout(() => {
        if (ws && ws.readyState === WebSocket.CONNECTING) {
          console.warn(
            "[MP] Connect timeout — WS stuck in CONNECTING, forcing close to retry",
          );
          watchdogTriggered = true;
          try {
            ws.close();
          } catch {}
        }
      }, CONNECT_TIMEOUT_MS);

      ws.addEventListener("open", () => {
        clearTimeout(watchdog);
        if (closed || wsRef.current !== ws) return;
        console.log("[MP] Connected");
        setConnected(true);
        setStatus("open");
      });

      ws.addEventListener("close", (e) => {
        clearTimeout(watchdog);
        const wasActive = wsRef.current === ws;
        console.log(
          "[MP] Disconnected",
          e.code,
          e.reason,
          wasActive ? "(active)" : "(stale)",
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
          const delay = watchdogTriggered
            ? FAST_RECONNECT_MS
            : NORMAL_RECONNECT_MS;
          reconnectTimer = setTimeout(open, delay);
        }
      });

      ws.addEventListener("error", (e) => {
        if (wsRef.current !== ws) return;
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
          if (msg.self?.userId != null) {
            selfUserIdRef.current = msg.self.userId;
            setSelfUserId(msg.self.userId);
          }
          const map = new Map();
          for (const other of msg.others || []) {
            map.set(other.userId, {
              ...other,
              curX: other.x,
              curY: other.y,
              curZ: other.z,
              curRotY: other.rotY,
              targetX: other.x,
              targetY: other.y,
              targetZ: other.z,
              targetRotY: other.rotY,
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
            curX: u.x,
            curY: u.y,
            curZ: u.z,
            curRotY: u.rotY,
            targetX: u.x,
            targetY: u.y,
            targetZ: u.z,
            targetRotY: u.rotY,
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
          }
          break;
        }
        case "chat_message": {
          const selfId = selfUserIdRef.current;
          if (selfId != null) {
            appendChatMessage(msg, selfId);
          }
          break;
        }
        case "chat_history_response": {
          replaceChatHistory(msg.withUserId, msg.messages || []);
          break;
        }
        case "chat_error": {
          console.warn("[MP] Chat error:", msg.reason);
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
      if (
        ws &&
        ws.readyState !== WebSocket.CLOSED &&
        ws.readyState !== WebSocket.CLOSING
      ) {
        try {
          ws.close(1000, "Component unmount");
        } catch {}
      }
      wsRef.current = null;
    };
  }, [updatePlayersState]);

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

    const heartbeat = now - last.ts > 2000;
    if (!movedEnough && !heartbeat) return;

    ws.send(
      JSON.stringify({
        type: "position",
        x: position.x,
        y: position.y,
        z: position.z,
        rotY,
      }),
    );

    last.x = position.x;
    last.y = position.y;
    last.z = position.z;
    last.rotY = rotY;
    last.ts = now;
  }, []);

  const sendOverWs = useCallback((message) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(message));
    return true;
  }, []);

  const sendChatMessage = useCallback(
    (toUserId, text) => {
      const trimmed = (text ?? "").trim();
      if (!trimmed || !Number.isInteger(toUserId)) return false;
      return sendOverWs({
        type: "chat_send",
        to: toUserId,
        text: trimmed,
      });
    },
    [sendOverWs],
  );

  const requestChatHistory = useCallback(
    (withUserId) => {
      if (!Number.isInteger(withUserId)) return false;
      return sendOverWs({ type: "chat_history", with: withUserId });
    },
    [sendOverWs],
  );

  const openChat = useCallback(
    (userId) => {
      if (!Number.isInteger(userId)) return;
      activeChatUserIdRef.current = userId;
      setActiveChatUserId(userId);
      setUnreadCounts((prev) => {
        if (!prev.has(userId)) return prev;
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
      if (!historyFetchedRef.current.has(userId)) {
        requestChatHistory(userId);
      }
    },
    [requestChatHistory],
  );

  const closeChat = useCallback(() => {
    activeChatUserIdRef.current = null;
    setActiveChatUserId(null);
  }, []);

  return {
    connected,
    status,
    lastError,
    remotePlayers,
    sendPosition,
    chatMessages,
    unreadCounts,
    activeChatUserId,
    selfUserId,
    sendChatMessage,
    openChat,
    closeChat,
  };
}
