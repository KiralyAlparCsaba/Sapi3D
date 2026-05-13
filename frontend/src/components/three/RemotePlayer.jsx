import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

import Avatar from "./avatars/Avatar";

const LERP_RATE = 12; // higher = snappier; lower = smoother

/**
 * RemotePlayer — handles the network-driven motion of a remote player
 * (interpolation toward the latest broadcast pose) and renders an
 * <Avatar> + nametag at that pose.
 *
 * The avatar itself (GLB or capsule fallback) is chosen inside <Avatar>
 * based on the loaded manifest. `otherPlayers` is forwarded so the avatar
 * can implement look-at-nearest-player.
 */
export default function RemotePlayer({ player, otherPlayers }) {
  const groupRef = useRef();
  const playerRef = useRef(player);
  playerRef.current = player; // always point to the latest reference

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const p = playerRef.current;

    // Exponential damping toward target (frame-rate independent)
    const k = 1 - Math.exp(-LERP_RATE * delta);

    p.curX += (p.targetX - p.curX) * k;
    p.curY += (p.targetY - p.curY) * k;
    p.curZ += (p.targetZ - p.curZ) * k;

    // Rotation wrap-around for short-path interpolation
    let dr = p.targetRotY - p.curRotY;
    while (dr > Math.PI) dr -= Math.PI * 2;
    while (dr < -Math.PI) dr += Math.PI * 2;
    p.curRotY += dr * k;

    g.position.set(p.curX, p.curY, p.curZ);
    g.rotation.set(0, p.curRotY, 0);
  });

  return (
    <group ref={groupRef}>
      <Avatar player={player} otherPlayers={otherPlayers} />

      {/* Username tag floating overhead.
          We use <Html> (DOM billboard) instead of drei's <Text> because
          drei's <Text> spins up a separate troika-three-text SDF atlas
          textura per instance. At 50 concurrent remote players that's
          50 atlas textures + 50 extra draw calls just for nametags —
          painful on mobile GPUs. <Html> is a single DOM element scaled
          by distance, essentially free on the GPU. */}
      <Html
        position={[0, 2.05, 0]}
        center
        distanceFactor={6}
        style={{
          color: "#ffffff",
          fontFamily: "sans-serif",
          fontWeight: 600,
          fontSize: "16px",
          textShadow:
            "0 0 3px #000, 0 0 3px #000, 0 0 3px #000, 0 0 3px #000",
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
