"""Outbox-доставка: транзакционная запись задания, повторы, ошибки Telegram."""

from datetime import datetime, timedelta, timezone

from sqlmodel import select

from app.models.admin import DeliveryJob
from app.services.delivery import DeliveryWorker
from app.services.telegram import TelegramError


def _utcnow() -> datetime:
    """Наивный UTC — как хранит SQLite (см. модели и worker)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class FakeNotifier:
    """Имитация Telegram: временные сбои N раз, затем успех (или постоянная ошибка)."""

    def __init__(self, temporary_failures: int = 0, permanent: bool = False) -> None:
        self.temporary_failures = temporary_failures
        self.permanent = permanent
        self.court_messages: list[dict] = []
        self.report_messages: list[dict] = []

    def send_court_created(self, court_id, court_name, sport_type):
        if self.permanent:
            raise TelegramError("chat not found", retryable=False)
        if self.temporary_failures > 0:
            self.temporary_failures -= 1
            raise TelegramError("temporary network failure", retryable=True)
        self.court_messages.append({"court_id": court_id, "court_name": court_name, "sport_type": sport_type})

    def send_report_created(self, report_id, kind, target, court_id):
        if self.permanent:
            raise TelegramError("chat not found", retryable=False)
        if self.temporary_failures > 0:
            self.temporary_failures -= 1
            raise TelegramError("temporary network failure", retryable=True)
        self.report_messages.append(
            {"report_id": report_id, "kind": kind, "target": target, "court_id": court_id}
        )


def _jobs(session) -> list[DeliveryJob]:
    # expire_all: сессия могла закэшировать задание до коммита воркером.
    session.expire_all()
    return list(session.exec(select(DeliveryJob)).all())


def test_court_creation_enqueues_delivery_job(client, create_court, db_session):
    court = create_court(name="Центральная")
    jobs = _jobs(db_session)
    assert len(jobs) == 1
    job = jobs[0]
    assert job.kind == "court_created"
    assert job.court_id == court["id"]
    assert job.status == "pending"


def test_report_creation_enqueues_delivery_job(client, create_court, db_session):
    court = create_court()
    report_id = client.post(
        f"/courts/{court['id']}/reports",
        json={"kind": "correction", "target": "has_lighting", "proposed_value": False},
    ).json()["id"]
    jobs = _jobs(db_session)
    # Площадка тоже ставит задание доставки; ищем задание обращения.
    report_jobs = [job for job in jobs if job.kind == "report_created"]
    assert len(report_jobs) == 1
    job = report_jobs[0]
    assert job.report_id == report_id
    assert job.court_id == court["id"]


def test_successful_delivery_marks_job_done(client, create_court, db_session):
    court = create_court(name="Успешная")
    notifier = FakeNotifier()
    worker = DeliveryWorker(db_session.get_bind(), notifier)
    processed = worker.process_once()
    assert processed == 1

    job = _jobs(db_session)[0]
    assert job.status == "done"
    assert job.attempts == 1
    assert job.last_error is None
    assert notifier.court_messages == [
        {"court_id": court["id"], "court_name": "Успешная", "sport_type": "basketball"}
    ]


def test_temporary_failure_is_retried_and_record_stays(client, create_court, db_session):
    court = create_court()
    notifier = FakeNotifier(temporary_failures=1)
    worker = DeliveryWorker(db_session.get_bind(), notifier)

    # Первая попытка — временный сбой Telegram.
    assert worker.process_once() == 1
    job = _jobs(db_session)[0]
    assert job.status == "pending"
    assert job.attempts == 1
    assert job.last_error == "temporary network failure"
    assert job.next_attempt_at > _utcnow()

    # Площадка сохранена и доступна, запись не создана повторно.
    assert client.get(f"/courts/{court['id']}").status_code == 200
    assert len(_jobs(db_session)) == 1

    # До истечения задержки задание не подбирается повторно.
    assert worker.process_once() == 0

    # После задержки — повторная доставка успешна, без повторного создания.
    soon = _utcnow() + timedelta(seconds=61)
    assert worker.process_once(now=soon) == 1
    job = _jobs(db_session)[0]
    assert job.status == "done"
    assert len(notifier.court_messages) == 1


def test_permanent_failure_marks_job_failed(client, create_court, db_session):
    court = create_court()
    notifier = FakeNotifier(permanent=True)
    worker = DeliveryWorker(db_session.get_bind(), notifier)
    assert worker.process_once() == 1

    job = _jobs(db_session)[0]
    assert job.status == "failed"
    assert job.last_error == "chat not found"

    # Площадка всё равно опубликована — доставка не влияет на сохранение.
    assert client.get(f"/courts/{court['id']}").status_code == 200


def test_report_notification_delivered_after_temporary_failure(client, create_court, db_session):
    court = create_court(has_lighting="true")
    response = client.post(
        f"/courts/{court['id']}/reports",
        json={"kind": "complaint", "target": "description", "reason": "Реклама"},
    )
    report_id = response.json()["id"]
    # Обращение принято, даже если Telegram недоступен.
    assert response.status_code == 201

    # Оба задания (площадка и обращение) падают и затем доставляются.
    notifier = FakeNotifier(temporary_failures=2)
    worker = DeliveryWorker(db_session.get_bind(), notifier)
    assert worker.process_once() == 2
    assert notifier.report_messages == []
    assert worker.process_once(now=_utcnow() + timedelta(seconds=61)) == 2

    assert notifier.report_messages == [
        {"report_id": report_id, "kind": "complaint", "target": "description", "court_id": court["id"]}
    ]
    report_job = [job for job in _jobs(db_session) if job.kind == "report_created"][0]
    assert report_job.status == "done"


def test_worker_ignores_jobs_not_due_yet(client, create_court, db_session):
    create_court()
    notifier = FakeNotifier()
    worker = DeliveryWorker(db_session.get_bind(), notifier)
    # Задание с будущим next_attempt_at не подбирается.
    job = _jobs(db_session)[0]
    job.next_attempt_at = _utcnow() + timedelta(hours=1)
    db_session.add(job)
    db_session.commit()

    assert worker.process_once() == 0
    assert notifier.court_messages == []


def test_delivery_jobs_visible_to_admin(admin_client, client, create_court):
    create_court()
    jobs = admin_client.get("/admin/delivery-jobs").json()
    assert len(jobs) == 1
    assert jobs[0]["kind"] == "court_created"
    assert jobs[0]["status"] == "pending"


def test_login_session_survives_delivery_settings(client):
    # Сессия не зависит от Telegram: вход работает при незаданном боте.
    response = client.post(
        "/admin/session",
        data={"username": "admin", "password": "correct-admin-password", "return_to": "/admin"},
    )
    assert response.status_code == 200
