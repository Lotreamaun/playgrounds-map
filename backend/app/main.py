import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.database import create_db_and_tables
from app.models.court import Court  # noqa: F401 — регистрирует модель в SQLModel.metadata
from app.routers import courts

settings = get_settings()

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up: creating database tables if missing")
    create_db_and_tables()
    yield


app = FastAPI(title="CourtMap API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/photos", StaticFiles(directory="data/photos"), name="photos")

app.include_router(courts.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
