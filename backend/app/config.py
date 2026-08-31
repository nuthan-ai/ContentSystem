from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    openrouter_api_key: str = ""
    openrouter_model: str = "google/gemini-2.0-flash-001"
    github_token: str = ""
    llm_item_cap: int = 60
    database_url: str = f"sqlite:///{DATA_DIR / 'research.db'}"
    twitter_username: str = ""
    twitter_email: str = ""
    twitter_password: str = ""
    twitter_cookies_path: str = str(DATA_DIR / "twitter_cookies.json")


settings = AppSettings()
