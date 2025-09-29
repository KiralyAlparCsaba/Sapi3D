// src/components/three/ThreeScene.jsx
import { useRef, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import Building from "./Building";

export default function ThreeScene() {
  const [inside, setInside] = useState(false);
  const controlsRef = useRef();

  return (
    <Canvas camera={{ position: [0, 1.6, 3], fov: 60 }}
            style={{ width: "100vw", height: "100vh" }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7.5]} intensity={1} />

      <Suspense fallback={null}>
        <Building controlsRef={controlsRef} onInsideChange={setInside} />
      </Suspense>

      <PointerLockControls ref={controlsRef} />
    </Canvas>
  );
}
