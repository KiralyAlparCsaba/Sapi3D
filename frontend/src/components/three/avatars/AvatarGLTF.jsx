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
 * Bone-rotation convention:
 *   - **Default forward axis is bone-local +Y**, matching Blender's
 *     standard bone convention (a bone's local +Y is its head→tail
 *     direction). This is what every "normal" Blender export produces.
 *   - For rigs that use a different convention (e.g. local -Z forward),
 *     set `bones.forwardAxis` on the variant in manifest.json. Accepted
 *     values: "+X", "-X", "+Y", "-Y", "+Z", "-Z".
 *   - All look-at bones for a given variant share the same forward axis.
 *     Mixing conventions within one rig is not supported (and shouldn't
 *     happen if the rig is authored consistently).
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

// Walk-cycle speed scaling: the playing animation's `timeScale` is driven
// by the avatar's horizontal velocity. At rest the animation freezes; at
// `WALK_REFERENCE_SPEED` it plays at the authored speed; faster than that
// it accelerates up to `WALK_MAX_TIMESCALE`. Constants tuned for the
// current chibi (short stride) — bump REFERENCE_SPEED higher for taller
// avatars, lower for slower ones.
const WALK_REFERENCE_SPEED = 2.5; // m/s where timeScale = 1.0
const WALK_MAX_TIMESCALE = 3.0; // cap so sprinting doesn't look insane
const WALK_TIMESCALE_EMA_ALPHA = 0.15; // smoothing; lower = smoother but laggier

const DEFAULT_BONES = {
  head: "head",
  eyeL: "eye_L",
  eyeR: "eye_R",
};

// Blender bone convention: a bone's local +Y axis is the head→tail direction
// (its "forward" / looking direction). Almost every glTF export from Blender
// produces bones that match this. Other axes are supported via the
// `bones.forwardAxis` field on a manifest entry.
const FORWARD_AXIS_BY_NAME = {
  "+X": new THREE.Vector3(1, 0, 0),
  "-X": new THREE.Vector3(-1, 0, 0),
  "+Y": new THREE.Vector3(0, 1, 0),
  "-Y": new THREE.Vector3(0, -1, 0),
  "+Z": new THREE.Vector3(0, 0, 1),
  "-Z": new THREE.Vector3(0, 0, -1),
};
const DEFAULT_FORWARD_AXIS_NAME = "+Y";

