import json
import os
import struct
from typing import List

from models.location import Location
from repositories.base import BaseRepository
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

class LocationObjectsRepository:
    """Repository for reading location object names from the GLB model file."""

    GLB_MAGIC = b"glTF"
    JSON_CHUNK_TYPE = 0x4E4F534A  # b"JSON" in little-endian uint32

    def get_location_objects(self, model_file_path: str) -> List[str]:
        if not os.path.exists(model_file_path):
            raise FileNotFoundError(f"Model file not found: {model_file_path}")

        with open(model_file_path, "rb") as glb_file:
            data = glb_file.read()

        if len(data) < 20:
            raise ValueError("Invalid GLB file: header is too short")

        magic, _, _ = struct.unpack_from("<4sII", data, 0)
        if magic != self.GLB_MAGIC:
            raise ValueError("Invalid GLB file: unexpected magic header")

        json_chunk = self._extract_json_chunk(data)
        gltf = json.loads(json_chunk.decode("utf-8").rstrip("\x00\r\n\t "))
        nodes = gltf.get("nodes", [])
        names = set()

        for node in nodes:
            if not isinstance(node, dict):
                continue

            name = node.get("name")
            if not name:
                continue

            name = str(name).strip()

            if name.startswith("Marker"):
                names.add(name)

        return sorted(names)

    def _extract_json_chunk(self, data: bytes) -> bytes:
        offset = 12
        while offset + 8 <= len(data):
            chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
            offset += 8

            if offset + chunk_length > len(data):
                raise ValueError("Invalid GLB file: chunk length out of bounds")

            chunk_data = data[offset : offset + chunk_length]
            offset += chunk_length

            if chunk_type == self.JSON_CHUNK_TYPE:
                return chunk_data

        raise ValueError("Invalid GLB file: JSON chunk not found")

class LocationsRepository(BaseRepository[Location]):
    """Repository for Location model with custom queries."""

    def __init__(self, db: AsyncSession):
        super().__init__(Location, db)

    async def get_by_name(self, name: str) -> Location | None:
        """Get a location by its name."""
        result = await self.db.execute(
            select(self.model).where(self.model.name == name)
        )
        return result.scalars().first()

    async def get_by_object_name(self, object_name: str) -> Location | None:
        """Get a location by its associated object name."""
        result = await self.db.execute(
            select(self.model).where(self.model.button_location == object_name)
        )
        return result.scalars().first()

