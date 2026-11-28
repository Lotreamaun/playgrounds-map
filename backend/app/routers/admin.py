"""Закрытая админка: вход по паролю, cookie-сессия, CSRF, управление
площадками, очередь обращений, журнал и задания доставки.

Сервер проверяет полномочия при каждом обращении к закрытым данным
и действиям; без сессии закрытые данные не раскрываются (401).
Изменяющие запросы требуют X-CSRF-Token, привязанный к сессии.
"""

from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Form, Header, HTTPException, Query, Request, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text
from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.database import get_session
from app.core.rate_limit import FailureLockout, client_ip
from app.core.security import (
    AdminSessions,
    CSRF_COOKIE,
    CSRF_HEADER,
    SESSION_COOKIE,
    create_csrf_token,
    create_session_token,
    is_login_configured,
    verify_admin_credentials,
    verify_csrf,
    verify_session_token,
)
from app.models.admin import AdminAction, CourtReport, DeliveryJob
from app.models.court import Court
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])

settings = get_settings()

login_lockout = FailureLockout(
    max_failures=settings.LOGIN_MAX_FAILURES,
    window_seconds=settings.LOGIN_LOCKOUT_SECONDS,
)


admin_sessions = AdminSessions()


def _cookie_secure() -> bool:
    return not settings.ADMIN_ALLOW_INSECURE_HTTP


def _sanitize_return_to(value: str) -> str:
    """Адрес возврата обязан быть локальным путём приложения."""
    if (
        value.partition("?")[0] == "/admin"
        and "\\" not in value
        and all(ord(character) >= 32 and ord(character) != 127 for character in value)
    ):
        return value
    return "/admin"


# ------------------------------------------------------------------- responses


class AdminReportCourt(BaseModel):
    id: int
    name: Optional[str] = None
    sport_type: str
    is_hidden: bool


class AdminReportOut(BaseModel):
    id: Optional[int] = None
    court_id: int
    kind: str
    target: str
    original_value: Optional[dict] = None
    proposed_value: Optional[dict] = None
    reason: Optional[str] = None
    reporter_ip: Optional[str] = None
    status: str
    resolution_note: Optional[str] = None
    created_at: object = None
    resolved_at: object = None
    court: Optional[AdminReportCourt] = None


class AdminActionOut(BaseModel):
    id: Optional[int] = None
    court_id: Optional[int] = None
    report_id: Optional[int] = None
    admin: str
    action: str
    reason: Optional[str] = None
    result: str
    details: Optional[dict] = None
    created_at: object = None


class AdminCourtUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: Optional[str] = None
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    surface: Optional[str] = None
    condition: Optional[str] = None
    has_lighting: Optional[bool] = None
    is_covered: Optional[bool] = None
    description: Optional[str] = None
    address: Optional[str] = None


class ReasonBody(BaseModel):
    reason: Optional[str] = None


class NoteBody(BaseModel):
    note: Optional[str] = None


class SessionOut(BaseModel):
    admin: str
    return_to: Optional[str] = None


def _report_out(report: CourtReport, court: Optional[Court]) -> AdminReportOut:
    return AdminReportOut(
        id=report.id,
        court_id=report.court_id,
        kind=report.kind,
        target=report.target,
        original_value=report.original_value,
        proposed_value=report.proposed_value,
        reason=report.reason,
        reporter_ip=report.reporter_ip,
        status=report.status,
        resolution_note=report.resolution_note,
        created_at=report.created_at,
        resolved_at=report.resolved_at,
        court=(
            AdminReportCourt(id=court.id, name=court.name, sport_type=court.sport_type, is_hidden=court.is_hidden)
            if court is not None and court.id is not None
            else None
        ),
    )


def _action_out(action: AdminAction) -> AdminActionOut:
    return AdminActionOut(
        id=action.id,
        court_id=action.court_id,
        report_id=action.report_id,
        admin=action.admin,
        action=action.action,
        reason=action.reason,
        result=action.result,
        details=action.details,
        created_at=action.created_at,
    )


# ------------------------------------------------------------------- security


def require_admin(
    admin_session: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE),
) -> str:
    if not is_login_configured(settings.ADMIN_USERNAME, settings.ADMIN_PASSWORD, settings.SESSION_SECRET):
        raise HTTPException(status_code=401, detail="administrator session required")
    username = verify_session_token(settings.SESSION_SECRET, admin_session)
    if username != settings.ADMIN_USERNAME or not admin_session or not admin_sessions.is_active(admin_session):
        raise HTTPException(status_code=401, detail="administrator session required")
    return username


