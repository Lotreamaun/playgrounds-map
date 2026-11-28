import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self) -> None:
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/courtmap.db")
        self.CORS_ORIGINS: list[str] = [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
            if origin.strip()
        ]
        self.LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

        self.PHOTO_DIR: str = os.getenv("PHOTO_DIR", "data/photos")

        # Старый токен DELETE /courts/{id}. Выключен, если не задан или равен стандартному значению.
        self.ADMIN_TOKEN: str = os.getenv("ADMIN_TOKEN", "change-me")

        # Единственный серверный аккаунт администратора (см. design.md, решение 1).
        # ADMIN_PASSWORD и SESSION_SECRET обязаны быть заданы явно — без них вход закрыт.
        self.ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
        self.ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")
        self.SESSION_SECRET: str = os.getenv("SESSION_SECRET", "")
        self.ADMIN_ALLOW_INSECURE_HTTP = os.getenv("ADMIN_ALLOW_INSECURE_HTTP", "false").lower() == "true"
        self.TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "false").lower() == "true"
        self.ADMIN_SESSION_TTL_HOURS: float = float(os.getenv("ADMIN_SESSION_TTL_HOURS", "12"))

        # Telegram: токен бота, закрытый чат администратора и публичный адрес Courtmap для ссылок.
        self.TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.TELEGRAM_ADMIN_CHAT_ID: str = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")
        self.PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")

        # Лимиты: попытки входа и частота пользовательских обращений (защита памяти, один инстанс).
        self.LOGIN_MAX_FAILURES: int = int(os.getenv("LOGIN_MAX_FAILURES", "5"))
        self.LOGIN_LOCKOUT_SECONDS: int = int(os.getenv("LOGIN_LOCKOUT_SECONDS", "900"))
        self.REPORT_MAX_PER_WINDOW: int = int(os.getenv("REPORT_MAX_PER_WINDOW", "5"))
        self.REPORT_WINDOW_SECONDS: int = int(os.getenv("REPORT_WINDOW_SECONDS", "600"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
