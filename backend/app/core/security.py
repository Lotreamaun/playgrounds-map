"""Сессия администратора: подписанная cookie и CSRF-токен.

Сессия — это cookie `admin_session` со значением `username:expiry:nonce`,
подписанным HMAC-SHA256 по SESSION_SECRET. Права выдаёт только сервер,
ссылки (в том числе из Telegram) полномочий не несут. Изменяющие запросы
дополнительно требуют X-CSRF-Token, привязанный подписью к текущей
сессии и доступный фронтенду через cookie `admin_csrf`.
"""

import hashlib
import hmac
import re
import secrets
import time
from threading import Lock
from urllib.parse import quote, unquote

from fastapi import HTTPException

SESSION_COOKIE = "admin_session"
CSRF_COOKIE = "admin_csrf"
CSRF_HEADER = "x-csrf-token"

STANDARD_PASSWORDS = {"change-me", "password"}


def _sign(secret: str, payload: str) -> str:
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_session_token(secret: str, username: str, ttl_seconds: float) -> str:
    issued_at = int(time.time())
    expires_at = issued_at + int(ttl_seconds)
    nonce = secrets.token_hex(16)
    payload = f"{quote(username, safe='')}:{expires_at}:{nonce}"
    signature = _sign(secret, payload)
    return f"{payload}:{signature}"


def verify_session_token(secret: str, token: str | None, now: float | None = None) -> str | None:
    """Возвращает имя администратора для валидной непросроченной сессии, иначе None."""
    if not secret or not token:
        return None
    parts = token.rsplit(":", 1)
    if len(parts) != 2:
        return None
    payload, signature = parts
    if not hmac.compare_digest(signature.encode(), _sign(secret, payload).encode()):
        return None
    segments = payload.split(":")
    if len(segments) != 3:
        return None
    username, expires_at, _nonce = segments
    try:
        expiry = int(expires_at)
    except ValueError:
        return None
    current = time.time() if now is None else now
    if current >= expiry:
        return None
    return unquote(username)


def create_csrf_token(secret: str, session_token: str) -> str:
    return _sign(secret, f"csrf:{session_token}")


class AdminSessions:
    """Process-local registry for explicit logout and expiry."""

    def __init__(self) -> None:
        self._expires: dict[str, float] = {}
        self._lock = Lock()

    def register(self, token: str, ttl_seconds: float) -> None:
        now = time.monotonic()
        with self._lock:
            self._expires = {key: expiry for key, expiry in self._expires.items() if expiry > now}
            self._expires[token] = now + ttl_seconds

    def is_active(self, token: str) -> bool:
        with self._lock:
            return self._expires.get(token, 0) > time.monotonic()

    def revoke(self, token: str) -> None:
        with self._lock:
            self._expires.pop(token, None)


def verify_csrf(header_token: str | None, cookie_token: str | None) -> None:
    if not header_token or not cookie_token:
        raise HTTPException(status_code=403, detail="missing CSRF token")
    if not secrets.compare_digest(header_token.encode(), cookie_token.encode()):
        raise HTTPException(status_code=403, detail="invalid CSRF token")


def verify_admin_credentials(expected_username: str, expected_password: str, username: str, password: str) -> bool:
    username_ok = secrets.compare_digest(username.encode(), expected_username.encode())
    password_ok = secrets.compare_digest(password.encode(), expected_password.encode())
    return username_ok and password_ok


def is_login_configured(username: str, password: str, session_secret: str) -> bool:
    """Fail-closed: без явно заданного пароля и секрета сессий вход не работает."""
    return (
        bool(username.strip())
        and len(password.strip()) >= 12
        and password.strip().casefold() not in STANDARD_PASSWORDS
        and re.fullmatch(r"[0-9a-fA-F]{64}", session_secret) is not None
        and len(set(session_secret.lower())) > 1
    )
