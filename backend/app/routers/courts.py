import secrets
from typing import Optional

from fastapi import APIRouter, Depends, Form, Header, HTTPException, UploadFile
from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.database import get_session
from app.models.court import Court
from app.services.court_service import CourtService

router = APIRouter(prefix="/courts", tags=["courts"])

settings = get_settings()


def get_court_service(session: Session = Depends(get_session)) -> CourtService:
    return CourtService(session)


def _admin_token_authorized(admin_token: Optional[str] = Header(default=None)) -> None:
    if not admin_token or not secrets.compare_digest(admin_token, settings.ADMIN_TOKEN):
        raise HTTPException(status_code=403, detail="invalid or missing ADMIN_TOKEN")


@router.get("")
def list_courts(
    min_lat: Optional[float] = None,
    min_lon: Optional[float] = None,
    max_lat: Optional[float] = None,
    max_lon: Optional[float] = None,
    session: Session = Depends(get_session),
) -> list[Court]:
    statement = select(Court)
    if min_lat is not None:
        statement = statement.where(Court.latitude >= min_lat)
    if max_lat is not None:
        statement = statement.where(Court.latitude <= max_lat)
    if min_lon is not None:
        statement = statement.where(Court.longitude >= min_lon)
    if max_lon is not None:
        statement = statement.where(Court.longitude <= max_lon)
    return session.exec(statement).all()


@router.post("", status_code=201)
def create_court(
    sport_type: str = Form(...),
    name: Optional[str] = Form(default=None),
    latitude: float = Form(...),
    longitude: float = Form(...),
    surface: str = Form(...),
    condition: str = Form(...),
    has_lighting: bool = Form(...),
    description: Optional[str] = Form(default=None),
    address: Optional[str] = Form(default=None),
    photo: Optional[UploadFile] = None,
    session: Session = Depends(get_session),
) -> Court:
    service = get_court_service(session)
    service.validate_coordinates(latitude, longitude)
    service.validate_required_fields(
        {
            "sport_type": sport_type,
            "surface": surface,
            "condition": condition,
            "has_lighting": has_lighting,
        }
    )
    service.ensure_no_duplicate(sport_type, latitude, longitude)
    photo_url = service.save_photo(photo) if photo is not None else None

    court = Court(
        sport_type=sport_type,
        name=name,
        latitude=latitude,
        longitude=longitude,
        surface=surface,
        condition=condition,
        has_lighting=has_lighting,
        description=description,
        address=address,
        photo_url=photo_url,
    )
    session.add(court)
    session.commit()
    session.refresh(court)
    return court


@router.get("/{court_id}")
def get_court(
    court_id: int,
    session: Session = Depends(get_session),
) -> Court:
    court = session.get(Court, court_id)
    if court is None:
        raise HTTPException(status_code=404, detail="court not found")
    return court


@router.delete("/{court_id}", status_code=204)
def delete_court(
    court_id: int,
    session: Session = Depends(get_session),
    admin_token: Optional[str] = Header(default=None),
) -> None:
    _admin_token_authorized(admin_token)
    court = session.get(Court, court_id)
    if court is None:
        raise HTTPException(status_code=404, detail="court not found")
    session.delete(court)
    session.commit()
    return None
