import math
import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlmodel import Session, select

from app.models.court import Court

MAX_COURT_DUPLICATE_DISTANCE_METERS = 30.0
MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png"}
PHOTO_CONTENT_TYPES = {"image/jpeg", "image/png"}

DEFAULT_PHOTO_DIR = "data/photos"


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_m = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return earth_radius_m * 2 * math.asin(math.sqrt(a))


class CourtService:
    def __init__(self, session: Session, photo_dir: str | os.PathLike[str] | None = None) -> None:
        self.session = session
        self.photo_dir = Path(photo_dir) if photo_dir is not None else Path(DEFAULT_PHOTO_DIR)

    def validate_coordinates(self, latitude: float, longitude: float) -> None:
        if latitude is None or longitude is None:
            raise HTTPException(status_code=422, detail="latitude and longitude are required")
        if not (-90.0 <= latitude <= 90.0):
            raise HTTPException(status_code=422, detail="latitude must be between -90 and 90")
        if not (-180.0 <= longitude <= 180.0):
            raise HTTPException(status_code=422, detail="longitude must be between -180 and 180")

    def validate_required_fields(self, court_data: dict) -> None:
        missing = [
            field
            for field in ("sport_type", "surface", "condition")
            if not court_data.get(field)
        ]
        has_lighting_missing = court_data.get("has_lighting") is None
        if missing or has_lighting_missing:
            fields = list(missing)
            if has_lighting_missing:
                fields.append("has_lighting")
            raise HTTPException(
                status_code=422,
                detail=f"missing required fields: {', '.join(fields)}",
            )

    def _find_duplicate(self, sport_type: str, latitude: float, longitude: float) -> Court | None:
        courts = self.session.exec(
            select(Court).where(Court.sport_type == sport_type)
        ).all()
        for court in courts:
            distance = haversine_meters(
                latitude,
                longitude,
                court.latitude,
                court.longitude,
            )
            if distance <= MAX_COURT_DUPLICATE_DISTANCE_METERS:
                return court
        return None

    def ensure_no_duplicate(self, sport_type: str, latitude: float, longitude: float) -> None:
        duplicate = self._find_duplicate(sport_type, latitude, longitude)
        if duplicate is not None:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"duplicate court: a '{sport_type}' court already exists "
                    f"within {MAX_COURT_DUPLICATE_DISTANCE_METERS} m"
                ),
            )

    def _validate_photo(self, photo: UploadFile) -> None:
        extension = Path(photo.filename or "").suffix.lower()
        if extension not in ALLOWED_PHOTO_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="photo must be a jpg or png file",
            )
        if photo.content_type not in PHOTO_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail="photo must be a jpg or png file",
            )
        photo.file.seek(0, os.SEEK_END)
        size = photo.file.tell()
        photo.file.seek(0)
        if size > MAX_PHOTO_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail="photo must be no larger than 5 MB",
            )

    def _save_photo(self, photo: UploadFile) -> str:
        self.photo_dir.mkdir(parents=True, exist_ok=True)
        extension = Path(photo.filename or "").suffix.lower()
        if extension == ".jpeg":
            extension = ".jpg"
        filename = f"{uuid.uuid4().hex}{extension}"
        destination = self.photo_dir / filename
        content = photo.file.read()
        destination.write_bytes(content)
        return f"/photos/{filename}"

    def save_photo(self, photo: UploadFile) -> str | None:
        if photo is None:
            return None
        self._validate_photo(photo)
        return self._save_photo(photo)
