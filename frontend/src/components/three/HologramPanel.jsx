import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

const FADE_START = 5;
const FADE_END = 7;

export default function HologramPanel({ position, text }) {
  const groupRef = useRef();
  const materialRef = useRef();
  const lineMaterialRef = useRef();
  const textRef = useRef();
  const { camera } = useThree();

  const panelPosition = useMemo(
    () => new THREE.Vector3(position.x, position.y + 1.3, position.z),
    [position.x, position.y, position.z]
  );

  const cameraWorldPos = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    groupRef.current.quaternion.copy(camera.quaternion);

    camera.getWorldPosition(cameraWorldPos.current);
    const dist = cameraWorldPos.current.distanceTo(panelPosition);
    const proximityFactor =
      dist >= FADE_END ? 0 :
      dist <= FADE_START ? 1 :
      1 - (dist - FADE_START) / (FADE_END - FADE_START);

    groupRef.current.visible = proximityFactor > 0;

    if (materialRef.current) {
      materialRef.current.opacity =
        (0.25 + Math.sin(clock.elapsedTime * 2) * 0.1) * proximityFactor;
    }

    if (lineMaterialRef.current) {
      lineMaterialRef.current.opacity = 0.9 * proximityFactor;
    }

    if (textRef.current?.material) {
      textRef.current.material.opacity = proximityFactor;
      textRef.current.material.transparent = true;
    }
  });

  return (
    <group position={[position.x, position.y + 1.3, position.z]} ref={groupRef}>

      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[2.2, 2.2]} />
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

      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(2.3, 2.3)]} />
        <lineBasicMaterial
          ref={lineMaterialRef}
          color="#39ff14"
          transparent
          opacity={0.9}
        />
      </lineSegments>

      <Text
        ref={textRef}
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
