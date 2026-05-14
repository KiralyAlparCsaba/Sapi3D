import { useEffect, useLayoutEffect, useRef, useState } from "react";

const MAX_TEXT_LEN = 500;

function formatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ChatWindow({
  messages,
  selfUserId,
  partner,
  onSend,
  onClose,
  isMobile = false,
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const STICK_THRESHOLD = 60;
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distFromBottom < STICK_THRESHOLD;
  };

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    if (text.length > MAX_TEXT_LEN) return;
    onSend?.(text);
    setDraft("");
    stickToBottomRef.current = true;
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose?.();
    }
  };

  const partnerName = partner?.username || `user${partner?.userId ?? "?"}`;
  const charsLeft = MAX_TEXT_LEN - draft.length;

  return (
    <div
      style={{
        position: "absolute",
        left: 20,
        bottom: 20,
        width: 360,
        maxWidth: "calc(100vw - 40px)",
        height: isMobile ? 360 : 440,
        maxHeight: isMobile ? "calc(100vh - 200px)" : "calc(100vh - 120px)",
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
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <span style={{ fontSize: 11, opacity: 0.55, letterSpacing: 0.5 }}>
            CHAT
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {partnerName}
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
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              margin: "auto",
              color: "rgba(255,255,255,0.4)",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Még nincs üzenet ebben a beszélgetésben.
            <br />
            írj egy üzenetet, hogy elindítsd a csevegést!
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.fromUserId === selfUserId;
            return (
              <div
                key={m.msgId ?? `${m.fromUserId}-${m.sentAt}-${m.text}`}
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "82%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: mine ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 14,
                    borderBottomRightRadius: mine ? 4 : 14,
                    borderBottomLeftRadius: mine ? 14 : 4,
                    background: mine
                      ? "rgba(21, 80, 21, 0.85)"
                      : "rgba(255,255,255,0.08)",
                    color: "#fff",
                    fontSize: 14,
                    lineHeight: 1.35,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.text}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: "rgba(255,255,255,0.4)",
                    marginTop: 2,
                    padding: "0 4px",
                  }}
                >
                  {formatTime(m.sentAt)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          padding: "10px 12px 12px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_TEXT_LEN))}
          onKeyDown={handleKeyDown}
          onKeyUp={(e) => e.stopPropagation()}
          placeholder="Írj egy üzenetet..."
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#fff",
            padding: "8px 10px",
            borderRadius: 8,
            fontSize: 16,
            fontFamily: "inherit",
            outline: "none",
            maxHeight: 100,
          }}
        />
        <button
          onClick={submit}
          disabled={!draft.trim()}
          style={{
            padding: "8px 14px",
            border: "none",
            borderRadius: 8,
            background: draft.trim()
              ? "rgba(21, 80, 21, 0.9)"
              : "rgba(255,255,255,0.08)",
            color: "#fff",
            cursor: draft.trim() ? "pointer" : "default",
            fontSize: 13,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          Küldés
        </button>
      </div>

      {charsLeft < 80 && (
        <div
          style={{
            position: "absolute",
            right: 90,
            bottom: 18,
            fontSize: 11,
            color: charsLeft < 20 ? "#ff8080" : "rgba(255,255,255,0.45)",
            pointerEvents: "none",
          }}
        >
          {charsLeft}
        </div>
      )}
    </div>
  );
}
