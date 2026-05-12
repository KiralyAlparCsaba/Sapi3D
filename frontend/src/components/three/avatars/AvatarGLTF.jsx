/**
 * AvatarGLTF — GLB-based remote-player avatar with reactive eye/head
 * tracking.
 *
 * Pipeline:
 *   1. Load the variant's GLB once (cached by URL via `useGLTF`).
 *   2. Clone the scene per player using `SkeletonUtils.clone` so each
 *      remote player has its own skeleton instance while sharing geometry.
 *   3. Play the embedded `idle` animation (or the first available clip)
 *      with a randomized phase offset, so 50 avatars don't march in sync.
 *   4. Each frame, rotate the `head` / `eye_L` / `eye_R` bones toward the
 *      nearest other player (or the local camera, whichever is closer
 *      and within range).
 *
 * Bone-rotation math caveats:
 *   - Assumes each bone's local +Z faces along its "looking" direction at
 *     rest. This matches the convention documented in the avatars README.
 *   - If a particular GLB doesn't match (e.g. the rig uses +Y forward),
 *     the look-at will be visibly wrong. We can add a per-variant
 *     `boneForwardAxis` override later; for now, the convention is the
 *     contract.
 *   - The math may need tuning when the first real GLB arrives — without
 *     a real rig to test against, the angle clamps and slerp rate are
 *     educated guesses.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

import findNearestPlayer from "./useNearestPlayer";

const LOOK_AT_RANGE = 8.0; // meters; beyond this, bones drift back to rest
const LOOK_LERP_RATE = 8; // higher = snappier eye/head tracking
const HEAD_MAX_ANGLE = Math.PI / 3; // ~60° head turn limit
const EYE_MAX_ANGLE = Math.PI / 6; // ~30° eye turn limit

const DEFAULT_BONES = {
  head: "head",
  eyeL: "eye_L",
  eyeR: "eye_R",
};

// Scratch objects reused across frames to avoid per-frame allocations.
const _identityQuat = new THREE.Quaternion();
const _targetWorld = new THREE.Vector3();
const _boneWorldPos = new THREE.Vector3();
const _parentWorldQuat = new THREE.Quaternion();
const _targetLocalQuat = new THREE.Quaternion();
const _scratchObj = new THREE.Object3D();
_scratchObj.up.set(0, 1, 0);

export default function AvatarGLTF({ player, variant, otherPlayers }) {
  const { scene, animations } = useGLTF(variant.gltfUrl);
  const { camera } = useThree();
  const groupRef = useRef();

  // Clone the GLTF scene so each remote player has its own skeleton.
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  // drei's animations hook attached to the cloned root.
  const { actions, names } = useAnimations(animations, clonedScene);

  // Resolve bone names (per-variant override > default).
  const boneNames = useMemo(() => {
    const b = variant.bones || {};
    return {
      head: b.head || DEFAULT_BONES.head,
      eyeL: b.eyeL || b.eye_l || DEFAULT_BONES.eyeL,
      eyeR: b.eyeR || b.eye_r || DEFAULT_BONES.eyeR,
    };
  }, [variant]);

  // Find the bones once after the scene clone is ready.
  const bonesRef = useRef({ head: null, eyeL: null, eyeR: null });
  useEffect(() => {
    const found = { head: null, eyeL: null, eyeR: null };
    clonedScene.traverse((obj) => {
      if (!obj.isBone) return;
      if (obj.name === boneNames.head) found.head = obj;
      else if (obj.name === boneNames.eyeL) found.eyeL = obj;
      else if (obj.name === boneNames.eyeR) found.eyeR = obj;
    });
    bonesRef.current = found;
    if (!found.head && !found.eyeL && !found.eyeR) {
      console.warn(
        `[Avatars] No look-at bones found in ${variant.id}. Expected one of:`,
        boneNames,
      );
    }
  }, [clonedScene, boneNames, variant.id]);

  // Start the idle clip with a randomized phase offset.
  useEffect(() => {
    if (!actions || !names || names.length === 0) return;
    const idleName =
      names.find((n) => n.toLowerCase().includes("idle")) || names[0];
    const action = actions[idleName];
    if (!action) return;
    const dur = action.getClip()?.duration ?? 1;
    action.reset();
    action.time = Math.random() * dur;
    action.play();
    return () => {
      action.stop();
    };
  }, [actions, names]);

  // Per-frame: rotate the head/eye bones toward the nearest player.
  useFrame((_, delta) => {
    const bones = bonesRef.current;
    if (!bones.head && !bones.eyeL && !bones.eyeR) return;

    const k = 1 - Math.exp(-LOOK_LERP_RATE * delta);

    const nearest = findNearestPlayer({
      selfUserId: player.userId,
      selfPos: { x: player.curX, y: player.curY, z: player.curZ },
      others: otherPlayers,
      camera,
      maxDistance: LOOK_AT_RANGE,
    });

    if (!nearest) {
      // Drift bones back toward identity (resting pose).
      if (bones.head) bones.head.quaternion.slerp(_identityQuat, k);
      if (bones.eyeL) bones.eyeL.quaternion.slerp(_identityQuat, k);
      if (bones.eyeR) bones.eyeR.quaternion.slerp(_identityQuat, k);
      return;
    }

    // Ensure world matrices are current before reading bone world positions.
    if (groupRef.current) groupRef.current.updateMatrixWorld(true);

    _targetWorld.set(nearest.x, nearest.y, nearest.z);

    applyLookAtToBone(bones.head, HEAD_MAX_ANGLE, k);
    applyLookAtToBone(bones.eyeL, EYE_MAX_ANGLE, k);
    applyLookAtToBone(bones.eyeR, EYE_MAX_ANGLE, k);
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

/**
 * Rotate a bone so its local +Z axis aims at `_targetWorld`, clamped to
 * `maxAngle` from rest and slerped at rate `k`.
 *
 * Uses Object3D.lookAt under the hood (via a scratch object positioned at
 * the bone's world location), then converts the resulting world rotation
 * to the bone's local space via the parent's inverse world quaternion.
 */
function applyLookAtToBone(bone, maxAngle, k) {
  if (!bone || !bone.parent) return;

  bone.getWorldPosition(_boneWorldPos);
  _scratchObj.position.copy(_boneWorldPos);
  _scratchObj.lookAt(_targetWorld);
  _scratchObj.updateMatrix();

  bone.parent.getWorldQuaternion(_parentWorldQuat).invert();
  _targetLocalQuat.copy(_parentWorldQuat).multiply(_scratchObj.quaternion);

  // Clamp the rotation angle vs identity so the bone doesn't crane unnaturally.
  const w = Math.min(1, Math.abs(_targetLocalQuat.w));
  const angle = 2 * Math.acos(w);
  if (angle > maxAngle && angle > 1e-4) {
    _targetLocalQuat.slerp(_identityQuat, 1 - maxAngle / angle);
  }

  bone.quaternion.slerp(_targetLocalQuat, k);
}

// Preload helper. Call this once the manifest is known to warm the GLB
// cache before any <AvatarGLTF> mounts — saves a frame on first render.
export function preloadAvatarVariant(gltfUrl) {
  useGLTF.preload(gltfUrl);
}
