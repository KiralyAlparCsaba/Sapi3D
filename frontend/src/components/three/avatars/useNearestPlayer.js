const DEFAULT_HEAD_HEIGHT = 1.5;

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

  return found ? { x: bestX, y: bestY, z: bestZ } : null;
}
