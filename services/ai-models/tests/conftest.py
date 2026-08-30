import pytest
from fastapi.testclient import TestClient

from interfaces.api.app import create_app
from interfaces.api.state import state


@pytest.fixture()
def client(tmp_path, monkeypatch) -> TestClient:
    monkeypatch.setenv("VISIONGUARD_AI_MODEL_DIR", str(tmp_path / "models"))
    monkeypatch.setenv("VISIONGUARD_ALLOW_SKIN_HAND_FALLBACK", "1")
    state.reset()
    return TestClient(create_app())
