import { useEffect } from "react";

function colorFromId(id) {
  const n = Number(id) || 0;
  const hue = (n * 137) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

export default function PlayerPickerPanel({
  remotePlayers,
  unreadCounts,
  onPick,
  onClose,
  isMobile = false,
}) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const players = [...(remotePlayers?.values?.() || [])];
  players.sort((a, b) => {
    const an = (a.username || "").toLowerCase();
    const bn = (b.username || "").toLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return a.userId - b.userId;
  });

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: 20,
        bottom: 20,
        width: 280,
        maxWidth: "calc(100vw - 40px)",
        maxHeight: isMobile ? "calc(100vh - 200px)" : "60vh",
        display: "flex",
        flexDirection: "column",
        background: "rgba(4, 14, 11, 0.92)",
        border: "1px solid rgba(21, 80, 21, 0.55)",
        borderRadius: 14,
        boxShadow: "0 18px 36px rgba(0,0,0,0.55)",
        backdropFilter: isMobile ? "none" : "blur(16px)",
        WebkitBackdropFilter: isMobile ? "none" : "blur(16px)",
        color: "#fff",
        fontFamily: '"Inter", Arial, sans-serif',
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 11, opacity: 0.55, letterSpacing: 0.5 }}>
            CHATELJ EGY JÁTÉKOSSAL
          </span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {players.length} online
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Bezárás"
          style={{
            border: "none",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            width: 32,
            height: 32,
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 6,
        }}
      >
        {players.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              textAlign: "center",
              color: "rgba(255,255,255,0.4)",
              fontSize: 13,
            }}
          >
            Senki más nincs most online.
            <br />
            Várj amíg valaki belép a modellbe.
          </div>
        ) : (
          players.map((p) => {
            const unread = unreadCounts?.get?.(p.userId) || 0;
            return (
              <button
                key={p.userId}
                onClick={() => onPick?.(p.userId)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  background: "transparent",
                  color: "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "inherit",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: colorFromId(p.userId),
                    boxShadow: `0 0 8px ${colorFromId(p.userId)}`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.username || `user${p.userId}`}
                </span>
                {unread > 0 && (
                  <span
                    style={{
                      background: "#cc3333",
                      color: "#fff",
                      borderRadius: 999,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 700,
                      minWidth: 22,
                      textAlign: "center",
                    }}
                  >
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
