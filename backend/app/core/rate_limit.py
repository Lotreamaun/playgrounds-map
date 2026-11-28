"""Простые лимиты в памяти: скользящее окно для публичных обращений
и блокировка после серии неудачных попыток входа.

Реплика backend одна (SQLite — single-writer, см. README), поэтому
состояние лимитов сбрасывается при перезапуске процесса.
"""

import time
from collections import defaultdict
from threading import Lock

from fastapi import Request


def client_ip(request: Request, *, trust_proxy: bool) -> str:
    if trust_proxy:
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
    return request.client.host if request.client is not None else "unknown"


class SlidingWindowLimiter:
    """Не более `max_events` событий за `window_seconds` на ключ."""

    def __init__(self, max_events: int, window_seconds: int) -> None:
        self.max_events = max_events
        self.window_seconds = window_seconds
        self._lock = Lock()
        self._next_cleanup = 0.0
        self._events: dict[str, list[float]] = defaultdict(list)

    def allow(self, key: str, now: float | None = None) -> bool:
        current = time.monotonic() if now is None else now
        cutoff = current - self.window_seconds
        with self._lock:
            if current >= self._next_cleanup:
                self._events = defaultdict(list, {
                    address: events for address, events in self._events.items() if events[-1] > cutoff
                })
                self._next_cleanup = current + self.window_seconds
            events = self._events[key]
            self._events[key] = events = [ts for ts in events if ts > cutoff]
            if len(events) >= self.max_events:
                return False
            events.append(current)
            return True

    def retry_after(self, key: str, now: float | None = None) -> int:
        """Сколько секунд ждать до ближайшего допустимого события (для Retry-After)."""
        current = time.monotonic() if now is None else now
        with self._lock:
            events = self._events.get(key)
            if not events:
                return 0
            oldest = events[0]
        remaining = int(self.window_seconds - (current - oldest)) + 1
        return max(remaining, 1)


class FailureLockout:
    """Блокирует ключ после `max_failures` неудач за `window_seconds`."""

    def __init__(self, max_failures: int, window_seconds: int) -> None:
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self._lock = Lock()
        self._next_cleanup = 0.0
        self._failures: dict[str, list[float]] = defaultdict(list)
        self._locked_until: dict[str, float] = {}

    def is_locked(self, key: str, now: float | None = None) -> bool:
        current = time.monotonic() if now is None else now
        with self._lock:
            return self._locked_until.get(key, 0.0) > current

    def register_failure(self, key: str, now: float | None = None) -> None:
        current = time.monotonic() if now is None else now
        cutoff = current - self.window_seconds
        with self._lock:
            if current >= self._next_cleanup:
                self._failures = defaultdict(list, {
                    address: events for address, events in self._failures.items() if events[-1] > cutoff
                })
                self._locked_until = {
                    address: expiry for address, expiry in self._locked_until.items() if expiry > current
                }
                self._next_cleanup = current + self.window_seconds
            events = [ts for ts in self._failures[key] if ts > cutoff]
            events.append(current)
            if len(events) >= self.max_failures:
                self._locked_until[key] = current + self.window_seconds
                del self._failures[key]
            else:
                self._failures[key] = events

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)
            self._locked_until.pop(key, None)

    def retry_after(self, key: str, now: float | None = None) -> int:
        current = time.monotonic() if now is None else now
        with self._lock:
            remaining = int(self._locked_until.get(key, 0.0) - current) + 1
        return max(remaining, 1)
