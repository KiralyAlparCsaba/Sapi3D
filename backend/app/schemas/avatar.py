"""Pydantic schemas for the avatar manifest endpoint.

Schemas only — no database models. Avatar variants are configured via
`static/avatars-3d/manifest.json` and served by `avatars_router.py`.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class AvatarBones(BaseModel):
    """Optional bone-name overrides for non-conventional rigs.

    If a GLB follows the conventions documented in
    `static/avatars-3d/README.md` (head bone named `head`, eyes named
    `eye_L` / `eye_R`), this block can be omitted entirely.
    """

    model_config = ConfigDict(populate_by_name=True)

    head: Optional[str] = None
    eye_l: Optional[str] = Field(default=None, alias="eyeL")
    eye_r: Optional[str] = Field(default=None, alias="eyeR")


class AvatarVariant(BaseModel):
    """One entry in the avatar manifest."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Stable identifier (e.g. 'student_male'). Used for user→variant mapping and must not change across deployments.")
    name: str = Field(..., description="Human-readable display name (for any future avatar picker UI).")
    gltf_url: str = Field(..., alias="gltfUrl", description="Absolute URL to the GLB file. Conventionally /api/static/avatars-3d/<file>.glb")
    thumbnail: Optional[str] = Field(default=None, description="Absolute URL to a preview image (PNG/JPG). Used by the avatar picker.")
    bones: Optional[AvatarBones] = Field(default=None, description="Bone-name overrides; omit to use the defaults from the README.")


class AvatarManifest(BaseModel):
    """Response model for GET /avatars/manifest."""

    variants: List[AvatarVariant] = Field(default_factory=list)
