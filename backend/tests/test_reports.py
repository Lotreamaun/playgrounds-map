"""Пользовательские обращения: правки, жалобы, очередь, одобрение, отклонение."""


from concurrent.futures import ThreadPoolExecutor


def _submit(client, court_id, payload):
    return client.post(f"/courts/{court_id}/reports", json=payload)


def test_correction_submission_captures_original_and_proposed(client, create_court):
    court = create_court(has_lighting="true")
    response = _submit(
        client,
        court["id"],
        {"kind": "correction", "target": "has_lighting", "proposed_value": False},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "new"
    report_id = body["id"]

    # Посетителю подтверждается приём, решение остаётся за администратором.
    fetched = client.get(f"/courts/{court['id']}")
    assert fetched.json()["has_lighting"] is True

    detail = client.get(f"/admin/reports/{report_id}")
    assert detail.status_code == 401  # закрытые данные без сессии не отдаются


def test_admin_sees_correction_with_values(admin_client, client, create_court):
    court = create_court(has_lighting="true")
    response = _submit(
        client,
        court["id"],
        {"kind": "correction", "target": "has_lighting", "proposed_value": False, "reason": "сломаны фонари"},
    )
    report_id = response.json()["id"]

    detail = admin_client.get(f"/admin/reports/{report_id}").json()
    assert detail["original_value"] == {"has_lighting": True}
    assert detail["proposed_value"] == {"has_lighting": False}
    assert detail["status"] == "new"
    assert detail["reason"] == "сломаны фонари"
    assert detail["court"]["id"] == court["id"]


def test_approve_correction_applies_change_and_logs_history(admin_client, client, create_court):
    court = create_court(has_lighting="true")
    report_id = _submit(
        client,
        court["id"],
        {"kind": "correction", "target": "has_lighting", "proposed_value": False},
    ).json()["id"]

    approved = admin_client.post(f"/admin/reports/{report_id}/approve", json={"note": "проверил лично"})
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"

    card = client.get(f"/courts/{court['id']}").json()
    assert card["has_lighting"] is False

    history = admin_client.get(f"/admin/courts/{court['id']}/history").json()
    approve_entries = [h for h in history if h["action"] == "approve"]
    assert len(approve_entries) == 1
    entry = approve_entries[0]
    assert entry["result"] == "done"
    assert entry["report_id"] == report_id
    assert entry["details"]["field"] == "has_lighting"
    assert entry["details"]["before"] is True
    assert entry["details"]["after"] is False


def test_stale_correction_does_not_overwrite_current_value(admin_client, client, create_court):
    court = create_court(has_lighting="true")
    report_id = _submit(
        client,
        court["id"],
        {"kind": "correction", "target": "has_lighting", "proposed_value": False},
    ).json()["id"]

    # Администратор уже исправил освещение напрямую до разбора заявки.
    patched = admin_client.patch(f"/admin/courts/{court['id']}", json={"has_lighting": False})
    assert patched.status_code == 200

    stale = admin_client.post(f"/admin/reports/{report_id}/approve", json={})
    assert stale.status_code == 409
    assert "stale" in stale.json()["detail"]

    # Заявка не перезаписала актуальное значение и осталась неразобранной.
    card = client.get(f"/courts/{court['id']}").json()
    assert card["has_lighting"] is False
    detail = admin_client.get(f"/admin/reports/{report_id}").json()
    assert detail["status"] == "new"

    # Причина видна в журнале.
    history = admin_client.get(f"/admin/courts/{court['id']}/history").json()
    stale_entries = [h for h in history if h["action"] == "approve" and h["result"] == "stale"]
    assert len(stale_entries) == 1
    assert stale_entries[0]["details"]["expected_original"] is True
    assert stale_entries[0]["details"]["actual"] is False


def test_rejected_correction_does_not_change_court(admin_client, client, create_court):
    court = create_court(has_lighting="true")
    report_id = _submit(
        client,
        court["id"],
        {"kind": "correction", "target": "has_lighting", "proposed_value": False},
    ).json()["id"]

    rejected = admin_client.post(f"/admin/reports/{report_id}/reject", json={"note": "не подтвердилось"})
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"

    assert client.get(f"/courts/{court['id']}").json()["has_lighting"] is True
    # Повторное решение невозможно.
    assert admin_client.post(f"/admin/reports/{report_id}/approve", json={}).status_code == 409


def test_advertising_complaint_full_flow(admin_client, client, create_court):
    court = create_court(description="Куплю подписчиков! Пишите в telegram @spam")
    response = _submit(
        client,
        court["id"],
        {"kind": "complaint", "target": "description", "reason": "Реклама в описании"},
    )
    assert response.status_code == 201

    queue = admin_client.get("/admin/reports", params={"status": "new"}).json()
    assert any(item["id"] == response.json()["id"] for item in queue)

    report_id = response.json()["id"]
    detail = admin_client.get(f"/admin/reports/{report_id}").json()
    assert detail["kind"] == "complaint"
    assert detail["target"] == "description"
    assert detail["reason"] == "Реклама в описании"
    assert detail["court"]["id"] == court["id"]

    # Администратор убирает описание и закрывает обращение.
    unpublish = admin_client.post(
        f"/admin/courts/{court['id']}/unpublish-description", json={"reason": "реклама по жалобе"}
    )
    assert unpublish.status_code == 200
    resolved = admin_client.post(f"/admin/reports/{report_id}/resolve", json={"note": "реклама убрана"})
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"

    card = client.get(f"/courts/{court['id']}").json()
    assert card["description"] is None

    # История связывает действия по площадке и обращению.
    history = admin_client.get(f"/admin/courts/{court['id']}/history").json()
    actions = {h["action"] for h in history}
    assert {"unpublish_description", "resolve"} <= actions
    resolve_entry = next(h for h in history if h["action"] == "resolve")
    assert resolve_entry["report_id"] == report_id


def test_correction_validation(client, create_court):
    court = create_court()
    unknown_field = _submit(
        client, court["id"], {"kind": "correction", "target": "name", "proposed_value": "X"}
    )
    assert unknown_field.status_code == 422

    bad_surface = _submit(
        client, court["id"], {"kind": "correction", "target": "surface", "proposed_value": "marble"}
    )
    assert bad_surface.status_code == 422

    bad_bool = _submit(
        client, court["id"], {"kind": "correction", "target": "has_lighting", "proposed_value": "нет"}
    )
    assert bad_bool.status_code == 422

    bad_complaint = _submit(
        client, court["id"], {"kind": "complaint", "target": "scoreboard", "reason": "x"}
    )
    assert bad_complaint.status_code == 422

    long_reason = _submit(
        client,
        court["id"],
        {"kind": "complaint", "target": "card", "reason": "р" * 501},
    )
    assert long_reason.status_code == 422


def test_report_submission_is_rate_limited(client, create_court):
    court = create_court()
    for _ in range(5):
        response = _submit(client, court["id"], {"kind": "complaint", "target": "card", "reason": "Неверные данные"})
        assert response.status_code == 201
    sixth = _submit(client, court["id"], {"kind": "complaint", "target": "card", "reason": "Неверные данные"})
    assert sixth.status_code == 429
    assert "Retry-After" in sixth.headers


def test_hidden_court_rejects_reports(client, admin_client, create_court):
    court = create_court()
    admin_client.post(f"/admin/courts/{court['id']}/hide", json={})
    response = _submit(client, court["id"], {"kind": "complaint", "target": "card", "reason": "Неверные данные"})
    assert response.status_code == 404


def test_surface_and_condition_corrections_are_valid(admin_client, client, create_court):
    court = create_court(surface="asphalt", condition="good")
    surface_id = _submit(
        client, court["id"], {"kind": "correction", "target": "surface", "proposed_value": "rubber"}
    ).json()["id"]
    condition_id = _submit(
        client, court["id"], {"kind": "correction", "target": "condition", "proposed_value": "poor"}
    ).json()["id"]

    assert admin_client.post(f"/admin/reports/{surface_id}/approve", json={}).status_code == 200
    assert admin_client.post(f"/admin/reports/{condition_id}/approve", json={}).status_code == 200

    card = client.get(f"/courts/{court['id']}").json()
    assert card["surface"] == "rubber"
    assert card["condition"] == "poor"


def test_parallel_correction_approvals_only_apply_one(admin_client, client, create_court):
    court = create_court(surface="asphalt")
    report_ids = [
        _submit(
            client,
            court["id"],
            {"kind": "correction", "target": "surface", "proposed_value": surface},
        ).json()["id"]
        for surface in ("rubber", "wood")
    ]

    def approve(report_id):
        return admin_client.post(f"/admin/reports/{report_id}/approve", json={})

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(approve, report_ids))
    assert sorted(response.status_code for response in responses) == [200, 409]
    approved = next(response.json() for response in responses if response.status_code == 200)
    card = client.get(f"/courts/{court['id']}").json()
    assert card["surface"] == approved["proposed_value"]["surface"]


def test_complaint_requires_nonblank_reason(client, create_court):
    court = create_court()
    response = _submit(client, court["id"], {"kind": "complaint", "target": "card", "reason": "  "})
    assert response.status_code == 422
