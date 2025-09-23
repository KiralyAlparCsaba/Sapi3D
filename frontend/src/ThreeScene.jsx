// frontend/src/ThreeScene.jsx
import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import Stats from 'three/examples/jsm/libs/stats.module.js';

// Metrics class
class Metrics {
  constructor(renderer) {
    this.renderer = renderer;

    this.stats = new Stats();
    this.stats.showPanel(0); // FPS
    document.body.appendChild(this.stats.dom);

    this.extraMetrics = document.createElement('div');
    this.extraMetrics.style.color = '#0f0';
    this.extraMetrics.style.fontFamily = 'monospace';
    this.extraMetrics.style.fontSize = '16px';
    this.extraMetrics.style.marginTop = '4px';
    this.stats.dom.appendChild(this.extraMetrics);

    this.maxMemoryMB = 0;
  }

  begin() { this.stats.begin(); }

  end() {
    this.stats.end();

    const info = this.renderer.info;
    const triangles = info.render.triangles;
    const drawCalls = info.render.calls;

    let memoryMB = 'N/A';
    if (performance && performance.memory) {
      memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
      this.maxMemoryMB = Math.max(this.maxMemoryMB, parseFloat(memoryMB));
    }

    this.extraMetrics.innerHTML = `
      Tri: ${triangles.toLocaleString()}<br>
      Draw: ${drawCalls.toLocaleString()}<br>
      Mem: ${memoryMB} MB (Max: ${this.maxMemoryMB.toFixed(1)})
    `;
  }
}

// Main ThreeScene component
export default function ThreeScene() {
  const [insideTrigger, setInsideTrigger] = useState(false);
  const controlsRef = useRef(); // pointer lock controls ref

  // Building component
  function Building({ controlsRef }) {
    const gltf = useGLTF("http://localhost:8000/model");
    const roofRef = useRef();
    const interiorRef = useRef();
    const triggerBoxRef = useRef();
    const isInsideRef = useRef(false);

    const { camera, gl } = useThree();

    const metricsRef = useRef();
    if (!metricsRef.current) metricsRef.current = new Metrics(gl);

    // Movement state
    const move = useRef({ forward: false, backward: false, left: false, right: false });
    const velocity = useRef(new THREE.Vector3());
    const direction = new THREE.Vector3();
    const moveSpeed = 10.0;

    // Keyboard events
    useEffect(() => {
      const handleKeyDown = (e) => {
        switch (e.code) {
          case "KeyW": case "ArrowUp": move.current.forward = true; break;
          case "KeyS": case "ArrowDown": move.current.backward = true; break;
          case "KeyA": case "ArrowLeft": move.current.left = true; break;
          case "KeyD": case "ArrowRight": move.current.right = true; break;
        }
      };
      const handleKeyUp = (e) => {
        switch (e.code) {
          case "KeyW": case "ArrowUp": move.current.forward = false; break;
          case "KeyS": case "ArrowDown": move.current.backward = false; break;
          case "KeyA": case "ArrowLeft": move.current.left = false; break;
          case "KeyD": case "ArrowRight": move.current.right = false; break;
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, []);

    // Frame loop
    useFrame((state, delta) => {
      const metrics = metricsRef.current;
      metrics.begin();

      // Trigger zones
      if (triggerBoxRef.current && roofRef.current && interiorRef.current) {
        const cameraPos = camera.position;
        const nowInside = triggerBoxRef.current.containsPoint(cameraPos);
        if (nowInside !== isInsideRef.current) {
          isInsideRef.current = nowInside;
          roofRef.current.visible = !nowInside;
          interiorRef.current.visible = nowInside;
          setInsideTrigger(nowInside);
        }
      }

      // Movement
      velocity.current.x -= velocity.current.x * 5.0 * delta;
      velocity.current.z -= velocity.current.z * 5.0 * delta;

      direction.z = Number(move.current.forward) - Number(move.current.backward);
      direction.x = Number(move.current.right) - Number(move.current.left);
      direction.normalize();

      if (move.current.forward || move.current.backward) velocity.current.z -= direction.z * moveSpeed * delta;
      if (move.current.left || move.current.right) velocity.current.x -= direction.x * moveSpeed * delta;

      const moveVector = new THREE.Vector3(velocity.current.x * delta, 0, velocity.current.z * delta);
      if (controlsRef.current) {
        controlsRef.current.moveRight(-moveVector.x);
        controlsRef.current.moveForward(-moveVector.z);
      }

      metrics.end();
    });

    // Assign references when model loads
    gltf.scene.traverse((child) => {
      if (child.name === "Roof") roofRef.current = child;
      if (child.name === "Interior") interiorRef.current = child;
      if (child.name === "TriggerZone") {
        triggerBoxRef.current = new THREE.Box3().setFromObject(child);
        child.visible = false;
      }
    });

    return <primitive object={gltf.scene} />;
  }

  return (
    <Canvas camera={{ position: [0, 1.6, 3], fov: 60 }} style={{ width: "100vw", height: "100vh" }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7.5]} intensity={1} />

      <Suspense fallback={null}>
        <Building controlsRef={controlsRef} />
      </Suspense>

      <PointerLockControls ref={controlsRef} />
    </Canvas>
  );
}
