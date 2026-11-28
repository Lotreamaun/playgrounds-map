import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import create_db_and_tables, engine
from app.models.admin import AdminAction, CourtReport, DeliveryJob  # noqa: F401 — регистрирует модели
from app.models.court import Court  # noqa: F401 — регистрирует модель в SQLModel.metadata
from app.routers import admin, courts, photos, reports
from app.services.delivery import DeliveryWorker
from app.services.telegram import TelegramNotifier

settings = get_settings()

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
# HTTPX logs request URLs at INFO. Telegram URLs contain the bot token.
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

notifier = TelegramNotifier(
    bot_token=settings.TELEGRAM_BOT_TOKEN,
    chat_id=settings.TELEGRAM_ADMIN_CHAT_ID,
    public_base_url=settings.PUBLIC_BASE_URL,
)
delivery_worker = DeliveryWorker(engine, notifier)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up: creating database tables if missing")
    create_db_and_tables()
    delivery_worker.start()
    yield
    delivery_worker.stop()
    logger.info("Shutdown complete")


app = FastAPI(title="CourtMap API", lifespan=lifespan)

data_dir = Path("data")
photos_dir = Path(settings.PHOTO_DIR)
photos_dir.mkdir(parents=True, exist_ok=True)
logger.info("Runtime dirs ready: %s, %s", data_dir, photos_dir)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def prevent_admin_cache(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/admin/"):
        response.headers["Cache-Control"] = "no-store"
    return response


# Фото отдаются через route с проверкой публикации, а не напрямую с диска:
# снятое с публикации фото недоступно и по старой ссылке на файл.
app.include_router(photos.router)

app.include_router(courts.router)
app.include_router(reports.router)
app.include_router(admin.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
