"""Формат уведомлений: тип события, ссылки «Открыть карточку» / «Управлять»,
без текста жалобы; классификация временных и постоянных ошибок Telegram."""

import httpx
import pytest

from app.services.telegram import TelegramError, TelegramNotifier

BASE = "https://courtmap.example.com"


@pytest.fixture()
def notifier() -> TelegramNotifier:
    return TelegramNotifier(bot_token="bot-token", chat_id="123456", public_base_url=BASE)


def _capture_post(monkeypatch, status_code=200):
    captured = {}

    def fake_post(url, json=None, timeout=None):
        captured["url"] = url
        captured["payload"] = json
        return httpx.Response(status_code, json={"ok": True, "result": {"message_id": 42}})

    monkeypatch.setattr(httpx, "post", fake_post)
    return captured


def test_new_court_notification_has_card_and_manage_links(monkeypatch, notifier):
    captured = _capture_post(monkeypatch)
    notifier.send_court_created(court_id=12, court_name="Центральная", sport_type="basketball")

    assert captured["url"] == "https://api.telegram.org/botbot-token/sendMessage"
    payload = captured["payload"]
    assert payload["chat_id"] == "123456"
    assert "#12" in payload["text"]
    assert "Центральная" in payload["text"]
    buttons = payload["reply_markup"]["inline_keyboard"][0]
    assert [b["text"] for b in buttons] == ["Открыть карточку", "Управлять"]
    assert buttons[0]["url"] == f"{BASE}/?court=12"
    assert buttons[1]["url"] == f"{BASE}/admin?court=12"


def test_new_court_notification_without_name(notifier, monkeypatch):
    captured = _capture_post(monkeypatch)
    notifier.send_court_created(court_id=13, court_name=None, sport_type="basketball")
    assert "#13" in captured["payload"]["text"]
    assert "без названия" in captured["payload"]["text"]


def test_report_notification_has_link_and_no_complaint_text(notifier, monkeypatch):
    captured = _capture_post(monkeypatch)
    notifier.send_report_created(report_id=9, kind="complaint", target="description", court_id=12)

    text = captured["payload"]["text"]
    assert "обращение #9" in text
    assert "жалоба" in text
    assert "описание" in text
    buttons = captured["payload"]["reply_markup"]["inline_keyboard"][0]
    assert buttons[0]["text"] == "Открыть обращение"
    assert buttons[0]["url"] == f"{BASE}/admin?report=9"


def test_correction_notification_names_the_field(notifier, monkeypatch):
    captured = _capture_post(monkeypatch)
    notifier.send_report_created(report_id=10, kind="correction", target="has_lighting", court_id=12)
    assert "освещение" in captured["payload"]["text"]


def test_server_errors_are_temporary(notifier, monkeypatch):
    _capture_post(monkeypatch, status_code=503)
    with pytest.raises(TelegramError) as info:
        notifier.send_court_created(1, "X", "basketball")
    assert info.value.retryable is True

    _capture_post(monkeypatch, status_code=429)
    with pytest.raises(TelegramError) as info:
        notifier.send_court_created(1, "X", "basketball")
    assert info.value.retryable is True


def test_client_errors_are_permanent(notifier, monkeypatch):
    _capture_post(monkeypatch, status_code=400)
    with pytest.raises(TelegramError) as info:
        notifier.send_court_created(1, "X", "basketball")
    assert info.value.retryable is False


def test_network_errors_are_temporary(monkeypatch, notifier):
    def failing_post(url, json=None, timeout=None):
        raise httpx.ConnectError("connection refused")

    monkeypatch.setattr(httpx, "post", failing_post)
    with pytest.raises(TelegramError) as info:
        notifier.send_court_created(1, "X", "basketball")
    assert info.value.retryable is True


def test_unconfigured_notifier_is_permanent_error():
    unconfigured = TelegramNotifier(bot_token="", chat_id="", public_base_url="")
    with pytest.raises(TelegramError) as info:
        unconfigured.send_court_created(1, "X", "basketball")
    assert info.value.retryable is False


@pytest.mark.parametrize(
    ("status", "content", "retryable"),
    [(302, b"", False), (200, b"invalid", True), (200, b'{"ok": false}', False)],
)
def test_only_confirmed_messages_are_delivered(monkeypatch, notifier, status, content, retryable):
    monkeypatch.setattr(httpx, "post", lambda *args, **kwargs: httpx.Response(status, content=content))
    with pytest.raises(TelegramError) as info:
        notifier.send_court_created(1, "Площадка", "basketball")
    assert info.value.retryable is retryable
