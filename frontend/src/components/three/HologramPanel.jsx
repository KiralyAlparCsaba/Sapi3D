import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export default function HologramPanel({ position, text }) {
  const groupRef = useRef();
  const materialRef = useRef();

  useFrame(({ camera, clock }) => {
    if (!groupRef.current) return;

    // kamera felé néz
    groupRef.current.quaternion.copy(camera.quaternion);

    // pulzáló hologram effekt
    if (materialRef.current) {
      materialRef.current.opacity =
        0.25 + Math.sin(clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group position={[position.x, position.y + 1.3, position.z]} ref={groupRef}>

      {/* 1. HOLOGRAM HÁTTÉR */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[2.2, 0.8]} />
        <meshBasicMaterial
          ref={materialRef}
          color="#39ff14"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 2. VÉKONY NEON KERET (nem tömör) */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(2.3, 0.9)]} />
        <lineBasicMaterial
          color="#39ff14"
          transparent
          opacity={0.9}
        />
      </lineSegments>

      {/* 3. SZÖVEG */}
      <Text
        position={[0, 0, 0]}
        fontSize={0.08}
        color="#b6ff9e"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.0}
        textAlign="center"
        lineHeight={1.3}
        outlineWidth={0.004}
        outlineColor="#39ff14"
      >
        {text}
      </Text>
    </group>
  );
}