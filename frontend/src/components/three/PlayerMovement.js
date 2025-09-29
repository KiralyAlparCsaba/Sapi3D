// src/hooks/PlayerMovement.js
import { useRef, useEffect } from "react";
import * as THREE from "three";

export default function PlayerMovement(controlsRef, moveSpeed = 10.0) {
  const move = useRef({ forward: false, backward: false, left: false, right: false });
  const velocity = useRef(new THREE.Vector3());
  const direction = new THREE.Vector3();

  // Keyboard handling
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

  // Update function to call inside useFrame
  const updateMovement = (delta) => {
    velocity.current.x -= velocity.current.x * 5.0 * delta;
    velocity.current.z -= velocity.current.z * 5.0 * delta;

    direction.z = Number(move.current.forward) - Number(move.current.backward);
    direction.x = Number(move.current.right) - Number(move.current.left);
    direction.normalize();

    if (move.current.forward || move.current.backward)
      velocity.current.z -= direction.z * moveSpeed * delta;
    if (move.current.left || move.current.right)
      velocity.current.x -= direction.x * moveSpeed * delta;

    const moveVector = new THREE.Vector3(
      velocity.current.x * delta,
      0,
      velocity.current.z * delta
    );

    if (controlsRef.current) {
      controlsRef.current.moveRight(-moveVector.x);
      controlsRef.current.moveForward(-moveVector.z);
    }
  };

  return { updateMovement, move, velocity };
}
