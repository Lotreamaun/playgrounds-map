from datetime import datetime, timezone
from typing import Any, Optional

from sqlmodel import JSON, Column, Field, SQLModel


class CourtBase(SQLModel):
    sport_type: str
    name: Optional[str] = None
    latitude: float
    longitude: float
    surface: str
    condition: str
    has_lighting: bool
    is_covered: Optional[bool] = None
    description: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    attributes: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))


class Court(CourtBase, table=True):
    __tablename__ = "courts"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Видимость: скрытая карточка не выдаётся публично (список, прямая ссылка, фото).
    is_hidden: bool = Field(default=False)
    # Снятое с публикации фото остаётся в записи (для восстановления), но не выдаётся.
    is_photo_published: bool = Field(default=True)


class CourtPublic(SQLModel):
    """Публичное представление площадки: значения API не меняются (см. tasks 2.2)."""

    sport_type: str
    name: Optional[str] = None
    latitude: float
    longitude: float
    surface: str
    condition: str
    has_lighting: bool
    is_covered: Optional[bool] = None
    description: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    attributes: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


def court_to_public(court: Court) -> CourtPublic:
    """Публичный ответ: фото скрыто, если оно снято с публикации."""
    return CourtPublic(
        sport_type=court.sport_type,
        name=court.name,
        latitude=court.latitude,
        longitude=court.longitude,
        surface=court.surface,
        condition=court.condition,
        has_lighting=court.has_lighting,
        is_covered=court.is_covered,
        description=court.description,
        address=court.address,
        photo_url=court.photo_url if court.is_photo_published else None,
        attributes=court.attributes,
        id=court.id,
        created_at=court.created_at,
        updated_at=court.updated_at,
    )