def require_admin_csrf(
    admin: str = Depends(require_admin),
    csrf_header: Optional[str] = Header(default=None, alias=CSRF_HEADER),
    admin_session: str = Cookie(alias=SESSION_COOKIE),
) -> str:
    verify_csrf(csrf_header, create_csrf_token(settings.SESSION_SECRET, admin_session))
    return admin


def _session_cookies(response: Response, session_token: str, csrf_token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        session_token,
        max_age=int(settings.ADMIN_SESSION_TTL_HOURS * 3600),
        httponly=True,
        samesite="lax",
        secure=_cookie_secure(),
        path="/",
    )
    # Читается фронтендом и возвращается заголовком X-CSRF-Token при изменениях.
    response.set_cookie(
        CSRF_COOKIE,
        csrf_token,
        max_age=int(settings.ADMIN_SESSION_TTL_HOURS * 3600),
        httponly=False,
        samesite="lax",
        secure=_cookie_secure(),
        path="/",
    )


# -------------------------------------------------------------------- session


@router.post("/session", response_model=SessionOut)
def login(
    request: Request,
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    return_to: str = Form(default="/admin"),
) -> SessionOut:
    ip = client_ip(request, trust_proxy=settings.TRUST_PROXY_HEADERS)
    lock_key = ip

    if not is_login_configured(settings.ADMIN_USERNAME, settings.ADMIN_PASSWORD, settings.SESSION_SECRET):
        # Fail-closed: без настроенного пароля и секрета сессий вход недоступен.
        raise HTTPException(status_code=503, detail="administrator login is not configured")

    if login_lockout.is_locked(lock_key):
        raise HTTPException(
            status_code=429,
            detail="too many failed login attempts, try again later",
            headers={"Retry-After": str(login_lockout.retry_after(lock_key))},
        )

    if not verify_admin_credentials(settings.ADMIN_USERNAME, settings.ADMIN_PASSWORD, username, password):
        login_lockout.register_failure(lock_key)
        raise HTTPException(status_code=401, detail="invalid username or password")

    login_lockout.reset(lock_key)
    session_token = create_session_token(
        settings.SESSION_SECRET, settings.ADMIN_USERNAME, settings.ADMIN_SESSION_TTL_HOURS * 3600
    )
    admin_sessions.register(session_token, settings.ADMIN_SESSION_TTL_HOURS * 3600)
    csrf_token = create_csrf_token(settings.SESSION_SECRET, session_token)
    _session_cookies(response, session_token, csrf_token)
    return SessionOut(admin=settings.ADMIN_USERNAME, return_to=_sanitize_return_to(return_to))


@router.get("/session", response_model=SessionOut)
def whoami(admin: str = Depends(require_admin)) -> SessionOut:
    return SessionOut(admin=admin)


@router.delete("/session", status_code=204)
def logout(
    response: Response,
    admin_session: str = Cookie(alias=SESSION_COOKIE),
    admin: str = Depends(require_admin_csrf),
) -> None:
    admin_sessions.revoke(admin_session)
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")
    return None


# --------------------------------------------------------------------- courts


@router.get("/courts")
def admin_list_courts(
    q: Optional[str] = Query(default=None),
    admin: str = Depends(require_admin),
    session: Session = Depends(get_session),
) -> list[Court]:
    service = AdminService(session)
    return service.list_courts(q)


@router.get("/courts/{court_id}")
def admin_get_court(
    court_id: int,
    admin: str = Depends(require_admin),
    session: Session = Depends(get_session),
) -> Court:
    service = AdminService(session)
    return service.get_court_or_404(court_id)


@router.patch("/courts/{court_id}")
def admin_update_court(
    court_id: int,
    payload: AdminCourtUpdate,
    admin: str = Depends(require_admin_csrf),
    session: Session = Depends(get_session),
) -> Court:
    service = AdminService(session)
    court = service.get_court_or_404(court_id)
    changes = payload.model_dump(exclude_unset=True)
    return service.update_court(court, changes, admin, changes.pop("reason", None))


@router.post("/courts/{court_id}/hide")
def admin_hide_court(
    court_id: int,
    payload: ReasonBody,
    admin: str = Depends(require_admin_csrf),
    session: Session = Depends(get_session),
) -> Court:
    service = AdminService(session)
    court = service.get_court_or_404(court_id)
    return service.set_hidden(court, hidden=True, admin=admin, reason=payload.reason)


