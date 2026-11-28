"""Изолированные локальные фикстуры: собственная БД и каталог фото.

Переменные окружения выставляются ДО импорта приложения, чтобы
get_settings()/движок БД увидели тестовые значения.
"""

import os
import secrets
import sys
import tempfile
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]

_TMP_DIR = tempfile.mkdtemp(prefix="courtmap-tests-")

os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DIR}/courtmap.db"
os.environ["PHOTO_DIR"] = os.path.join(_TMP_DIR, "photos")
os.environ["ADMIN_USERNAME"] = "admin"
os.environ["ADMIN_PASSWORD"] = "correct-admin-password"
os.environ["SESSION_SECRET"] = secrets.token_hex(32)
os.environ["ADMIN_ALLOW_INSECURE_HTTP"] = "true"
os.environ["TRUST_PROXY_HEADERS"] = "false"
os.environ["ADMIN_TOKEN"] = "change-me"
os.environ["PUBLIC_BASE_URL"] = "http://localhost:5173"
os.environ["TELEGRAM_BOT_TOKEN"] = ""
os.environ["TELEGRAM_ADMIN_CHAT_ID"] = ""
os.environ["LOGIN_MAX_FAILURES"] = "3"
os.environ["LOGIN_LOCKOUT_SECONDS"] = "60"
os.environ["REPORT_MAX_PER_WINDOW"] = "5"
os.environ["REPORT_WINDOW_SECONDS"] = "600"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

sys.path.insert(0, str(BACKEND_DIR))

os.makedirs(os.environ["PHOTO_DIR"], exist_ok=True)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import Session, SQLModel  # noqa: E402

import app.main as main_module  # noqa: E402
from app.core.database import engine  # noqa: E402

ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]


@pytest.fixture(autouse=True)
def fresh_db():
    """Каждый тест начинает с пустой БД и чистых лимитеров."""
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    from app.routers import admin as admin_router
    from app.routers import reports as reports_router

    admin_router.login_lockout._failures.clear()
    admin_router.login_lockout._locked_until.clear()
    reports_router.report_limiter._events.clear()
    yield


@pytest.fixture()
def client() -> TestClient:
    # Без контекстного менеджера lifespan не запускается — таблицы уже созданы,
    # фоновый поток доставки не нужен (worker тестируется напрямую).
    return TestClient(main_module.app)


@pytest.fixture()
def admin_client(client: TestClient) -> TestClient:
    response = client.post(
        "/admin/session",
        data={"username": "admin", "password": ADMIN_PASSWORD, "return_to": "/admin"},
    )
    assert response.status_code == 200, response.text
    csrf = client.cookies.get("admin_csrf")
    assert csrf is not None
    client.headers.update({"X-CSRF-Token": csrf})
    return client


@pytest.fixture()
def db_session() -> Session:
    with Session(engine) as session:
        yield session


@pytest.fixture()
def create_court(client: TestClient):
    """Создание площадки через публичный POST /courts (публикация сразу)."""
    counter = {"n": 0}

    def _create(**overrides) -> dict:
        counter["n"] += 1
        payload = {
            "sport_type": "basketball",
            "latitude": 41.70 + counter["n"] * 0.01,
            "longitude": 44.80 + counter["n"] * 0.01,
            "surface": "asphalt",
            "condition": "good",
            "has_lighting": "true",
        }
        payload.update({k: v for k, v in overrides.items() if k != "photo"})
        files = None
        photo = overrides.get("photo")
        if photo is not None:
            files = {"photo": photo}
        response = client.post("/courts", data=payload, files=files)
        assert response.status_code == 201, response.text
        return response.json()

    return _create
