"""Endpoints and filters that back the frontend's Tasks view, duration filter and Contacts table."""


def test_list_action_items_across_meetings(client):
    items = client.get("/api/action-items").json()
    assert len(items) == 35
    first = items[0]
    assert {"id", "text", "is_completed", "assignee", "meeting_id", "meeting_title", "meeting_date"} <= set(first)
    dates = [i["meeting_date"] for i in items]
    assert dates == sorted(dates, reverse=True)  # newest meeting first
    meeting = client.get(f"/api/meetings/{first['meeting_id']}").json()
    assert first["meeting_title"] == meeting["title"]


def test_list_action_items_completed_filter_and_toggle_persists(client):
    done = client.get("/api/action-items", params={"completed": True}).json()
    open_ = client.get("/api/action-items", params={"completed": False}).json()
    assert done and open_ and len(done) + len(open_) == 35
    assert all(i["is_completed"] for i in done) and not any(i["is_completed"] for i in open_)

    target = open_[0]["id"]
    assert client.patch(f"/api/action-items/{target}", json={"is_completed": True}).status_code == 200
    assert target in {i["id"] for i in client.get("/api/action-items", params={"completed": True}).json()}
    assert client.get("/api/action-items", params={"completed": "maybe"}).status_code == 422


def test_duration_filters(client):
    all_items = client.get("/api/meetings").json()["items"]
    durations = sorted(m["duration_seconds"] for m in all_items)
    assert durations[0] < 15 * 60 and durations[-1] > 30 * 60  # seed data spans all three presets

    short = client.get("/api/meetings", params={"max_duration": 899}).json()
    assert short["total"] >= 1 and all(m["duration_seconds"] <= 899 for m in short["items"])
    long = client.get("/api/meetings", params={"min_duration": 1801}).json()
    assert long["total"] >= 1 and all(m["duration_seconds"] >= 1801 for m in long["items"])
    mid = client.get("/api/meetings", params={"min_duration": 900, "max_duration": 1800}).json()
    assert mid["total"] >= 1
    assert short["total"] + mid["total"] + long["total"] == len(all_items)
    assert client.get("/api/meetings", params={"min_duration": 5000, "max_duration": 10}).json()["total"] == 0
    assert client.get("/api/meetings", params={"min_duration": -1}).status_code == 422


def test_people_include_meeting_stats(client):
    people = {p["name"]: p for p in client.get("/api/people").json()}
    carla = people["Carla Mendes"]
    assert carla["meeting_count"] == 1 and carla["last_meeting_date"].endswith("Z")
    assert people["Jordan Lee"]["meeting_count"] >= 6
    new = client.post("/api/people", json={"name": "Nobody Yet"}).json()
    stats = {p["id"]: p for p in client.get("/api/people").json()}[new["id"]]
    assert stats["meeting_count"] == 0 and stats["last_meeting_date"] is None

    mid = client.get("/api/meetings", params={"q": "brightwave"}).json()["items"][0]["id"]
    client.patch(f"/api/meetings/{mid}", json={"participant_ids": [new["id"]]})
    after = {p["name"]: p for p in client.get("/api/people").json()}
    assert after["Carla Mendes"]["meeting_count"] == 0 and after["Nobody Yet"]["meeting_count"] == 1
    assert after["Nobody Yet"]["last_meeting_date"] is not None


def test_status_and_platform_filters(client):
    assert client.get("/api/meetings", params={"status": "processing"}).json()["total"] == 0
    created = client.post(
        "/api/meetings", json={"title": "Pending recap", "meeting_date": "2026-10-01T10:00:00Z", "platform": "teams"}
    ).json()
    processing = client.get("/api/meetings", params={"status": "processing"}).json()
    assert [m["id"] for m in processing["items"]] == [created["id"]]
    assert client.get("/api/meetings", params={"status": "ready"}).json()["total"] == 8

    uploads = client.get("/api/meetings", params={"platform": "upload"}).json()
    assert uploads["total"] == 1 and uploads["items"][0]["platform"] == "upload"
    assert client.get("/api/meetings", params={"platform": "zoom"}).json()["total"] == 3
    assert client.get("/api/meetings", params={"status": "bogus"}).status_code == 422
