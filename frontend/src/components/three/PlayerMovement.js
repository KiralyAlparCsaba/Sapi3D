import { useRef, useEffect } from "react";
import * as THREE from "three";

export default function PlayerMovement(controlsRef, sceneRef, moveSpeed = 10.0) {
  const move = useRef({ forward: false, backward: false, left: false, right: false });
  const velocity = useRef(new THREE.Vector3());
  const direction = new THREE.Vector3();
  const raycaster = useRef(new THREE.Raycaster());

  const playerHeight = 1.7;
  const collisionDistance = 0.25;
  const gravity = -30;
  const onGround = useRef(false);
  const MAX_STEP_HEIGHT = 0.5;
  const DAMPING = 5.0;

  // Keyboard (desktop only)
  useEffect(() => {
    const down = (e) => {
      if (e.code === "KeyW" || e.code === "ArrowUp") move.current.forward = true;
      if (e.code === "KeyS" || e.code === "ArrowDown") move.current.backward = true;
      if (e.code === "KeyA" || e.code === "ArrowLeft") move.current.left = true;
      if (e.code === "KeyD" || e.code === "ArrowRight") move.current.right = true;
    };
    const up = (e) => {
      if (e.code === "KeyW" || e.code === "ArrowUp") move.current.forward = false;
      if (e.code === "KeyS" || e.code === "ArrowDown") move.current.backward = false;
      if (e.code === "KeyA" || e.code === "ArrowLeft") move.current.left = false;
      if (e.code === "KeyD" || e.code === "ArrowRight") move.current.right = false;
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
    if (!scene || !controls) return;

    const camera = controls.getObject();

    // MOBILE joystick → pass rotation to controller
    if (controls.setLook && window.joystickLook) {
      controls.setLook(window.joystickLook.lx, window.joystickLook.ly);
    }

    // --- Velocity damping
    velocity.current.x -= velocity.current.x * DAMPING * delta;
    velocity.current.z -= velocity.current.z * DAMPING * delta;

    // DESKTOP keys
    direction.z = Number(move.current.forward) - Number(move.current.backward);
    direction.x = Number(move.current.right) - Number(move.current.left);

    // MOBILE joystick
    if (window.joystickMove) {
      direction.x = window.joystickMove.x;
      direction.z = window.joystickMove.y;
    }

    direction.normalize();

    // accelerate
    if (direction.z !== 0) velocity.current.z -= direction.z * moveSpeed * delta;
    if (direction.x !== 0) velocity.current.x -= direction.x * moveSpeed * delta;

    const moveVec = new THREE.Vector3(
      velocity.current.x * delta,
      0,
      velocity.current.z * delta
    );

    // Scene colliders
    const collidable = [];
    scene.traverse((child) => {
      if (child.isMesh && !["Roof", "TriggerZone"].includes(child.name))
        collidable.push(child);
    });

    // Wall collision
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
      const hit = raycaster.current.intersectObjects(collidable, true)[0];

      if (hit && hit.distance < collisionDistance) {
        blocked = true;
        break;
      }
    }

    if (!blocked) {
      controls.moveRight(-moveVec.x);
      controls.moveForward(-moveVec.z);
    }

    // Floor detection
    const downRay = new THREE.Raycaster(
      camera.position.clone().add(new THREE.Vector3(0, 0.2, 0)),
      new THREE.Vector3(0, -1, 0),
      0,
      playerHeight + MAX_STEP_HEIGHT + 1.0
    );

    const hits = downRay.intersectObjects(collidable, true);
    const currentY = camera.position.y - playerHeight;

    const valid = hits.filter((h) => h.point.y - currentY <= MAX_STEP_HEIGHT);

    if (valid.length) {
      const floor = valid.reduce((a, b) => (b.point.y > a.point.y ? b : a));
      onGround.current = true;
      velocity.current.y = 0;
      camera.position.y = floor.point.y + playerHeight;
    } else {
      onGround.current = false;
      velocity.current.y += gravity * delta;
      camera.position.y += velocity.current.y * delta;
    }

    //Call controller update (rotate camera)
    if (controls.update) {
      controls.update(delta);
    }
  };

  return { updateMovement, move, velocity };
}
