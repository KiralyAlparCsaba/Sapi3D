import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";

const LERP_RATE = 12; // higher = snappier; lower = smoother

// Stable color from user id (HSL ring)
function colorFromId(id) {
  const hue = (Number(id) * 137) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

export default function RemotePlayer({ player }) {
  const groupRef = useRef();
  const playerRef = useRef(player);
  playerRef.current = player; // always point to latest reference

  const color = useMemo(() => colorFromId(player.userId), [player.userId]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const p = playerRef.current;

    // Exponential damping toward target (frame-rate independent)
    const k = 1 - Math.exp(-LERP_RATE * delta);

    p.curX += (p.targetX - p.curX) * k;
    p.curY += (p.targetY - p.curY) * k;
    p.curZ += (p.targetZ - p.curZ) * k;

    // Handle rotation wrap-around for short-path interpolation
    let dr = p.targetRotY - p.curRotY;
    while (dr > Math.PI) dr -= Math.PI * 2;
    while (dr < -Math.PI) dr += Math.PI * 2;
    p.curRotY += dr * k;

    g.position.set(p.curX, p.curY, p.curZ);
    g.rotation.set(0, p.curRotY, 0);
  });

  return (
    <group ref={groupRef}>
      {/* Body — capsule centered roughly at hip height */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.3, 1.0, 6, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* "Nose" — small marker showing facing direction (+Z is forward) */}
      <mesh position={[0, 1.25, 0.32]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Username tag floating overhead */}
      <Text
        position={[0, 2.05, 0]}
        fontSize={0.18}
        color="#ffffff"
        outlineWidth={0.012}
        outlineColor="#000000"
        anchorX="center"
        anchorY="middle"
      >
        {player.username || `user${player.userId}`}
      </Text>
    </group>
  );
}