@router.post("/courts/{court_id}/restore")
def admin_restore_court(
    court_id: int,
    payload: ReasonBody,
    admin: str = Depends(require_admin_csrf),
    session: Session = Depends(get_session),
) -> Court:
    service = AdminService(session)
    court = service.get_court_or_404(court_id)
    return service.set_hidden(court, hidden=False, admin=admin, reason=payload.reason)


@router.post("/courts/{court_id}/unpublish-description")
def admin_unpublish_description(
    court_id: int,
    payload: ReasonBody,
    admin: str = Depends(require_admin_csrf),
    session: Session = Depends(get_session),
) -> Court:
    service = AdminService(session)
    court = service.get_court_or_404(court_id)
    return service.unpublish_description(court, admin=admin, reason=payload.reason)


@router.post("/courts/{court_id}/unpublish-photo")
def admin_unpublish_photo(
    court_id: int,
    payload: ReasonBody,
    admin: str = Depends(require_admin_csrf),
    session: Session = Depends(get_session),
) -> Court:
    service = AdminService(session)
    court = service.get_court_or_404(court_id)
    return service.unpublish_photo(court, admin=admin, reason=payload.reason)


@router.get("/courts/{court_id}/history")
def admin_court_history(
    court_id: int,
    admin: str = Depends(require_admin),
    session: Session = Depends(get_session),
) -> list[AdminActionOut]:
    service = AdminService(session)
    service.get_court_or_404(court_id)
    return [_action_out(action) for action in service.history_for_court(court_id)]


# -------------------------------------------------------------------- reports


@router.get("/reports")
def admin_list_reports(
    status: Optional[str] = Query(default=None),
    admin: str = Depends(require_admin),
    session: Session = Depends(get_session),
) -> list[AdminReportOut]:
    service = AdminService(session)
    courts = {court.id: court for court in session.exec(select(Court)).all()}
    return [
        _report_out(report, courts.get(report.court_id))
        for report in service.list_reports(status)
    ]


@router.get("/reports/{report_id}")
def admin_get_report(
    report_id: int,
    admin: str = Depends(require_admin),
    session: Session = Depends(get_session),
) -> AdminReportOut:
    service = AdminService(session)
    report = service.get_report_or_404(report_id)
    court = session.get(Court, report.court_id)
    return _report_out(report, court)


@router.post("/reports/{report_id}/approve")
def admin_approve_report(
    report_id: int,
    payload: NoteBody,
    admin: str = Depends(require_admin_csrf),
    session: Session = Depends(get_session),
) -> AdminReportOut:
    service = AdminService(session)
    if session.get_bind().dialect.name == "sqlite":
        session.execute(text("BEGIN IMMEDIATE"))
    report = service.get_report_or_404(report_id)
    report = service.approve_report(report, admin=admin, note=payload.note)
    court = session.get(Court, report.court_id)
    return _report_out(report, court)


@router.post("/reports/{report_id}/reject")
def admin_reject_report(
    report_id: int,
    payload: NoteBody,
    admin: str = Depends(require_admin_csrf),
    session: Session = Depends(get_session),
) -> AdminReportOut:
    service = AdminService(session)
    if session.get_bind().dialect.name == "sqlite":
        session.execute(text("BEGIN IMMEDIATE"))
    report = service.get_report_or_404(report_id)
    report = service.reject_report(report, admin=admin, note=payload.note)
    court = session.get(Court, report.court_id)
    return _report_out(report, court)


@router.post("/reports/{report_id}/resolve")
def admin_resolve_report(
    report_id: int,
    payload: NoteBody,
    admin: str = Depends(require_admin_csrf),
    session: Session = Depends(get_session),
) -> AdminReportOut:
    service = AdminService(session)
    if session.get_bind().dialect.name == "sqlite":
        session.execute(text("BEGIN IMMEDIATE"))
    report = service.get_report_or_404(report_id)
    report = service.resolve_report(report, admin=admin, note=payload.note)
    court = session.get(Court, report.court_id)
    return _report_out(report, court)


# -------------------------------------------------------------- delivery jobs


@router.get("/delivery-jobs")
def admin_delivery_jobs(
    limit: int = Query(default=50, ge=1, le=200),
    admin: str = Depends(require_admin),
    session: Session = Depends(get_session),
) -> list[DeliveryJob]:
    service = AdminService(session)
    return service.recent_delivery_jobs(limit)
