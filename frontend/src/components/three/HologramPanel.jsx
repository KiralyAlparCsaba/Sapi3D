import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export default function HologramPanel({ position, text }) {
  const groupRef = useRef();

  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    // Az egész panelt (keret + háttér + szöveg) a kamera felé fordítjuk
    groupRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y + 1.3, position.z]}
    >
      {/* 1. SÖTÉT HÁTTÉR PANEL (Megnövelve) */}
      <mesh position={[0, 0, -0.01]}>
        {/* Szélesség: 2.2 méter, Magasság: 0.8 méter */}
        <planeGeometry args={[2.2, 0.8]} />
        <meshBasicMaterial
          color="#001133"
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 2. VILÁGÍTÓ CIÁNKÉK KERET */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[2.25, 0.85]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 3. A SZÖVEG */}
      <Text
        position={[0, 0, 0]}
        fontSize={0.08}       // <-- Kisebb betűméret (0.12-ről 0.08-ra)
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.0}        // <-- Szélesebb tördelési határ, hogy illeszkedjen a kerethez
        textAlign="center"
        lineHeight={1.3}      // <-- Kicsit szellősebb sorok
        outlineWidth={0.0015} // <-- Sokkal finomabb ragyogás (0.008-ról)
        outlineColor="#00ffff"
      >
        {text}
      </Text>
    </group>
  );
}