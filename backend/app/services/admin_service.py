"""Операции администратора: правка, скрытие/восстановление, снятие
описания и фото с публикации, разбор обращений и журнал действий.

Каждая операция меняет площадку, статус обращения и запись журнала
в одной транзакции — один commit в конце метода.
"""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlmodel import Session, or_, select

from app.models.admin import (
    REPORT_KIND_CORRECTION,
    REPORT_STATUS_APPROVED,
    REPORT_STATUS_NEW,
    REPORT_STATUS_REJECTED,
    REPORT_STATUS_RESOLVED,
    AdminAction,
    CourtReport,
)
from app.models.court import Court
from app.services.court_service import CourtService
from app.services.report_service import CONDITION_VALUES, SURFACE_VALUES

MAX_NAME_LENGTH = 200
MAX_DESCRIPTION_LENGTH = 2000
MAX_ADDRESS_LENGTH = 300
MAX_NOTE_LENGTH = 500

# Поля, доступные админской правке (sport_type фиксируется при создании).
EDITABLE_FIELDS = (
    "name",
    "latitude",
    "longitude",
    "surface",
    "condition",
    "has_lighting",
    "is_covered",
    "description",
    "address",
)


def _clean_optional(value: str | None, field: str, max_length: int) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if cleaned == "":
        return None
    if len(cleaned) > max_length:
        raise HTTPException(status_code=422, detail=f"{field} must be at most {max_length} characters")
    return cleaned


def _clean_note(note: str | None) -> str | None:
    if note is None:
        return None
    cleaned = note.strip()
    if cleaned == "":
        return None
    if len(cleaned) > MAX_NOTE_LENGTH:
        raise HTTPException(status_code=422, detail=f"note must be at most {MAX_NOTE_LENGTH} characters")
    return cleaned


