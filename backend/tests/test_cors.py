ORIGIN = "http://localhost:3000"  # the default in main.py when CORS_ORIGINS is unset


def _preflight(client, origin: str, method: str = "PATCH"):
    return client.options(
        "/api/meetings/1",
        headers={"Origin": origin, "Access-Control-Request-Method": method, "Access-Control-Request-Headers": "content-type"},
    )


def test_allowed_origin_can_use_every_method_the_frontend_needs(client):
    for method in ("GET", "POST", "PATCH", "DELETE"):
        r = _preflight(client, ORIGIN, method)
        assert r.status_code == 200 and r.headers["access-control-allow-origin"] == ORIGIN


def test_unknown_origin_is_not_allowed(client):
    assert "access-control-allow-origin" not in _preflight(client, "https://evil.example").headers


def test_credentials_are_not_enabled_and_export_filename_is_readable(client):
    r = client.get("/api/meetings/1/export?format=txt", headers={"Origin": ORIGIN})
    assert "access-control-allow-credentials" not in r.headers
    assert "Content-Disposition" in r.headers["access-control-expose-headers"]
