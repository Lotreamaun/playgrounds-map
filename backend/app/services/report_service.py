"""Создание и валидация пользовательских обращений (правок и жалоб).

Заявка хранит исходное значение поля на момент отправки (снимок делает
сервер) и предлагаемое значение. При одобрении исходное сравнивается
с актуальным (см. admin_service.approve_report).
"""

from fastapi import HTTPException
from sqlmodel import Session

from app.models.admin import (
    COMPLAINT_TARGETS,
    CORRECTION_FIELDS,
    MAX_REPORT_REASON_LENGTH,
    REPORT_KIND_COMPLAINT,
    REPORT_KIND_CORRECTION,
    CourtReport,
)
from app.models.court import Court

# Допустимые значения структурированных характеристик (совпадают с фронтендом).
SURFACE_VALUES = {"asphalt", "rubber", "grass", "sand", "wood", "other"}
CONDITION_VALUES = {"excellent", "good", "fair", "poor"}
BOOL_CORRECTION_FIELDS = {"has_lighting", "is_covered"}


def _clean_reason(reason: str | None) -> str | None:
    if reason is None:
        return None
    cleaned = reason.strip()
    if cleaned == "":
        return None
    if len(cleaned) > MAX_REPORT_REASON_LENGTH:
        raise HTTPException(status_code=422, detail=f"reason must be at most {MAX_REPORT_REASON_LENGTH} characters")
    return cleaned


class ReportService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_correction(
        self,
        court: Court,
        field: str,
        proposed_value: object,
        reason: str | None,
        reporter_ip: str | None,
    ) -> CourtReport:
        if field not in CORRECTION_FIELDS:
            raise HTTPException(status_code=422, detail=f"unknown correction field: {field}")
        original = getattr(court, field)
        if field in BOOL_CORRECTION_FIELDS:
            if not isinstance(proposed_value, bool):
                raise HTTPException(status_code=422, detail=f"proposed value for {field} must be true or false")
        elif field == "surface":
            if not isinstance(proposed_value, str) or proposed_value not in SURFACE_VALUES:
                raise HTTPException(status_code=422, detail="proposed surface is not a valid surface value")
        elif field == "condition":
            if not isinstance(proposed_value, str) or proposed_value not in CONDITION_VALUES:
                raise HTTPException(status_code=422, detail="proposed condition is not a valid condition value")
        return CourtReport(
            court_id=court.id if court.id is not None else 0,
            kind=REPORT_KIND_CORRECTION,
            target=field,
            original_value={field: original},
            proposed_value={field: proposed_value},
            reason=_clean_reason(reason),
            reporter_ip=reporter_ip,
        )

    def create_complaint(
        self,
        court: Court,
        target: str,
        reason: str | None,
        reporter_ip: str | None,
    ) -> CourtReport:
        if target not in COMPLAINT_TARGETS:
            raise HTTPException(status_code=422, detail=f"unknown complaint target: {target}")
        cleaned_reason = _clean_reason(reason)
        if cleaned_reason is None:
            raise HTTPException(status_code=422, detail="complaint reason is required")
        return CourtReport(
            court_id=court.id if court.id is not None else 0,
            kind=REPORT_KIND_COMPLAINT,
            target=target,
            reason=cleaned_reason,
            reporter_ip=reporter_ip,
        )
