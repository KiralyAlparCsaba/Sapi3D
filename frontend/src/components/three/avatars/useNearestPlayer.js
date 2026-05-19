/**
 * findNearestPlayer — returns the world-space position of the entity
 * closest to `selfPos`, considering all other remote players plus the
 * local camera (i.e. the local viewer counts as a "player" for the
 * purpose of "look at the nearest person").
 *
 * Returns `null` if nothing is within `maxDistance`.
 *
 * Not a React hook despite the file name — it's called every frame from
 * inside `useFrame` and must not allocate React state. The file is
 * prefixed with `use` for filename consistency with the rest of the
 * three/ directory; the export is a plain function.
 *
 * Cost: O(N) per avatar per frame. For 50 avatars × 50 candidates × 60 fps
 * that's 150 000 distance checks per second, which is negligible.
 */

const DEFAULT_HEAD_HEIGHT = 1.5; // meters above the player root

export default function findNearestPlayer({
  selfUserId,
  selfPos,
  others,
  camera,
  maxDistance,
}) {
  let bestDist = maxDistance;
  let bestX = 0;
  let bestY = 0;
  let bestZ = 0;
  let found = false;

  // Other remote players (Map<userId, player>).
  if (others) {
    for (const [uid, p] of others) {
      if (uid === selfUserId) continue;
      const dx = p.curX - selfPos.x;
      const dy = p.curY - selfPos.y;
      const dz = p.curZ - selfPos.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist < bestDist) {
        bestDist = dist;
        bestX = p.curX;
        bestY = p.curY + DEFAULT_HEAD_HEIGHT;
        bestZ = p.curZ;
        found = true;
      }
    }
  }

  // Local camera (the viewer).
  if (camera) {
    const dx = camera.position.x - selfPos.x;
    const dy = camera.position.y - selfPos.y;
    const dz = camera.position.z - selfPos.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < bestDist) {
      bestDist = dist;
      bestX = camera.position.x;
      bestY = camera.position.y;
      bestZ = camera.position.z;
      found = true;
    }
  }

  // Returns a fresh small object each call. ~50 allocations/frame at most,
  // collected by V8's nursery. If this ever becomes a hotspot, refactor
  // to take an `out` Vector3 and mutate it in place.
  return found ? { x: bestX, y: bestY, z: bestZ } : null;
}
