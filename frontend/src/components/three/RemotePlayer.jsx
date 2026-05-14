import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

import Avatar from "./avatars/Avatar";

const LERP_RATE = 12;
export default function RemotePlayer({ player, otherPlayers, onSelect }) {
  const groupRef = useRef();
  const playerRef = useRef(player);
  playerRef.current = player;

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const p = playerRef.current;

    const k = 1 - Math.exp(-LERP_RATE * delta);

    p.curX += (p.targetX - p.curX) * k;
    p.curY += (p.targetY - p.curY) * k;
    p.curZ += (p.targetZ - p.curZ) * k;

    let dr = p.targetRotY - p.curRotY;
    while (dr > Math.PI) dr -= Math.PI * 2;
    while (dr < -Math.PI) dr += Math.PI * 2;
    p.curRotY += dr * k;

    g.position.set(p.curX, p.curY, p.curZ);
    g.rotation.set(0, p.curRotY, 0);
  });

  const handleClick = onSelect
    ? (e) => {
        e.stopPropagation();
        onSelect(player.userId);
      }
    : undefined;

  return (
    <group ref={groupRef} onClick={handleClick}>
      <Avatar player={player} otherPlayers={otherPlayers} />

      <Html
        position={[0, 2.05, 0]}
        center
        distanceFactor={6}
        style={{
          color: "#ffffff",
          fontFamily: "sans-serif",
          fontWeight: 600,
          fontSize: "16px",
          textShadow: "0 0 3px #000, 0 0 3px #000, 0 0 3px #000, 0 0 3px #000",
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        {player.username || `user${player.userId}`}
      </Html>
    </group>
  );
}
