from typing import List
from core.config import settings
from repositories.locations_repository import LocationObjectsRepository

class LocationsService:
	"""Service layer for location-related model object operations."""

	def __init__(self, repository: LocationObjectsRepository | None = None):
		self.repository = repository or LocationObjectsRepository()

	def get_location_objects(self) -> List[str]:
		"""Return all named objects found in the configured GLB model file."""
		return self.repository.get_location_objects(settings.model_file_path)
