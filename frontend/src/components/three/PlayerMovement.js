import { useRef, useEffect } from "react";
import * as THREE from "three";

export default function PlayerMovement(
  controlsRef,
  sceneRef,
  playerRootRef,
  moveSpeed = 10.0,
) {
  const move = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });
  const velocity = useRef(new THREE.Vector3());
  const direction = new THREE.Vector3();
  const raycaster = useRef(new THREE.Raycaster());

  const frontDir = new THREE.Vector3();
  const sideDir = new THREE.Vector3();
  const worldStep = new THREE.Vector3();
  const checkDirTmp = new THREE.Vector3();

  const camWorldPosRef = useRef(new THREE.Vector3());
  const originRef = useRef(new THREE.Vector3());

  const playerHeight = 1.7;
  const collisionDistance = 0.32;
  const gravity = -30;
  const onGround = useRef(false);
  const MAX_STEP_HEIGHT = 0.5;
  const DAMPING = 5.0;

  const MAX_SUBSTEP_DIST = 0.07;
  const SKIN_WALL = 0.05;
  const HEIGHTS = [-1.2, -0.7, -0.2];
  const collidableRef = useRef([]);
  const collidableDirtyRef = useRef(true);

  const SPAWN_POS = new THREE.Vector3(1, -0.099324, 6.3213);
  const FALL_DEATH_Y = -15;

  const markCollidableDirty = () => {
    collidableDirtyRef.current = true;
  };

  const rebuildCollidablesIfNeeded = (scene) => {
    if (!collidableDirtyRef.current) return;
    const list = [];
    scene.traverse((child) => {
      if (!child || !child.isMesh) return;
      if (child.name === "Roof") return;
      if (child.name && child.name.startsWith("TriggerZone")) return;
      list.push(child);
    });
    collidableRef.current = list;
    collidableDirtyRef.current = false;
  };

  useEffect(() => {
    const isTypingTarget = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    const down = (e) => {
      if (isTypingTarget(document.activeElement)) {
        move.current.forward = false;
        move.current.backward = false;
        move.current.left = false;
        move.current.right = false;
        return;
      }
      if (e.code === "KeyW" || e.code === "ArrowUp")
        move.current.forward = true;
      if (e.code === "KeyS" || e.code === "ArrowDown")
        move.current.backward = true;
      if (e.code === "KeyA" || e.code === "ArrowLeft") move.current.left = true;
      if (e.code === "KeyD" || e.code === "ArrowRight")
        move.current.right = true;
    };
    const up = (e) => {
      if (e.code === "KeyW" || e.code === "ArrowUp")
        move.current.forward = false;
      if (e.code === "KeyS" || e.code === "ArrowDown")
        move.current.backward = false;
      if (e.code === "KeyA" || e.code === "ArrowLeft")
        move.current.left = false;
      if (e.code === "KeyD" || e.code === "ArrowRight")
        move.current.right = false;
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
    const root = playerRootRef?.current;

    if (!scene || !controls || !root) return;

    rebuildCollidablesIfNeeded(scene);
    const collidable = collidableRef.current;

    const camera = controls.getObject();

    camera.getWorldPosition(camWorldPosRef.current);

    if (controls.setLook && window.joystickLook) {
      controls.setLook(window.joystickLook.lx, window.joystickLook.ly);
    }

    const dampK = Math.exp(-DAMPING * delta);
    velocity.current.x *= dampK;
    velocity.current.z *= dampK;

    direction.z = Number(move.current.forward) - Number(move.current.backward);
    direction.x = Number(move.current.right) - Number(move.current.left);

    if (window.joystickMove) {
      direction.x = window.joystickMove.x;
      direction.z = window.joystickMove.y;
    }

    direction.normalize();

    if (direction.z !== 0)
      velocity.current.z -= direction.z * moveSpeed * delta;
    if (direction.x !== 0)
      velocity.current.x -= direction.x * moveSpeed * delta;

    camera.getWorldDirection(frontDir);
    frontDir.y = 0;
    frontDir.normalize();
    sideDir.crossVectors(frontDir, camera.up).normalize();

    const clampStep = (moveX, moveZ) => {
      worldStep
        .set(0, 0, 0)
        .addScaledVector(sideDir, moveX)
        .addScaledVector(frontDir, moveZ);

      const dist = worldStep.length();
      if (dist < 1e-6) return { ok: true, scale: 1, blocked: false };

      checkDirTmp.copy(worldStep).multiplyScalar(1 / dist);

      let minAllowed = dist;

      for (let i = 0; i < HEIGHTS.length; i++) {
        const h = HEIGHTS[i];
        originRef.current.copy(camWorldPosRef.current);
        originRef.current.y += h;

        raycaster.current.set(originRef.current, checkDirTmp);
        raycaster.current.far = dist + collisionDistance + SKIN_WALL;

        const hits = raycaster.current.intersectObjects(collidable, true);
        if (!hits.length) continue;

        let nearest = hits[0];
        for (let j = 1; j < hits.length; j++) {
          if (hits[j].distance < nearest.distance) nearest = hits[j];
        }

        const d = nearest.distance;
        const allowed = d - (collisionDistance + SKIN_WALL);

        if (allowed < minAllowed) minAllowed = allowed;
      }

      if (minAllowed <= 0) return { ok: false, scale: 0, blocked: true };

      const scale = Math.min(1, minAllowed / dist);
      return { ok: scale > 0, scale, blocked: scale < 1 };
    };

    const totalX = -velocity.current.x * delta;
    const totalZ = -velocity.current.z * delta;

    const totalDist = Math.sqrt(totalX * totalX + totalZ * totalZ);
    const steps = Math.max(1, Math.ceil(totalDist / MAX_SUBSTEP_DIST));

    for (let i = 0; i < steps; i++) {
      const stepX = totalX / steps;
      const stepZ = totalZ / steps;

      const diag = clampStep(stepX, stepZ);

      if (diag.ok && diag.scale > 0) {
        const sx = stepX * diag.scale;
        const sz = stepZ * diag.scale;
        if (Math.abs(sx) > 1e-8) root.position.addScaledVector(sideDir, sx);
        if (Math.abs(sz) > 1e-8) root.position.addScaledVector(frontDir, sz);

        if (diag.blocked) {
          velocity.current.x *= 0.6;
          velocity.current.z *= 0.6;
        }
      } else {
        let movedX = false;
        let movedZ = false;

        const cx = clampStep(stepX, 0);
        if (cx.ok && cx.scale > 0) {
          const sx = stepX * cx.scale;
          if (Math.abs(sx) > 1e-8) root.position.addScaledVector(sideDir, sx);
          movedX = true;

          if (cx.blocked) velocity.current.x *= 0.5;
        } else {
          velocity.current.x = 0;
        }

        const cz = clampStep(0, stepZ);
        if (cz.ok && cz.scale > 0) {
          const sz = stepZ * cz.scale;
          if (Math.abs(sz) > 1e-8) root.position.addScaledVector(frontDir, sz);
          movedZ = true;

          if (cz.blocked) velocity.current.z *= 0.5;
        } else {
          velocity.current.z = 0;
        }

        if (!movedX && !movedZ) {
          velocity.current.x = 0;
          velocity.current.z = 0;
        }
      }
      camera.getWorldPosition(camWorldPosRef.current);
    }

    const downOrigin = originRef.current.copy(camWorldPosRef.current);
    downOrigin.y += 0.2;

    const downRay = new THREE.Raycaster(
      downOrigin,
      new THREE.Vector3(0, -1, 0),
      0,
      playerHeight + MAX_STEP_HEIGHT + 0.5,
    );

    const floorHits = downRay.intersectObjects(collidable, true);
    const currentFeetY = root.position.y;

    let topFloor = null;
    for (let i = 0; i < floorHits.length; i++) {
      const h = floorHits[i];
      if (h.point.y - currentFeetY > MAX_STEP_HEIGHT) continue;
      if (!topFloor || h.point.y > topFloor.point.y) topFloor = h;
    }

    if (topFloor) {
      onGround.current = true;
      velocity.current.y = 0;
      root.position.y = topFloor.point.y;
    } else {
      onGround.current = false;
      velocity.current.y += gravity * delta;
      root.position.y += velocity.current.y * delta;
    }

    if (root.position.y < FALL_DEATH_Y) {
      // Safety net: if the player somehow falls through the geometry,
      // teleport back to the body spawn point and zero the velocity.
      root.position.copy(SPAWN_POS);
      camera.position.set(0, playerHeight, 0);
      velocity.current.set(0, 0, 0);
    }

    if (controls.update) controls.update(delta);
  };

  return { updateMovement, move, velocity, markCollidableDirty };
}
