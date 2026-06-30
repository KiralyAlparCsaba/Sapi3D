/**
 * Avatar manifest loader.
 *
 * Fetches the list of available avatar variants from the backend on first
 * use and caches the result. Subsequent consumers share the same promise,
 * so 50 mounted <Avatar> components only ever cause one network request.
 *
 * Provides a deterministic mapping from `user_id` to a variant. Until the
 * backend's manifest.json contains at least one entry, every call to
 * `getAvatarForUserId(...)` returns `null`, which signals <Avatar> to
 * render the fallback (capsule) placeholder. This makes the whole avatar
 * pipeline safe to ship before any real GLBs exist.
 */

import { useEffect, useState } from "react";

const MANIFEST_URL = "/api/avatars/manifest";

let manifestPromise = null;
let cachedVariants = null; // null while loading, [] when empty/failed, [...] when loaded

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

/**
 * React hook: returns the loaded manifest variants array, or `null` while
 * still loading. Components should render the fallback while null.
 */
export function useAvatarManifest() {
  const [variants, setVariants] = useState(cachedVariants);

  useEffect(() => {
    if (cachedVariants !== null) {
      // Already loaded (or failed) — sync once and we're done.
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

/**
 * Deterministically map a user_id to a variant from the loaded manifest.
 *
 * @param {Array} variants - The manifest variants (from useAvatarManifest).
 * @param {number|string} userId
 * @returns The variant object, or `null` if the manifest is empty / not loaded.
 */
export function getAvatarForUserId(variants, userId) {
  if (!variants || variants.length === 0) return null;
  const n = Math.abs(Number(userId)) || 0;
  return variants[n % variants.length];
}

/**
 * Dev helper: clear the cache so the next `useAvatarManifest` triggers a
 * fresh fetch. Not used in production code paths.
 */
export function clearAvatarManifestCache() {
  manifestPromise = null;
  cachedVariants = null;
}
