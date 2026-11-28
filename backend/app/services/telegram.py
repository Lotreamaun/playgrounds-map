"""Отправка уведомлений администратору через Telegram Bot API.

Уведомление содержит тип события и ссылки, без текста жалобы.
Ошибки делятся на временные (сеть, 5xx, 429 — повторяем) и постоянные
(неверный токен/чат, отсутствие настройки — фиксируем для оператора).
"""

import httpx

TELEGRAM_API_BASE = "https://api.telegram.org"

FIELD_LABELS = {
    "has_lighting": "освещение",
    "surface": "покрытие",
    "condition": "состояние",
    "is_covered": "крытая площадка",
}

COMPLAINT_TARGET_LABELS = {
    "card": "карточку",
    "description": "описание",
    "photo": "фото",
}


class TelegramError(Exception):
    def __init__(self, message: str, retryable: bool) -> None:
        super().__init__(message)
        self.retryable = retryable


class TelegramNotifier:
    def __init__(
        self,
        bot_token: str,
        chat_id: str,
        public_base_url: str,
        timeout: float = 10.0,
    ) -> None:
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.public_base_url = public_base_url.rstrip("/")
        self.timeout = timeout

    @property
    def configured(self) -> bool:
        return bool(self.bot_token) and bool(self.chat_id) and bool(self.public_base_url)

    def _post_message(self, text: str, buttons: list[dict]) -> None:
        if not self.configured:
            raise TelegramError(
                "telegram is not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID / PUBLIC_BASE_URL)",
                retryable=False,
            )
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "reply_markup": {"inline_keyboard": [[button for button in buttons]]},
        }
        url = f"{TELEGRAM_API_BASE}/bot{self.bot_token}/sendMessage"
        try:
            response = httpx.post(url, json=payload, timeout=self.timeout)
        except httpx.RequestError as error:
            raise TelegramError(
                f"telegram request failed: {type(error).__name__}", retryable=True
            ) from None
        if response.status_code == 429 or response.status_code >= 500:
            raise TelegramError(
                f"telegram temporary failure: HTTP {response.status_code}",
                retryable=True,
            )
        if not 200 <= response.status_code < 300:
            raise TelegramError(
                f"telegram rejected the message: HTTP {response.status_code}",
                retryable=False,
            )

        try:
            body = response.json()
        except ValueError:
            raise TelegramError("telegram returned invalid JSON", retryable=True) from None
        if not isinstance(body, dict):
            raise TelegramError("telegram returned an unexpected response", retryable=True)
        if body.get("ok") is False:
            code = body.get("error_code")
            retryable = type(code) is int and (code == 429 or code >= 500)
            raise TelegramError("telegram rejected the message", retryable=retryable)
        result = body.get("result")
        if body.get("ok") is not True or not isinstance(result, dict) or type(result.get("message_id")) is not int:
            raise TelegramError("telegram did not confirm message delivery", retryable=True)

    def send_court_created(self, court_id: int, court_name: str | None, sport_type: str) -> None:
        title = court_name.strip() if court_name and court_name.strip() else "без названия"
        text = f"Новая площадка #{court_id} «{title}» ({sport_type})"
        buttons = [
            {"text": "Открыть карточку", "url": f"{self.public_base_url}/?court={court_id}"},
            {"text": "Управлять", "url": f"{self.public_base_url}/admin?court={court_id}"},
        ]
        self._post_message(text, buttons)

    def send_report_created(self, report_id: int, kind: str, target: str, court_id: int) -> None:
        if kind == "correction":
            what = f"предложение исправить «{FIELD_LABELS.get(target, target)}»"
        else:
            what = f"жалоба на {COMPLAINT_TARGET_LABELS.get(target, target)}"
        text = f"Новое обращение #{report_id}: {what} (площадка #{court_id})"
        buttons = [
            {"text": "Открыть обращение", "url": f"{self.public_base_url}/admin?report={report_id}"}
        ]
        self._post_message(text, buttons)
