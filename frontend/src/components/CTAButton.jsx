import { useRef, useState } from "react";
import "../styles/CTAButton.css";

const IconArrowRight = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export default function CTAButton({ label = "Részletek megtekintése", onClick, className = "" }) {
  const btnRef = useRef(null);
  const [magPos, setMagPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [ripples, setRipples] = useState([]);
  const [shimmer, setShimmer] = useState(false);

  const handleMouseMove = (e) => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setMagPos({
      x: (e.clientX - (r.left + r.width / 2)) * 0.26,
      y: (e.clientY - (r.top + r.height / 2)) * 0.26,
    });
  };

  const handleMouseEnter = () => {
    setHovered(true);
    setShimmer(true);
    setTimeout(() => setShimmer(false), 620);
  };

  const handleMouseLeave = () => {
    setMagPos({ x: 0, y: 0 });
    setHovered(false);
  };

  const handleClick = (e) => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const id = Date.now();
    setRipples(prev => [...prev, { x: e.clientX - r.left, y: e.clientY - r.top, id }]);
    setTimeout(() => setRipples(prev => prev.filter(rp => rp.id !== id)), 720);
    onClick?.();
  };

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`ev-cta-btn${className ? ` ${className}` : ""}`}
      style={{
        transform: `translate(${magPos.x}px,${magPos.y}px) scale(${hovered ? 1.05 : 1})`,
        transition: hovered
          ? "transform 0.1s ease, box-shadow 0.2s ease"
          : "transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.25s ease",
        boxShadow: hovered
          ? "0 10px 40px rgba(61,170,122,0.35), 0 2px 10px rgba(0,0,0,0.3)"
          : "0 4px 20px rgba(0,0,0,0.25)",
      }}
    >
      <div
        className="ev-cta-shimmer"
        style={{ left: shimmer ? "160%" : "-65%", transition: shimmer ? "left 0.52s ease" : "none" }}
      />
      {ripples.map(rp => (
        <span key={rp.id} className="ev-cta-ripple" style={{ left: rp.x, top: rp.y }} />
      ))}
      <span className="ev-cta-label">{label}</span>
      <span className="ev-cta-arrow">
        <span style={{
          position: "absolute", display: "flex", alignItems: "center",
          transform: hovered ? "translateX(26px)" : "translateX(0)",
          transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <IconArrowRight />
        </span>
        <span style={{
          position: "absolute", display: "flex", alignItems: "center",
          transform: hovered ? "translateX(0)" : "translateX(-26px)",
          transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <IconArrowRight />
        </span>
      </span>
    </button>
  );
}
