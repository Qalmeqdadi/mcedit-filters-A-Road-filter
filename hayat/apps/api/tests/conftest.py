"""API tests run against SQLite by default.

Set HAYAT_TEST_DATABASE_URL to run them against PostgreSQL, e.g.
postgresql+psycopg://hayat:hayat@localhost:5432/hayat_test
"""

import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path):
    url = os.environ.get("HAYAT_TEST_DATABASE_URL") or f"sqlite:///{tmp_path / 'test.db'}"
    from hayat_api.main import create_app
    from hayat_api.seed.cli import seed

    seed(url)
    with TestClient(create_app()) as c:
        yield c
