"""Админская выдача, правка, журнал и координаты."""

import pytest


def test_admin_list_includes_hidden_and_search(admin_client, create_court):
    visible = create_court(name="Парковая", address="ул. Парковая 1")
    hidden = create_court(name="Спам-площадка")
    admin_client.post(f"/admin/courts/{hidden['id']}/hide", json={})

    listing = admin_client.get("/admin/courts").json()
    by_id = {c["id"]: c for c in listing}
    assert set(by_id) == {visible["id"], hidden["id"]}
    assert by_id[visible["id"]]["is_hidden"] is False
    assert by_id[hidden["id"]]["is_hidden"] is True

    found = admin_client.get("/admin/courts", params={"q": "Парковая"}).json()
    assert [c["id"] for c in found] == [visible["id"]]

    empty = admin_client.get("/admin/courts", params={"q": "нет-такой"}).json()
    assert empty == []


def test_admin_get_court_created_before_update(admin_client, create_court):
    # «Старая» площадка: те же поля, что и созданные до обновления.
    court = create_court(name="Легаси", is_covered=None, description=None)
    detail = admin_client.get(f"/admin/courts/{court['id']}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["name"] == "Легаси"
    assert body["is_hidden"] is False
    assert body["is_photo_published"] is True


def test_admin_get_missing_court_404(admin_client):
    assert admin_client.get("/admin/courts/999").status_code == 404


def test_patch_updates_fields_and_coordinates(admin_client, client, create_court):
    court = create_court(name="Старое имя", has_lighting="true")
    response = admin_client.patch(
        f"/admin/courts/{court['id']}",
        json={
            "name": "Новое имя",
            "latitude": 41.728,
            "longitude": 44.843,
            "has_lighting": False,
            "surface": "rubber",
            "description": "обновлено администратором",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Новое имя"
    assert body["latitude"] == 41.728
    assert body["has_lighting"] is False

    card = client.get(f"/courts/{court['id']}").json()
    assert card["name"] == "Новое имя"
    assert card["surface"] == "rubber"

    history = admin_client.get(f"/admin/courts/{court['id']}/history").json()
    edit = next(h for h in history if h["action"] == "edit")
    assert edit["details"]["before"]["name"] is True
    assert edit["details"]["after"]["name"] is True
    assert "Старое имя" not in str(edit["details"])
    assert "Новое имя" not in str(edit["details"])


def test_patch_validates_coordinates_and_enums(client, admin_client, create_court):
    court = create_court()
    bad_lat = admin_client.patch(f"/admin/courts/{court['id']}", json={"latitude": 120.0})
    assert bad_lat.status_code == 422
    bad_surface = admin_client.patch(f"/admin/courts/{court['id']}", json={"surface": "бетон"})
    assert bad_surface.status_code == 422
    bad_condition = admin_client.patch(f"/admin/courts/{court['id']}", json={"condition": "разрушено"})
    assert bad_condition.status_code == 422
    empty = admin_client.patch(f"/admin/courts/{court['id']}", json={})
    assert empty.status_code == 422

    # Площадка не изменилась.
    assert client.get(f"/courts/{court['id']}").json()["latitude"] == court["latitude"]


def test_hide_and_restore_are_logged(admin_client, create_court):
    court = create_court()
    admin_client.post(f"/admin/courts/{court['id']}/hide", json={"reason": "жалоба"})
    admin_client.post(f"/admin/courts/{court['id']}/restore", json={"reason": "проверено"})

    history = admin_client.get(f"/admin/courts/{court['id']}/history").json()
    actions = [h["action"] for h in history]
    assert actions == ["restore", "hide"]
    hide_entry = history[1]
    assert hide_entry["reason"] == "жалоба"
    assert hide_entry["result"] == "done"
    assert hide_entry["admin"] == "admin"


def test_unpublish_description_without_description_conflict(admin_client, create_court):
    court = create_court(description=None)
    response = admin_client.post(f"/admin/courts/{court['id']}/unpublish-description", json={})
    assert response.status_code == 409


def test_unpublish_photo_without_photo_conflict(admin_client, create_court):
    court = create_court()
    response = admin_client.post(f"/admin/courts/{court['id']}/unpublish-photo", json={})
    assert response.status_code == 409


def test_history_includes_report_related_actions(admin_client, client, create_court):
    court = create_court(has_lighting="true")
    report_id = client.post(
        f"/courts/{court['id']}/reports",
        json={"kind": "correction", "target": "has_lighting", "proposed_value": False},
    ).json()["id"]
    admin_client.post(f"/admin/reports/{report_id}/approve", json={})

    history = admin_client.get(f"/admin/courts/{court['id']}/history").json()
    approve = [h for h in history if h["action"] == "approve"]
    assert len(approve) == 1
    assert approve[0]["report_id"] == report_id
    assert approve[0]["court_id"] == court["id"]


def test_admin_report_actions_require_csrf(client, create_court):
    court = create_court()
    client.post(
        "/admin/session",
        data={"username": "admin", "password": "correct-admin-password", "return_to": "/admin"},
    )
    response = client.post(f"/admin/courts/{court['id']}/hide", json={})
    assert response.status_code == 403
    # Площадка осталась опубликованной.
    assert client.get(f"/courts/{court['id']}").status_code == 200


@pytest.mark.parametrize(
    "endpoint",
    [
        "/admin/courts",
        "/admin/reports",
        "/admin/delivery-jobs",
    ],
)
def test_admin_get_endpoints_require_session(client, endpoint):
    assert client.get(endpoint).status_code == 401
