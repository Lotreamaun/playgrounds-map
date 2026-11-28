"""Публичная приёмка обращений: предложение правки или жалоба.

Серверная валидация, ограничение частоты по IP, подтверждение приёма.
Задание доставки сохраняется в одной транзакции с обращением.
"""

from typing import Literal, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session

from app.core.config import get_settings
from app.core.database import get_session
from app.core.rate_limit import SlidingWindowLimiter, client_ip
from app.models.admin import DeliveryJob, CourtReport
from app.models.court import Court
from app.services.report_service import ReportService

router = APIRouter(tags=["reports"])

settings = get_settings()

report_limiter = SlidingWindowLimiter(
    max_events=settings.REPORT_MAX_PER_WINDOW,
    window_seconds=settings.REPORT_WINDOW_SECONDS,
)


class ReportCreate(BaseModel):
    kind: Literal["correction", "complaint"]
    # Для правки — имя поля (has_lighting/surface/condition/is_covered),
    # для жалобы — объект (card/description/photo).
    target: str
    proposed_value: Optional[Union[bool, str]] = None
    reason: Optional[str] = None


class ReportAccepted(BaseModel):
    id: int
    status: str
    message: str



@router.post("/courts/{court_id}/reports", status_code=201, response_model=ReportAccepted)
def create_court_report(
    court_id: int,
    payload: ReportCreate,
    request: Request,
    session: Session = Depends(get_session),
) -> ReportAccepted:
    court = session.get(Court, court_id)
    # Скрытая площадка для публичного API не существует.
    if court is None or court.is_hidden:
        raise HTTPException(status_code=404, detail="court not found")

    ip = client_ip(request, trust_proxy=settings.TRUST_PROXY_HEADERS)
    if not report_limiter.allow(ip):
        raise HTTPException(
            status_code=429,
            detail="too many reports from this address, try again later",
            headers={"Retry-After": str(report_limiter.retry_after(ip))},
        )

    service = ReportService(session)
    if payload.kind == "correction":
        report = service.create_correction(court, payload.target, payload.proposed_value, payload.reason, ip)
    else:
        report = service.create_complaint(court, payload.target, payload.reason, ip)

    session.add(report)
    session.flush()
    session.add(DeliveryJob(kind="report_created", court_id=court.id, report_id=report.id))
    session.commit()
    session.refresh(report)

    if payload.kind == "correction":
        message = "Спасибо! Предложение отправлено администратору."
    else:
        message = "Спасибо! Жалоба отправлена администратору."
    return ReportAccepted(id=report.id if report.id is not None else 0, status=report.status, message=message)
