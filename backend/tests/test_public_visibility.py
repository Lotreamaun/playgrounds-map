"""Публичная видимость: скрытие, восстановление, снятие описания и фото."""


def test_create_publishes_description_immediately(client, create_court):
    court = create_court(description="Вход со стороны школы, вечером многолюдно")
    assert court["description"] == "Вход со стороны школы, вечером многолюдно"
    fetched = client.get(f"/courts/{court['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["description"] == "Вход со стороны школы, вечером многолюдно"
    listing = client.get("/courts")
    assert any(c["id"] == court["id"] for c in listing.json())


def test_public_response_shape_is_unchanged(client, create_court):
    """Публичный API не раскрывает внутренние поля видимости."""
    court = create_court()
    body = client.get(f"/courts/{court['id']}").json()
    assert "is_hidden" not in body
    assert "is_photo_published" not in body
    listing = client.get("/courts").json()
    assert all("is_hidden" not in item and "is_photo_published" not in item for item in listing)


def test_hidden_court_excluded_from_list_and_direct_link(client, admin_client, create_court):
    court = create_court()
    hide = admin_client.post(f"/admin/courts/{court['id']}/hide", json={"reason": "спам"})
    assert hide.status_code == 200
    assert hide.json()["is_hidden"] is True

    listing = client.get("/courts").json()
    assert all(c["id"] != court["id"] for c in listing)
    assert client.get(f"/courts/{court['id']}").status_code == 404


def test_hidden_court_excluded_from_bbox(client, admin_client, create_court):
    visible = create_court(latitude=41.70, longitude=44.80)
    hidden = create_court(latitude=41.71, longitude=44.81)
    admin_client.post(f"/admin/courts/{hidden['id']}/hide", json={})

    response = client.get(
        "/courts",
        params={"min_lat": 41.0, "max_lat": 42.0, "min_lon": 44.0, "max_lon": 45.0},
    )
    ids = [c["id"] for c in response.json()]
    assert visible["id"] in ids
    assert hidden["id"] not in ids


def test_restore_returns_court_with_same_id(client, admin_client, create_court):
    court = create_court()
    admin_client.post(f"/admin/courts/{court['id']}/hide", json={})
    restore = admin_client.post(f"/admin/courts/{court['id']}/restore", json={})
    assert restore.status_code == 200
    assert restore.json()["is_hidden"] is False

    fetched = client.get(f"/courts/{court['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == court["id"]


def test_unpublish_description_keeps_court_available(client, admin_client, create_court):
    court = create_court(description="Куплю подписчиков, телефон X")
    response = admin_client.post(
        f"/admin/courts/{court['id']}/unpublish-description", json={"reason": "реклама"}
    )
    assert response.status_code == 200

    fetched = client.get(f"/courts/{court['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["description"] is None
    history = admin_client.get(f"/admin/courts/{court['id']}/history")
    assert "Куплю подписчиков" not in history.text
    assert client.get("/courts").json()  # карточка осталась на карте


def test_unpublish_photo_closes_old_file_link(client, admin_client, create_court):
    photo_bytes = b"\x89PNG-fake-image-bytes"
    court = create_court(photo=("court.png", photo_bytes, "image/png"))
    photo_url = court["photo_url"]
    assert photo_url is not None

    # До снятия файл выдаётся по старой ссылке.
    before = client.get(photo_url)
    assert before.status_code == 200
    assert before.content == photo_bytes

    response = admin_client.post(
        f"/admin/courts/{court['id']}/unpublish-photo", json={"reason": "реклама"}
    )
    assert response.status_code == 200

    # Публичная карточка больше не содержит ссылки, исходный файл закрыт.
    fetched = client.get(f"/courts/{court['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["photo_url"] is None
    assert client.get(photo_url).status_code == 404

    # Администратор видит, что фото снято с публикации, но ещё хранится.
    admin_view = admin_client.get(f"/admin/courts/{court['id']}").json()
    assert admin_view["photo_url"] == photo_url
    assert admin_view["is_photo_published"] is False


def test_hidden_court_photo_is_not_served(client, admin_client, create_court):
    court = create_court(photo=("court.png", b"\x89PNG-fake", "image/png"))
    photo_url = court["photo_url"]
    assert client.get(photo_url).status_code == 200
    admin_client.post(f"/admin/courts/{court['id']}/hide", json={})
    assert client.get(photo_url).status_code == 404
    assert client.get(f"/courts/{court['id']}").status_code == 404


def test_unknown_photo_name_returns_404(client):
    assert client.get("/photos/deadbeef.jpg").status_code == 404
    assert client.get("/photos/../../etc/passwd").status_code == 404
    assert client.get("/photos/not-hex-name.png").status_code == 404


def test_create_court_rejects_out_of_range_coordinates(client):
    response = client.post(
        "/courts",
        data={
            "sport_type": "basketball",
            "latitude": 200.0,
            "longitude": 44.8,
            "surface": "asphalt",
            "condition": "good",
            "has_lighting": "true",
        },
    )
    assert response.status_code == 422
    assert client.get("/courts").json() == []
