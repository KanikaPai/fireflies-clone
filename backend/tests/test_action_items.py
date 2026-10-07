def _first_meeting(client):
    mid = client.get("/api/meetings", params={"q": "sprint"}).json()["items"][0]["id"]
    return client.get(f"/api/meetings/{mid}").json()


def test_action_item_crud(client):
    meeting = _first_meeting(client)
    mid = meeting["id"]
    people = {p["name"]: p["id"] for p in client.get("/api/people").json()}
    segment_id = client.get(f"/api/meetings/{mid}/transcript").json()["segments"][3]["id"]

    created = client.post(
        f"/api/meetings/{mid}/action-items",
        json={"text": "Book the retro room", "assignee_id": people["Priya Nair"], "due_date": "2026-11-01",
              "source_segment_id": segment_id},
    )
    assert created.status_code == 201
    item = created.json()
    assert item["assignee"]["name"] == "Priya Nair" and item["is_completed"] is False
    assert item["due_date"] == "2026-11-01" and item["source_segment_id"] == segment_id and item["source_start_ms"] is not None

    detail = client.get(f"/api/meetings/{mid}").json()
    assert len(detail["action_items"]) == len(meeting["action_items"]) + 1

    done = client.patch(f"/api/action-items/{item['id']}", json={"is_completed": True, "text": "Book the big retro room"})
    assert done.status_code == 200 and done.json()["is_completed"] and done.json()["text"] == "Book the big retro room"
    assert done.json()["assignee"]["name"] == "Priya Nair"  # untouched fields are preserved

    reassigned = client.patch(f"/api/action-items/{item['id']}", json={"assignee_id": people["Sofia Alvarez"]}).json()
    assert reassigned["assignee"]["name"] == "Sofia Alvarez"
    cleared = client.patch(f"/api/action-items/{item['id']}", json={"assignee_id": None, "due_date": None}).json()
    assert cleared["assignee"] is None and cleared["due_date"] is None

    listing = client.get("/api/meetings", params={"q": "sprint"}).json()["items"][0]
    assert listing["action_item_count"] == len(meeting["action_items"]) + 1

    assert client.delete(f"/api/action-items/{item['id']}").status_code == 204
    assert client.delete(f"/api/action-items/{item['id']}").status_code == 404
    assert len(client.get(f"/api/meetings/{mid}").json()["action_items"]) == len(meeting["action_items"])


def test_action_item_validation_and_not_found(client):
    meeting = _first_meeting(client)
    mid = meeting["id"]
    assert client.post("/api/meetings/9999/action-items", json={"text": "x"}).status_code == 404
    assert client.post(f"/api/meetings/{mid}/action-items", json={"text": ""}).status_code == 422
    assert client.post(f"/api/meetings/{mid}/action-items", json={"text": "x", "assignee_id": 9999}).status_code == 400
    other = client.get("/api/meetings", params={"q": "q3 board"}).json()["items"][0]["id"]
    other_segment = client.get(f"/api/meetings/{other}/transcript").json()["segments"][0]["id"]
    wrong = client.post(f"/api/meetings/{mid}/action-items", json={"text": "x", "source_segment_id": other_segment})
    assert wrong.status_code == 400
    item_id = meeting["action_items"][0]["id"]
    assert client.patch("/api/action-items/9999", json={"text": "x"}).status_code == 404
    assert client.patch(f"/api/action-items/{item_id}", json={"text": None}).status_code == 400
    assert client.patch(f"/api/action-items/{item_id}", json={"is_completed": None}).status_code == 400
    assert client.patch(f"/api/action-items/{item_id}", json={"assignee_id": 9999}).status_code == 400