class AdminService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.court_service = CourtService(session)

    # ------------------------------------------------------------------ courts

    def get_court_or_404(self, court_id: int) -> Court:
        court = self.session.get(Court, court_id)
        if court is None:
            raise HTTPException(status_code=404, detail="court not found")
        return court

    def list_courts(self, query: str | None = None) -> list[Court]:
        """Закрытая выдача: опубликованные и скрытые площадки, включая созданные до обновления."""
        statement = select(Court).order_by(Court.id.desc())  # type: ignore[attr-defined]
        if query:
            needle = f"%{query.strip()}%"
            statement = statement.where(
                or_(
                    Court.name.ilike(needle),  # type: ignore[union-attr]
                    Court.address.ilike(needle),  # type: ignore[union-attr]
                    Court.description.ilike(needle),  # type: ignore[union-attr]
                )
            )
        return list(self.session.exec(statement).all())

    def update_court(self, court: Court, changes: dict, admin: str, reason: str | None) -> Court:
        """Правка полей и координат с серверной проверкой; журнал хранит прежние и новые значения."""
        unknown = set(changes) - set(EDITABLE_FIELDS)
        if unknown:
            raise HTTPException(status_code=422, detail=f"unknown fields: {', '.join(sorted(unknown))}")
        if not changes:
            raise HTTPException(status_code=422, detail="no fields to update")

        before = {}
        after = {}
        for field, value in changes.items():
            if field == "latitude" or field == "longitude":
                if not isinstance(value, (int, float)) or isinstance(value, bool):
                    raise HTTPException(status_code=422, detail=f"{field} must be a number")
            elif field == "surface":
                if value not in SURFACE_VALUES:
                    raise HTTPException(status_code=422, detail="surface is not a valid surface value")
            elif field == "condition":
                if value not in CONDITION_VALUES:
                    raise HTTPException(status_code=422, detail="condition is not a valid condition value")
            elif field in ("has_lighting", "is_covered"):
                if not isinstance(value, bool):
                    raise HTTPException(status_code=422, detail=f"{field} must be true or false")
            elif field == "name":
                value = _clean_optional(value, "name", MAX_NAME_LENGTH)
            elif field == "description":
                value = _clean_optional(value, "description", MAX_DESCRIPTION_LENGTH)
            elif field == "address":
                value = _clean_optional(value, "address", MAX_ADDRESS_LENGTH)
            if field in {"name", "address", "description"}:
                before[field] = getattr(court, field) is not None
                after[field] = value is not None
            else:
                before[field] = getattr(court, field)
                after[field] = value
            setattr(court, field, value)

        self.court_service.validate_coordinates(court.latitude, court.longitude)
        court.updated_at = datetime.now(timezone.utc)
        self._record(
            court=court,
            admin=admin,
            action="edit",
            reason=reason,
            result="done",
            details={"before": before, "after": after},
        )
        self.session.commit()
        self.session.refresh(court)
        return court

    def set_hidden(self, court: Court, hidden: bool, admin: str, reason: str | None) -> Court:
        action = "hide" if hidden else "restore"
        court.is_hidden = hidden
        court.updated_at = datetime.now(timezone.utc)
        self._record(
            court=court,
            admin=admin,
            action=action,
            reason=reason,
            result="done",
            details={"hidden": hidden},
        )
        self.session.commit()
        self.session.refresh(court)
        return court

    def unpublish_description(self, court: Court, admin: str, reason: str | None) -> Court:
        """Убирает описание; карточка остаётся доступной."""
        if court.description is None:
            raise HTTPException(status_code=409, detail="court has no published description")
        court.description = None
        court.updated_at = datetime.now(timezone.utc)
        self._record(
            court=court,
            admin=admin,
            action="unpublish_description",
            reason=reason,
            result="done",
            details={},
        )
        self.session.commit()
        self.session.refresh(court)
        return court

    def unpublish_photo(self, court: Court, admin: str, reason: str | None) -> Court:
        """Закрывает выдачу исходного файла фото, не только ссылки в карточке."""
        if court.photo_url is None or not court.is_photo_published:
            raise HTTPException(status_code=409, detail="court has no published photo")
        if court.is_photo_published:
            court.is_photo_published = False
            court.updated_at = datetime.now(timezone.utc)
        self._record(
            court=court,
            admin=admin,
            action="unpublish_photo",
            reason=reason,
            result="done",
            details={},
        )
        self.session.commit()
        self.session.refresh(court)
        return court

    # ----------------------------------------------------------------- reports

    def list_reports(self, status: str | None = None) -> list[CourtReport]:
        statement = select(CourtReport).order_by(CourtReport.id.desc())  # type: ignore[attr-defined]
        if status:
            statement = statement.where(CourtReport.status == status)
        return list(self.session.exec(statement).all())

    def get_report_or_404(self, report_id: int) -> CourtReport:
        report = self.session.get(CourtReport, report_id)
        if report is None:
            raise HTTPException(status_code=404, detail="report not found")
        return report

    def approve_report(self, report: CourtReport, admin: str, note: str | None) -> CourtReport:
        """Одобрение правки: сравнение исходного значения с актуальным, изменение
        площадки, статуса заявки и журнала — в одной транзакции (один commit)."""
        if report.kind != REPORT_KIND_CORRECTION:
            raise HTTPException(status_code=409, detail="only corrections can be approved")
        if report.status != REPORT_STATUS_NEW:
            raise HTTPException(status_code=409, detail=f"report is already {report.status}")
        court = self.get_court_or_404(report.court_id)
        field = report.target
        expected = (report.original_value or {}).get(field)
        current = getattr(court, field)
        if current != expected:
            # Устаревшее предложение не перезаписывает данные: фиксируем причину в журнале.
            self._record(
                court=court,
                report=report,
                admin=admin,
                action="approve",
                reason=note,
                result="stale",
                details={"field": field, "expected_original": expected, "actual": current},
            )
            self.session.commit()
            raise HTTPException(
                status_code=409,
                detail=(
                    f"proposal is stale: current {field} value has changed since submission "
                    f"(current: {current!r}, expected: {expected!r})"
                ),
            )
        proposed = (report.proposed_value or {}).get(field)
        before = getattr(court, field)
        setattr(court, field, proposed)
        court.updated_at = datetime.now(timezone.utc)
        report.status = REPORT_STATUS_APPROVED
        report.resolved_at = datetime.now(timezone.utc)
        report.resolution_note = _clean_note(note)
        self._record(
            court=court,
            report=report,
            admin=admin,
            action="approve",
            reason=note,
            result="done",
            details={"field": field, "before": before, "after": proposed},
        )
        self.session.commit()
        self.session.refresh(report)
        return report

    def reject_report(self, report: CourtReport, admin: str, note: str | None) -> CourtReport:
        if report.status != REPORT_STATUS_NEW:
            raise HTTPException(status_code=409, detail=f"report is already {report.status}")
        report.status = REPORT_STATUS_REJECTED
        report.resolved_at = datetime.now(timezone.utc)
        report.resolution_note = _clean_note(note)
        self._record(
            report=report,
            court_id=report.court_id,
            admin=admin,
            action="reject",
            reason=note,
            result="done",
            details={},
        )
        self.session.commit()
        self.session.refresh(report)
        return report

    def resolve_report(self, report: CourtReport, admin: str, note: str | None) -> CourtReport:
        """Закрытие обращения (например, жалобы после уборки рекламы)."""
        if report.status != REPORT_STATUS_NEW:
            raise HTTPException(status_code=409, detail=f"report is already {report.status}")
        report.status = REPORT_STATUS_RESOLVED
        report.resolved_at = datetime.now(timezone.utc)
        report.resolution_note = _clean_note(note)
        self._record(
            report=report,
            court_id=report.court_id,
            admin=admin,
            action="resolve",
            reason=note,
            result="done",
            details={"kind": report.kind, "target": report.target},
        )
        self.session.commit()
        self.session.refresh(report)
        return report

    # ----------------------------------------------------------------- history

    def history_for_court(self, court_id: int) -> list[AdminAction]:
        """История по площадке и её обращениям (связанные действия включаются)."""
        report_ids = [
            report.id
            for report in self.session.exec(select(CourtReport).where(CourtReport.court_id == court_id)).all()
            if report.id is not None
        ]
        statement = select(AdminAction).order_by(AdminAction.id.desc())  # type: ignore[attr-defined]
        if report_ids:
            statement = statement.where(
                or_(AdminAction.court_id == court_id, AdminAction.report_id.in_(report_ids))  # type: ignore[union-attr]
            )
        else:
            statement = statement.where(AdminAction.court_id == court_id)
        return list(self.session.exec(statement).all())

    def recent_delivery_jobs(self, limit: int = 50) -> list:
        from app.models.admin import DeliveryJob  # локальный импорт во избежание цикла

        statement = select(DeliveryJob).order_by(DeliveryJob.id.desc()).limit(limit)  # type: ignore[attr-defined]
        return list(self.session.exec(statement).all())

    # ----------------------------------------------------------------- helpers

    def _record(
        self,
        admin: str,
        action: str,
        result: str,
        details: dict,
        reason: str | None = None,
        court: Court | None = None,
        report: CourtReport | None = None,
        court_id: int | None = None,
    ) -> None:
        self.session.add(
            AdminAction(
                court_id=(court.id if court is not None else court_id),
                report_id=(report.id if report is not None else None),
                admin=admin,
                action=action,
                reason=_clean_note(reason),
                result=result,
                details=details,
            )
        )
