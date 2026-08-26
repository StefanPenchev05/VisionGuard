import pytest
from fastapi.testclient import TestClient

from interfaces.api.app import create_app
from interfaces.api.state import state


@pytest.fixture()
def client() -> TestClient:
    state.datasets.clear()
    state.training_jobs.clear()
    return TestClient(create_app())
