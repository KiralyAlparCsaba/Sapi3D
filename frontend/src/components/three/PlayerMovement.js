import { useRef, useEffect } from "react";
import * as THREE from "three";

export default function PlayerMovement(controlsRef, sceneRef, moveSpeed = 10.0) {
  const move = useRef({ forward: false, backward: false, left: false, right: false });
  const velocity = useRef(new THREE.Vector3());
  const direction = new THREE.Vector3();
  const raycaster = useRef(new THREE.Raycaster());

  const playerHeight = 1.7;
  const collisionDistance = 0.25;   // was 0.35 → allows closer approach to walls
  const gravity = -30;
  const onGround = useRef(false);
  const MAX_STEP_HEIGHT = 0.5;
  const DAMPING = 5.0;

  // --- Keyboard handling ---
  useEffect(() => {
    const down = (e) => {
      if (["KeyW", "ArrowUp"].includes(e.code)) move.current.forward = true;
      if (["KeyS", "ArrowDown"].includes(e.code)) move.current.backward = true;
      if (["KeyA", "ArrowLeft"].includes(e.code)) move.current.left = true;
      if (["KeyD", "ArrowRight"].includes(e.code)) move.current.right = true;
    };
    const up = (e) => {
      if (["KeyW", "ArrowUp"].includes(e.code)) move.current.forward = false;
      if (["KeyS", "ArrowDown"].includes(e.code)) move.current.backward = false;
      if (["KeyA", "ArrowLeft"].includes(e.code)) move.current.left = false;
      if (["KeyD", "ArrowRight"].includes(e.code)) move.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const updateMovement = (delta) => {
    const scene = sceneRef.current;
    const controls = controlsRef.current;
    if (!controls || !scene) return;

    const camera = controls.getObject();

    // velocity damping
    velocity.current.x -= velocity.current.x * DAMPING * delta;
    velocity.current.z -= velocity.current.z * DAMPING * delta;

    // input direction
    direction.z = Number(move.current.forward) - Number(move.current.backward);
    direction.x = Number(move.current.right) - Number(move.current.left);
    direction.normalize();

    // acceleration
    if (move.current.forward || move.current.backward)
      velocity.current.z -= direction.z * moveSpeed * delta;
    if (move.current.left || move.current.right)
      velocity.current.x -= direction.x * moveSpeed * delta;

    const moveVec = new THREE.Vector3(
      velocity.current.x * delta,
      0,
      velocity.current.z * delta
    );

    // collect meshes
    const collidableObjects = [];
    scene.traverse((child) => {
      if (child.isMesh && !["Roof", "TriggerZone"].includes(child.name))
        collidableObjects.push(child);
    });

    // ---- capsule wall collision ----
    const offsets = [
      new THREE.Vector3(0.18, 0, 0),
      new THREE.Vector3(-0.18, 0, 0),
      new THREE.Vector3(0, 0, 0.18),
      new THREE.Vector3(0, 0, -0.18),
    ];
    const dir = moveVec.clone().normalize();
    let blocked = false;
    for (const o of offsets) {
      const origin = camera.position.clone().add(o);
      raycaster.current.set(origin, dir);
      const hit = raycaster.current.intersectObjects(collidableObjects, true)[0];
      if (hit && hit.distance < collisionDistance) {
        blocked = true;
        break;
      }
    }

    if (!blocked) {
      controls.moveRight(-moveVec.x);
      controls.moveForward(-moveVec.z);
    }

    // ---- Original floor detection (stairs included) ----
    const downRay = new THREE.Raycaster(
      camera.position.clone().add(new THREE.Vector3(0, 0.2, 0)),
      new THREE.Vector3(0, -1, 0),
      0,
      playerHeight + MAX_STEP_HEIGHT + 1.0
    );

    const floorHits = downRay.intersectObjects(collidableObjects, true);
    const currentFloorY = camera.position.y - playerHeight;
    const validHits = floorHits.filter(
      (h) => h.point.y - currentFloorY <= MAX_STEP_HEIGHT
    );

    if (validHits.length) {
      const floor = validHits.reduce((a, b) =>
        b.point.y > a.point.y ? b : a
      );
      onGround.current = true;
      velocity.current.y = 0;
      camera.position.y = floor.point.y + playerHeight;
    } else {
      onGround.current = false;
      velocity.current.y += gravity * delta;
      camera.position.y += velocity.current.y * delta;
    }
  };

  return { updateMovement, move, velocity };
}
