import os
import sys
import pytest

# Add backend directory to sys.path so test modules can import app code
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture(autouse=True)
def _init_db():
    """Initialize the default database before each test."""
    from database import init_default_db
    init_default_db()
