import { useRef, useEffect } from "react";
import * as THREE from "three";

export default function PlayerMovement(controlsRef, sceneRef, moveSpeed = 10.0) {
  const move = useRef({ forward: false, backward: false, left: false, right: false });
  const velocity = useRef(new THREE.Vector3());
  const direction = new THREE.Vector3();
  const raycaster = useRef(new THREE.Raycaster());

  const playerHeight = 1.2;
  const collisionDistance = 0.5;
  const gravity = -30;
  const onGround = useRef(false);

  const MAX_STEP_HEIGHT = 0.5; // max height player can "step" up

  // --- Keyboard handling ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["KeyW", "ArrowUp"].includes(e.code)) move.current.forward = true;
      if (["KeyS", "ArrowDown"].includes(e.code)) move.current.backward = true;
      if (["KeyA", "ArrowLeft"].includes(e.code)) move.current.left = true;
      if (["KeyD", "ArrowRight"].includes(e.code)) move.current.right = true;
    };

    const handleKeyUp = (e) => {
      if (["KeyW", "ArrowUp"].includes(e.code)) move.current.forward = false;
      if (["KeyS", "ArrowDown"].includes(e.code)) move.current.backward = false;
      if (["KeyA", "ArrowLeft"].includes(e.code)) move.current.left = false;
      if (["KeyD", "ArrowRight"].includes(e.code)) move.current.right = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // --- Update function (call in useFrame) ---
  const updateMovement = (delta) => {
    const scene = sceneRef.current;
    if (!controlsRef.current || !scene) return;

    const camera = controlsRef.current.getObject();

    // Smooth damping for velocity
    velocity.current.x -= velocity.current.x * 5.0 * delta;
    velocity.current.z -= velocity.current.z * 5.0 * delta;

    // Movement direction
    direction.z = Number(move.current.forward) - Number(move.current.backward);
    direction.x = Number(move.current.right) - Number(move.current.left);
    direction.normalize();

    // Apply acceleration
    if (move.current.forward || move.current.backward)
      velocity.current.z -= direction.z * moveSpeed * delta;
    if (move.current.left || move.current.right)
      velocity.current.x -= direction.x * moveSpeed * delta;

    const moveVector = new THREE.Vector3(
      velocity.current.x * delta,
      0,
      velocity.current.z * delta
    );

    // --- Collision Detection ---
    const moveDir = moveVector.clone().normalize();
    raycaster.current.set(camera.position, moveDir);

    const collidableObjects = [];
    scene.traverse((child) => {
      if (child.isMesh && !["Roof", "TriggerZone"].includes(child.name)) {
        collidableObjects.push(child);
      }
    });

    const intersections = raycaster.current.intersectObjects(collidableObjects, true);
    const blocking = intersections.find((i) => i.distance < collisionDistance);

    if (!blocking) {
      controlsRef.current.moveRight(-moveVector.x);
      controlsRef.current.moveForward(-moveVector.z);
    }

    // --- Gravity & Floor Detection with Max Step Height ---
    const downRay = new THREE.Raycaster(
      camera.position.clone().add(new THREE.Vector3(0, 0.2, 0)),
      new THREE.Vector3(0, -1, 0),
      0,
      playerHeight + MAX_STEP_HEIGHT + 1.0
    );

    const floorHits = downRay.intersectObjects(collidableObjects, true);
    const currentFloorY = camera.position.y - playerHeight;

    // Filter hits within step height
    const validHits = floorHits.filter(hit => (hit.point.y - currentFloorY) <= MAX_STEP_HEIGHT);

    if (validHits.length > 0) {
      // Pick the closest valid hit
      const floor = validHits.reduce((closest, hit) => {
        return hit.point.y > closest.point.y ? hit : closest;
      }, validHits[0]);

      onGround.current = true;
      velocity.current.y = 0;
      camera.position.y = floor.point.y + playerHeight;
    } else {
      // No valid floor → falling
      onGround.current = false;
      velocity.current.y += gravity * delta;
      camera.position.y += velocity.current.y * delta;
    }
  };

  return { updateMovement, move, velocity };
}
