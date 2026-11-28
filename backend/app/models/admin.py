"""Модели администрирования: пользовательские обращения, журнал действий,
задания доставки уведомлений (outbox).

Журнал хранит сведения для разбора действий администратора (кто, когда,
что и с каким результатом) без копий удалённого текста или фото:
содержание обращений остаётся только в самих обращениях.
"""

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import Column
from sqlmodel import JSON, Field, SQLModel

REPORT_KIND_CORRECTION = "correction"
REPORT_KIND_COMPLAINT = "complaint"

REPORT_STATUS_NEW = "new"
REPORT_STATUS_APPROVED = "approved"
REPORT_STATUS_REJECTED = "rejected"
REPORT_STATUS_RESOLVED = "resolved"

# Поля, которые посетитель может предложить исправить (первая версия — структурированные).
CORRECTION_FIELDS = ("has_lighting", "surface", "condition", "is_covered")

# Объекты жалобы.
COMPLAINT_TARGETS = ("card", "description", "photo")

MAX_REPORT_REASON_LENGTH = 500


class CourtReport(SQLModel, table=True):
    __tablename__ = "court_reports"

    id: Optional[int] = Field(default=None, primary_key=True)
    court_id: int = Field(foreign_key="courts.id", index=True)
    # 'correction' — предложение правки, 'complaint' — жалоба.
    kind: str
    # Для правки — имя поля; для жалобы — 'card' | 'description' | 'photo'.
    target: str
    original_value: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    proposed_value: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    reason: Optional[str] = None
    reporter_ip: Optional[str] = None
    status: str = Field(default=REPORT_STATUS_NEW, index=True)
    resolution_note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None


class AdminAction(SQLModel, table=True):
    __tablename__ = "admin_actions"

    id: Optional[int] = Field(default=None, primary_key=True)
    court_id: Optional[int] = Field(default=None, foreign_key="courts.id", index=True)
    report_id: Optional[int] = Field(default=None, foreign_key="court_reports.id", index=True)
    admin: str
    # 'edit' | 'hide' | 'restore' | 'unpublish_description' | 'unpublish_photo'
    # | 'approve' | 'reject' | 'resolve'
    action: str
    reason: Optional[str] = None
    # 'done' | 'stale' — результат изменения карточки или решения по обращению.
    result: str
    # Прежнее/новое значения и прочие сведения для разбора (без копий жалоб).
    details: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DeliveryJob(SQLModel, table=True):
    """Outbox: задание на отправку уведомления сохраняется в одной транзакции
    с площадкой или обращением; доставка никогда не создаёт записи."""

    __tablename__ = "delivery_jobs"

    id: Optional[int] = Field(default=None, primary_key=True)
    # 'court_created' | 'report_created'
    kind: str
    court_id: Optional[int] = Field(default=None, index=True)
    report_id: Optional[int] = Field(default=None, index=True)
    status: str = Field(default="pending", index=True)
    attempts: int = 0
    last_error: Optional[str] = None
    next_attempt_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
