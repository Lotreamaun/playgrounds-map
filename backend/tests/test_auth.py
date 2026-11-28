"""Вход администратора, сессия, CSRF, локальный возврат и старый DELETE."""


import pytest


def test_admin_data_requires_session(client):
    assert client.get("/admin/courts").status_code == 401
    assert client.get("/admin/reports").status_code == 401
    assert client.get("/admin/courts/1/history").status_code == 401
    assert client.get("/admin/delivery-jobs").status_code == 401


def test_login_not_configured_is_closed(client, monkeypatch):
    from app.routers import admin as admin_router

    monkeypatch.setattr(admin_router.settings, "ADMIN_PASSWORD", "")
    response = client.post(
        "/admin/session",
        data={"username": "admin", "password": "anything", "return_to": "/admin"},
    )
    assert response.status_code == 503


def test_login_success_sets_session_and_csrf_cookies(client):
    response = client.post(
        "/admin/session",
        data={"username": "admin", "password": "correct-admin-password", "return_to": "/admin"},
    )
    assert response.status_code == 200
    assert response.json() == {"admin": "admin", "return_to": "/admin"}
    assert client.cookies.get("admin_session") is not None
    assert client.cookies.get("admin_csrf") is not None

    who = client.get("/admin/session")
    assert who.status_code == 200
    assert who.json()["admin"] == "admin"


def test_login_wrong_password(client):
    response = client.post(
        "/admin/session",
        data={"username": "admin", "password": "wrong", "return_to": "/admin"},
    )
    assert response.status_code == 401


def test_login_lockout_after_repeated_failures(client):
    for _ in range(3):
        wrong = client.post(
            "/admin/session",
            data={"username": "admin", "password": "wrong", "return_to": "/admin"},
        )
        assert wrong.status_code == 401
    # Даже верный пароль не принимается в течение блокировки.
    blocked = client.post(
        "/admin/session",
        data={"username": "admin", "password": "correct-admin-password", "return_to": "/admin"},
    )
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers


def test_return_to_must_be_local(client):
    for external in ("https://evil.example/phish", "//evil.example", "http://evil.example"):
        response = client.post(
            "/admin/session",
            data={"username": "admin", "password": "correct-admin-password", "return_to": external},
        )
        assert response.status_code == 200
        assert response.json()["return_to"] == "/admin"


def test_return_to_local_path_is_kept(client):
    response = client.post(
        "/admin/session",
        data={"username": "admin", "password": "correct-admin-password", "return_to": "/admin?court=42"},
    )
    assert response.status_code == 200
    assert response.json()["return_to"] == "/admin?court=42"


def test_mutation_requires_csrf_header(client, create_court):
    court = create_court()
    client.post(
        "/admin/session",
        data={"username": "admin", "password": "correct-admin-password", "return_to": "/admin"},
    )
    # Сессия есть, заголовка CSRF нет.
    assert client.patch(f"/admin/courts/{court['id']}", json={"name": "X"}).status_code == 403
    # Неверный заголовок тоже отклоняется.
    wrong = client.patch(
        f"/admin/courts/{court['id']}", json={"name": "X"}, headers={"X-CSRF-Token": "forged"}
    )
    assert wrong.status_code == 403
    # Верный заголовок проходит.
    csrf = client.cookies.get("admin_csrf")
    ok = client.patch(
        f"/admin/courts/{court['id']}", json={"name": "X"}, headers={"X-CSRF-Token": csrf}
    )
    assert ok.status_code == 200


def test_logout_invalidates_session(admin_client):
    session = admin_client.cookies.get("admin_session")
    assert admin_client.delete("/admin/session").status_code == 204
    assert admin_client.get("/admin/session").status_code == 401
    assert admin_client.get("/admin/courts").status_code == 401
    admin_client.cookies.set("admin_session", session)
    assert admin_client.get("/admin/session").status_code == 401


def test_legacy_delete_disabled_without_custom_token(client, create_court):
    court = create_court()
    # Без заголовка.
    assert client.delete(f"/courts/{court['id']}").status_code == 503
    # Со стандартным значением токена.
    standard = client.delete(f"/courts/{court['id']}", headers={"admin-token": "change-me"})
    assert standard.status_code == 503
    # Площадка не удалена.
    assert client.get(f"/courts/{court['id']}").status_code == 200


def test_legacy_delete_with_custom_token(client, create_court, monkeypatch):
    from app.routers import courts as courts_router

    monkeypatch.setattr(courts_router.settings, "ADMIN_TOKEN", "operator-secret-token")
    court = create_court()
    wrong = client.delete(f"/courts/{court['id']}", headers={"admin-token": "nope"})
    assert wrong.status_code == 403
    ok = client.delete(f"/courts/{court['id']}", headers={"admin-token": "operator-secret-token"})
    assert ok.status_code == 204
    assert client.get(f"/courts/{court['id']}").status_code == 404


def test_session_cookies_are_secure_by_default(client, monkeypatch):
    from app.routers import admin as admin_router

    monkeypatch.setattr(admin_router.settings, "ADMIN_ALLOW_INSECURE_HTTP", False)
    response = client.post(
        "/admin/session",
        data={"username": "admin", "password": "correct-admin-password"},
    )
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
    assert all("Secure" in cookie for cookie in response.headers.get_list("set-cookie"))


@pytest.mark.parametrize(
    ("setting", "value"),
    [("ADMIN_PASSWORD", "short"), ("ADMIN_PASSWORD", " " * 20), ("SESSION_SECRET", "short"),
     ("SESSION_SECRET", " " * 64), ("SESSION_SECRET", "0" * 64)],
)
def test_weak_login_configuration_is_disabled(client, monkeypatch, setting, value):
    from app.routers import admin as admin_router

    monkeypatch.setattr(admin_router.settings, setting, value)
    response = client.post(
        "/admin/session",
        data={"username": "admin", "password": "correct-admin-password"},
    )
    assert response.status_code == 503
