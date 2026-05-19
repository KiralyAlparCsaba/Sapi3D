"""
Avatar manifest router.

Serves the list of available 3D avatar variants for multiplayer rendering.
The manifest is a JSON file at `<avatars_3d_directory>/manifest.json` and
is loaded once on first request, then cached in memory.

To add or remove a variant: edit `manifest.json`, drop the GLB into the
same directory, and restart the backend (or call `reload_manifest()` from
a future admin endpoint). The GLB binaries themselves are served by the
StaticFiles mount at `/static/avatars-3d/<filename>` registered in main.py.

This module deliberately does NOT touch the database. Per-user avatar
selection (which is currently deterministic-by-user-id on the client) is
a separate concern; if it ever gets persisted, that goes on the existing
`users` table, not in a new avatar table.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Optional

from fastapi import APIRouter

from core.config import settings
from schemas.avatar import AvatarManifest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/avatars")


# Module-level cache. Populated on first call to get_manifest().
_manifest_cache: Optional[AvatarManifest] = None


def _load_manifest_from_disk() -> AvatarManifest:
    """Read manifest.json, validate via Pydantic, return parsed manifest.

    Returns an empty manifest on any error (missing file, invalid JSON,
    schema mismatch). The endpoint is intentionally tolerant — a broken
    manifest must not break the rest of the app, since multiplayer falls
    back to the placeholder avatar when no variants are available.
    """
    manifest_path = os.path.join(settings.avatars_3d_directory, "manifest.json")

    if not os.path.exists(manifest_path):
        logger.warning(
            f"[Avatars] manifest.json not found at {manifest_path}, returning empty manifest"
        )
        return AvatarManifest(variants=[])

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Accept either `{"variants": [...]}` or a bare array `[...]`.
        if isinstance(data, list):
            data = {"variants": data}
        manifest = AvatarManifest.model_validate(data)
        logger.info(
            f"[Avatars] Loaded manifest: {len(manifest.variants)} variant(s)"
        )
        return manifest
    except Exception as e:
        logger.error(f"[Avatars] Failed to parse manifest.json: {e}")
        return AvatarManifest(variants=[])


def get_manifest() -> AvatarManifest:
    """Return the cached manifest, loading on first access."""
    global _manifest_cache
    if _manifest_cache is None:
        _manifest_cache = _load_manifest_from_disk()
    return _manifest_cache


def reload_manifest() -> AvatarManifest:
    """Force re-read from disk. Useful in dev and for future admin tooling."""
    global _manifest_cache
    _manifest_cache = _load_manifest_from_disk()
    return _manifest_cache


@router.get("/manifest", response_model=AvatarManifest)
async def get_avatar_manifest():
    """
    Return the list of available avatar variants.

    Until at least one GLB has been added and registered in manifest.json,
    this returns an empty list and every remote player will render as the
    capsule placeholder on the frontend.
    """
    return get_manifest()
