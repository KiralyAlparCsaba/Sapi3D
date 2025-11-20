import { useRef, useState, Suspense, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import UsePlayerMovement from "./PlayerMovement";
import Building from "./Building";
import * as THREE from "three";

function SceneContent({ controlsRef, sessionId }) {
  const collisionRef = useRef(null);
  const [collisionScene, setCollisionScene] = useState(null);

  useEffect(() => {
    if (collisionScene) collisionRef.current = collisionScene;
  }, [collisionScene]);

  const player = UsePlayerMovement(controlsRef, collisionRef, 10.0);

  useFrame((_, delta) => {
    if (collisionRef.current) player.updateMovement(delta);
  });

  return (
    <Suspense fallback={null}>
      <Building
        sessionId={sessionId}            // ← 🎯 FIX: pass sessionId into Building
        onWorldReady={(mesh) => {
          setCollisionScene(mesh);

          if (controlsRef.current) {
            const camera = controlsRef.current.getObject();

            const rayOrigin = camera.position.clone();
            rayOrigin.y = 10;
            const ray = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0));
            const hits = ray.intersectObjects(mesh.children, true);

            if (hits.length > 0) {
              camera.position.y = hits[0].point.y + 1.2;
            }
          }
        }}
        onInsideChange={(inside) => console.log("Inside:", inside)}
      />
    </Suspense>
  );
}

export default function ThreeScene() {
  const controlsRef = useRef();

  // ⭐ Load session ID from localStorage
  const sessionId = parseInt(localStorage.getItem("session_id"), 10);

  console.log("Loaded sessionId:", sessionId);

  return (
    <Canvas
      camera={{ position: [0, 2.0, 3], fov: 75 }}
      style={{ width: "100vw", height: "100vh" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7.5]} intensity={1.2} />

      <SceneContent controlsRef={controlsRef} sessionId={sessionId} />

      <PointerLockControls ref={controlsRef} />
    </Canvas>
  );
}
