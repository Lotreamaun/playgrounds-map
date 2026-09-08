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
    description: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    attributes: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))


class Court(CourtBase, table=True):
    __tablename__ = "courts"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
