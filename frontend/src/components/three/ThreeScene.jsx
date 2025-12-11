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
        sessionId={sessionId}
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

  const sessionId = parseInt(sessionStorage.getItem("session_id"), 10);
  console.log("Loaded sessionId:", sessionId);

  return (
    <>
      <button
        onClick={() => (window.location.href = "/app")}
        className="back-btn"
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          padding: "10px 20px",
          background: "white",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          zIndex: 999,
        }}
      >
        ← Vissza a főoldalra
      </button>

      <Canvas
        camera={{ position: [0, 2.0, 3], fov: 75 }}
        style={{ width: "100vw", height: "100vh" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 7.5]} intensity={1.2} />

        {/* ✔ main branch update: include sessionId */}
        <SceneContent controlsRef={controlsRef} sessionId={sessionId} />

        <PointerLockControls ref={controlsRef} />
      </Canvas>
    </>
  );
}