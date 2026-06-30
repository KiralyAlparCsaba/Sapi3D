import { useMemo } from "react";

function colorFromId(id) {
  const n = Number(id) || 0;
  const hue = (n * 137) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

export default function AvatarFallback({ userId }) {
  const color = useMemo(() => colorFromId(userId ?? 0), [userId]);

  return (
    <>

      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.3, 1.0, 6, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, 1.25, 0.32]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </>
  );
}
