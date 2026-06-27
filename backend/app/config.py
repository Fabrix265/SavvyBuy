from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    ai_provider: str = "openai"
    ai_model: str = "gpt-4o-mini"
    ai_api_key: str = ""
    ai_base_url: Optional[str] = None

    tavily_api_key: Optional[str] = None
    serpapi_api_key: Optional[str] = None

    cors_origins: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

SEARCH_APIS = [
    {
        "name": "tavily",
        "env_key": "tavily_api_key",
        "monthly_limit": 1000,
    },
    {
        "name": "serpapi",
        "env_key": "serpapi_api_key",
        "monthly_limit": 100,
    },
    {
        "name": "duckduckgo",
        "env_key": None,
        "monthly_limit": None,
    },
]

ACTIVE_STORES = [
    "mercadolibre",
    "falabella",
    "ripley",
    "oechsle",
    "sodimac",
    "metro",
    "tiendamia",
    "radioshack",
]
