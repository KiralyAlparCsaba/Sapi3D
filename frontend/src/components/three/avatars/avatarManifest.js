import { useEffect, useState } from "react";

const MANIFEST_URL = "/api/avatars/manifest";

let manifestPromise = null;
let cachedVariants = null;

function fetchManifest() {
  if (manifestPromise) return manifestPromise;

  manifestPromise = fetch(MANIFEST_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Manifest fetch failed: HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      const variants = Array.isArray(data?.variants) ? data.variants : [];
      cachedVariants = variants;
      return variants;
    })
    .catch((err) => {
      console.warn(
        "[Avatars] Manifest fetch failed; falling back to placeholders:",
        err,
      );
      cachedVariants = [];
      return cachedVariants;
    });

  return manifestPromise;
}

export function useAvatarManifest() {
  const [variants, setVariants] = useState(cachedVariants);

  useEffect(() => {
    if (cachedVariants !== null) {

      setVariants(cachedVariants);
      return;
    }
    let mounted = true;
    fetchManifest().then((v) => {
      if (mounted) setVariants(v);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return variants;
}

export function getAvatarForUserId(variants, userId) {
  if (!variants || variants.length === 0) return null;
  const n = Math.abs(Number(userId)) || 0;
  return variants[n % variants.length];
}

export function clearAvatarManifestCache() {
  manifestPromise = null;
  cachedVariants = null;
}
