import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../../styles/ChatWindow.css";

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
  const containerClass = isMobile ? "chat-window is-mobile" : "chat-window";
  const counterClass =
    charsLeft < 20
      ? "chat-window__counter is-critical"
      : "chat-window__counter";

  return (
    <div
      className={containerClass}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="chat-window__header">
        <div className="chat-window__title">
          <span className="chat-window__subtitle">CHAT</span>
          <span className="chat-window__name">{partnerName}</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Bezárás"
          className="chat-window__close"
        >
          ×
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="chat-window__messages"
      >
        {messages.length === 0 ? (
          <div className="chat-window__empty">
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
                className={`chat-window__message${mine ? " is-mine" : ""}`}
              >
                <div className={`chat-window__bubble${mine ? " is-mine" : ""}`}>
                  {m.text}
                </div>
                <div className="chat-window__timestamp">
                  {formatTime(m.sentAt)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="chat-window__input-row">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_TEXT_LEN))}
          onKeyDown={handleKeyDown}
          onKeyUp={(e) => e.stopPropagation()}
          placeholder="Írj egy üzenetet..."
          rows={1}
          className="chat-window__input"
        />
        <button
          onClick={submit}
          disabled={!draft.trim()}
          className="chat-window__send"
        >
          Küldés
        </button>
      </div>

      {charsLeft < 80 && <div className={counterClass}>{charsLeft}</div>}
    </div>
  );
}
