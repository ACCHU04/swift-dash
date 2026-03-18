"""
Vercel Python serverless entry point.
Adds the backend directory to sys.path so FastAPI app can be imported.
"""
import sys
import os

# Make backend importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app  # noqa: F401  – Vercel ASGI handler picks up `app`
