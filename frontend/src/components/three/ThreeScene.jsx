import { useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import UsePlayerMovement from "./PlayerMovement";
import Building from "./Building";

function SceneContent({ controlsRef }) {
  const [collisionScene, setCollisionScene] = useState(null);

  const player = UsePlayerMovement(controlsRef, collisionScene, 10.0);

  useFrame((_, delta) => {
    if (collisionScene) player.updateMovement(delta);
  });

  return (
    <Suspense fallback={null}>
      <Building
        onWorldReady={(mesh) => setCollisionScene(mesh)}
        onInsideChange={(inside) => console.log("Inside:", inside)}
      />
    </Suspense>
  );
}

export default function ThreeScene() {
  const controlsRef = useRef();

  return (
    <Canvas
      camera={{ position: [0, 2.0, 3], fov: 75 }}
      style={{ width: "100vw", height: "100vh" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7.5]} intensity={1.2} />

      <SceneContent controlsRef={controlsRef} />

      <PointerLockControls ref={controlsRef} />
    </Canvas>
  );
}
