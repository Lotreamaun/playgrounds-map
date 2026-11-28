import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.database import get_session
from app.models.court import Court

router = APIRouter(prefix="/photos", tags=["photos"])

settings = get_settings()

# Имена, которые создаёт save_photo: 32 hex-символа + jpg/png.
_PHOTO_NAME = re.compile(r"^[0-9a-f]{32}\.(jpg|png)$")


@router.api_route("/{filename}", methods=["GET", "HEAD"])
def get_photo(filename: str, session: Session = Depends(get_session)) -> FileResponse:
    if not _PHOTO_NAME.fullmatch(filename):
        raise HTTPException(status_code=404, detail="photo not found")
    court = session.exec(select(Court).where(Court.photo_url == f"/photos/{filename}")).first()
    # Выдача исходного файла закрыта, если фото снято с публикации или карточка скрыта.
    if court is None or court.is_hidden or not court.is_photo_published:
        raise HTTPException(status_code=404, detail="photo not found")
    photo_path = Path(get_settings().PHOTO_DIR) / filename
    if not photo_path.is_file():
        raise HTTPException(status_code=404, detail="photo not found")
    return FileResponse(photo_path, headers={"Cache-Control": "no-store"})
