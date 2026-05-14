import { useEffect } from "react";
import "../../styles/PlayerPickerPanel.css";

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
      className={`player-picker${isMobile ? " is-mobile" : ""}`}
    >
      <div className="player-picker__header">
        <div className="player-picker__title">
          <span className="player-picker__eyebrow">CHATELJ EGY JÁTÉKOSSAL</span>
          <span className="player-picker__count">{players.length} online</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Bezárás"
          className="player-picker__close"
        >
          ×
        </button>
      </div>

      <div className="player-picker__list">
        {players.length === 0 ? (
          <div className="player-picker__empty">
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
                className="player-picker__item"
              >
                <span
                  aria-hidden="true"
                  className="player-picker__dot"
                  style={{ "--player-color": colorFromId(p.userId) }}
                />
                <span className="player-picker__name">
                  {p.username || `user${p.userId}`}
                </span>
                {unread > 0 && (
                  <span className="player-picker__badge">
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
