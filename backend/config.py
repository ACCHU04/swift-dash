import os
from pathlib import Path
from pydantic_settings import BaseSettings

_TMP = "/tmp" if os.environ.get("VERCEL") else ""


class Settings(BaseSettings):
    # LLM
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    gemini_fallback_models: str = "models/gemini-flash-latest,gemini-2.0-flash,models/gemini-2.0-flash,gemini-2.5-flash"

    # Database
    db_path: str = os.path.join(_TMP, "ecommerce.db") if _TMP else "ecommerce.db"
    data_dir: str = str(Path(__file__).parent.parent / "data")
    default_csv: str = "amazon_sales.csv"

    # Firebase Admin — provide ONE of:
    # 1. JSON string of service account key (recommended for Vercel/cloud env vars)
    firebase_service_account_json: str = ""
    # 2. Path to service account JSON file (recommended for local dev)
    firebase_service_account_path: str = ""

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

    # Feature flags
    mock_mode: bool = False

    # Amazon / RapidAPI (optional)
    rapidapi_key: str = ""
    rapidapi_host: str = "real-time-amazon-data.p.rapidapi.com"
    rapidapi_base_url: str = "https://real-time-amazon-data.p.rapidapi.com"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

if not settings.gemini_api_key:
    settings.mock_mode = True
