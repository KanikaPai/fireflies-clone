def test_people_list_and_create(client):
    people = client.get("/api/people").json()
    assert len(people) == 13 and people == sorted(people, key=lambda p: p["name"].lower())
    assert [p["name"] for p in client.get("/api/people", params={"q": "priya"}).json()] == ["Priya Nair"]

    r = client.post("/api/people", json={"name": "  Ravi Kumar ", "email": "ravi@example.com"})
    assert r.status_code == 201
    created = r.json()
    assert created["name"] == "Ravi Kumar" and created["avatar_color"].startswith("#")
    assert client.post("/api/people", json={"name": "Other", "email": "RAVI@example.com"}).status_code == 409
    assert client.post("/api/people", json={"name": ""}).status_code == 422
    assert client.post("/api/people", json={"name": "X", "email": "not-an-email"}).status_code == 422
    assert client.post("/api/people", json={"name": "X", "avatar_color": "red"}).status_code == 422


def test_tags_list_and_create(client):
    assert len(client.get("/api/tags").json()) == 10
    r = client.post("/api/tags", json={"name": "Retro", "color": "#112233"})
    assert r.status_code == 201 and r.json()["color"] == "#112233"
    assert client.post("/api/tags", json={"name": "retro"}).status_code == 409
    assert client.post("/api/tags", json={"name": ""}).status_code == 422
    assert client.post("/api/tags", json={"name": "Auto"}).json()["color"].startswith("#")
