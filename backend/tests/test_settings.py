import pytest


def test_defaults_are_seeded(client):
    s = client.get("/api/me/settings").json()
    assert s == {
        "default_privacy": "link",
        "auto_join": "all",
        "recap_recipients": "everyone",
        "language": "English (Global)",
        "email_notes_enabled": True,
        "notify_on_ready": True,
        "theme": "system",
    }


def test_patch_is_partial_and_persists(client):
    r = client.patch("/api/me/settings", json={"auto_join": "owned", "theme": "dark"})
    assert r.status_code == 200 and r.json()["auto_join"] == "owned" and r.json()["theme"] == "dark"
    again = client.get("/api/me/settings").json()
    assert again["auto_join"] == "owned" and again["theme"] == "dark" and again["default_privacy"] == "link"


@pytest.mark.parametrize(
    "body",
    [
        {"default_privacy": "public"},
        {"auto_join": "never"},
        {"recap_recipients": "all"},
        {"theme": "blue"},
        {"language": "Klingon"},
        {"email_notes_enabled": "maybe"},
        {"unknown_field": 1},
    ],
)
def test_patch_validation(client, body):
    assert client.patch("/api/me/settings", json=body).status_code == 422


def test_null_is_rejected(client):
    assert client.patch("/api/me/settings", json={"theme": None}).status_code == 400
    assert client.get("/api/me/settings").json()["theme"] == "system"


def test_all_six_privacy_levels_are_accepted(client):
    for level in ("link", "teammates_participants", "participants", "teammates", "participants_team", "owner"):
        assert client.patch("/api/me/settings", json={"default_privacy": level}).json()["default_privacy"] == level


def test_missing_settings_row_is_created_on_demand(client):
    from app.db import SessionLocal
    from app.models import UserSettings

    with SessionLocal() as db:
        db.query(UserSettings).delete()
        db.commit()
    assert client.get("/api/me/settings").json()["language"] == "English (Global)"


def test_patch_me(client):
    r = client.patch("/api/me", json={"name": "  Jordan L. Lee ", "email": "jordan@example.org"})
    assert r.status_code == 200 and r.json()["name"] == "Jordan L. Lee" and r.json()["email"] == "jordan@example.org"
    assert client.get("/api/me").json()["email"] == "jordan@example.org"
    assert client.patch("/api/me", json={"email": "nope"}).status_code == 422
    assert client.patch("/api/me", json={"name": ""}).status_code == 422
    assert client.patch("/api/me", json={"name": None}).status_code == 400
    assert client.patch("/api/me", json={"id": 5}).status_code == 422
