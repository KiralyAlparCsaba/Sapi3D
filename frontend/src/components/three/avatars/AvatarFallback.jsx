/**
 * AvatarFallback — placeholder avatar rendered when no GLB variant is
 * available for a remote player. This is what the current deployed
 * multiplayer renders for every player; the GLB pipeline replaces it
 * only when the backend manifest contains at least one entry.
 *
 * Geometry: capsule body + nose sphere indicating facing direction.
 * Color is derived deterministically from the userId so players are
 * visually distinguishable until real avatars ship.
 */

import { useMemo } from "react";

// Stable HSL ring color from a user id.
function colorFromId(id) {
  const n = Number(id) || 0;
  const hue = (n * 137) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

export default function AvatarFallback({ userId }) {
  const color = useMemo(() => colorFromId(userId ?? 0), [userId]);

  return (
    <>
      {/* Body — capsule centered roughly at hip height */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.3, 1.0, 6, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* "Nose" — small sphere showing facing direction (+Z is forward) */}
      <mesh position={[0, 1.25, 0.32]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </>
  );
}
