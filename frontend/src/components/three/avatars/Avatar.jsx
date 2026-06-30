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
