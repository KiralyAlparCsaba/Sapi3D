/**
 * Avatar — top-level avatar component used by <RemotePlayer>.
 *
 * Picks between the GLB-based renderer and the capsule fallback based on
 * the loaded manifest and a deterministic user_id → variant mapping.
 *
 * Behavior matrix:
 *   manifest still loading  → AvatarFallback (so the player is visible
 *                              immediately rather than popping in late)
 *   manifest empty []       → AvatarFallback (current state until GLBs
 *                              are added)
 *   variant resolved        → AvatarGLTF with eye/head tracking
 *
 * <Suspense> wraps the GLTF path so that one slow GLB load doesn't block
 * the whole scene — other players keep rendering, this one shows the
 * fallback until its GLB is ready.
 */

import { Suspense } from "react";

import {
  useAvatarManifest,
  getAvatarForUserId,
} from "./avatarManifest";
import AvatarFallback from "./AvatarFallback";
import AvatarGLTF from "./AvatarGLTF";

export default function Avatar({ player, otherPlayers }) {
  const variants = useAvatarManifest();
  const variant = getAvatarForUserId(variants, player.userId);

  if (!variant) {
    return <AvatarFallback userId={player.userId} />;
  }

  return (
    <Suspense fallback={<AvatarFallback userId={player.userId} />}>
      <AvatarGLTF
        player={player}
        variant={variant}
        otherPlayers={otherPlayers}
      />
    </Suspense>
  );
}
