import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { Metrics } from "./metrics";

export default function ThreeScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.6, 3);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // Metrics
    const metrics = new Metrics(renderer);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    // Controls
    const controls = new PointerLockControls(camera, renderer.domElement);
    scene.add(controls.getObject());

    // Movement variables
    const move = { forward: false, backward: false, left: false, right: false };
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const moveSpeed = 20.0;

    // GLTF Loader
    const loader = new GLTFLoader();
    let roofGroup = null;
    let interiorGroup = null;
    let triggerBox = null;
    let isInside = false;

    loader.load("http://localhost:8000/model", (gltf) => {
      const model = gltf.scene;
      scene.add(model);
      model.traverse((child) => {
        if (child.name === "Roof") roofGroup = child;
        if (child.name === "Interior") interiorGroup = child;
        if (child.name === "TriggerZone") {
          triggerBox = new THREE.Box3().setFromObject(child);
          child.visible = false;
        }
      });
      if (roofGroup) roofGroup.visible = true;
      if (interiorGroup) interiorGroup.visible = false;
    });

    // Input handlers
    const handleKeyDown = (e) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          move.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          move.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          move.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          move.right = true;
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          move.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          move.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          move.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          move.right = false;
          break;
      }
    };

    const handleClick = () => controls.lock();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("click", handleClick);

    // Clock
    const clock = new THREE.Clock();

    // Animate loop
    const moveVector = new THREE.Vector3(); // reuse to avoid creating new object each frame
    const animate = () => {
      requestAnimationFrame(animate);
      metrics.begin();

      const delta = clock.getDelta();
      velocity.x -= velocity.x * 10.0 * delta;
      velocity.z -= velocity.z * 10.0 * delta;

      direction.z = Number(move.forward) - Number(move.backward);
      direction.x = Number(move.right) - Number(move.left);
      direction.normalize();

      if (move.forward || move.backward) velocity.z -= direction.z * moveSpeed * delta;
      if (move.left || move.right) velocity.x -= direction.x * moveSpeed * delta;

      moveVector.set(velocity.x * delta, 0, velocity.z * delta);
      controls.moveRight(-moveVector.x);
      controls.moveForward(-moveVector.z);

      // Trigger zone
      if (triggerBox) {
        const nowInside = triggerBox.containsPoint(controls.getObject().position);
        if (nowInside !== isInside) {
          isInside = nowInside;
          if (roofGroup) roofGroup.visible = !isInside;
          if (interiorGroup) interiorGroup.visible = isInside;
        }
      }

      renderer.render(scene, camera);
      metrics.end();
    };
    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("resize", handleResize);
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />;
}