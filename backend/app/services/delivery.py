"""Фоновая доставка уведомлений из outbox.

Задание сохраняется в базе в одной транзакции с площадкой или обращением.
Обработчик подбирает готовые задания, отправляет уведомление и повторяет
временные ошибки с нарастающей задержкой. Доставка никогда не создаёт
записи и не влияет на сохранённые данные.
"""

import logging
import threading
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.models.admin import DeliveryJob
from app.services.telegram import TelegramError, TelegramNotifier

logger = logging.getLogger(__name__)

# Нарастающая задержка для временных ошибок (сек), дальше — раз в час.
RETRY_DELAYS_SECONDS = (10, 60, 300, 1800)
MAX_RETRY_DELAY_SECONDS = 3600
POLL_INTERVAL_SECONDS = 2.0


def _backoff_seconds(attempts: int) -> int:
    if attempts <= 0:
        return RETRY_DELAYS_SECONDS[0]
    if attempts > len(RETRY_DELAYS_SECONDS):
        return MAX_RETRY_DELAY_SECONDS
    return RETRY_DELAYS_SECONDS[attempts - 1]


def _utcnow() -> datetime:
    """Наивный UTC: SQLite хранит datetime без tzinfo (см. модели)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class DeliveryWorker:
    def __init__(self, engine, notifier: TelegramNotifier, poll_interval: float = POLL_INTERVAL_SECONDS) -> None:
        self.engine = engine
        self.notifier = notifier
        self.poll_interval = poll_interval
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    # ------------------------------------------------------------ background

    def start(self) -> None:
        if self._thread is not None:
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, name="delivery-worker", daemon=True)
        self._thread.start()
        logger.info("Delivery worker started (poll interval %.1fs)", self.poll_interval)

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5.0)
            self._thread = None
        logger.info("Delivery worker stopped")

    def _run(self) -> None:
        while not self._stop_event.wait(self.poll_interval):
            try:
                self.process_once()
            except Exception:  # noqa: BLE001 — фоновый поток не должен умирать
                logger.exception("Delivery worker iteration failed")

    # -------------------------------------------------------------- processing

    def process_once(self, now: datetime | None = None) -> int:
        """Обрабатывает все задания, готовые к отправке. Возвращает число попыток."""
        current = now if now is not None else _utcnow()
        processed = 0
        with Session(self.engine) as session:
            jobs = list(
                session.exec(
                    select(DeliveryJob)
                    .where(DeliveryJob.status == "pending")
                    .where(DeliveryJob.next_attempt_at <= current)  # type: ignore[arg-type]
                    .order_by(DeliveryJob.id)  # type: ignore[arg-defined]
                    .limit(50)
                ).all()
            )
            for job in jobs:
                self._attempt(session, job, current)
                processed += 1
        return processed

    def _attempt(self, session: Session, job: DeliveryJob, now: datetime) -> None:
        try:
            self._send(job, session)
        except TelegramError as error:
            job.last_error = str(error)
            job.attempts += 1
            job.updated_at = now
            if error.retryable:
                job.next_attempt_at = now + timedelta(seconds=_backoff_seconds(job.attempts))
                logger.warning(
                    "Delivery job %s temporarily failed (attempt %s): %s",
                    job.id,
                    job.attempts,
                    error,
                )
            else:
                job.status = "failed"
                logger.error("Delivery job %s permanently failed: %s", job.id, error)
            session.add(job)
            session.commit()
        else:
            job.status = "done"
            job.last_error = None
            job.attempts += 1
            job.updated_at = now
            session.add(job)
            session.commit()
            logger.info("Delivery job %s delivered", job.id)

    def _send(self, job: DeliveryJob, session: Session) -> None:
        if job.kind == "court_created" and job.court_id is not None:
            from app.models.court import Court

            court = session.get(Court, job.court_id)
            if court is None:
                raise TelegramError(f"court {job.court_id} no longer exists", retryable=False)
            self.notifier.send_court_created(
                court_id=court.id if court.id is not None else job.court_id,
                court_name=court.name,
                sport_type=court.sport_type,
            )
        elif job.kind == "report_created" and job.report_id is not None:
            from app.models.admin import CourtReport

            report = session.get(CourtReport, job.report_id)
            if report is None:
                raise TelegramError(f"report {job.report_id} no longer exists", retryable=False)
            self.notifier.send_report_created(
                report_id=report.id if report.id is not None else job.report_id,
                kind=report.kind,
                target=report.target,
                court_id=report.court_id,
            )
        else:
            raise TelegramError(f"unknown delivery job: kind={job.kind!r}", retryable=False)