// Scratch objects reused across frames to avoid per-frame allocations.
const _identityQuat = new THREE.Quaternion();
const _targetWorld = new THREE.Vector3();
const _boneWorldPos = new THREE.Vector3();
const _parentWorldQuat = new THREE.Quaternion();
const _targetLocalQuat = new THREE.Quaternion();
const _dirWorld = new THREE.Vector3();
const _dirParent = new THREE.Vector3();

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

  // Resolve the forward axis vector for this variant.
  const forwardAxisVec = useMemo(() => {
    const axisName =
      variant.bones?.forwardAxis ||
      variant.bones?.forward_axis ||
      DEFAULT_FORWARD_AXIS_NAME;
    const vec = FORWARD_AXIS_BY_NAME[axisName];
    if (!vec) {
      console.warn(
        `[Avatars] Unknown forwardAxis "${axisName}" for ${variant.id}; falling back to ${DEFAULT_FORWARD_AXIS_NAME}`,
      );
      return FORWARD_AXIS_BY_NAME[DEFAULT_FORWARD_AXIS_NAME];
    }
    return vec;
  }, [variant]);

  // Find the bones once after the scene clone is ready.
  const bonesRef = useRef({ head: null, eyeL: null, eyeR: null });

  // Walk-cycle speed scaling state. `playingActionRef` is the AnimationAction
  // currently looping; `prevPosRef` retains the avatar's last-frame horizontal
  // position; `smoothedSpeedRef` is the EMA-filtered speed used to drive
  // `action.timeScale`.
  const playingActionRef = useRef(null);
  const prevPosRef = useRef({ x: 0, z: 0, initialized: false });
  const smoothedSpeedRef = useRef(0);
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

  // Start the looping clip with a randomized phase offset, then leave the
  // mixer running with `timeScale = 0` so the avatar appears in a static
  // pose until movement starts. The useFrame below will then drive the
  // timeScale from horizontal velocity each frame.
  useEffect(() => {
    if (!actions || !names || names.length === 0) return;
    const clipName =
      names.find((n) => n.toLowerCase().includes("idle")) ||
      names.find((n) => n.toLowerCase().includes("walk")) ||
      names[0];
    const action = actions[clipName];
    if (!action) return;
    const dur = action.getClip()?.duration ?? 1;
    action.reset();
    action.time = Math.random() * dur;
    action.timeScale = 0; // useFrame will set this from velocity each frame
    action.play();
    playingActionRef.current = action;
    return () => {
      action.stop();
      playingActionRef.current = null;
    };
  }, [actions, names]);

  // Per-frame: (1) scale the walk-cycle by horizontal velocity, then
  // (2) rotate the head/eye bones toward the nearest player.
  useFrame((_, delta) => {
    // ── Walk-cycle speed scaling ──────────────────────────────────────
    // Read the interpolated position from `player.cur*` (what's actually
    // being rendered, after RemotePlayer's exponential damping). Compute
    // the horizontal speed since the previous frame, smooth it with an
    // EMA so a single jittery network update doesn't kick the timeScale,
    // and map it onto the animation's playback speed.
    const action = playingActionRef.current;
    if (action) {
      const prev = prevPosRef.current;
      if (prev.initialized && delta > 1e-6) {
        const dx = player.curX - prev.x;
        const dz = player.curZ - prev.z;
        const instantSpeed = Math.hypot(dx, dz) / delta;
        smoothedSpeedRef.current =
          smoothedSpeedRef.current * (1 - WALK_TIMESCALE_EMA_ALPHA) +
          instantSpeed * WALK_TIMESCALE_EMA_ALPHA;
      } else {
        prev.initialized = true;
      }
      prev.x = player.curX;
      prev.z = player.curZ;

      action.timeScale = Math.min(
        WALK_MAX_TIMESCALE,
        smoothedSpeedRef.current / WALK_REFERENCE_SPEED,
      );
    }

    // ── Head/eye look-at (no-op when the rig has no matching bones) ───
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

    applyLookAtToBone(bones.head, forwardAxisVec, HEAD_MAX_ANGLE, k);
    applyLookAtToBone(bones.eyeL, forwardAxisVec, EYE_MAX_ANGLE, k);
    applyLookAtToBone(bones.eyeR, forwardAxisVec, EYE_MAX_ANGLE, k);
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

/**
 * Rotate a bone so its local `forwardAxis` aims at `_targetWorld`,
 * clamped to `maxAngle` from rest and slerped at rate `k`.
 *
 * Steps:
 *   1. Get the world-space direction from the bone to the target.
 *   2. Convert that direction into the bone's parent space (since the
 *      bone's `.quaternion` is local to its parent).
 *   3. Build a quaternion that rotates `forwardAxis` to point along that
 *      parent-space direction. This is the desired local rotation.
 *   4. Clamp the rotation angle (vs identity) so bones can't crane
 *      unnaturally — e.g. a head turning more than 60° looks wrong.
 *   5. Slerp the bone's current local rotation toward the clamped target
 *      at the frame-rate-independent damping rate `k`.
 *
 * Note: this overwrites the bone's rest-pose rotation. That's intentional —
 * we want the bone to track the target regardless of where it was authored
 * to point at rest. The mesh deformation handles the rest via the bone's
 * inverse-bind matrix, so the eye/head visual follows correctly.
 */
function applyLookAtToBone(bone, forwardAxis, maxAngle, k) {
  if (!bone || !bone.parent) return;

  // 1. World-space direction from bone to target.
  bone.getWorldPosition(_boneWorldPos);
  _dirWorld.subVectors(_targetWorld, _boneWorldPos);
  if (_dirWorld.lengthSq() < 1e-8) return;
  _dirWorld.normalize();

  // 2. Convert direction into bone's parent space.
  bone.parent.getWorldQuaternion(_parentWorldQuat).invert();
  _dirParent.copy(_dirWorld).applyQuaternion(_parentWorldQuat);

  // 3. Quaternion that rotates `forwardAxis` to `_dirParent` in local space.
  _targetLocalQuat.setFromUnitVectors(forwardAxis, _dirParent);

  // 4. Clamp rotation angle vs identity.
  const w = Math.min(1, Math.abs(_targetLocalQuat.w));
  const angle = 2 * Math.acos(w);
  if (angle > maxAngle && angle > 1e-4) {
    _targetLocalQuat.slerp(_identityQuat, 1 - maxAngle / angle);
  }

  // 5. Slerp current toward target.
  bone.quaternion.slerp(_targetLocalQuat, k);
}

// Preload helper. Call this once the manifest is known to warm the GLB
// cache before any <AvatarGLTF> mounts — saves a frame on first render.
export function preloadAvatarVariant(gltfUrl) {
  useGLTF.preload(gltfUrl);
}
