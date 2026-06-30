import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

import findNearestPlayer from "./useNearestPlayer";

const LOOK_AT_RANGE = 8.0;
const LOOK_LERP_RATE = 8;
const HEAD_MAX_ANGLE = Math.PI / 3;
const EYE_MAX_ANGLE = Math.PI / 6;

const WALK_REFERENCE_SPEED = 2.5;
const WALK_MAX_TIMESCALE = 3.0;
const WALK_TIMESCALE_EMA_ALPHA = 0.15;

const DEFAULT_BONES = {
  head: "head",
  eyeL: "eye_L",
  eyeR: "eye_R",
};

const FORWARD_AXIS_BY_NAME = {
  "+X": new THREE.Vector3(1, 0, 0),
  "-X": new THREE.Vector3(-1, 0, 0),
  "+Y": new THREE.Vector3(0, 1, 0),
  "-Y": new THREE.Vector3(0, -1, 0),
  "+Z": new THREE.Vector3(0, 0, 1),
  "-Z": new THREE.Vector3(0, 0, -1),
};
const DEFAULT_FORWARD_AXIS_NAME = "+Y";

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

  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  const { actions, names } = useAnimations(animations, clonedScene);

  const boneNames = useMemo(() => {
    const b = variant.bones || {};
    return {
      head: b.head || DEFAULT_BONES.head,
      eyeL: b.eyeL || b.eye_l || DEFAULT_BONES.eyeL,
      eyeR: b.eyeR || b.eye_r || DEFAULT_BONES.eyeR,
    };
  }, [variant]);

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

  const bonesRef = useRef({ head: null, eyeL: null, eyeR: null });

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
    action.timeScale = 0;
    action.play();
    playingActionRef.current = action;
    return () => {
      action.stop();
      playingActionRef.current = null;
    };
  }, [actions, names]);

  useFrame((_, delta) => {

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

      if (bones.head) bones.head.quaternion.slerp(_identityQuat, k);
      if (bones.eyeL) bones.eyeL.quaternion.slerp(_identityQuat, k);
      if (bones.eyeR) bones.eyeR.quaternion.slerp(_identityQuat, k);
      return;
    }

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

function applyLookAtToBone(bone, forwardAxis, maxAngle, k) {
  if (!bone || !bone.parent) return;

  bone.getWorldPosition(_boneWorldPos);
  _dirWorld.subVectors(_targetWorld, _boneWorldPos);
  if (_dirWorld.lengthSq() < 1e-8) return;
  _dirWorld.normalize();

  bone.parent.getWorldQuaternion(_parentWorldQuat).invert();
  _dirParent.copy(_dirWorld).applyQuaternion(_parentWorldQuat);

  _targetLocalQuat.setFromUnitVectors(forwardAxis, _dirParent);

  const w = Math.min(1, Math.abs(_targetLocalQuat.w));
  const angle = 2 * Math.acos(w);
  if (angle > maxAngle && angle > 1e-4) {
    _targetLocalQuat.slerp(_identityQuat, 1 - maxAngle / angle);
  }

  bone.quaternion.slerp(_targetLocalQuat, k);
}

export function preloadAvatarVariant(gltfUrl) {
  useGLTF.preload(gltfUrl);
}
